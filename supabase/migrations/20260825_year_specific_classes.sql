-- Migration: Year-Specific Classes Architecture
-- Converts generic classes (name + section) to year-specific cohorts (department + year + section)
-- Executes safely in a single transaction with hard assertions and zero data loss.

BEGIN;

-- 1. Staging Schema (Safe Rerun Lifecycle)
DROP TABLE IF EXISTS public.migration_issues_audit;
DROP TABLE IF EXISTS public.migration_class_mapping;

CREATE TABLE public.migration_class_mapping (
    old_class_id UUID NOT NULL,
    department_id UUID NOT NULL,
    name TEXT NOT NULL,
    section TEXT NOT NULL,
    year TEXT NOT NULL CHECK (year IN ('1st Year', '2nd Year', '3rd Year', '4th Year')),
    new_class_id UUID NOT NULL PRIMARY KEY,
    mapping_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.migration_issues_audit (
    id BIGSERIAL PRIMARY KEY,
    record_type TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_class_id UUID,
    possible_years TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('RESOLVED', 'MANUAL_REVIEW_REQUIRED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Populate Mapping Table deterministically
-- Group by (c.id, c.department_id, c.name, c.section, discovered.year) to guarantee 100% uniqueness per (class, year)
INSERT INTO public.migration_class_mapping (old_class_id, department_id, name, section, year, new_class_id, mapping_reason)
SELECT 
    c.id,
    c.department_id,
    c.name,
    c.section,
    discovered.year,
    gen_random_uuid(),
    STRING_AGG(DISTINCT discovered.reason, '; ')
FROM public.classes c
JOIN (
    SELECT class_id, year, 'Required by existing student records' AS reason
    FROM public.students WHERE year IS NOT NULL AND class_id IS NOT NULL
    UNION ALL
    SELECT class_id, year, 'Required by teacher assignments' AS reason
    FROM public.teacher_assignments WHERE year IS NOT NULL AND class_id IS NOT NULL
) discovered ON c.id = discovered.class_id
GROUP BY c.id, c.department_id, c.name, c.section, discovered.year;

-- For any class that had 0 student or assignment records, provide 1st Year as the baseline cohort
INSERT INTO public.migration_class_mapping (old_class_id, department_id, name, section, year, new_class_id, mapping_reason)
SELECT 
    c.id,
    c.department_id,
    c.name,
    c.section,
    '1st Year',
    gen_random_uuid(),
    'Baseline cohort for existing unpopulated class'
FROM public.classes c
WHERE c.id NOT IN (SELECT old_class_id FROM public.migration_class_mapping);

-- 3. Prepare classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS year TEXT;

-- Drop old unique constraint before inserting multi-year cohorts with identical name & section
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_name_section_department_id_key;

-- 4. Insert newly generated Year-Specific classes from mapping table
INSERT INTO public.classes (id, name, section, department_id, year, created_at)
SELECT m.new_class_id, m.name, m.section, m.department_id, m.year, now()
FROM public.migration_class_mapping m;

-- 5. Student Migration
UPDATE public.students s
SET class_id = m.new_class_id
FROM public.migration_class_mapping m
WHERE s.class_id = m.old_class_id AND s.year = m.year;

-- 6. Teacher Assignments Migration
UPDATE public.teacher_assignments ta
SET class_id = m.new_class_id
FROM public.migration_class_mapping m
WHERE ta.class_id = m.old_class_id AND ta.year = m.year;

-- 7. Timetable Migration
-- 7A. Timetables with linked teacher_assignment_id
UPDATE public.timetables t
SET class_id = ta.class_id
FROM public.teacher_assignments ta
WHERE t.teacher_assignment_id = ta.id 
  AND t.class_id <> ta.class_id;

-- 7B. Unlinked timetables: check for single unambiguous assignment
WITH unlinked_candidates AS (
    SELECT 
        t.id AS timetable_id,
        t.class_id AS old_class_id,
        COUNT(DISTINCT ta.class_id) AS distinct_cohort_count,
        MAX(ta.class_id::text)::uuid AS target_class_id,
        STRING_AGG(DISTINCT ta.year, ', ') AS candidate_years
    FROM public.timetables t
    JOIN public.teacher_assignments ta 
        ON ta.teacher_id = t.teacher_id 
        AND ta.subject_id = t.subject_id
        AND ta.class_id IN (SELECT new_class_id FROM public.migration_class_mapping WHERE old_class_id = t.class_id)
    WHERE t.teacher_assignment_id IS NULL
    GROUP BY t.id, t.class_id
)
UPDATE public.timetables t
SET class_id = uc.target_class_id
FROM unlinked_candidates uc
WHERE t.id = uc.timetable_id AND uc.distinct_cohort_count = 1;

-- For remaining unlinked timetables where class only mapped to a single cohort (like CSD-A)
UPDATE public.timetables t
SET class_id = m.new_class_id
FROM (
    SELECT old_class_id, MIN(new_class_id::text)::uuid AS new_class_id
    FROM public.migration_class_mapping
    GROUP BY old_class_id
    HAVING COUNT(*) = 1
) m
WHERE t.class_id = m.old_class_id;

-- 8. Historical Attendance Sessions Migration
-- 8A. Unambiguous single-year sessions
WITH single_year_sessions AS (
    SELECT 
        pa.session_id,
        s.class_id AS old_class_id,
        MIN(st.year) AS single_year
    FROM public.period_attendance pa
    JOIN public.attendance_sessions s ON pa.session_id = s.id
    JOIN public.students st ON pa.student_id = st.id
    WHERE st.year IS NOT NULL AND s.class_id IN (SELECT old_class_id FROM public.migration_class_mapping)
    GROUP BY pa.session_id, s.class_id
    HAVING COUNT(DISTINCT st.year) = 1
)
UPDATE public.attendance_sessions sess
SET class_id = m.new_class_id
FROM single_year_sessions sys
JOIN public.migration_class_mapping m ON sys.old_class_id = m.old_class_id AND sys.single_year = m.year
WHERE sess.id = sys.session_id;

-- 8B. Split-year sessions: resolve via authoritative teacher assignment if available
WITH split_year_resolutions AS (
    SELECT 
        s.id AS session_id,
        s.class_id AS old_class_id,
        COUNT(DISTINCT ta.class_id) AS matching_assignment_count,
        MAX(ta.class_id::text)::uuid AS resolved_class_id,
        STRING_AGG(DISTINCT st.year, ', ') AS student_years,
        MAX(ta.year) AS assignment_year
    FROM public.attendance_sessions s
    JOIN public.period_attendance pa ON pa.session_id = s.id
    JOIN public.students st ON pa.student_id = st.id
    LEFT JOIN public.teacher_assignments ta 
        ON ta.teacher_id = s.teacher_id 
        AND ta.subject_id = s.subject_id 
        AND ta.class_id IN (SELECT new_class_id FROM public.migration_class_mapping WHERE old_class_id = s.class_id)
    WHERE s.class_id IN (SELECT old_class_id FROM public.migration_class_mapping)
    GROUP BY s.id, s.class_id
    HAVING COUNT(DISTINCT st.year) > 1
)
UPDATE public.attendance_sessions sess
SET class_id = syr.resolved_class_id
FROM split_year_resolutions syr
WHERE sess.id = syr.session_id AND syr.matching_assignment_count = 1;

-- 8C. Zero-attendance sessions: match via teacher assignment if available, or unique cohort if class has only 1 cohort
WITH zero_attendance_resolutions AS (
    SELECT 
        s.id AS session_id,
        s.class_id AS old_class_id,
        COUNT(DISTINCT ta.class_id) AS matching_assignment_count,
        MAX(ta.class_id::text)::uuid AS resolved_class_id
    FROM public.attendance_sessions s
    LEFT JOIN public.period_attendance pa ON pa.session_id = s.id
    JOIN public.teacher_assignments ta 
        ON ta.teacher_id = s.teacher_id 
        AND ta.subject_id = s.subject_id 
        AND ta.class_id IN (SELECT new_class_id FROM public.migration_class_mapping WHERE old_class_id = s.class_id)
    WHERE pa.id IS NULL AND s.class_id IN (SELECT old_class_id FROM public.migration_class_mapping)
    GROUP BY s.id, s.class_id
)
UPDATE public.attendance_sessions sess
SET class_id = zar.resolved_class_id
FROM zero_attendance_resolutions zar
WHERE sess.id = zar.session_id AND zar.matching_assignment_count = 1;

-- For remaining zero-attendance sessions on single-cohort classes
UPDATE public.attendance_sessions sess
SET class_id = m.new_class_id
FROM (
    SELECT old_class_id, MIN(new_class_id::text)::uuid AS new_class_id
    FROM public.migration_class_mapping
    GROUP BY old_class_id
    HAVING COUNT(*) = 1
) m
WHERE sess.class_id = m.old_class_id;

-- 9. Hard Pre-Deletion Validation Assertions (PL/pgSQL Block)
DO $$
DECLARE
    v_unresolved_issues INTEGER;
    v_old_student_refs INTEGER;
    v_old_asgn_refs INTEGER;
    v_old_tt_refs INTEGER;
    v_old_sess_refs INTEGER;
    v_mismatched_students INTEGER;
    v_mismatched_asgns INTEGER;
BEGIN
    -- Check 1: No pending manual review issues
    SELECT COUNT(*) INTO v_unresolved_issues
    FROM public.migration_issues_audit
    WHERE status = 'MANUAL_REVIEW_REQUIRED';

    IF v_unresolved_issues > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % unresolved issues requiring manual review in migration_issues_audit.', v_unresolved_issues;
    END IF;

    -- Check 2: No students referencing old classes
    SELECT COUNT(*) INTO v_old_student_refs
    FROM public.students
    WHERE class_id IN (SELECT old_class_id FROM public.migration_class_mapping);

    IF v_old_student_refs > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % students still reference old class IDs.', v_old_student_refs;
    END IF;

    -- Check 3: No teacher_assignments referencing old classes
    SELECT COUNT(*) INTO v_old_asgn_refs
    FROM public.teacher_assignments
    WHERE class_id IN (SELECT old_class_id FROM public.migration_class_mapping);

    IF v_old_asgn_refs > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % teacher assignments still reference old class IDs.', v_old_asgn_refs;
    END IF;

    -- Check 4: No timetables referencing old classes
    SELECT COUNT(*) INTO v_old_tt_refs
    FROM public.timetables
    WHERE class_id IN (SELECT old_class_id FROM public.migration_class_mapping);

    IF v_old_tt_refs > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % timetables still reference old class IDs.', v_old_tt_refs;
    END IF;

    -- Check 5: No attendance_sessions referencing old classes
    SELECT COUNT(*) INTO v_old_sess_refs
    FROM public.attendance_sessions
    WHERE class_id IN (SELECT old_class_id FROM public.migration_class_mapping);

    IF v_old_sess_refs > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % attendance sessions still reference old class IDs.', v_old_sess_refs;
    END IF;

    -- Check 6: Student year = class year consistency
    SELECT COUNT(*) INTO v_mismatched_students
    FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.year <> c.year;

    IF v_mismatched_students > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % students have year mismatched with class year.', v_mismatched_students;
    END IF;

    -- Check 7: Teacher assignment year = class year consistency
    SELECT COUNT(*) INTO v_mismatched_asgns
    FROM public.teacher_assignments ta
    JOIN public.classes c ON ta.class_id = c.id
    WHERE ta.year IS NOT NULL AND ta.year <> c.year;

    IF v_mismatched_asgns > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: % teacher assignments have year mismatched with class year.', v_mismatched_asgns;
    END IF;
END $$;

-- 10. Delete old generic classes
DELETE FROM public.classes 
WHERE id IN (SELECT old_class_id FROM public.migration_class_mapping);

-- 11. Finalize constraints on classes table
ALTER TABLE public.classes ALTER COLUMN year SET NOT NULL;
ALTER TABLE public.classes ADD CONSTRAINT classes_year_check 
    CHECK (year IN ('1st Year', '2nd Year', '3rd Year', '4th Year'));
ALTER TABLE public.classes ADD CONSTRAINT classes_dept_name_section_year_key 
    UNIQUE (department_id, name, section, year);

COMMIT;
