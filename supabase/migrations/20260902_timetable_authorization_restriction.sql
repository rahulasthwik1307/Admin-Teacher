-- Migration: AttendGuard Year-Aware Timetable Authorization and Period Restriction
-- Guarantees:
-- 1. AUTHORITATIVE TIMETABLE AUTHORIZATION:
--    A teacher may only start or reopen attendance for a period that is explicitly assigned to that exact
--    Teacher + Academic Cohort (Department + Year + Section + Class) + Subject + Day of Week + Period in public.timetables.
--    Any unauthorized attempt is rejected at the database level with action='timetable_not_authorized'.
-- 2. SAME-SUBJECT IDEMPOTENCY & REOPENING:
--    Same teacher + exact cohort + subject + period + date resumes/reopens the existing session (0 duplicate rows).
-- 3. SLOT CONFLICT PRESERVATION:
--    Different subject attempting the same teacher + exact cohort + period + date is blocked with action='slot_conflict'.
-- 4. MULTIPLE PERIODS PER SUBJECT:
--    Supports multiple authorized timetable periods for the same subject on the same day.
-- 5. ATOMIC SERIALIZATION:
--    Advisory locking on (teacher + class + period + date) slot identity prevents race conditions.

BEGIN;

-- 1. Database-Level Trigger to Block Conflicting / Duplicate Raw Session Inserts
CREATE OR REPLACE FUNCTION public.trg_prevent_duplicate_attendance_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_conflict_subject_id UUID;
  v_conflict_subject_name TEXT;
  v_period_number INT;
BEGIN
  SELECT s.subject_id, sub.name, p.period_number
  INTO v_conflict_subject_id, v_conflict_subject_name, v_period_number
  FROM public.attendance_sessions s
  LEFT JOIN public.subjects sub ON sub.id = s.subject_id
  LEFT JOIN public.periods p ON p.id = s.period_id
  WHERE s.teacher_id = NEW.teacher_id
    AND s.class_id = NEW.class_id
    AND s.period_id = NEW.period_id
    AND s.session_date = NEW.session_date
    AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY s.opened_at DESC
  LIMIT 1;

  IF v_conflict_subject_id IS NOT NULL THEN
    IF v_conflict_subject_id = NEW.subject_id THEN
      RAISE EXCEPTION 'Conflict: An attendance session already exists for this teacher, class, subject, period, and date (session_date: %, period_id: %)', NEW.session_date, NEW.period_id;
    ELSE
      RAISE EXCEPTION 'Conflict: Period % is already used for % on %', COALESCE(v_period_number::text, NEW.period_id::text), COALESCE(v_conflict_subject_name, 'another subject'), NEW.session_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_attendance_sessions ON public.attendance_sessions;
CREATE TRIGGER trg_prevent_duplicate_attendance_sessions
BEFORE INSERT ON public.attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_prevent_duplicate_attendance_sessions();

-- 2. Atomic Stored Procedure with Authoritative Year-Aware Timetable Authorization
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
  v_day_of_week INT;
  v_session RECORD;
  v_conflict RECORD;
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

  -- 2. Verify existence of Period, Class Cohort, and Subject
  IF NOT EXISTS (SELECT 1 FROM public.periods WHERE id = p_period_id) THEN
    RAISE EXCEPTION 'Bad Request: Invalid period ID';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'Bad Request: Invalid class ID';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'Bad Request: Invalid subject ID';
  END IF;

  -- 3. Authoritative Timetable Authorization
  -- Resolve day of week from session_date (1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun)
  v_day_of_week := EXTRACT(isodow FROM p_session_date)::INT;

  -- Verify exact timetable assignment:
  -- Teacher + Cohort (Department + Year + Section + Class) + Subject + Day + Period
  IF NOT EXISTS (
    SELECT 1
    FROM public.timetables tt
    JOIN public.classes c ON c.id = tt.class_id
    WHERE tt.teacher_id = p_teacher_id
      AND tt.class_id = p_class_id
      AND tt.subject_id = p_subject_id
      AND tt.period_id = p_period_id
      AND tt.day_of_week = v_day_of_week
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'action', 'timetable_not_authorized',
      'message', 'You are not assigned to this subject for this period.'
    );
  END IF;

  -- 4. Transaction-level Advisory Lock keyed on SLOT identity (teacher + class + period + date)
  -- Serializes all concurrent requests for this slot atomically
  v_lock_key := ('x' || substr(md5(p_teacher_id::text || p_class_id::text || p_period_id::text || p_session_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 5. Session Idempotency & Reopening: Check if session already exists for this exact lesson today (SAME subject)
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
      -- Reopen existing finalized session for review and editing
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
      
      UPDATE public.qr_tokens
      SET is_used = true
      WHERE session_id = v_session.id AND is_used = false;

      INSERT INTO public.qr_tokens (session_id, token, expires_at, is_used)
      VALUES (v_session.id, v_token, v_expiry, false);

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

  -- 6. Conflict Check: Verify whether a DIFFERENT subject already occupies this slot
  SELECT s.id, s.subject_id, sub.name AS subject_name, p.period_number
  INTO v_conflict
  FROM public.attendance_sessions s
  LEFT JOIN public.subjects sub ON sub.id = s.subject_id
  LEFT JOIN public.periods p ON p.id = s.period_id
  WHERE s.teacher_id = p_teacher_id
    AND s.class_id = p_class_id
    AND s.period_id = p_period_id
    AND s.session_date = p_session_date
    AND s.subject_id <> p_subject_id
  ORDER BY s.opened_at DESC
  LIMIT 1;

  IF v_conflict.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'action', 'slot_conflict',
      'existingSessionId', v_conflict.id,
      'existingSubjectId', v_conflict.subject_id,
      'existingSubjectName', COALESCE(v_conflict.subject_name, 'another subject'),
      'periodNumber', v_conflict.period_number,
      'message', 'Period ' || COALESCE(v_conflict.period_number::text, '') || ' is already used for ' || COALESCE(v_conflict.subject_name, 'another subject') || '.'
    );
  END IF;

  -- 7. No existing session found for this slot: Create 1 new active session atomically
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
