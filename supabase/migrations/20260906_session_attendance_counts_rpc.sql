-- Fast Server-Side Attendance Count Aggregator for Teacher Sessions
-- Replaces heavy multi-chunk client downloads with atomic SQL aggregation

CREATE OR REPLACE FUNCTION public.get_session_attendance_counts(p_session_ids uuid[])
RETURNS TABLE(
  session_id uuid,
  present_count bigint,
  absent_count bigint,
  total_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    pa.session_id,
    COUNT(CASE WHEN pa.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN pa.status = 'absent' THEN 1 END) as absent_count,
    COUNT(*) as total_count
  FROM period_attendance pa
  WHERE pa.session_id = ANY(p_session_ids)
  GROUP BY pa.session_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_attendance_counts(uuid[]) TO authenticated, service_role, anon;
