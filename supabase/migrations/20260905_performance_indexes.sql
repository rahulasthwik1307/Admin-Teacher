-- Performance Optimization Migration: Covering Indexes for High-Frequency Queries
-- Date: 2026-09-05

-- 1. Timetables indexes
CREATE INDEX IF NOT EXISTS idx_timetables_teacher_dow ON public.timetables (teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetables_period_id ON public.timetables (period_id);
CREATE INDEX IF NOT EXISTS idx_timetables_subject_id ON public.timetables (subject_id);

-- 2. Teacher assignments indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_id ON public.teacher_assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject_id ON public.teacher_assignments (subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_assigned_at ON public.teacher_assignments (assigned_at DESC);

-- 3. Attendance sessions indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_period_id ON public.attendance_sessions (period_id);

-- 4. Students indexes
CREATE INDEX IF NOT EXISTS idx_students_department_id ON public.students (department_id);
CREATE INDEX IF NOT EXISTS idx_students_class_year ON public.students (class_id, year);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON public.students (created_by);

-- 5. Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notification_batches_teacher_id ON public.notification_batches (teacher_id);
CREATE INDEX IF NOT EXISTS idx_notification_batch_recipients_student_id ON public.notification_batch_recipients (student_id);
CREATE INDEX IF NOT EXISTS idx_notification_batch_recipients_period_att ON public.notification_batch_recipients (period_attendance_id);

-- 6. QR tokens index
CREATE INDEX IF NOT EXISTS idx_qr_tokens_session_id ON public.qr_tokens (session_id);

-- 7. Face registrations indexes
CREATE INDEX IF NOT EXISTS idx_face_registrations_student_id ON public.face_registrations (student_id);
CREATE INDEX IF NOT EXISTS idx_face_registrations_reviewed_by ON public.face_registrations (reviewed_by);

-- 8. Academic structure & logging indexes
CREATE INDEX IF NOT EXISTS idx_subjects_department_id ON public.subjects (department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON public.teachers (department_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_performed_by ON public.system_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_period_attendance_overridden_by ON public.period_attendance (overridden_by);
