# FORENSIC AUDIT REPORT: TEACHER QR ATTENDANCE AUTHORIZATION, SESSION OWNERSHIP & END-TO-END ATTENDANCE DATA FLOW

**Audit Date:** August 31, 2026  
**Auditor:** Antigravity Advanced Agentic Forensic Security Inspector  
**Mode:** STRICT READ-ONLY FORENSIC INVESTIGATION (Zero DDL/DML, Zero Code Modifications, Zero Policy Changes)  
**Target Scope:** Teacher Portal QR Attendance, Session Management, QR Lifecycle, Student Roster Resolution, Attendance Writes, Missed Attendance, Analytics, History, Absence Notifications, Admin Visibility, Student Portal Compatibility, and PostgreSQL RLS Architecture.

---

## EXECUTIVE SUMMARY

This forensic investigation audited the end-to-end Teacher QR Attendance lifecycle, teacher identity propagation, session ownership boundaries, timetable synchronization, and database authorization layer across both the application code (`e:\Admin-Teacher`) and the live Supabase PostgreSQL database (`project_id: knkoihgyfjoaxznelrjr`).

### Primary Finding
The application exhibits a **hybrid authorization architecture**:
1. **Server-authoritative routes (e.g. `GET /api/teacher/student-list`, `GET /api/teacher/absence-notifications/*`, `GET /api/teacher/analytics`, `GET /api/teacher/missed-attendance`)** strictly derive teacher identity from Supabase Auth (`auth.uid()`), resolve authorized classes from `teacher_assignments`, and successfully reject parameter tampering.
2. **Client-driven QR session lifecycle (`app/teacher/qr-attendance/page.tsx`)** creates sessions (`attendance_sessions`), generates/rotates tokens (`qr_tokens`), overrides attendance, and finalizes sessions via **direct browser Supabase client calls (`createClient()`)**.
3. **Database RLS Policies have significant privilege overreach**:
   - `attendance_sessions` RLS policy `teacher_manage_own_sessions` checks `teacher_id = auth.uid()` but **does not verify whether the teacher is assigned to `(subject_id, class_id)` in `teacher_assignments`**. A teacher can insert an active attendance session for any class and subject campus-wide.
   - `period_attendance` RLS policy `teacher_manage_period_attendance` is a permissive `ALL` policy with `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')`. Any authenticated teacher possesses raw PostgreSQL `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to **all student period attendance records across all classes and teachers campus-wide**.
   - `students` RLS policy `teacher_update_students` is `is_teacher()`, permitting any teacher to update any student in the database.
   - `qr_tokens` RLS policy `student_read_qr_tokens` is `SELECT true`, permitting any public/authenticated user to read all active and historical QR tokens campus-wide.
4. **Privileged API Route Gaps (`createAdminClient()` / Service Role bypass)**:
   - `POST /api/teacher/save-missed-attendance` and `POST /api/teacher/bulk-save-missed-attendance` authenticate the caller via `auth.getUser()`, but use the service role client without validating that the submitted `class_id` and `subject_id` match the teacher's legitimate assignments in `teacher_assignments` or `timetables`.
   - `GET /api/teacher/face-approvals` uses `createAdminClient()` and trusts `?teacher_id=` from search parameters without executing `auth.getUser()`, exposing student face registration photos and details across teachers.
   - `POST /api/teacher/send-absence-digest`, `POST /api/teacher/reject-face`, and `POST /api/teacher/reset-student-password` use `createAdminClient()` without validating that the targeted student belongs to the teacher's authorized class cohort.

All existing functional workflows (QR generation, 15-second rotation, 180-second session countdown, live roster polling/realtime sync, manual review override, missed attendance calculation, absence notifications, Admin reporting RPCs, and multi-tab session isolation) have been cataloged and mapped with exact dependencies to ensure zero regression during subsequent hardening phases.

---

## PHASE 1 — MAP THE COMPLETE TEACHER QR ATTENDANCE ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TEACHER QR ATTENDANCE SYSTEM MAP                                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

[UI / Teacher QR Page] (app/teacher/qr-attendance/page.tsx)
  │
  ├── 1. Setup Phase:
  │     ├── Supabase Browser Query -> teacher_assignments (RLS: teacher_read_own_assignments)
  │     ├── Supabase Browser Query -> periods (RLS: all_read_periods)
  │     ├── Supabase Browser Query -> attendance_sessions (RLS: teacher_manage_own_sessions)
  │     └── Supabase Browser Query -> timetables (RLS: teacher_read_own_timetable)
  │
  ├── 2. Start Session (handleStart):
  │     ├── crypto.randomUUID() generated in browser
  │     ├── Supabase Browser INSERT -> attendance_sessions (RLS: teacher_manage_own_sessions)
  │     └── Supabase Browser INSERT -> qr_tokens (RLS: teacher_manage_qr_tokens)
  │
  ├── 3. Active Window (QRActiveSession & LiveStudentList):
  │     ├── Timer Hook (useQRTimer): 15s auto-rotation trigger
  │     │     ├── Supabase Browser UPDATE -> qr_tokens (is_used = true)
  │     │     ├── Supabase Browser INSERT -> qr_tokens (new token)
  │     │     └── Supabase Browser UPDATE -> attendance_sessions (current_qr_token)
  │     ├── Session Timer: 180s authoritative countdown derived from opened_at
  │     ├── Data Fetch -> GET /api/teacher/student-list?class_id=X&session_id=Y
  │     │     ├── Next.js Route Handler (app/api/teacher/student-list/route.ts)
  │     │     ├── Server Supabase Client (Bearer token auth via SSR)
  │     │     ├── Auth Verification -> supabase.auth.getUser()
  │     │     ├── Assignment Validation -> teacher_assignments where teacher_id = user.id
  │     │     ├── Student Query -> students where class_id IN (authorizedClassIds)
  │     │     └── Attendance Query -> period_attendance where session_id = Y
  │     └── Realtime Subscription -> supabase.channel('attendance_${sessionId}')
  │           └── on('postgres_changes', table: 'period_attendance') -> triggers fetchStudentList()
  │
  ├── 4. Student Check-in (Mobile / Flutter App):
  │     ├── Scans rotating QR token from screen
  │     ├── Supabase Client -> SELECT qr_tokens WHERE token = scannedToken AND is_used = false
  │     ├── Supabase Client -> INSERT period_attendance (student_id = auth.uid(), status = 'present')
  │     └── Triggers Postgres CDC -> Realtime broadcast to Teacher Portal
  │
  ├── 5. Review & Finalization (handleFinalize & QRSummaryState):
  │     ├── Supabase Browser UPDATE -> attendance_sessions (status = 'reviewing')
  │     ├── Supabase Browser SELECT -> students where class_id = selectedClass
  │     ├── Supabase Browser SELECT -> period_attendance where session_id = activeSessionId
  │     ├── Supabase Browser INSERT -> period_attendance (missing students as 'absent')
  │     ├── Supabase Browser UPDATE -> period_attendance (pending/failed -> 'absent')
  │     ├── Manual Teacher Override (handleOverride):
  │     │     └── Supabase Browser UPDATE/INSERT -> period_attendance (override_by_teacher = true)
  │     └── Done Action (onDone):
  │           ├── Supabase Browser UPDATE -> attendance_sessions (status = 'finalized', finalized_at = now())
  │           └── Supabase Browser INSERT -> system_logs (action_type = 'create')
```

### Complete End-to-End Operation Call Chains

