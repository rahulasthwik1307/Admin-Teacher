# Admin System Logs Forensic Audit & Failure Point Investigation Report

**Project:** NNRG Smart Attendance Management System — Admin Portal  
**Document:** `ADMIN_SYSTEM_LOGS_FORENSIC_AUDIT.md`  
**Investigation Mode:** READ-ONLY FORENSIC INVESTIGATION (Zero Mutating Operations)  
**Database Project ID:** `knkoihgyfjoaxznelrjr` (Region: `ap-south-1`)  
**Audit Date:** August 30, 2026  

---

## 1. Executive Summary

A read-only forensic investigation was conducted on the administrative audit logging pipeline in the Admin Portal. Specifically, we traced why administrative teacher-management actions performed in the **Admin → Teachers** section—namely:
1. **Reset Teacher Password**
2. **Disable Teacher Account**
3. **Enable / Reactivate Teacher Account**

do not appear in **Admin Dashboard → Audit Trail / Activity Log** or **Admin Reports → System Logs**.

### Key Findings:
- **Root Cause:** The failure is strictly at the **Log Generation Step**. Neither the frontend handler nor the backend API endpoint / database trigger creates an entry in `public.system_logs` when these three specific actions occur.
- **Log Storage & Schema:** The `public.system_logs` schema, foreign key constraints, indexes, and RLS policies are fully functional and healthy (782 existing records exist for other events like `create`, `update`, `delete`, `assign`).
- **Dashboard & Reports Query / UI:** Both the Admin Dashboard (`/api/admin/dashboard-data` + `AdminDashboardPage`) and Admin Reports (`/api/admin/reports-data` + `ReportsPage` Tab 4) are correctly coded, indexed, and actively configured with dedicated UI icons, badges, and filters (e.g., `action_type: 'reset'`, `action_type: 'update'`). They fail to display these events solely because zero records are inserted into `public.system_logs`.
- **Zero Database Triggers:** No PostgreSQL triggers exist on `auth.users`, `public.users`, or `public.teachers`. Logging across the platform is implemented entirely in application code.

---

## 2. Exact Problem Statement

When an administrator performs any of the following operations in `app/admin/teachers/page.tsx`:
1. Selects **Reset Password** from a teacher's dropdown menu and confirms the dialog.
2. Selects **Disable Account** from an active teacher's dropdown menu and confirms the dialog.
3. Selects **Enable Account** from a disabled teacher's dropdown menu and confirms the dialog.

The state changes are committed to the database (`auth.users`, `public.users.must_change_password`, or `public.teachers.is_active`), but **no corresponding log records are generated in `public.system_logs`**. Consequently:
- **Admin Dashboard → Activity Log (`recentActivity`)** does not show the event.
- **Admin Reports → System Logs (Tab 4)** does not show the event.

---

## 3. Repository File & Function Map

The table below maps all components, API routes, database objects, and UI views involved in the administrative logging pipeline:

