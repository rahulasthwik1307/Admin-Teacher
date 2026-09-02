-- Migration: Attendance Session Idempotency & Finalized Session Reopening
-- Guarantees: ONE LOGICAL LESSON (teacher + class + subject + period + date) = ONE ATTENDANCE SESSION
-- Allows authorized teachers to reopen and edit existing finalized sessions without creating duplicate session rows.

BEGIN;

-- 1. Database-Level Trigger to Block Duplicate Session Inserts
CREATE OR REPLACE FUNCTION public.trg_prevent_duplicate_attendance_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.attendance_sessions
    WHERE teacher_id = NEW.teacher_id
      AND class_id = NEW.class_id
      AND subject_id = NEW.subject_id
      AND period_id = NEW.period_id
      AND session_date = NEW.session_date
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Conflict: An attendance session already exists for this teacher, class, subject, period, and date (session_date: %, period_id: %)', NEW.session_date, NEW.period_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_attendance_sessions ON public.attendance_sessions;
CREATE TRIGGER trg_prevent_duplicate_attendance_sessions
BEFORE INSERT ON public.attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_prevent_duplicate_attendance_sessions();

-- 2. Atomic Stored Procedure: Start, Resume, or Reopen QR Attendance Session
CREATE OR REPLACE FUNCTION public.start_or_resume_qr_session(
  p_teacher_id UUID,
  p_class_id UUID,
  p_subject_id UUID,
  p_period_id UUID,
  p_session_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_session RECORD;
  v_session_id UUID;
  v_token TEXT;
  v_now TIMESTAMPTZ := now();
  v_expiry TIMESTAMPTZ := now() + interval '15 seconds';
  v_lock_key BIGINT;
BEGIN
  -- 0. Authenticated Caller Check (Defense-in-depth)
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = v_caller_id;
    IF NOT v_is_admin AND v_caller_id <> p_teacher_id THEN
      RAISE EXCEPTION 'Forbidden: Caller does not match teacher ID';
    END IF;
  END IF;

  -- 1. Verify Teacher is active & valid
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.teachers t ON t.id = u.id
    WHERE u.id = p_teacher_id AND u.role = 'teacher' AND (t.is_active IS NULL OR t.is_active = true)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Teacher account is invalid or inactive';
  END IF;

  -- 2. Verify Teacher Assignment (class_id + subject_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_assignments
    WHERE teacher_id = p_teacher_id AND class_id = p_class_id AND subject_id = p_subject_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: You are not assigned to teach this subject and class cohort';
  END IF;

  -- 3. Verify Period exists
  IF NOT EXISTS (SELECT 1 FROM public.periods WHERE id = p_period_id) THEN
    RAISE EXCEPTION 'Bad Request: Invalid period ID';
  END IF;

  -- 4. Transaction-level Advisory Lock to prevent concurrent race conditions
  v_lock_key := ('x' || substr(md5(p_teacher_id::text || p_class_id::text || p_subject_id::text || p_period_id::text || p_session_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 5. Check if session already exists for this exact logical slot today
  SELECT id, status, opened_at, current_qr_token, qr_token_expires_at
  INTO v_session
  FROM public.attendance_sessions
  WHERE teacher_id = p_teacher_id
    AND class_id = p_class_id
    AND subject_id = p_subject_id
    AND period_id = p_period_id
    AND session_date = p_session_date
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    IF v_session.status = 'finalized' THEN
      -- Reopen the existing finalized session for review and editing
      -- Invalidate old QR tokens
      UPDATE public.qr_tokens
      SET is_used = true
      WHERE session_id = v_session.id AND is_used = false;

      -- Transition existing session to 'reviewing'
      UPDATE public.attendance_sessions
      SET status = 'reviewing'
      WHERE id = v_session.id;

      RETURN jsonb_build_object(
        'success', true,
        'action', 'reopened_review',
        'sessionId', v_session.id,
        'status', 'reviewing',
        'openedAt', v_session.opened_at,
        'currentQrToken', v_session.current_qr_token,
        'message', 'Existing finalized session reopened for review and editing.'
      );
    ELSIF v_session.status = 'reviewing' THEN
      -- Resume reviewing state
      RETURN jsonb_build_object(
        'success', true,
        'action', 'resumed_review',
        'sessionId', v_session.id,
        'status', 'reviewing',
        'openedAt', v_session.opened_at,
        'currentQrToken', v_session.current_qr_token
      );
    ELSIF v_session.status = 'active' THEN
      -- Resume active session and generate a fresh rotating token
      v_token := gen_random_uuid()::text;
      
      -- Mark previous tokens as used
      UPDATE public.qr_tokens
      SET is_used = true
      WHERE session_id = v_session.id AND is_used = false;

      -- Insert new active token
      INSERT INTO public.qr_tokens (session_id, token, expires_at, is_used)
      VALUES (v_session.id, v_token, v_expiry, false);

      -- Update session with new token
      UPDATE public.attendance_sessions
      SET current_qr_token = v_token,
          qr_token_expires_at = v_expiry
      WHERE id = v_session.id;

      RETURN jsonb_build_object(
        'success', true,
        'action', 'resumed_active',
        'sessionId', v_session.id,
        'status', 'active',
        'openedAt', v_session.opened_at,
        'currentQrToken', v_token,
        'qrTokenExpiresAt', v_expiry
      );
    END IF;
  END IF;

  -- 6. No existing session found: Create 1 new active session atomically
  v_token := gen_random_uuid()::text;
  
  INSERT INTO public.attendance_sessions (
    teacher_id, class_id, subject_id, period_id, session_date,
    status, opened_at, current_qr_token, qr_token_expires_at
  ) VALUES (
    p_teacher_id, p_class_id, p_subject_id, p_period_id, p_session_date,
    'active', v_now, v_token, v_expiry
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.qr_tokens (session_id, token, expires_at, is_used)
  VALUES (v_session_id, v_token, v_expiry, false);

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created_active',
    'sessionId', v_session_id,
    'status', 'active',
    'openedAt', v_now,
    'currentQrToken', v_token,
    'qrTokenExpiresAt', v_expiry
  );
END;
$function$;

COMMIT;