#### 1. Setup & Roster Population Flow
- **UI:** [app/teacher/qr-attendance/page.tsx:L65-L238](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L65-L238)
- **Frontend Function:** `fetchSetupData(uid)`
- **Data Layer:** Browser Supabase client `createClient()` ([lib/supabase/client.ts](file:///e:/Admin-Teacher/lib/supabase/client.ts))
- **Queries Executed in Parallel:**
  1. `teacher_assignments`: Joined with `classes(id, name, section, year, department:departments(code))` and `subjects(id, name)` filtered by `teacher_id = uid`.
  2. `periods`: Ordered by `period_number ASC`.
  3. `attendance_sessions`: Finalized sessions for `teacher_id = uid` (limit 30).
  4. `timetables`: Filtered by `teacher_id = uid` and `day_of_week = todayDow`.
- **Database Tables:** `teacher_assignments`, `classes`, `departments`, `subjects`, `periods`, `attendance_sessions`, `timetables`, `period_attendance`.
- **RLS Policies Evaluated:** `teacher_read_own_assignments`, `all_read_periods`, `teacher_manage_own_sessions`, `teacher_read_own_timetable`, `teacher_read_period_attendance` (and `teacher_manage_period_attendance`).
- **Consuming Component:** `QRSetupState` ([components/teacher/qr-setup-state.tsx](file:///e:/Admin-Teacher/components/teacher/qr-setup-state.tsx)).

#### 2. Session Initialization & QR Generation Flow
- **UI:** [components/teacher/qr-setup-state.tsx:L353-L362](file:///e:/Admin-Teacher/components/teacher/qr-setup-state.tsx#L353-L362) -> [app/teacher/qr-attendance/page.tsx:L380-L428](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L380-L428)
- **Frontend Function:** `handleStart()`
- **Database Operations:**
  1. `INSERT INTO attendance_sessions (teacher_id, subject_id, class_id, period_id, session_date, status, current_qr_token, qr_token_expires_at) VALUES (...) RETURNING id, opened_at`
  2. `INSERT INTO qr_tokens (session_id, token, expires_at, is_used) VALUES (...)`
- **RLS Policies:** `teacher_manage_own_sessions` on `attendance_sessions`, `teacher_manage_qr_tokens` on `qr_tokens`.
- **Consuming Component:** Transitions state to `pageState = 'active'`, rendering `QRActiveSession` ([components/teacher/qr-active-session.tsx](file:///e:/Admin-Teacher/components/teacher/qr-active-session.tsx)).

#### 3. Dynamic QR Rotation Flow
- **Hook & Timer:** `useQRTimer` in [components/teacher/qr-code-display.tsx:L92-L130](file:///e:/Admin-Teacher/components/teacher/qr-code-display.tsx#L92-L130) runs a 15-second countdown.
- **Frontend Function:** `handleRotate()` in [app/teacher/qr-attendance/page.tsx:L430-L481](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L430-L481).
- **Database Operations:**
  1. `UPDATE qr_tokens SET is_used = true WHERE session_id = activeSessionId AND is_used = false`
  2. `INSERT INTO qr_tokens (session_id, token, expires_at, is_used) VALUES (activeSessionId, newToken, expiry, false)`
  3. `UPDATE attendance_sessions SET current_qr_token = newToken, qr_token_expires_at = expiry WHERE id = activeSessionId`
- **Consuming Component:** `QRCodeDisplay` ([components/teacher/qr-code-display.tsx](file:///e:/Admin-Teacher/components/teacher/qr-code-display.tsx)) re-renders SVG with `tokenValue = newToken`.

#### 4. Live Student Check-in & Realtime Invalidation Flow
- **UI:** `LiveStudentList` in [components/teacher/live-student-list.tsx](file:///e:/Admin-Teacher/components/teacher/live-student-list.tsx).
- **Server Route:** `GET /api/teacher/student-list?class_id=...&session_id=...` in [app/api/teacher/student-list/route.ts](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts).
- **Realtime Trigger:**
  - Client subscribes to `supabase.channel('attendance_${activeSessionId}').on('postgres_changes', { table: 'period_attendance' })`.
  - On event matching `record.session_id === activeSessionId`, calls `fetchStudentList()`.
  - Fallback polling interval runs every 5000ms.
  - Tab visibility resume listener refreshes immediately on `visibilitychange` or `focus`.

#### 5. Session Finalization & Absence Resolution Flow
- **Frontend Function:** `handleFinalize()` in [app/teacher/qr-attendance/page.tsx:L483-L547](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L483-L547).
- **Database Operations:**
  1. `UPDATE attendance_sessions SET status = 'reviewing' WHERE id = activeSessionId`.
  2. `SELECT id FROM students WHERE class_id = selectedClass`.
  3. `SELECT student_id FROM period_attendance WHERE session_id = activeSessionId`.
  4. Compare rosters; for all enrolled students with no scan, `INSERT INTO period_attendance (session_id, student_id, status) VALUES (activeSessionId, student.id, 'absent')`.
  5. `UPDATE period_attendance SET status = 'absent' WHERE session_id = activeSessionId AND status IN ('pending', 'failed')`.
- **Consuming Component:** `QRSummaryState` ([components/teacher/qr-summary-state.tsx](file:///e:/Admin-Teacher/components/teacher/qr-summary-state.tsx)).
- **Manual Overrides:** `handleOverride(studentId, newStatus)` updates or inserts `period_attendance` with `override_by_teacher = true, overridden_by = teacherId`.
- **Final Done:** `onDone()` updates `attendance_sessions SET status = 'finalized', finalized_at = now() WHERE id = activeSessionId` and writes to `system_logs`.

---

## PHASE 2 — TEACHER IDENTITY & AUTHENTICATION

### Code & Database Inspection Answers

| Question | Forensic Answer | Evidence |
|---|---|---|
| **1. How does the server determine the current teacher?** | Through Supabase Auth Session verification via `supabase.auth.getUser()`, which validates the JWT stored in HTTP cookies or transmitted via the `Authorization: Bearer <token>` header. | [lib/supabase/server.ts:L9-L36](file:///e:/Admin-Teacher/lib/supabase/server.ts#L9-L36), [lib/supabase/client.ts:L90-L121](file:///e:/Admin-Teacher/lib/supabase/client.ts#L90-L121) |
| **2. Which database column identifies the teacher?** | `public.users.id` (UUID matching `auth.users.id`), foreign-keyed to `public.teachers.id` (PK) and referenced as `teacher_id` in `teacher_assignments`, `attendance_sessions`, `timetables`, and `notification_batches`. | [information_schema.columns query](file:///C:/Users/rahul/.gemini/antigravity-ide/brain/8e101ec3-aea1-440e-b3c7-e4e29395dfa8/.system_generated/steps/47/output.txt), [foreign keys](file:///C:/Users/rahul/.gemini/antigravity-ide/brain/8e101ec3-aea1-440e-b3c7-e4e29395dfa8/.system_generated/steps/51/output.txt) |
| **3. Is identity derived from authenticated session?** | **Yes for API routes**: Derived strictly from `(await supabase.auth.getUser()).data.user.id`. **Yes for Client queries**: Derived from the active JWT evaluated by PostgreSQL `auth.uid()`. | [app/api/teacher/student-list/route.ts:L12](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts#L12), [app/api/teacher/dashboard/route.ts:L8](file:///e:/Admin-Teacher/app/api/teacher/dashboard/route.ts#L8) |
| **4. Can frontend provide `teacher_id`?** | Yes, the frontend passes `teacher_id` in query parameters or request bodies on specific legacy routes (e.g. `GET /api/teacher/face-approvals?teacher_id=...`). | [app/api/teacher/face-approvals/route.ts:L8](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L8) |
| **5. If `teacher_id` is supplied by browser, is it trusted?** | In `GET /api/teacher/face-approvals`, **YES (VULNERABLE)**. In other routes (`student-list`, `dashboard`, `analytics`, `missed-attendance`, `save-missed-attendance`), `teacher_id` from client is ignored and `user.id` is enforced. | [app/api/teacher/face-approvals/route.ts:L8](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L8), [app/api/teacher/save-missed-attendance/route.ts:L62](file:///e:/Admin-Teacher/app/api/teacher/save-missed-attendance/route.ts#L62) |
| **6. Which APIs accept `teacher_id`?** | `GET /api/teacher/face-approvals` (query param `teacher_id`), `GET /api/admin/reports-data` (query param `teacherId` for admin filter). | [app/api/teacher/face-approvals/route.ts:L8](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L8), [app/api/admin/reports-data/route.ts:L94](file:///e:/Admin-Teacher/app/api/admin/reports-data/route.ts#L94) |
| **7. Can a teacher impersonate another teacher by changing `teacher_id`?** | In `face-approvals`, **YES**. In standard attendance APIs, **NO for teacher identity**, but **YES for class/subject data tampering** due to missing assignment checks in `save-missed-attendance` and RLS `period_attendance`. | [app/api/teacher/face-approvals/route.ts:L8-L20](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L8-L20) |
| **8. Is there any API that does NOT verify authenticated teacher?** | `GET /api/teacher/face-approvals` has zero authentication calls (`auth.getUser()` is completely missing). | [app/api/teacher/face-approvals/route.ts:L4-L14](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L4-L14) |
| **9. Are service-role Supabase clients used?** | Yes, `createAdminClient()` initializes `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`. | [lib/supabase/admin.ts:L8-L19](file:///e:/Admin-Teacher/lib/supabase/admin.ts#L8-L19) |
| **10. Where are service-role clients used?** | In `save-missed-attendance`, `bulk-save-missed-attendance`, `send-absence-digest`, `absence-notifications/send`, `absence-notifications/preview`, `face-approvals`, `reject-face`, `reset-student-password`, and admin management routes. | Grep search across `app/api/teacher` |
| **11. Does any teacher-facing API bypass RLS using service role?** | **YES**: `save-missed-attendance`, `bulk-save-missed-attendance`, `send-absence-digest`, `absence-notifications/send`, `face-approvals`, `reject-face`, `reset-student-password`. | Listed route files |

---

## PHASE 3 — TEACHER ASSIGNMENT MODEL

### Authoritative Entity Relationship

```
┌─────────────────┐       1:N       ┌──────────────────────┐       N:1       ┌─────────────────┐
│ public.teachers │ ─────────────── │ teacher_assignments  │ ─────────────── │ public.subjects │
└─────────────────┘                 └──────────────────────┘                 └─────────────────┘
        │                                      │                                      │
        │                                      │ N:1                                  │
        │                                      ▼                                      │
        │                           ┌──────────────────────┐                          │
        │                           │    public.classes    │ ◄────────────────────────┘ (via dept)
        │                           └──────────────────────┘
        │                                      │
        │                                      │ 1:N
        │                                      ▼
        │                           ┌──────────────────────┐
        │                           │   public.students    │
        │                           └──────────────────────┘
        │                                      ▲
        │                                      │
        ▼ 1:N                                  │ 1:N
┌─────────────────┐       1:N       ┌──────────────────────┐
│   timetables    │ ─────────────── │  period_attendance   │
└─────────────────┘                 └──────────────────────┘
        ▲                                      ▲
        │                                      │
        │ 1:N                                  │ N:1
┌──────────────────────────────────────────────────────────┐
│                public.attendance_sessions                │
└──────────────────────────────────────────────────────────┘
```

### Table & Column Structure

1. **`public.teacher_assignments`**:
   - `id`: `uuid` (PK)
   - `teacher_id`: `uuid` (FK $\rightarrow$ `teachers.id`)
   - `subject_id`: `uuid` (FK $\rightarrow$ `subjects.id`)
   - `class_id`: `uuid` (FK $\rightarrow$ `classes.id`)
   - `year`: `text`
   - `assigned_at`: `timestamptz`
   - **Unique Constraint:** `teacher_assignments_teacher_subject_class_year_key` on `(teacher_id, subject_id, class_id, year)`
   - **RLS Policy:** `teacher_read_own_assignments` (`SELECT (teacher_id = auth.uid())`)

2. **`public.timetables`**:
   - `id`: `uuid` (PK)
   - `class_id`: `uuid` (FK $\rightarrow$ `classes.id`)
   - `subject_id`: `uuid` (FK $\rightarrow$ `subjects.id`)
   - `teacher_id`: `uuid` (FK $\rightarrow$ `teachers.id`, nullable)
   - `period_id`: `uuid` (FK $\rightarrow$ `periods.id`)
   - `day_of_week`: `integer` (1=Mon ... 6=Sat)
   - `teacher_assignment_id`: `uuid` (FK $\rightarrow$ `teacher_assignments.id`)
   - `created_at`: `timestamptz`
   - **Unique Constraint:** `timetables_class_period_day_key` on `(class_id, period_id, day_of_week)`
   - **RLS Policy:** `teacher_read_own_timetable` (`SELECT (auth.uid() = teacher_id)`)

3. **`public.classes`**:
   - `id`: `uuid` (PK), `name`: `text`, `section`: `text`, `year`: `text`, `department_id`: `uuid` (FK $\rightarrow$ `departments.id`).
   - **Unique Constraint:** `classes_dept_name_section_year_key` on `(department_id, name, section, year)`.

### How the Application Determines Legitimate Teaching Authority
Authoritative relationship:
$$\text{Teacher } X \text{ is authorized to teach Subject } Y \text{ for Class } Z \iff \exists \, \text{row in } \texttt{teacher\_assignments} \text{ where } \texttt{teacher\_id} = X \land \texttt{subject\_id} = Y \land \texttt{class\_id} = Z$$

- **In QR Setup UI:** [app/teacher/qr-attendance/page.tsx:L79-L87](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L79-L87) filters subjects strictly by the selected class using a local map derived from `teacher_assignments`.
- **In `student-list` API:** [app/api/teacher/student-list/route.ts:L60-L72](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts#L60-L72) resolves `authorizedClassIds` from `teacher_assignments`.
- **In Database RLS (`attendance_sessions`):** **NOT ENFORCED**. RLS only checks `teacher_id = auth.uid()`, ignoring `subject_id` and `class_id`.

---

## PHASE 4 — ATTENDANCE SESSION OWNERSHIP

### Session Lifecycle & Structure

```
[active] ──(handleFinalize)──> [reviewing] ──(onDone)──> [finalized]
```

- **`public.attendance_sessions` Columns:**
  - `id`: `uuid` (PK)
  - `teacher_id`: `uuid` (FK $\rightarrow$ `teachers.id`)
  - `subject_id`: `uuid` (FK $\rightarrow$ `subjects.id`)
  - `class_id`: `uuid` (FK $\rightarrow$ `classes.id`)
  - `period_id`: `uuid` (FK $\rightarrow$ `periods.id`)
  - `session_date`: `date`
  - `opened_at`: `timestamptz`
  - `finalized_at`: `timestamptz`
  - `status`: `text` (`'active'`, `'reviewing'`, `'finalized'`)
  - `current_qr_token`: `text`
  - `qr_token_expires_at`: `timestamptz`

### Session Authorization Evaluation Matrix

| API / Operation | Auth Caller? | Verify Teacher Role? | Verify Assignment? | Verify Session Ownership? | Trusts Client `session_id`? | Tampering Result |
|---|---|---|---|---|---|---|
| **Direct INSERT (`handleStart`)** | Yes (`auth.uid()`) | Yes (RLS) | **NO** | N/A (creates new) | Creates new ID | Can create session for unauthorized class/subject |
| **Direct UPDATE (`handleRotate`)** | Yes (`auth.uid()`) | Yes (RLS) | **NO** | Yes (`teacher_id = auth.uid()`) | Yes | Cannot rotate other teacher's session (RLS blocks) |
| **Direct UPDATE (`handleFinalize`)** | Yes (`auth.uid()`) | Yes (RLS) | **NO** | Yes (`teacher_id = auth.uid()`) | Yes | Cannot finalize other teacher's session (RLS blocks) |
| **Direct UPDATE (`onDone`)** | Yes (`auth.uid()`) | Yes (RLS) | **NO** | Yes (`teacher_id = auth.uid()`) | Yes | Cannot finalize other teacher's session (RLS blocks) |
| **`POST /api/teacher/save-missed-attendance`** | Yes (`getUser`) | No explicit check | **NO** | N/A (creates new) | Creates new ID | Can create session for unauthorized class/subject |
| **`POST /api/teacher/bulk-save-missed-attendance`** | Yes (`getUser`) | No explicit check | **NO** | N/A (creates new) | Creates new ID | Can bulk-create sessions for unauthorized classes |
| **`GET /api/teacher/student-list`** | Yes (`getUser`) | Yes (`role = 'teacher'`) | **YES** | **YES** | Validated against assignment | Returns empty `[]` if session/class is unauthorized |

---

## PHASE 5 — QR GENERATION & ROTATION

### Complete QR Mechanism

1. **Token Generation:**
   - Generated client-side via `crypto.randomUUID()` in `handleStart()` ([app/teacher/qr-attendance/page.tsx:L386](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L386)) and `handleRotate()` ([app/teacher/qr-attendance/page.tsx:L434](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L434)).
   - Expiry set to `Date.now() + 15000` (15-second window).
2. **Token Storage (`public.qr_tokens`):**
   - `id`: `uuid` (PK)
   - `session_id`: `uuid` (FK $\rightarrow$ `attendance_sessions.id`)
   - `token`: `text` (UNIQUE)
   - `created_at`: `timestamptz`
   - `expires_at`: `timestamptz`
   - `is_used`: `boolean`
3. **Session Linkage:**
   - `attendance_sessions.current_qr_token` and `attendance_sessions.qr_token_expires_at` are mirrored on rotation.
4. **Rotation Authorization:**
   - Client executes `UPDATE qr_tokens SET is_used = true WHERE session_id = ...` and `INSERT INTO qr_tokens ...`.
   - `qr_tokens` RLS policy `teacher_manage_qr_tokens`:
     `EXISTS (SELECT 1 FROM attendance_sessions WHERE attendance_sessions.id = qr_tokens.session_id AND attendance_sessions.teacher_id = auth.uid())`.
   - Teacher A **CANNOT** rotate Teacher B's QR token because RLS enforces `attendance_sessions.teacher_id = auth.uid()`.
5. **Student Scanning & Validation:**
   - Flutter client queries: `SELECT * FROM qr_tokens WHERE token = :scannedToken AND is_used = false AND expires_at > now()`.
   - Student inserts `period_attendance` (`student_id = auth.uid(), session_id = token.session_id, status = 'present'`).
   - RLS policy `student_read_qr_tokens` is `SELECT true`. Students can read QR tokens to validate scans.

---

## PHASE 6 — STUDENT ROSTER AUTHORIZATION

### Trace of Student Roster Loading

```
Browser: fetch('/api/teacher/student-list?class_id=C&session_id=S')
   │
   ▼
Server: app/api/teacher/student-list/route.ts
   │
   ├── 1. auth.getUser() -> user.id
   ├── 2. users.role === 'teacher' && teachers.is_active !== false
   ├── 3. SELECT class_id FROM teacher_assignments WHERE teacher_id = user.id -> authorizedClassIds
   ├── 4. if (requestedClassId && !authorizedClassIds.includes(requestedClassId)) return { students: [] }
   ├── 5. if (sessionId) verify session.teacher_id === user.id OR authorizedClassIds.includes(session.class_id)
   ├── 6. SELECT * FROM students WHERE class_id IN (targetClassIds)
   └── 7. if (sessionId) SELECT * FROM period_attendance WHERE session_id = sessionId
```

### Parameter Manipulation Analysis on Student List API

| Parameter Injected | Server Behavior | Result | Security State |
|---|---|---|---|
| `?class_id=unauthorized_class` | Checked against `authorizedClassIds` array | Returns `{ students: [] }` | **SECURE** |
| `?teacher_id=another_teacher` | Parameter is ignored; server uses `user.id` from auth session | Scoped to caller | **SECURE** |
| `?session_id=another_session` | Checked against `session.teacher_id === user.id` and `authorizedClassIds` | Returns `{ students: [] }` | **SECURE** |

### Direct Browser Supabase Queries Vulnerability
While `/api/teacher/student-list` is hardened, **direct client queries** in `qr-attendance/page.tsx` (`handleFinalize` and `onDone`) execute:
```ts
const { data: classStudents } = await supabase
  .from("students")
  .select("id")
  .eq("class_id", selectedClass)
```
- PostgreSQL RLS policy `teacher_read_own_students` on `students`:
  `EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = auth.uid() AND ta.class_id = students.class_id)`
- PostgreSQL enforces that a teacher can only read students belonging to their assigned classes via direct client queries.

---

## PHASE 7 — ATTENDANCE WRITE AUTHORIZATION

### Matrix of All Attendance Write Operations

| Operation | Invocation Location | Input Parameters | Authorization Mechanism | Database Table | RLS Policy | Security Vulnerability |
|---|---|---|---|---|---|---|
| **QR Scan Attendance** | Flutter App | `session_id`, `token` | Student JWT (`auth.uid()`) | `period_attendance` | `student_insert_period_attendance` (`student_id = auth.uid()`) | None for students |
| **Auto-mark Absent on Finalize** | Browser `page.tsx` | `session_id`, `missingStudents` | Direct Browser Supabase Client | `period_attendance` | `teacher_manage_period_attendance` (`is_teacher()`) | **PERMISSIVE RLS OVERREACH** |
| **Manual Override (Present/Absent)** | `qr-summary-state.tsx` | `sessionId`, `studentId`, `newStatus` | Direct Browser Supabase Client | `period_attendance` | `teacher_manage_period_attendance` (`is_teacher()`) | **PERMISSIVE RLS OVERREACH** |
| **Save Missed Attendance** | `/api/teacher/save-missed-attendance` | `class_id`, `subject_id`, `period_id`, `session_date`, `attendance` | Server Route (`createAdminClient()`) | `attendance_sessions`, `period_attendance`, `system_logs` | Bypassed (Service Role) | **NO ASSIGNMENT CHECK** |
| **Bulk Save Missed Attendance** | `/api/teacher/bulk-save-missed-attendance` | `slots`, `mode`, `absenteeIds` | Server Route (`createAdminClient()`) | `attendance_sessions`, `period_attendance`, `system_logs` | Bypassed (Service Role) | **NO ASSIGNMENT CHECK** |
| **Face Rejection & Embedding Wipe** | `/api/teacher/reject-face` | `studentId` | Server Route (`createAdminClient()`) | `students`, `storage.objects`, `system_logs` | Bypassed (Service Role) | **NO CLASS COHORT CHECK** |
| **Face Approval** | `face-approval/page.tsx` | `studentId` | Direct Browser Supabase Client | `students`, `system_logs` | `teacher_update_students` (`is_teacher()`) | **PERMISSIVE RLS OVERREACH** |

---

## PHASE 8 — MISSED ATTENDANCE

### Forensic Analysis of Missed Attendance Calculation

1. **Authoritative Source of Scheduled Periods:**
   - Derived from `public.timetables` filtered by `teacher_id = user.id`.
   - Joined with `subjects(id, name, code)`, `classes(id, name, section, year)`, and `periods(id, period_number, start_time, end_time)`.
2. **Authoritative Source of Conducted Sessions:**
   - Derived from `public.attendance_sessions` filtered by `teacher_id = user.id`, `session_date >= startDateStr`, `session_date <= todayStr`.
3. **Missed Determination Algorithm:**
   - Evaluated server-side in [app/api/teacher/missed-attendance/route.ts:L44-L107](file:///e:/Admin-Teacher/app/api/teacher/missed-attendance/route.ts#L44-L107).
   - Loops from `startDate` (default 30 days back) to `today`.
   - For each date, finds timetable slots matching `day_of_week`.
   - **Slot Creation Cutoff:** Ignores dates prior to `timetable.created_at` to prevent phantom historical missed sessions.
   - **Composite Key Match:** `existingKeys.has('${dateStr}__${slot.subject_id}__${slot.class_id}__${slot.period_id}')`.
   - If slot key is not found in `existingSessions` and period end time has passed for today, the slot is appended to the `missed` list.
4. **Scoping & Tampering:**
   - Identity is strictly `user.id` from `supabase.auth.getUser()`.
   - Query parameters `?days=30` only control the date window.
   - Teacher cannot view another teacher's missed attendance because `timetables.teacher_id = user.id` and `attendance_sessions.teacher_id = user.id` are hardcoded to the authenticated session.
5. **Handling of Multiple Subjects / Sections:**
   - Composite deduplication key incorporates `subject_id`, `class_id`, and `period_id`, ensuring full isolation across multiple assigned sections and subjects.
6. **Discrepancies Between Timetable & Assignments:**
   - If admin removes a teacher assignment, trigger `delete_teacher_assignment_cascade` sets `timetables.teacher_id = NULL`, automatically removing the slot from the teacher's missed attendance calculation.

---

## PHASE 9 — TEACHER ATTENDANCE CATEGORIES

| Section | Route / Component | Primary API / Query | Authenticated Teacher Verified? | Assignment Verified? | Parameter Tampering Risk | Security State |
|---|---|---|---|---|---|---|
| **1. QR Attendance** | [app/teacher/qr-attendance/page.tsx](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx) | Direct Supabase & `/api/teacher/student-list` | Yes (`auth.uid()`) | UI & `student-list` yes; direct DB insert **NO** | Low on API; Medium on direct Supabase INSERT | Requires RLS hardening on `attendance_sessions` |
| **2. Missed Attendance** | [app/teacher/missed-attendance/page.tsx](file:///e:/Admin-Teacher/app/teacher/missed-attendance/page.tsx) | `GET /api/teacher/missed-attendance` | Yes (`auth.getUser()`) | Yes (from `timetables`) | None on GET | **SECURE READ** |
| **3. Save Missed Attendance** | [app/teacher/missed-attendance/page.tsx](file:///e:/Admin-Teacher/app/teacher/missed-attendance/page.tsx) | `POST /api/teacher/save-missed-attendance` | Yes (`auth.getUser()`) | **NO (Service Role bypass)** | **HIGH**: Can submit arbitrary `class_id`/`subject_id` | **NEEDS HARDENING** |
| **4. Bulk Save Missed Attendance** | [app/teacher/missed-attendance/page.tsx](file:///e:/Admin-Teacher/app/teacher/missed-attendance/page.tsx) | `POST /api/teacher/bulk-save-missed-attendance` | Yes (`auth.getUser()`) | **NO (Service Role bypass)** | **HIGH**: Can submit arbitrary `classId`/`subjectId` | **NEEDS HARDENING** |
| **5. Attendance History** | [app/teacher/attendance-history/page.tsx](file:///e:/Admin-Teacher/app/teacher/attendance-history/page.tsx) | `GET /api/teacher/attendance-history` & Direct Supabase | Yes (`auth.getUser()`) | Scoped to `teacher_id` sessions | Low on GET; Session detail uses Direct Supabase | **SECURE READ** |
| **6. Teacher Analytics** | [app/teacher/analytics/page.tsx](file:///e:/Admin-Teacher/app/teacher/analytics/page.tsx) | `GET /api/teacher/analytics` | Yes (`auth.getUser()`) | Yes (from `teacher_assignments`) | None | **SECURE READ** |
| **7. Dashboard Summaries** | [app/teacher/dashboard/page.tsx](file:///e:/Admin-Teacher/app/teacher/dashboard/page.tsx) | `GET /api/teacher/dashboard` | Yes (`auth.getUser()`) | Yes (from `teacher_assignments`) | None | **SECURE READ** |
| **8. My Classes & Timetable** | [components/teacher/my-classes.tsx](file:///e:/Admin-Teacher/components/teacher/my-classes.tsx), [my-timetable.tsx](file:///e:/Admin-Teacher/components/teacher/my-timetable.tsx) | Dashboard API & Direct Supabase `timetables` | Yes (`auth.uid()`) | Yes | None | **SECURE READ** |
| **9. College Attendance** | Not exposed in Teacher UI (Admin/Student only) | `public.college_attendance` | Evaluated in RLS | N/A | RLS allows any teacher to read | Read-only visibility in DB |

---

## PHASE 10 — ACTIONS & NOTIFICATIONS

### Absence Notifications Architecture

```
[Teacher Portal: absence-notifications/page.tsx]
   │
   ├── 1. Fetch Pending Absences:
   │     └── GET /api/teacher/absence-notifications/pending
   │           └── getEligibleAbsences(supabase, teacherId = user.id)
   │                 ├── SELECT FROM period_attendance WHERE status = 'absent'
   │                 │     JOIN attendance_sessions!inner WHERE teacher_id = user.id AND status = 'finalized'
   │                 ├── Dedup: latest session per (date + subject + class + period)
   │                 └── Computes overall attendance % per student for severity badge
   │
   ├── 2. Preview Notification Email:
   │     └── POST /api/teacher/absence-notifications/preview
   │           └── Body: { studentId, periodAttendanceIds }
   │                 ├── Derives canonical dataset for teacherId
   │                 ├── Validates that all IDs belong to canonical dataset
   │                 └── Generates HTML preview using buildConsolidatedAbsenceEmail()
   │
   ├── 3. Send Notification Batch:
   │     └── POST /api/teacher/absence-notifications/send
   │           └── Body: { periodAttendanceIds }
   │                 ├── Derives canonical dataset for teacherId
   │                 ├── Filters selected IDs strictly to canonical dataset
   │                 ├── INSERT INTO notification_batches (teacher_id, selected_count, student_count)
   │                 ├── Sends consolidated email via Resend API
   │                 ├── INSERT INTO notification_batch_recipients (batch_id, student_id, period_attendance_id, status)
   │                 ├── UPDATE period_attendance SET notified_at = now(), notification_batch_id = batch.id
   │                 └── INSERT INTO system_logs
   │
   └── 4. View Batch History:
         ├── GET /api/teacher/absence-notifications/history
         └── GET /api/teacher/absence-notifications/history/[batchId]
               └── RLS / API scopes strictly to notification_batches.teacher_id = user.id
```

### Authorization & Cross-Teacher Security
- **Teacher Isolation:** In [lib/absence-notifications/eligible-dataset.ts:L48](file:///e:/Admin-Teacher/lib/absence-notifications/eligible-dataset.ts#L48), `session.teacher_id = teacherId` is strictly enforced.
- **Forged Attendance IDs:** If Teacher A passes attendance record IDs belonging to Teacher B in `POST /api/teacher/absence-notifications/send`, the server executes `getEligibleAbsences(admin, user.id)` and intersects client IDs against the server-derived canonical list. Forged IDs are silently dropped.
- **Legacy Route `POST /api/teacher/send-absence-digest`:** Does NOT check class assignment; trusts `student_id` and uses `createAdminClient()`. **Requires hardening or retirement in favor of the canonical absence-notifications workflow**.

---

## PHASE 11 — ATTENDANCE HISTORY

### Forensic Inspection

1. **API Route:** `GET /api/teacher/attendance-history` in [app/api/teacher/attendance-history/route.ts](file:///e:/Admin-Teacher/app/api/teacher/attendance-history/route.ts).
2. **Session Query:**
   `SELECT id, session_date, finalized_at, subject_id, class_id, period_id FROM attendance_sessions WHERE teacher_id = user.id AND status = 'finalized' ORDER BY session_date DESC, finalized_at DESC`
3. **Attendance Summary:** Fetches attendance counts in two bulk queries filtered by `session_id IN (sessionIds)` and `status IN ('present', 'absent')`.
4. **Session Detail Breakdown (Sheet):**
   When clicking a session in [app/teacher/attendance-history/page.tsx:L341-L365](file:///e:/Admin-Teacher/app/teacher/attendance-history/page.tsx#L341-L365), executes direct client query:
   `supabase.from("period_attendance").select("status, student_id, students(roll_number, users(full_name))").eq("session_id", selectedSession.id)`
5. **Authorization Verification:**
   - Primary history list is strictly scoped to `teacher_id = user.id`.
   - The session detail sheet queries `period_attendance` by `session_id`. Because `selectedSession` is selected from the teacher's own history, standard UI flows are safe. However, direct query tampering is possible due to overly broad RLS on `period_attendance`.

---

## PHASE 12 — TEACHER ANALYTICS

### Forensic Inspection

1. **API Route:** `GET /api/teacher/analytics?period=...` in [app/api/teacher/analytics/route.ts](file:///e:/Admin-Teacher/app/api/teacher/analytics/route.ts).
2. **Dataset Scoping:**
   - Assignments: `teacher_assignments WHERE teacher_id = user.id`.
   - Sessions: `attendance_sessions WHERE teacher_id = user.id AND status = 'finalized' AND session_date >= from AND session_date <= to`.
   - Student Counts: `students WHERE class_id IN (uniqueClassIds) AND is_active = true`.
   - Attendance Marks: `period_attendance WHERE session_id IN (sessionIds)`.
3. **Output Metrics:**
   - Per-Subject Attendance Cards with attendance %, trend analysis, student totals.
   - 8-session chronological trend chart.
   - Campus KPI summary for teacher's cohorts.
   - Defaulter students list (<75%) and Top students list (>=90%).
4. **Separation from Admin Analytics:**
   - Teacher Analytics executes TypeScript aggregation over teacher-scoped queries.
   - Admin Analytics executes the PostgreSQL RPC `get_admin_reports_analytics` which requires `role = 'admin'`.
   - **Zero collision:** Hardening teacher authorization will not affect Admin Analytics.

---

## PHASE 13 — ADMIN COMPATIBILITY

### Shared Tables & Visibility Model

| Table / RPC | Teacher Access | Admin Access | Risk of Policy Change to Admin |
|---|---|---|---|
| **`attendance_sessions`** | Own sessions only (`teacher_id = auth.uid()`) | All sessions campus-wide (`role = 'admin'`) | Admin policy `admin_read_attendance_sessions` must remain unchanged |
| **`period_attendance`** | Assigned sessions only | All records campus-wide | Admin policy `admin_read_period_attendance` must remain unchanged |
| **`teacher_assignments`** | Own assignments only | All assignments (`is_admin()`) | Admin policy `admin_manage_assignments` must remain unchanged |
| **`students`** | Assigned class students only | All students campus-wide (`is_admin()`) | Admin policies (`admin_read_all_students`, `admin_insert_students`, etc.) must remain unchanged |
| **`get_admin_reports_analytics`** | Blocked (`role != 'admin'`) | Full execution (`SECURITY DEFINER`) | Must remain untouched |
| **`system_logs`** | Insert own actions | Read all logs (`is_admin()`) | Admin policies must remain untouched |

---

## PHASE 14 — STUDENT PORTAL COMPATIBILITY

### Student Interaction Model

1. **Student Authentication:** Authenticated student JWT with `auth.uid() = students.id`.
2. **Active Session Discovery:** Policy `student_read_active_sessions` (`SELECT WHERE status = 'active'`) and `Students can read their class sessions` (`SELECT WHERE class_id = get_my_class_id()`).
3. **QR Token Verification:** Policy `student_read_qr_tokens` (`SELECT WHERE true`).
4. **Marking Attendance:** Policy `student_insert_period_attendance` (`INSERT WITH CHECK (student_id = auth.uid())`).
5. **Reading Own Records:** Policy `student_read_own_period_attendance` (`SELECT WHERE student_id = auth.uid()`).
6. **College Attendance:** Policy `student_insert_college_attendance` / `student_read_own_college_attendance`.

**Preservation Rule:** Tightening teacher write policies on `attendance_sessions` and `period_attendance` must explicitly retain student self-insertion and self-reading policies.

---

## PHASE 15 — RLS FORENSIC AUDIT

### Complete PostgreSQL RLS Policy Matrix

```sql
-- Queried directly from pg_policies on live Supabase Database (knkoihgyfjoaxznelrjr)
```

| Table | Policy Name | Command | Roles | USING (qual) | WITH CHECK | Security Assessment / Risk | Consumers |
|---|---|---|---|---|---|---|---|
| **`attendance_sessions`** | `teacher_manage_own_sessions` | ALL | public | `(teacher_id = auth.uid())` | null | **OVERLY BROAD**: Checks `teacher_id`, but does NOT verify `(subject_id, class_id)` in `teacher_assignments`. | Teacher Portal |
| **`attendance_sessions`** | `admin_read_attendance_sessions` | SELECT | public | `(auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))` | null | Secure for admin read. | Admin Portal |
| **`attendance_sessions`** | `student_read_active_sessions` | SELECT | public | `(status = 'active')` | null | Permits students to see active sessions. | Student Portal |
| **`attendance_sessions`** | `Students can read their class sessions` | SELECT | authenticated | `(class_id IN (SELECT class_id FROM students WHERE id = auth.uid()))` | null | Scoped to student class. | Student Portal |
| **`period_attendance`** | `teacher_manage_period_attendance` | ALL | public | `(EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'))` | null | **CRITICAL SECURITY FLAW**: Grants ALL teachers unrestricted SELECT/INSERT/UPDATE/DELETE on ALL rows campus-wide. | Teacher Portal |
| **`period_attendance`** | `teacher_read_period_attendance` | SELECT | public | `(EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.id = period_attendance.session_id AND s.teacher_id = auth.uid()))` | null | Properly scoped, but overridden by the permissive `teacher_manage_period_attendance` policy. | Teacher Portal |
| **`period_attendance`** | `admin_read_period_attendance` | SELECT | public | `(auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))` | null | Secure for admin read. | Admin Portal |
| **`period_attendance`** | `student_insert_period_attendance` | INSERT | public | null | `(student_id = auth.uid())` | Secure for student self-marking. | Student Portal |
| **`period_attendance`** | `student_read_own_period_attendance` | SELECT | public | `(student_id = auth.uid())` | null | Secure for student read. | Student Portal |
| **`period_attendance`** | `student_update_own_period_attendance` | UPDATE | public | `(student_id = auth.uid())` | `(student_id = auth.uid())` | Secure for student update. | Student Portal |
| **`qr_tokens`** | `student_read_qr_tokens` | SELECT | public | `true` | null | Public read on all tokens. | Student Portal |
| **`qr_tokens`** | `teacher_manage_qr_tokens` | ALL | public | `(EXISTS (SELECT 1 FROM attendance_sessions WHERE attendance_sessions.id = qr_tokens.session_id AND attendance_sessions.teacher_id = auth.uid()))` | null | Properly scoped to session teacher. | Teacher Portal |
| **`students`** | `teacher_read_own_students` | SELECT | public | `(EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = auth.uid() AND ta.class_id = students.class_id))` | null | Properly scoped to teacher assignments. | Teacher Portal |
| **`students`** | `teacher_update_students` | UPDATE | public | `is_teacher()` | `is_teacher()` | **OVERLY BROAD**: Any teacher can update any student campus-wide. | Teacher Portal |
| **`teacher_assignments`** | `teacher_read_own_assignments` | SELECT | public | `(teacher_id = auth.uid())` | null | Properly scoped. | Teacher Portal |
| **`teacher_assignments`** | `admin_manage_assignments` | ALL | public | `is_admin()` | `is_admin()` | Secure for admin. | Admin Portal |
| **`timetables`** | `teacher_read_own_timetable` | SELECT | public | `(auth.uid() = teacher_id)` | null | Properly scoped. | Teacher Portal |
| **`users`** | `teacher_read_all_users` | SELECT | public | `is_teacher()` | null | Broad read on all users for teachers. | Teacher Portal |
| **`users`** | `teacher_insert_users` | INSERT | public | null | `is_teacher()` | Teacher student creation. | Teacher Portal |
| **`users`** | `teacher_delete_users` | DELETE | public | `is_teacher()` | null | **OVERLY BROAD**: Any teacher can delete users. | Teacher Portal |

---

## PHASE 16 — SERVICE ROLE / RLS BYPASS AUDIT

### Service Role Usage Analysis

| File & Endpoint | RLS Bypassed? | Justification for Service Role | Authorization Prior to Query | Vulnerability Analysis |
|---|---|---|---|---|
| [app/api/teacher/save-missed-attendance/route.ts](file:///e:/Admin-Teacher/app/api/teacher/save-missed-attendance/route.ts) | **YES** | Allows creating finalized attendance session and bulk attendance marks without multi-step RLS friction. | `supabase.auth.getUser()`, derives `teacher_id = user.id`. | **VULNERABLE**: Does NOT verify that `(user.id, subject_id, class_id)` is an assigned pair. |
| [app/api/teacher/bulk-save-missed-attendance/route.ts](file:///e:/Admin-Teacher/app/api/teacher/bulk-save-missed-attendance/route.ts) | **YES** | Creates sessions across multiple historical slots in a single atomic transaction. | `supabase.auth.getUser()`, derives `teacher_id = user.id`. | **VULNERABLE**: Does NOT verify assignment for each slot in `slots[]`. |
| [app/api/teacher/absence-notifications/send/route.ts](file:///e:/Admin-Teacher/app/api/teacher/absence-notifications/send/route.ts) | **YES** | Inserts notification batches and updates `period_attendance.notified_at`. | Re-derives canonical dataset via `getEligibleAbsences(admin, user.id)`. | **SECURE**: Authoritative server validation prevents tampering. |
| [app/api/teacher/face-approvals/route.ts](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts) | **YES** | Fetches unapproved students and face photo URLs. | **NONE** (missing `auth.getUser()`). | **CRITICAL**: Completely unauthenticated; trusts `?teacher_id=`. |
| [app/api/teacher/reject-face/route.ts](file:///e:/Admin-Teacher/app/api/teacher/reject-face/route.ts) | **YES** | Deletes Supabase Storage files and resets face embedding vectors. | `supabase.auth.getUser()`. | **VULNERABLE**: Does not verify student belongs to caller's class. |
| [app/api/teacher/reset-student-password/route.ts](file:///e:/Admin-Teacher/app/api/teacher/reset-student-password/route.ts) | **YES** | Calls `supabase.auth.admin.updateUserById()` to reset password. | `supabase.auth.getUser()`. | **VULNERABLE**: Does not verify student belongs to caller's class. |
| [app/api/teacher/send-absence-digest/route.ts](file:///e:/Admin-Teacher/app/api/teacher/send-absence-digest/route.ts) | **YES** | Queries full attendance history and sends email via Resend. | `supabase.auth.getUser()`, verifies `role = 'teacher'`. | **VULNERABLE**: Does not verify student belongs to caller's class. |

---

## PHASE 17 — PARAMETER TAMPERING MATRIX

| Attack Vector / Manipulation | Target | Expected Behavior | Current Behavior | Risk Level | Evidence |
|---|---|---|---|---|---|
| `teacher_id -> another_teacher` in `student-list` | `GET /api/teacher/student-list` | DENY / Ignore | Ignored; server derives caller `user.id` | **NONE (SECURE)** | [student-list/route.ts:L12](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts#L12) |
| `class_id -> unauthorized_class` in `student-list` | `GET /api/teacher/student-list` | DENY | Returns `{ students: [] }` | **NONE (SECURE)** | [student-list/route.ts:L87-L89](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts#L87-L89) |
| `session_id -> unauthorized_session` in `student-list` | `GET /api/teacher/student-list` | DENY | Returns `{ students: [] }` | **NONE (SECURE)** | [student-list/route.ts:L101-L108](file:///e:/Admin-Teacher/app/api/teacher/student-list/route.ts#L101-L108) |
| `teacher_id -> another_teacher` in `face-approvals` | `GET /api/teacher/face-approvals?teacher_id=UUID` | DENY | **EXPOSES DATA**: Returns other teacher's student face photos and details | **CRITICAL** | [face-approvals/route.ts:L8-L20](file:///e:/Admin-Teacher/app/api/teacher/face-approvals/route.ts#L8-L20) |
| `class_id -> unauthorized_class` in `save-missed-attendance` | `POST /api/teacher/save-missed-attendance` | DENY | **CREATES RECORD**: Creates finalized session and inserts attendance for unauthorized class | **HIGH** | [save-missed-attendance/route.ts:L25-L65](file:///e:/Admin-Teacher/app/api/teacher/save-missed-attendance/route.ts#L25-L65) |
| `subject_id -> unauthorized_subject` in `save-missed-attendance` | `POST /api/teacher/save-missed-attendance` | DENY | **CREATES RECORD**: Creates finalized session with unassigned subject | **HIGH** | [save-missed-attendance/route.ts:L59-L72](file:///e:/Admin-Teacher/app/api/teacher/save-missed-attendance/route.ts#L59-L72) |
| `slots[] -> unauthorized_slots` in `bulk-save-missed-attendance` | `POST /api/teacher/bulk-save-missed-attendance` | DENY | **CREATES RECORDS**: Bulk-creates finalized attendance across arbitrary classes | **HIGH** | [bulk-save-missed-attendance/route.ts:L50-L105](file:///e:/Admin-Teacher/app/api/teacher/bulk-save-missed-attendance/route.ts#L50-L105) |
| Direct Supabase `INSERT attendance_sessions` (unauthorized class/subject) | Direct PostgreSQL Query | DENY | **ALLOWED BY RLS**: `teacher_manage_own_sessions` passes because `teacher_id = auth.uid()` | **HIGH** | `pg_policies` on `attendance_sessions` |
| Direct Supabase `UPDATE/DELETE period_attendance` (other teacher's session) | Direct PostgreSQL Query | DENY | **ALLOWED BY RLS**: `teacher_manage_period_attendance` passes for any teacher | **CRITICAL** | `pg_policies` on `period_attendance` |
| Direct Supabase `UPDATE students` | Direct PostgreSQL Query | DENY | **ALLOWED BY RLS**: `teacher_update_students` passes for any teacher | **HIGH** | `pg_policies` on `students` |
| `student_id -> unauthorized_student` in `send-absence-digest` | `POST /api/teacher/send-absence-digest` | DENY | **SENDS EMAIL**: Sends attendance digest for any student campus-wide | **HIGH** | [send-absence-digest/route.ts:L42-L135](file:///e:/Admin-Teacher/app/api/teacher/send-absence-digest/route.ts#L42-L135) |
| `student_id -> unauthorized_student` in `reset-student-password` | `POST /api/teacher/reset-student-password` | DENY | **RESETS PASSWORD**: Resets password of any student in DB | **HIGH** | [reset-student-password/route.ts:L19-L26](file:///e:/Admin-Teacher/app/api/teacher/reset-student-password/route.ts#L19-L26) |

---

## PHASE 18 — PERFORMANCE AUDIT

### Observed Bottlenecks & Optimization Targets

1. **Sequential / Duplicate Direct DB Calls in `fetchSetupData`:**
   - [app/teacher/qr-attendance/page.tsx:L73-L113](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L73-L113) executes 4 parallel queries (`teacher_assignments`, `periods`, `attendance_sessions`, `timetables`), followed by a secondary bulk fetch of present/total counts on 30 recent sessions ([L190-L200](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L190-L200)).
   - **Improvement Opportunity:** Setup data can be consolidated into a single cached server route or RPC, reducing 5 client network round trips to 1.
2. **Realtime Re-query Amplification:**
   - In [app/teacher/qr-attendance/page.tsx:L351](file:///e:/Admin-Teacher/app/teacher/qr-attendance/page.tsx#L351), every student scan event triggers a full HTTP request `fetchStudentList()`.
   - Combined with a 5000ms polling fallback, if 60 students scan within 30 seconds, 60+ full roster fetch requests are dispatched.
   - **Observation:** Debouncing `fetchStudentList()` (e.g. 300-500ms trailing throttle) will eliminate redundant API requests during high-concurrency scan bursts.
3. **Database Indexes on Authorization Fields:**
   - `teacher_assignments(teacher_id, class_id, subject_id)` has a composite unique constraint.
   - `attendance_sessions(teacher_id, status, session_date)` has foreign keys.
   - Index verification: `period_attendance(session_id, student_id)` has unique constraint `period_attendance_session_id_student_id_key`.

---

## PHASE 19 — REALTIME AUDIT

1. **Subscribed Channels:**
   - Teacher Portal: `attendance_${activeSessionId}` on table `public.period_attendance`.
   - Admin Reports: `admin-reports-realtime-${tabId}` on `attendance_sessions`, `period_attendance`, and `college_attendance`.
2. **Filter Granularity:**
   - In `app/teacher/qr-attendance/page.tsx:L347`, subscription filter is client-side: `{ event: "*", schema: "public", table: "period_attendance" }`.
   - The client checks `if (record?.session_id === activeSessionId)`.
3. **Cross-Tenant Event Leakage Risk:**
   - Because `period_attendance` RLS allows all teachers to read all records, Postgres CDC sends all period attendance changes to the connected WebSocket.
   - While the payload only contains row metadata (`id, session_id, student_id, status`), proper server-side publication filtering (`filter: "session_id=eq.${activeSessionId}"`) will improve network efficiency and security.

---

## PHASE 20 — REGRESSION DEPENDENCY MAP

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   REGRESSION DEPENDENCY MAP                                      │
├──────────────────────────────────────┬────────────────────────────────────┬───────────────────────┤
│ SAFE TO HARDEN / MODIFY LATER        │ HIGH RISK / MUST BE EXACT          │ FREEZE / UNCHANGED    │
├──────────────────────────────────────┼────────────────────────────────────┼───────────────────────┤
│ 1. POST save-missed-attendance       │ 1. QR Timer rotation (15s hook)    │ 1. Admin Reports RPC  │
│    (Add assignment validation)       │ 2. Session countdown (180s opened) │    (get_admin_reports)│
│ 2. POST bulk-save-missed-attendance  │ 3. Flutter mobile scan query       │ 2. Admin dashboard API│
│    (Add per-slot assignment check)   │ 4. Period attendance unique index  │ 3. Student portal auth│
│ 3. GET /api/teacher/face-approvals   │ 5. Realtime session invalidation   │ 4. Session isolation  │
│    (Add auth.getUser() & validation) │ 6. Missed attendance timetable key │    (session-manager)  │
│ 4. POST /api/teacher/reject-face     │ 7. Absence notification dedup rule │ 5. Multi-tab cookie   │
│    (Add class cohort validation)     │ 8. Teacher analytics date ranges   │    interceptor        │
│ 5. POST reset-student-password       │                                    │ 6. Defaulter calc     │
│    (Add class cohort validation)     │                                    │    (<75% threshold)   │
│ 6. Replace broad RLS policies        │                                    │ 7. Relink timetable   │
│    (period_attendance & sessions)    │                                    │    DB trigger         │
└──────────────────────────────────────┴────────────────────────────────────┴───────────────────────┘
```

---

## PHASE 21 — FINAL FINDINGS

### A. CURRENTLY SECURE

1. **`GET /api/teacher/student-list`**:
   - Authenticates caller using `supabase.auth.getUser()`.
   - Enforces teacher role and `is_active` status.
   - Server-derives authorized classes strictly from `teacher_assignments`.
   - Intersects `class_id` and `session_id` query parameters against authorized classes and session ownership; returns empty array on mismatch.
2. **`GET /api/teacher/missed-attendance`**:
   - Identity derived strictly from `user.id`.
   - Scheduled slots derived strictly from `timetables` where `teacher_id = user.id`.
   - Bound by slot creation timestamp to prevent phantom historical sessions.
3. **`GET /api/teacher/absence-notifications/pending` & `history`**:
   - Strictly scopes pending absences to `attendance_sessions.teacher_id = user.id`.
   - Enforces finalized-only session filter and latest-session deduplication rule.
4. **`POST /api/teacher/absence-notifications/send` & `preview`**:
   - Re-derives canonical eligible dataset server-side.
   - Rejects any client-submitted attendance IDs not belonging to the teacher's legitimate sessions.
5. **`GET /api/teacher/analytics`**:
   - Aggregates metrics strictly across the teacher's assigned subjects and classes in `teacher_assignments`.
6. **Multi-Tab Session Isolation (`lib/supabase/client.ts`, `lib/auth/session-manager.ts`)**:
   - Unique tab IDs backed by `sessionStorage`.
   - Automatic Bearer token header injection interceptor prevents cookie jar collision between Admin and Teacher tabs.

---

### B. CONFIRMED SECURITY GAPS

1. **Critical Database RLS Overreach on `period_attendance`**:
   - Policy `teacher_manage_period_attendance` grants `ALL` (SELECT, INSERT, UPDATE, DELETE) to any user where `users.role = 'teacher'`.
   - **Impact:** Any teacher can query, insert, overwrite, or delete period attendance records for any student, class, or teacher across the entire campus via direct Supabase client requests.
2. **Missing Assignment Validation on `attendance_sessions` RLS**:
   - Policy `teacher_manage_own_sessions` grants `ALL` based only on `(teacher_id = auth.uid())`.
   - **Impact:** A teacher can insert an active attendance session for any `class_id` and `subject_id` (even outside their department), becoming the session owner in the database.
3. **Missing Assignment Validation in `save-missed-attendance` & `bulk-save-missed-attendance`**:
   - Endpoints use `createAdminClient()` (Service Role) and trust client-submitted `class_id` / `subject_id` without verifying that `(user.id, subject_id, class_id)` exists in `teacher_assignments` or `timetables`.
4. **Completely Unauthenticated Endpoint in `GET /api/teacher/face-approvals`**:
   - Does not call `auth.getUser()`; reads `teacherId` directly from `searchParams` and queries the database using `createAdminClient()`.
5. **Missing Student Cohort Authorization on Teacher Management APIs**:
   - `POST /api/teacher/reject-face`, `POST /api/teacher/reset-student-password`, and `POST /api/teacher/send-absence-digest` use `createAdminClient()` without validating that `student_id` is enrolled in one of the teacher's assigned classes.
6. **Overly Broad RLS Policies on `students` and `users`**:
   - `teacher_update_students` allows any teacher to update any student in the database.
   - `teacher_delete_users` allows any teacher to delete users.
7. **Public Read Access on `qr_tokens`**:
   - `student_read_qr_tokens` allows `SELECT true`, exposing all tokens across all sessions to anyone with an authenticated or public connection.

---

### C. POTENTIAL SECURITY GAPS REQUIRING FURTHER VALIDATION

1. **Storage Bucket RLS for `face-registrations`**:
   - `reject-face` deletes storage objects via `supabaseAdmin.storage.from("face-registrations").remove(...)`. Direct client storage policies on the Supabase storage bucket were not inspected for direct teacher/student deletion access.
2. **Realtime Channel Filtering**:
   - In `qr-attendance/page.tsx`, the channel subscription is unfiltered at the Postgres CDC level. Validating whether Postgres CDC broadcasts full row payloads to unauthorized websocket clients should be verified against production Supabase Realtime configs.

---

### D. API ROUTES REQUIRING HARDENING

1. **`app/api/teacher/save-missed-attendance/route.ts` (`POST`)**:
   - **Current Behavior:** Inserts session and attendance marks using `createAdminClient()` without verifying teacher assignment.
   - **Required Authorization:** Query `teacher_assignments` (or `timetables`) to confirm `teacher_id = user.id AND class_id = body.class_id AND subject_id = body.subject_id`. Reject with `403 Forbidden` if not assigned.
2. **`app/api/teacher/bulk-save-missed-attendance/route.ts` (`POST`)**:
   - **Current Behavior:** Iterates through `slots[]` and inserts sessions without verifying that the teacher is assigned to each slot.
   - **Required Authorization:** Pre-fetch all teacher assignments for `user.id` and validate every slot in `slots[]` prior to database execution.
3. **`app/api/teacher/face-approvals/route.ts` (`GET`)**:
   - **Current Behavior:** Reads `?teacher_id=` with no auth check and returns student face records using `createAdminClient()`.
   - **Required Authorization:** Execute `supabase.auth.getUser()`, verify `role === 'teacher'`, ignore search param `teacher_id`, and derive data strictly for `user.id`.
4. **`app/api/teacher/reject-face/route.ts` (`POST`)**:
   - **Current Behavior:** Resets student face embeddings and deletes storage files using `createAdminClient()` without checking student cohort.
   - **Required Authorization:** Verify student belongs to a class assigned to `user.id` in `teacher_assignments`.
5. **`app/api/teacher/reset-student-password/route.ts` (`POST`)**:
   - **Current Behavior:** Resets student auth password using `createAdminClient()` without checking student cohort.
   - **Required Authorization:** Verify student belongs to a class assigned to `user.id` in `teacher_assignments`.
6. **`app/api/teacher/send-absence-digest/route.ts` (`POST`)**:
   - **Current Behavior:** Sends absence email for any `student_id`.
   - **Required Authorization:** Verify student belongs to a class assigned to `user.id` or deprecate in favor of `absence-notifications/send`.

---

### E. DATABASE/RLS POLICIES REQUIRING CONSIDERATION

1. **`period_attendance`**:
   - **Current Policy:** `teacher_manage_period_attendance` (`ALL`, `is_teacher()`).
   - **Problem:** Broad cross-teacher write access.
   - **Recommended Future Policy:** Restrict to `EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.id = period_attendance.session_id AND s.teacher_id = auth.uid())` for UPDATE/DELETE, and ensure WITH CHECK validates session ownership.
   - **Impact on Consumers:** Teacher can only modify attendance within their own sessions. Admin and Student policies remain unaffected.
2. **`attendance_sessions`**:
   - **Current Policy:** `teacher_manage_own_sessions` (`ALL`, `teacher_id = auth.uid()`).
   - **Problem:** Missing check for `teacher_assignments`.
   - **Recommended Future Policy:** Add `WITH CHECK (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = auth.uid() AND ta.class_id = attendance_sessions.class_id AND ta.subject_id = attendance_sessions.subject_id))`.
   - **Impact on Consumers:** Teachers can only create sessions for subjects/classes they are officially assigned to teach.
3. **`students`**:
   - **Current Policy:** `teacher_update_students` (`UPDATE`, `is_teacher()`).
   - **Problem:** Any teacher can modify any student.
   - **Recommended Future Policy:** Restrict update to students whose `class_id` is in `teacher_assignments` for `auth.uid()`.
4. **`qr_tokens`**:
   - **Current Policy:** `student_read_qr_tokens` (`SELECT`, `true`).
   - **Recommended Future Policy:** Scope to active sessions belonging to the student's enrolled class.

---

### F. DATABASE SCHEMA CHANGES

**No structural schema changes (new tables, column renames, or type changes) are required.**  
The existing schema already possesses all necessary foreign keys, unique constraints, and relation fields (`teacher_assignments`, `attendance_sessions`, `period_attendance`, `timetables`, `students`). Hardening can be achieved entirely through RLS policy refinement and server-side API authorization checks.

---

### G. PERFORMANCE RISKS

1. **High-frequency polling in Live Student List:** 5-second polling plus per-scan realtime invalidation can create duplicate requests during live lecture attendance bursts. Adding a 300ms trailing debounce on `fetchStudentList()` will mitigate this.
2. **Setup Data Query Count:** 5 sequential/parallel queries in `fetchSetupData` can be consolidated into a single cached API endpoint.

---

### H. REGRESSION RISKS

| System | Risk Factor | Mitigation / Protection Strategy |
|---|---|---|
| **Teacher QR Attendance** | If RLS on `attendance_sessions` is tightened, session creation will fail if assignments are out of sync. | Ensure UI dropdowns and RLS use identical `teacher_assignments` validation logic. |
| **Missed Attendance** | If timetable relinking trigger is altered, scheduled slots will be lost. | Freeze `relink_timetable_on_assignment_create` and `delete_teacher_assignment_cascade`. |
| **Student Portal Scanning** | If `period_attendance` RLS is modified incorrectly, student self-marking (`student_insert_period_attendance`) will break. | Explicitly preserve `student_insert_period_attendance` and `student_read_own_period_attendance`. |
| **Admin Reports & Analytics** | If shared tables have global policies altered, Admin RPC may fail. | `get_admin_reports_analytics` is `SECURITY DEFINER` with internal admin check; keep RPC completely untouched. |
| **Absence Notifications** | If dedup rule or Resend digest generation is modified, email digests could send duplicates. | Keep `getEligibleAbsences` canonical dataset untouched. |
| **Multi-tab Isolation** | If `sessionStorage` or fetch interceptor is modified, Admin/Teacher multi-tab collisions will reoccur. | Freeze `lib/supabase/client.ts` and `lib/auth/session-manager.ts`. |

---

### I. RECOMMENDED IMPLEMENTATION BOUNDARY

When the implementation plan is created:
1. **Scope of Modification:**
   - Harden server route handlers in `app/api/teacher/*` to enforce `teacher_assignments` checks.
   - Refine PostgreSQL RLS policies on `period_attendance`, `attendance_sessions`, and `students` to enforce assignment boundaries.
   - Add debouncing to live student list fetch in `app/teacher/qr-attendance/page.tsx`.
2. **Frozen Subsystems:**
   - Do NOT alter `get_admin_reports_analytics` RPC or Admin API routes.
   - Do NOT alter `useSessionGuard`, `session-manager.ts`, or tab isolation logic.
   - Do NOT alter the 15s QR rotation timer or 180s session countdown logic.
   - Do NOT alter student-side RLS policies on `period_attendance`, `college_attendance`, or `students`.

---

### J. FILES TO MODIFY LATER

1. `app/api/teacher/save-missed-attendance/route.ts`
2. `app/api/teacher/bulk-save-missed-attendance/route.ts`
3. `app/api/teacher/face-approvals/route.ts`
4. `app/api/teacher/reject-face/route.ts`
5. `app/api/teacher/reset-student-password/route.ts`
6. `app/api/teacher/send-absence-digest/route.ts`
7. `app/teacher/qr-attendance/page.tsx` (Add debouncing to `fetchStudentList`)
8. Database migration file (for tightening RLS policies on `attendance_sessions`, `period_attendance`, `students`)

---

### K. FILES / SYSTEMS TO FREEZE

1. `lib/auth/session-manager.ts` (Frozen — multi-tab session isolation)
2. `lib/supabase/client.ts` (Frozen — tab storage & fetch interceptor)
3. `lib/supabase/server.ts` (Frozen — SSR Bearer & cookie auth)
4. `lib/supabase/middleware.ts` / `proxy.ts` (Frozen — Next.js proxy)
5. `hooks/use-session-guard.ts` (Frozen — active session guard)
6. `hooks/use-reports-data.ts` (Frozen — Admin reports realtime)
7. `app/api/admin/reports-data/route.ts` (Frozen — Admin reporting endpoint)
8. `app/api/admin/dashboard-data/route.ts` (Frozen — Admin dashboard)
9. `lib/absence-notifications/eligible-dataset.ts` (Frozen — canonical absence dedup logic)
10. `components/teacher/qr-code-display.tsx` (Frozen — 15s rotation timer & QR SVG renderer)
11. `components/teacher/qr-active-session.tsx` (Frozen — 180s session countdown & finalize modal)
12. Database RPC `get_admin_reports_analytics` (Frozen — authoritative campus analytics)
13. Database triggers `relink_timetable_on_assignment_create` and `delete_teacher_assignment_cascade` (Frozen — timetable relational integrity)

---

## STRICT READ-ONLY VERIFICATION CONFIRMATION

In accordance with the primary directive:
- **No source code files were modified.**
- **No database schema was modified.**
- **No database data was modified.**
- **No RLS policy was modified.**
- **No migration was executed.**
- **No application behavior was changed.**
