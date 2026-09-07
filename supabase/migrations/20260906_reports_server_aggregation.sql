-- Migration: 20260906_reports_server_aggregation.sql
-- Optimizes get_admin_reports_analytics to return pre-aggregated timelineTrend,
-- lowTurnoutSessions, and consecutiveAbsentStudents directly in JSON.
-- Eliminates multi-megabyte raw attendance row downloads over HTTP.

CREATE OR REPLACE FUNCTION public.get_admin_reports_analytics(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_year text DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_caller_role text;
BEGIN
  -- 1. Security check: Caller must be an authenticated admin
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  WITH 
  -- 2. Filtered Finalized Sessions based on input parameters
  valid_sessions AS (
    SELECT 
      s.id AS session_id,
      s.teacher_id,
      s.subject_id,
      s.class_id,
      s.period_id,
      s.session_date,
      s.opened_at,
      s.finalized_at,
      c.department_id,
      c.name AS class_name,
      c.section AS class_section,
      c.year AS class_year,
      d.code AS dept_code,
      d.name AS dept_name,
      sub.name AS subject_name,
      sub.code AS subject_code,
      t.title AS teacher_title,
      u.full_name AS teacher_name
    FROM public.attendance_sessions s
    JOIN public.classes c ON s.class_id = c.id
    JOIN public.departments d ON c.department_id = d.id
    JOIN public.subjects sub ON s.subject_id = sub.id
    JOIN public.teachers t ON s.teacher_id = t.id
    JOIN public.users u ON t.id = u.id
    WHERE s.status = 'finalized'
      AND (p_date_from IS NULL OR s.session_date >= p_date_from)
      AND (p_date_to IS NULL OR s.session_date <= p_date_to)
      AND (p_department_id IS NULL OR c.department_id = p_department_id)
      AND (p_year IS NULL OR c.year = p_year)
      AND (p_class_id IS NULL OR s.class_id = p_class_id)
      AND (p_subject_id IS NULL OR s.subject_id = p_subject_id)
      AND (p_teacher_id IS NULL OR s.teacher_id = p_teacher_id)
  ),

  -- 3. Active Enrolled Student Count Per Class (Authoritative Expected Population)
  class_active_students AS (
    SELECT 
      class_id,
      COUNT(id)::int AS active_count
    FROM public.students
    WHERE is_active = true
    GROUP BY class_id
  ),

  -- 4. Session-Level Expected Attendance Metrics
  session_metrics AS (
    SELECT 
      vs.session_id,
      vs.session_date,
      vs.subject_id,
      vs.class_id,
      vs.teacher_id,
      vs.teacher_title,
      vs.teacher_name,
      vs.dept_code,
      vs.class_year,
      vs.class_section,
      vs.subject_name,
      vs.subject_code,
      COALESCE(cas.active_count, 0) AS expected_count,
      COUNT(pa.id) FILTER (WHERE pa.status = 'present' AND st.class_id = vs.class_id)::int AS present_count,
      COUNT(pa.id) FILTER (WHERE pa.status = 'absent' AND st.class_id = vs.class_id)::int AS absent_recorded_count,
      COUNT(pa.id)::int AS total_recorded_marks,
      CASE 
        WHEN COALESCE(cas.active_count, 0) > 0 THEN 
          ROUND((COUNT(pa.id) FILTER (WHERE pa.status = 'present' AND st.class_id = vs.class_id)::numeric / cas.active_count::numeric) * 100)
        ELSE NULL 
      END AS session_pct
    FROM valid_sessions vs
    LEFT JOIN class_active_students cas ON vs.class_id = cas.class_id
    LEFT JOIN public.period_attendance pa ON vs.session_id = pa.session_id
    LEFT JOIN public.students st ON pa.student_id = st.id
    GROUP BY vs.session_id, vs.session_date, vs.subject_id, vs.class_id, vs.teacher_id, vs.teacher_title, vs.teacher_name, 
             vs.dept_code, vs.class_year, vs.class_section, vs.subject_name, vs.subject_code, cas.active_count
  ),

  -- 5. Cross-Cohort Anomalies
  cross_cohort_anomalies AS (
    SELECT 
      pa.id AS attendance_id,
      pa.session_id,
      vs.session_date,
      pa.student_id,
      pa.status,
      st.roll_number,
      u.full_name AS student_name,
      st_c.name || '-' || st_c.section || ' (' || st_c.year || ')' AS enrolled_cohort,
      vs.dept_code || ' · ' || vs.class_year || ' · Sec ' || vs.class_section AS session_cohort,
      vs.subject_name
    FROM valid_sessions vs
    JOIN public.period_attendance pa ON vs.session_id = pa.session_id
    JOIN public.students st ON pa.student_id = st.id
    JOIN public.users u ON st.id = u.id
    JOIN public.classes st_c ON st.class_id = st_c.id
    WHERE st.class_id != vs.class_id
  ),

  -- 6. Zero-Enrollment Sessions
  zero_enrollment_sessions AS (
    SELECT 
      sm.session_id,
      sm.session_date,
      sm.subject_name,
      sm.subject_code,
      sm.dept_code || ' · ' || sm.class_year || ' · Sec ' || sm.class_section AS cohort_label,
      sm.teacher_title || '. ' || sm.teacher_name AS teacher_name,
      sm.total_recorded_marks
    FROM session_metrics sm
    WHERE sm.expected_count = 0
  ),

  -- 7. Overall Campus KPI Summary
  overall_kpis AS (
    SELECT 
      COUNT(DISTINCT sm.session_id)::int AS total_sessions,
      COALESCE(SUM(sm.expected_count) FILTER (WHERE sm.expected_count > 0), 0)::int AS total_expected,
      COALESCE(SUM(sm.present_count) FILTER (WHERE sm.expected_count > 0), 0)::int AS total_present,
      COUNT(DISTINCT sm.teacher_id)::int AS active_teachers,
      CASE 
        WHEN SUM(sm.expected_count) FILTER (WHERE sm.expected_count > 0) > 0 THEN 
          ROUND((SUM(sm.present_count) FILTER (WHERE sm.expected_count > 0)::numeric / 
                 SUM(sm.expected_count) FILTER (WHERE sm.expected_count > 0)::numeric) * 100)
        ELSE NULL 
      END AS campus_pct
    FROM session_metrics sm
  ),

  -- 8. Subject & Cohort Matrix
  subject_cohort_matrix AS (
    SELECT 
      sm.subject_id,
      sm.class_id,
      sm.subject_name,
      sm.subject_code,
      sm.dept_code,
      sm.class_year,
      sm.class_section,
      sm.dept_code || ' · ' || sm.class_year || ' · Sec ' || sm.class_section AS cohort_label,
      COUNT(DISTINCT sm.session_id)::int AS sessions_conducted,
      SUM(sm.expected_count)::int AS total_expected,
      SUM(sm.present_count)::int AS total_present,
      CASE 
        WHEN SUM(sm.expected_count) > 0 THEN 
          ROUND((SUM(sm.present_count)::numeric / SUM(sm.expected_count)::numeric) * 100)
        ELSE NULL 
      END AS attendance_pct,
      STRING_AGG(DISTINCT sm.teacher_title || '. ' || sm.teacher_name, ', ') AS teachers_list
    FROM session_metrics sm
    GROUP BY sm.subject_id, sm.class_id, sm.subject_name, sm.subject_code, sm.dept_code, sm.class_year, sm.class_section
  ),

  -- 9. Department / Academic Year Breakdown
  dept_year_breakdown AS (
    SELECT 
      sm.dept_code,
      sm.class_year,
      sm.dept_code || ' (' || sm.class_year || ')' AS label,
      COUNT(DISTINCT sm.session_id)::int AS sessions_conducted,
      SUM(sm.expected_count)::int AS total_expected,
      SUM(sm.present_count)::int AS total_present,
      CASE 
        WHEN SUM(sm.expected_count) > 0 THEN 
          ROUND((SUM(sm.present_count)::numeric / SUM(sm.expected_count)::numeric) * 100)
        ELSE NULL 
      END AS attendance_pct
    FROM session_metrics sm
    WHERE sm.expected_count > 0
    GROUP BY sm.dept_code, sm.class_year
  ),

  -- 10. Defaulter Students (<75%)
  student_cohort_attendance AS (
    SELECT 
      st.id AS student_id,
      st.roll_number,
      u.full_name AS student_name,
      c.id AS class_id,
      c.name AS class_name,
      c.section AS class_section,
      c.year AS class_year,
      d.code AS dept_code,
      COUNT(DISTINCT vs.session_id)::int AS expected_sessions,
      COUNT(DISTINCT pa.session_id) FILTER (WHERE pa.status = 'present')::int AS attended_sessions
    FROM public.students st
    JOIN public.users u ON st.id = u.id
    JOIN public.classes c ON st.class_id = c.id
    JOIN public.departments d ON c.department_id = d.id
    JOIN valid_sessions vs ON vs.class_id = st.class_id
    LEFT JOIN public.period_attendance pa ON pa.session_id = vs.session_id AND pa.student_id = st.id
    WHERE st.is_active = true
    GROUP BY st.id, st.roll_number, u.full_name, c.id, c.name, c.section, c.year, d.code
  ),
  defaulters AS (
    SELECT 
      sca.student_id,
      sca.roll_number,
      sca.student_name,
      sca.class_id,
      sca.class_name,
      sca.class_section,
      sca.class_year,
      sca.dept_code,
      sca.expected_sessions,
      sca.attended_sessions,
      ROUND((sca.attended_sessions::numeric / sca.expected_sessions::numeric) * 100) AS attendance_pct,
      CASE 
        WHEN (sca.attended_sessions::numeric / sca.expected_sessions::numeric) < 0.65 THEN 'critical'
        ELSE 'at_risk'
      END AS status
    FROM student_cohort_attendance sca
    WHERE sca.expected_sessions > 0 
      AND (sca.attended_sessions::numeric / sca.expected_sessions::numeric) < 0.75
  ),

  -- 11. Teacher Activity Metrics
  teacher_summary AS (
    SELECT 
      t.id AS teacher_id,
      t.title || '. ' || u.full_name AS teacher_name,
      d.code AS dept_code,
      COUNT(DISTINCT vs.session_id)::int AS sessions_conducted,
      (SELECT COUNT(DISTINCT id)::int FROM public.teacher_assignments WHERE teacher_id = t.id) AS assigned_courses_count,
      (SELECT COUNT(DISTINCT class_id)::int FROM public.teacher_assignments WHERE teacher_id = t.id) AS assigned_cohorts_count,
      MAX(vs.session_date)::text AS last_session_date,
      SUM(sm.expected_count)::int AS total_expected,
      SUM(sm.present_count)::int AS total_present,
      CASE 
        WHEN SUM(sm.expected_count) > 0 THEN 
          ROUND((SUM(sm.present_count)::numeric / SUM(sm.expected_count)::numeric) * 100)
        ELSE NULL 
      END AS avg_attendance_pct
    FROM public.teachers t
    JOIN public.users u ON t.id = u.id
    JOIN public.departments d ON t.department_id = d.id
    LEFT JOIN valid_sessions vs ON vs.teacher_id = t.id
    LEFT JOIN session_metrics sm ON sm.session_id = vs.session_id
    GROUP BY t.id, t.title, u.full_name, d.code
  ),

  -- 12. Top Subject Cohort (Meets minimum threshold N_sessions >= 3)
  top_subject_cohort AS (
    SELECT 
      scm.subject_id,
      scm.class_id,
      scm.subject_name,
      scm.subject_code,
      scm.cohort_label,
      scm.attendance_pct,
      scm.sessions_conducted,
      scm.teachers_list
    FROM subject_cohort_matrix scm
    WHERE scm.sessions_conducted >= 3 AND scm.attendance_pct IS NOT NULL
    ORDER BY scm.attendance_pct DESC, scm.sessions_conducted DESC
    LIMIT 1
  ),

  -- 13. Attention Required Subject Cohort
  attention_required_cohort AS (
    SELECT 
      scm.subject_id,
      scm.class_id,
      scm.subject_name,
      scm.subject_code,
      scm.cohort_label,
      scm.attendance_pct,
      scm.sessions_conducted,
      scm.teachers_list
    FROM subject_cohort_matrix scm
    WHERE scm.sessions_conducted >= 1 AND scm.attendance_pct IS NOT NULL AND scm.total_expected > 0
    ORDER BY scm.attendance_pct ASC, scm.sessions_conducted DESC
    LIMIT 1
  ),

  -- 14. Daily Timeline Trend
  daily_timeline_trend AS (
    SELECT 
      sm.session_date::text AS date,
      COUNT(DISTINCT sm.session_id)::int AS sessions,
      COALESCE(SUM(sm.expected_count), 0)::int AS expected,
      COALESCE(SUM(sm.present_count), 0)::int AS present,
      CASE 
        WHEN SUM(sm.expected_count) > 0 THEN 
          ROUND((SUM(sm.present_count)::numeric / SUM(sm.expected_count)::numeric) * 100)
        ELSE 0 
      END AS attendance_pct
    FROM session_metrics sm
    WHERE sm.expected_count > 0
    GROUP BY sm.session_date
    ORDER BY sm.session_date ASC
  ),

  -- 15. Low Turnout Sessions (< 50% Turnout)
  low_turnout_sessions AS (
    SELECT 
      sm.session_id AS "sessionId",
      sm.session_date::text AS "sessionDate",
      sm.subject_name AS "subjectName",
      sm.subject_code AS "subjectCode",
      sm.dept_code || '-' || sm.class_section AS "classSection",
      sm.class_year AS "year",
      sm.dept_code AS "deptCode",
      COALESCE(sm.teacher_title || '. ' || sm.teacher_name, sm.teacher_name, '—') AS "teacherName",
      sm.present_count AS "presentCount",
      sm.expected_count AS "expectedCount",
      sm.session_pct AS "turnoutPct",
      CASE WHEN sm.session_pct <= 25 THEN 'critical' ELSE 'moderate' END AS "severity"
    FROM session_metrics sm
    WHERE sm.expected_count > 0 AND sm.session_pct < 50
    ORDER BY sm.session_pct ASC, sm.session_date DESC
  ),

  -- 16. Consecutive Absence Streaks (>= 3 classes missed)
  student_session_ranks AS (
    SELECT 
      st.id AS student_id,
      st.roll_number,
      u.full_name AS student_name,
      c.id AS class_id,
      c.section AS class_section,
      c.year AS class_year,
      d.code AS dept_code,
      vs.session_date,
      pa.status,
      ROW_NUMBER() OVER (PARTITION BY st.id ORDER BY vs.session_date DESC, vs.opened_at DESC) AS rn
    FROM public.students st
    JOIN public.users u ON st.id = u.id
    JOIN public.classes c ON st.class_id = c.id
    JOIN public.departments d ON c.department_id = d.id
    JOIN valid_sessions vs ON vs.class_id = st.class_id
    JOIN public.period_attendance pa ON pa.session_id = vs.session_id AND pa.student_id = st.id
    WHERE st.is_active = true
  ),
  student_streaks AS (
    SELECT
      ssr.student_id AS "studentId",
      ssr.student_name AS "studentName",
      ssr.roll_number AS "rollNumber",
      ssr.dept_code || '-' || ssr.class_section AS "classSection",
      ssr.class_year AS "year",
      ssr.dept_code AS "deptCode",
      COALESCE(
        MIN(ssr.rn) FILTER (WHERE ssr.status = 'present') - 1,
        COUNT(*)::int
      ) AS "consecutiveMissed",
      (ARRAY_AGG(ssr.session_date::text ORDER BY ssr.rn ASC) FILTER (WHERE ssr.status = 'present'))[1] AS "lastAttendedDate",
      CASE 
        WHEN COALESCE(MIN(ssr.rn) FILTER (WHERE ssr.status = 'present') - 1, COUNT(*)::int) >= 5 THEN 'critical'
        ELSE 'high'
      END AS "riskLevel"
    FROM student_session_ranks ssr
    GROUP BY ssr.student_id, ssr.roll_number, ssr.student_name, ssr.class_id, ssr.class_section, ssr.class_year, ssr.dept_code
  ),
  consecutive_absentees AS (
    SELECT *
    FROM student_streaks
    WHERE "consecutiveMissed" >= 3
    ORDER BY "consecutiveMissed" DESC
  )

  -- Final Build JSON
  SELECT jsonb_build_object(
    'overview', (
      SELECT jsonb_build_object(
        'hasData', (SELECT total_sessions > 0 FROM overall_kpis),
        'campusAttendancePct', (SELECT campus_pct FROM overall_kpis),
        'totalSessionsConducted', (SELECT total_sessions FROM overall_kpis),
        'totalExpectedStudents', (SELECT total_expected FROM overall_kpis),
        'totalPresentMarks', (SELECT total_present FROM overall_kpis),
        'activeTeachersCount', (SELECT active_teachers FROM overall_kpis),
        'studentsBelow75Count', (SELECT COUNT(*)::int FROM defaulters),
        'topSubjectCohort', (
          SELECT jsonb_build_object(
            'subjectName', subject_name,
            'subjectCode', subject_code,
            'cohortLabel', cohort_label,
            'attendancePct', attendance_pct,
            'sessionsCount', sessions_conducted,
            'teacherName', teachers_list
          )
          FROM top_subject_cohort
        ),
        'attentionRequiredSubjectCohort', (
          SELECT jsonb_build_object(
            'subjectName', subject_name,
            'subjectCode', subject_code,
            'cohortLabel', cohort_label,
            'attendancePct', attendance_pct,
            'sessionsCount', sessions_conducted,
            'teacherName', teachers_list
          )
          FROM attention_required_cohort
        )
      ) FROM overall_kpis
    ),
    'subjectCohortMatrix', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', scm.subject_id || '__' || scm.class_id,
          'subjectId', scm.subject_id,
          'subjectName', scm.subject_name,
          'subjectCode', scm.subject_code,
          'classId', scm.class_id,
          'classSection', scm.dept_code || '-' || scm.class_section,
          'year', scm.class_year,
          'deptCode', scm.dept_code,
          'cohortLabel', scm.cohort_label,
          'attendancePct', scm.attendance_pct,
          'sessionsConducted', scm.sessions_conducted,
          'totalExpected', scm.total_expected,
          'totalPresent', scm.total_present,
          'teachersList', scm.teachers_list
        ) ORDER BY scm.attendance_pct DESC NULLS LAST, scm.sessions_conducted DESC
      ) FROM subject_cohort_matrix scm
    ), '[]'::jsonb),
    'departmentYearBreakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'deptCode', dyb.dept_code,
          'year', dyb.class_year,
          'label', dyb.label,
          'sessionsConducted', dyb.sessions_conducted,
          'attendancePct', dyb.attendance_pct
        ) ORDER BY dyb.attendance_pct DESC NULLS LAST
      ) FROM dept_year_breakdown dyb
    ), '[]'::jsonb),
    'defaulterStudents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'studentId', df.student_id,
          'name', df.student_name,
          'rollNumber', df.roll_number,
          'classId', df.class_id,
          'deptCode', df.dept_code,
          'year', df.class_year,
          'classSection', df.dept_code || '-' || df.class_section,
          'expectedSessions', df.expected_sessions,
          'attendedSessions', df.attended_sessions,
          'attendancePct', df.attendance_pct,
          'status', df.status
        ) ORDER BY df.attendance_pct ASC
      ) FROM defaulters df
    ), '[]'::jsonb),
    'teacherActivity', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'teacherId', ts.teacher_id,
          'name', ts.teacher_name,
          'deptCode', ts.dept_code,
          'sessionsConducted', ts.sessions_conducted,
          'assignedCoursesCount', ts.assigned_courses_count,
          'assignedCohortsCount', ts.assigned_cohorts_count,
          'avgAttendancePct', ts.avg_attendance_pct,
          'lastSessionDate', ts.last_session_date,
          'rate', COALESCE(ts.avg_attendance_pct, 0)
        ) ORDER BY ts.sessions_conducted DESC
      ) FROM teacher_summary ts
    ), '[]'::jsonb),
    'diagnostics', jsonb_build_object(
      'zeroEnrollmentSessionsCount', (SELECT COUNT(*)::int FROM zero_enrollment_sessions),
      'crossCohortMarksCount', (SELECT COUNT(*)::int FROM cross_cohort_anomalies),
      'zeroEnrollmentSessions', COALESCE((SELECT jsonb_agg(to_jsonb(zes)) FROM zero_enrollment_sessions zes), '[]'::jsonb),
      'crossCohortAnomalies', COALESCE((SELECT jsonb_agg(to_jsonb(cca)) FROM cross_cohort_anomalies cca), '[]'::jsonb)
    ),
    'timelineTrend', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', dtt.date,
          'sessions', dtt.sessions,
          'expected', dtt.expected,
          'present', dtt.present,
          'attendancePct', dtt.attendance_pct
        ) ORDER BY dtt.date ASC
      ) FROM daily_timeline_trend dtt
    ), '[]'::jsonb),
    'lowTurnoutSessions', COALESCE((
      SELECT jsonb_agg(to_jsonb(lts)) FROM low_turnout_sessions lts
    ), '[]'::jsonb),
    'consecutiveAbsentStudents', COALESCE((
      SELECT jsonb_agg(to_jsonb(ca)) FROM consecutive_absentees ca
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