| Category | File Path | Function / Component / Object | Role / Responsibility |
| :--- | :--- | :--- | :--- |
| **Admin UI (Teachers)** | [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx) | `TeacherManagementPage` | Main teacher management interface |
| **Teacher Reset Action** | [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L348-L373) | `handleResetPassword()` | Triggers `POST /api/admin/reset-password` |
| **Teacher Disable/Enable Action** | [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L375-L407) | `handleDisableAccount()` | Direct client mutation on `teachers.is_active` |
| **Teacher Create Action** | [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L244-L346) | `handleAddTeacher()` | Creates teacher & logs to `system_logs` (Client) |
| **Teacher Edit Action** | [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L409-L467) | `handleEditTeacher()` | Updates profile & logs to `system_logs` (Client) |
| **Password Reset API** | [`app/api/admin/reset-password/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reset-password/route.ts) | `POST` | Admin endpoint resetting password via Supabase Admin Auth |
| **Dashboard API** | [`app/api/admin/dashboard-data/route.ts`](file:///e:/Admin-Teacher/app/api/admin/dashboard-data/route.ts#L59-L63) | `GET` | Fetches top 8 `system_logs` for Dashboard Audit Trail |
| **Dashboard UI** | [`app/admin/dashboard/page.tsx`](file:///e:/Admin-Teacher/app/admin/dashboard/page.tsx#L680-L733) | `AdminDashboardPage`, `getActionConfig()` | Renders recent activity timeline with badges/icons |
| **Reports API** | [`app/api/admin/reports-data/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reports-data/route.ts#L121-L125) | `GET` | Fetches top 100 `system_logs` & resolves performer names |
| **Reports Hook** | [`hooks/use-reports-data.ts`](file:///e:/Admin-Teacher/hooks/use-reports-data.ts) | `useReportsData()` | React Query hook with debounced realtime invalidation |
| **Reports UI (Logs Tab)** | [`app/admin/reports/page.tsx`](file:///e:/Admin-Teacher/app/admin/reports/page.tsx#L1974-L2091) | `ReportsPage` (Tab 4: System Logs) | Filterable audit trail table |
| **Database Table** | `public.system_logs` | Table | Storage for system & administrative audit events |
| **Database Triggers** | `public.*`, `auth.*` | Triggers | Zero triggers present on users, teachers, or logs |

---

## 4. Password Reset Logging Trace

### Detailed Execution Trace:
1. **Admin Trigger:** Admin navigates to `/admin/teachers`, clicks the action dropdown (`...`) on a teacher row, and clicks **Reset Password** ([`app/admin/teachers/page.tsx:729-732`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L729-L732)).
2. **Dialog Confirmation:** `<AlertDialog>` displays confirmation prompt: *"Reset password for [Teacher Name] to default? They will be forced to change it on next login."* ([`app/admin/teachers/page.tsx:984-1001`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L984-L1001)).
3. **Frontend Handler:** Admin clicks "Reset", triggering `handleResetPassword()` ([`app/admin/teachers/page.tsx:348-373`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L348-L373)).
4. **Network Request:** `fetch("/api/admin/reset-password", { method: "POST", body: JSON.stringify({ userId: resetTarget.id }) })`.
5. **Server Route Execution:** [`app/api/admin/reset-password/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reset-password/route.ts):
   - Authenticates caller using `supabase.auth.getUser()`.
   - Authorizes admin role: `SELECT role FROM users WHERE id = user.id` (`callerProfile.role === "admin"`).
   - Initializes service-role client: `const adminClient = createAdminClient()`.
   - Calls Supabase Auth Admin: `adminClient.auth.admin.updateUserById(userId, { password: "Teacher@1234" })`.
   - Updates flag: `adminClient.from("users").update({ must_change_password: true }).eq("id", userId)`.
   - Returns `{ success: true }`.
6. **Logging Step:**
   - **`system_logs` Insert in `route.ts`:** ❌ **NONE** (No insert statement exists).
   - **`system_logs` Insert in `page.tsx`:** ❌ **NONE** (No insert statement exists).
   - **Database Trigger on `auth.users` / `public.users`:** ❌ **NONE**.
7. **Performer / Target Attribution:** Never saved.
8. **Dashboard / Reports Visibility:** Not visible because no row is inserted into PostgreSQL.

### Critical Security Verification:
- **Plaintext Passwords Stored in Logs:** **NONE** (Verified via SQL query against all 782 existing log rows).
- **Sensitive Credentials / Tokens / Hashes:** None exposed in logs or network responses.

---

## 5. Teacher Disable Logging Trace

### Detailed Execution Trace:
1. **Admin Trigger:** Admin clicks action dropdown (`...`) on an active teacher row and clicks **Disable Account** ([`app/admin/teachers/page.tsx:734-739`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L734-L739)).
2. **Dialog Confirmation:** `<AlertDialog>` displays: *"Are you sure you want to disable [Teacher Name]'s account? They will not be able to log in until re-enabled."* ([`app/admin/teachers/page.tsx:1004-1047`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L1004-L1047)).
3. **Frontend Handler:** Admin clicks "Disable", invoking `handleDisableAccount()` ([`app/admin/teachers/page.tsx:375-407`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L375-L407)).
4. **Database Mutation:** 
   - Executes client-side Supabase query:
     ```typescript
     const { error } = await supabase
       .from("teachers")
       .update({ is_active: false })
       .eq("id", disableTarget.id)
     ```
   - Mutation succeeds under RLS policy `admin_update_teachers_policy`.
5. **Local UI State Update:** Updates React state `setTeachers(...)` and displays toast notification.
6. **Logging Step:**
   - **`system_logs` Insert in `handleDisableAccount`:** ❌ **NONE** (Omitted entirely).
   - **Server Route / RPC:** None (Operation is executed client-side).
   - **Database Trigger on `public.teachers`:** ❌ **NONE**.
7. **Dashboard / Reports Visibility:** Not visible because no record is created.

---

## 6. Teacher Enable / Reactivate Logging Trace

### Detailed Execution Trace:
1. **Admin Trigger:** Admin clicks action dropdown (`...`) on a disabled teacher row and clicks **Enable Account** ([`app/admin/teachers/page.tsx:734-739`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L734-L739)).
2. **Dialog Confirmation:** `<AlertDialog>` displays: *"Re-enable [Teacher Name]'s account? They will regain full access."* ([`app/admin/teachers/page.tsx:1018-1023`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L1018-L1023)).
3. **Frontend Handler:** Admin clicks "Enable", invoking `handleDisableAccount()` ([`app/admin/teachers/page.tsx:375-407`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L375-L407)).
4. **Database Mutation:**
   - Executes client-side query:
     ```typescript
     const { error } = await supabase
       .from("teachers")
       .update({ is_active: true })
       .eq("id", disableTarget.id)
     ```
5. **Logging Step:**
   - **`system_logs` Insert in `handleDisableAccount`:** ❌ **NONE**.
   - **Database Trigger:** ❌ **NONE**.
6. **Dashboard / Reports Visibility:** Not visible because no record is created.

---

## 7. `system_logs` Schema Analysis

The database schema of `public.system_logs` was inspected via read-only SQL queries:

### Columns & Constraints:
| Column Name | Data Type | Nullable | Default Value | Foreign Key / Reference |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `NO` | `gen_random_uuid()` | **PRIMARY KEY** (`system_logs_pkey`) |
| `performed_by` | `uuid` | `YES` | `NULL` | **FOREIGN KEY** `system_logs_performed_by_fkey` $\rightarrow$ `public.users(id)` |
| `action_type` | `text` | `NO` | `NULL` | Free-text / categorization token (`create`, `update`, `delete`, `assign`, `reset`, etc.) |
| `description` | `text` | `NO` | `NULL` | Human-readable event description |
| `metadata` | `jsonb` | `YES` | `NULL` | Optional structured JSON metadata |
| `created_at` | `timestamptz` | `YES` | `now()` | UTC Timestamp with timezone |

### Indexes:
1. `system_logs_pkey`: `CREATE UNIQUE INDEX system_logs_pkey ON public.system_logs USING btree (id)`
2. `idx_system_logs_created_desc`: `CREATE INDEX idx_system_logs_created_desc ON public.system_logs USING btree (created_at DESC)`

### RLS Policies on `system_logs`:
1. `admin_read_system_logs`:
   - Command: `SELECT`
   - Target Roles: `{public}`
   - Qual: `is_admin()`
   - Effect: Restricts reading system logs exclusively to admin users.
2. `admin_insert_logs_policy`:
   - Command: `INSERT`
   - Target Roles: `{public}`
   - With Check: `(auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))`
3. `authenticated_insert_logs`:
   - Command: `INSERT`
   - Target Roles: `{public}`
   - With Check: `(auth.uid() IS NOT NULL)`

---

## 8. Existing Log Record Analysis

Read-only inspection of all existing records in `public.system_logs` revealed:

### Action Type Distribution (Total: 782 rows):
| `action_type` | Record Count | Earliest Timestamp | Latest Timestamp | Typical Description Pattern |
| :--- | :--- | :--- | :--- | :--- |
| `create` | **654** | `2026-02-28 09:18:32 UTC` | `2026-08-29 14:46:39 UTC` | `Student account created by admin: <Name> (<Roll>)`<br>`Teacher account created for <Name>`<br>`Department added: <Name>` |
| `update` | **57** | `2026-02-28 10:23:10 UTC` | `2026-08-25 12:52:16 UTC` | `Teacher profile updated for <Name>`<br>`Student record updated by admin: <Name> (<Roll>)`<br>`Geofence updated` |
| `delete` | **56** | `2026-03-14 01:26:27 UTC` | `2026-08-25 14:38:32 UTC` | `Assignment removed: <Teacher> — <Subject> (<Class>)`<br>`Timetable entry removed: <Subject> — <Class> — <Day>` |
| `assign` | **15** | `2026-02-28 09:58:30 UTC` | `2026-08-25 13:59:14 UTC` | `Teacher <Name> assigned to <Subject> — <Class>` |

### Keyword Search on `system_logs.description`:
- Queries for `password`, `reset`, `disable`, `enable`, `activate`, `deactivate`, `reactivate` returned **0 rows**.
- Queries for `teacher` returned **26 rows**, strictly covering:
  - `Teacher account created for <Name>` (`action_type: create`)
  - `Teacher profile updated for <Name>` (`action_type: update`)
  - `Teacher <Name> assigned to <Subject> — <Class>` (`action_type: assign`)
  - `Assignment removed: <Teacher> — <Subject> ...` (`action_type: delete`)

This proves that teacher password resets, account disabling, and account enabling **have never been logged under any alternative `action_type` or description**.

---

## 9. Admin Dashboard Audit Trail Trace

### Data Retrieval & Processing:
1. **API Endpoint:** `GET /api/admin/dashboard-data` ([`app/api/admin/dashboard-data/route.ts`](file:///e:/Admin-Teacher/app/api/admin/dashboard-data/route.ts)).
2. **Database Query:**
   ```typescript
   supabase
     .from("system_logs")
     .select("id, created_at, description, performed_by, action_type")
     .order("created_at", { ascending: false })
     .limit(8)
   ```
3. **Payload Mapping:**
   ```typescript
   const recentActivity = (logs || []).map((l: any) => ({
     text: l.description ?? "System action",
     time: timeAgo(l.created_at),
     actionType: l.action_type ?? "create",
   }))
   ```
4. **UI Presentation:** `AdminDashboardPage` ([`app/admin/dashboard/page.tsx:680-733`](file:///e:/Admin-Teacher/app/admin/dashboard/page.tsx#L680-L733)):
   - Evaluates `getActionConfig(item.actionType)` ([`app/admin/dashboard/page.tsx:37-94`](file:///e:/Admin-Teacher/app/admin/dashboard/page.tsx#L37-L94)).
   - `case "reset"`: Renders amber `KeyRound` icon with `RESET` badge.
   - `case "update"`: Renders sky-blue `Pencil` icon with `UPDATED` badge.
   - `case "delete"`: Renders rose `Trash2` icon with `DELETED` badge.
   - `default`: Renders muted `Activity` icon with `ACTION` badge.

### Verification of Dashboard Behavior:
The dashboard has **no client-side exclusion filters** or restrictive transforms that would hide teacher password resets or disable/enable actions. If records existed in `system_logs`, they would be returned by the API and rendered cleanly.

---

## 10. Reports → System Logs Trace

### Data Retrieval & Processing:
1. **API Endpoint:** `GET /api/admin/reports-data` ([`app/api/admin/reports-data/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reports-data/route.ts)).
2. **Database Query:**
   ```typescript
   supabase
     .from("system_logs")
     .select("id, created_at, action_type, description, performed_by")
     .order("created_at", { ascending: false })
     .limit(100)
   ```
3. **Performer Resolution:**
   - Extracts unique `performed_by` UUIDs:
     ```typescript
     const performerIds = [...new Set((logs ?? []).map((l: any) => l.performed_by).filter(Boolean))]
     const { data: logUsers } = performerIds.length > 0
       ? await supabase.from("users").select("id, full_name").in("id", performerIds)
       : { data: [] }
     ```
   - Maps `performed_by` UUID to `users.full_name`.
4. **UI Presentation:** `ReportsPage` Tab 4: System Logs ([`app/admin/reports/page.tsx:1974-2091`](file:///e:/Admin-Teacher/app/admin/reports/page.tsx#L1974-L2091)):
   - Filter dropdown includes options for `all`, `create`, `update`, `delete`, `reset`, `assign` ([`app/admin/reports/page.tsx:2004-2010`](file:///e:/Admin-Teacher/app/admin/reports/page.tsx#L2004-L2010)).
   - Evaluates `getActionConfig(action_type, description)` ([`app/admin/reports/page.tsx:135-148`](file:///e:/Admin-Teacher/app/admin/reports/page.tsx#L135-L148)).
   - Renders paginated/scrollable table with Type Icon, Action Badge, Description, Performed By name, and formatted Local Timestamp.

---

## 11. End-to-End Logging Comparison Matrix

| Action | Generated? | Stored in DB? | Queryable via API? | Dashboard Audit Trail | Reports System Logs | Failure Stage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Teacher Password Reset** | ❌ **No** | ❌ **No** | ❌ **No** | ❌ **Hidden (0 rows)** | ❌ **Hidden (0 rows)** | **Log Generation (Server & Client)** |
| **Teacher Account Disable** | ❌ **No** | ❌ **No** | ❌ **No** | ❌ **Hidden (0 rows)** | ❌ **Hidden (0 rows)** | **Log Generation (Client & DB)** |
| **Teacher Account Enable** | ❌ **No** | ❌ **No** | ❌ **No** | ❌ **Hidden (0 rows)** | ❌ **Hidden (0 rows)** | **Log Generation (Client & DB)** |
| **Teacher Account Created** | ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | ✅ **Displayed** | ✅ **Displayed** | *Fully Functional* |
| **Teacher Profile Updated** | ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | ✅ **Displayed** | ✅ **Displayed** | *Fully Functional* |
| **Teacher Subject Assigned** | ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | ✅ **Displayed** | ✅ **Displayed** | *Fully Functional* |
| **Teacher Assignment Deleted**| ✅ **Yes** | ✅ **Yes** | ✅ **Yes** | ✅ **Displayed** | ✅ **Displayed** | *Fully Functional* |

---

## 12. Detailed Failure Point Identification

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ADMIN TEACHER MANAGEMENT                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         ▼                                       ▼                                       ▼
  [Reset Password]                        [Disable Account]                       [Enable Account]
         │                                       │                                       │
         ▼                                       ▼                                       ▼
Calls /api/admin/reset-password           Direct Supabase Client                  Direct Supabase Client
         │                                Update teachers.is_active               Update teachers.is_active
         ▼                                       │                                       │
Updates auth.users & public.users                ▼                                       ▼
         │                                  teachers row                            teachers row
         │                                  updated in DB                           updated in DB
         │                                       │                                       │
         ▼                                       ▼                                       ▼
  ╔══════════════════╗                    ╔══════════════════╗                    ╔══════════════════╗
  ║  FAILURE POINT:  ║                    ║  FAILURE POINT:  ║                    ║  FAILURE POINT:  ║
  ║  No system_logs  ║                    ║  No system_logs  ║                    ║  No system_logs  ║
  ║  insert in API   ║                    ║  insert in page  ║                    ║  insert in page  ║
  ║  or client!      ║                    ║  or API!         ║                    ║  or API!         ║
  ╚══════════════════╝                    ╚══════════════════╝                    ╚══════════════════╝
         │                                       │                                       │
         └───────────────────────────────────────┼───────────────────────────────────────┘
                                                 ▼
                                ┌─────────────────────────────────┐
                                │      public.system_logs         │
                                │   (ZERO RECORDS GENERATED)      │
                                └─────────────────────────────────┘
                                                 │
                                                 ▼
                                ┌─────────────────────────────────┐
                                │    Dashboard & Reports APIs     │
                                │   (No events returned to UI)    │
                                └─────────────────────────────────┘
```

---

## 13. RLS and Security Forensics

1. **System Logs Access Isolation:**
   - `SELECT` is strictly gated by `is_admin()` (`admin_read_system_logs`). Regular teachers and students cannot view system logs.
   - `INSERT` is protected by `admin_insert_logs_policy` and `authenticated_insert_logs`.
   - Server-side routes run via `createAdminClient()` using Supabase service-role credentials, bypassing RLS safely while ensuring proper backend validation.
2. **Endpoint Protection:**
   - `/api/admin/reset-password`: Requires active session and verifies caller's `role === "admin"` in `public.users`.
   - Direct teacher updates on `teachers.is_active` are gated by `admin_update_teachers_policy` (`auth.uid() IN (SELECT id FROM users WHERE role = 'admin')`).
3. **Spoofing / Attribution Integrity:**
   - Server-side routes extract `user.id` directly from `await supabase.auth.getUser()`, preventing caller spoofing when writing `performed_by`.

---

## 14. Trigger & Database Function Forensics

- **Trigger Search:** A comprehensive search of `information_schema.triggers` and `pg_trigger` revealed only two non-internal triggers in the database:
  1. `on-attendance-session-active` on `attendance_sessions` (calls edge function).
  2. `trg_relink_timetable_on_assignment_create` on `teacher_assignments`.
- **Finding:** There are **no database triggers** logging user status changes, authentication events, password modifications, or teacher activations.
- **Architecture Classification:** **Explicit Application Code Logging (Model A)**. Every audit log in this application must be created explicitly by TypeScript code.

---

## 15. Logging Consistency Analysis

Our audit identified three contrasting logging paradigms currently in use:

1. **Server-Side API Route Logging (Best Practice):**
   - Implemented in `create-student`, `update-student`, `teacher-assignments/[id]`.
   - The route handler uses the authenticated caller's UID and the service-role client to insert an audit record into `system_logs`.
2. **Client-Side Component Logging (Inconsistent):**
   - Implemented in `handleAddTeacher` and `handleEditTeacher` inside `app/admin/teachers/page.tsx`, as well as timetable and geofence pages.
   - The React component calls `supabase.from("system_logs").insert(...)` after performing an action.
3. **Silent Omission (Broken):**
   - Implemented in `handleResetPassword`, `handleDisableAccount` (disable & enable), and `/api/admin/delete-user`.
   - The operation executes successfully, but neither the client nor the server records the event.

---

## 16. Performance Observations

1. **Index Optimization:**
   - The query `SELECT ... FROM system_logs ORDER BY created_at DESC LIMIT N` is supported by the index `idx_system_logs_created_desc` (`created_at DESC`).
   - Query execution time is negligible ($< 2\text{ ms}$).
2. **Performer Name Resolution:**
   - In `app/api/admin/reports-data/route.ts`, performer resolution extracts unique IDs from the 100 returned logs and executes a single `in("id", performerIds)` query on `users`. This avoids $N+1$ query overhead.

---

## 17. Security Risks Assessment

1. **Credential Exposure Risk:** **NONE IDENTIFIED**.
   - Passwords and hashes are not stored in `system_logs`.
   - Standard audit descriptions should adhere to safe formatting (e.g., `Password reset for teacher: John Doe (TCH001)`).
2. **Audit Gap Risk:** **MEDIUM-HIGH (Operational / Compliance Risk)**.
   - Disabling or enabling a faculty member's access is a high-privilege administrative action.
   - Resetting faculty credentials allows account takeover if performed by an unauthorized admin session.
   - The complete lack of audit records for these three actions leaves an administrative blind spot.

---

## 18. Evidence-Based Root Cause

The root cause of why teacher password resets, account disabling, and account enabling do not appear in the Admin Dashboard Audit Trail or Admin Reports System Logs is:

> **Omission of `system_logs` insertion logic in [`app/api/admin/reset-password/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reset-password/route.ts) and [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx) (`handleDisableAccount`).**
> 
> Because logging in this project is explicitly application-driven (not trigger-driven), any administrative operation that lacks an explicit `system_logs.insert()` statement produces zero database records, rendering the events invisible to both downstream API feeds.

---

## 19. What Is Working Correctly

1. ✅ **`public.system_logs` Database Table:** Columns, constraints, foreign keys, and indexes are valid.
2. ✅ **RLS Policies:** Admin read restrictions and authenticated insert permissions are operating as intended.
3. ✅ **Dashboard Activity Log Pipeline:** `/api/admin/dashboard-data` and `app/admin/dashboard/page.tsx` correctly fetch and render recent logs, with full support for `action_type: 'reset'`, `action_type: 'update'`, etc.
4. ✅ **Reports System Logs Pipeline:** `/api/admin/reports-data` and `app/admin/reports/page.tsx` correctly fetch top 100 logs, resolve performer full names, support filtering by performer and action type, and render formatted timeline entries.
5. ✅ **Teacher Create & Edit Logging:** `handleAddTeacher` and `handleEditTeacher` successfully record `create` and `update` logs to `system_logs`.
6. ✅ **Security & Password Protection:** Passwords are never leaked or written to log descriptions.

---

## 20. What Is Missing / Broken

1. ❌ **Missing Log on Password Reset:** [`app/api/admin/reset-password/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reset-password/route.ts) updates auth and `must_change_password` but does not insert a record into `system_logs`.
2. ❌ **Missing Log on Teacher Account Disable:** [`app/admin/teachers/page.tsx:375-407`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L375-L407) updates `teachers.is_active = false` but does not insert a record into `system_logs`.
3. ❌ **Missing Log on Teacher Account Enable:** [`app/admin/teachers/page.tsx:375-407`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx#L375-L407) updates `teachers.is_active = true` but does not insert a record into `system_logs`.

---

## 21. Exact Scope of Any Future Fix (Specification Only)

*Note: In compliance with the READ-ONLY instruction, no changes have been implemented.*

To resolve this issue in the subsequent implementation phase, changes must be constrained to the following boundaries:

### 1. Server-Side Password Reset Logging:
- **Target File:** [`app/api/admin/reset-password/route.ts`](file:///e:/Admin-Teacher/app/api/admin/reset-password/route.ts)
- **Scope:** 
  - Fetch target teacher name / ID before or during reset.
  - Insert log entry into `system_logs`:
    - `performed_by`: `user.id` (Admin caller)
    - `action_type`: `"reset"`
    - `description`: `Password reset for teacher: <Full Name> (<Teacher ID Code>)`
    - `metadata`: `{ target_user_id: userId, role: "teacher" }`

### 2. Teacher Disable & Enable Logging:
- **Target File:** [`app/admin/teachers/page.tsx`](file:///e:/Admin-Teacher/app/admin/teachers/page.tsx) (or dedicated admin API route if refactored)
- **Scope:**
  - Inside `handleDisableAccount()`, after successful `teachers` update:
    - If `newStatus === false` (Disabled):
      - `action_type`: `"update"`
      - `description`: `Teacher account disabled for ${disableTarget.name} (${disableTarget.teacherId})`
    - If `newStatus === true` (Enabled / Reactivated):
      - `action_type`: `"update"`
      - `description`: `Teacher account re-enabled for ${disableTarget.name} (${disableTarget.teacherId})`
    - `performed_by`: `adminUser.id`

---

## 22. Verification / Test Cases Required After Implementation

When the fix is implemented in a future phase, the following test cases must be verified:

1. **Test Case 1: Teacher Password Reset**
   - Admin triggers password reset for teacher *TCH001*.
   - Query `system_logs` $\rightarrow$ Record exists with `action_type: 'reset'` and description mentioning teacher.
   - Check Admin Dashboard $\rightarrow$ Amber `RESET` badge with `KeyRound` icon appears in Recent Activity.
   - Check Admin Reports Tab 4 $\rightarrow$ Row appears with correct performer name, timestamp, and matches the "Reset" filter.
2. **Test Case 2: Teacher Account Disable**
   - Admin disables active teacher *TCH001*.
   - Query `system_logs` $\rightarrow$ Record exists with `action_type: 'update'` and description `Teacher account disabled for ...`.
   - Check Dashboard & Reports $\rightarrow$ Sky-blue `UPDATED` badge appears with description.
3. **Test Case 3: Teacher Account Enable**
   - Admin re-enables disabled teacher *TCH001*.
   - Query `system_logs` $\rightarrow$ Record exists with `action_type: 'update'` and description `Teacher account re-enabled for ...`.
   - Check Dashboard & Reports $\rightarrow$ Sky-blue `UPDATED` badge appears with description.
4. **Test Case 4: Security Invariance**
   - Inspect `system_logs.description` and `metadata` $\rightarrow$ Confirm zero plaintext passwords or secrets are recorded.

---
*End of Forensic Investigation Report.*
