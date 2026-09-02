import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envLines = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BASE_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('   ATTENDGUARD — MISSED ATTENDANCE DEEP SECURITY & FUNCTIONAL SUITE   ');
  console.log('========================================================================\n');

  // 1. Authenticate Teacher A
  const teacherAEmail = 'tchoo7@nnrg.edu.in';
  const teacherAPassword = 'Tillu@1307';
  const { data: teacherAAuth, error: tAErr } = await anonClient.auth.signInWithPassword({
    email: teacherAEmail,
    password: teacherAPassword,
  });
  if (tAErr) throw new Error(`Teacher A login failed: ${tAErr.message}`);
  const teacherAToken = teacherAAuth.session.access_token;
  const teacherAId = teacherAAuth.user.id;
  console.log(`[AUTH] Teacher A authenticated: ${teacherAEmail} (${teacherAId})`);

  // 2. Authenticate Admin
  const adminEmail = 'admin@nnrg.edu.in';
  const adminPassword = 'Admin@1234';
  const { data: adminAuth, error: aErr } = await anonClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (aErr) throw new Error(`Admin login failed: ${aErr.message}`);
  const adminToken = adminAuth.session.access_token;
  console.log(`[AUTH] Admin authenticated: ${adminEmail} (${adminAuth.user.id})`);

  // 3. Authenticate/Create Student token
  // Let's set a known password for test student 227z1a6775@nnrg.student
  const studentEmail = '227z1a6775@nnrg.student';
  const studentUserObj = await adminClient.from('users').select('id').eq('email', studentEmail).single();
  const studentId = studentUserObj.data.id;
  await adminClient.auth.admin.updateUserById(studentId, { password: 'Student@1234' });

  const { data: studentAuth, error: sErr } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'Student@1234',
  });
  if (sErr) throw new Error(`Student login failed: ${sErr.message}`);
  const studentToken = studentAuth.session.access_token;
  console.log(`[AUTH] Student authenticated: ${studentEmail} (${studentId})`);

  // 4. Authenticate Teacher B (tcho18@nnrg.edu.in)
  const teacherBEmail = 'tcho18@nnrg.edu.in';
  const teacherBUserObj = await adminClient.from('users').select('id').eq('email', teacherBEmail).single();
  const teacherBId = teacherBUserObj.data.id;
  await adminClient.auth.admin.updateUserById(teacherBId, { password: 'TeacherB@1234' });

  const { data: teacherBAuth, error: tBErr } = await anonClient.auth.signInWithPassword({
    email: teacherBEmail,
    password: 'TeacherB@1234',
  });
  if (tBErr) throw new Error(`Teacher B login failed: ${tBErr.message}`);
  const teacherBToken = teacherBAuth.session.access_token;
  console.log(`[AUTH] Teacher B authenticated: ${teacherBEmail} (${teacherBId})\n`);

  // Get Teacher A valid assignment
  const { data: tAAssignments } = await adminClient
    .from('teacher_assignments')
    .select('class_id, subject_id, class:classes(name, section, year, department:departments(code)), subject:subjects(name)')
    .eq('teacher_id', teacherAId);
  
  const validAssignment = tAAssignments[0];
  const validClassId = validAssignment.class_id;
  const validSubjectId = validAssignment.subject_id;
  console.log(`[DATA] Teacher A Assignment: Class=${validAssignment.class.department.code}-${validAssignment.class.section} (${validAssignment.class.year}) [${validClassId}], Subject=${validAssignment.subject.name} [${validSubjectId}]`);

  // Get valid period
  const { data: periods } = await adminClient.from('periods').select('id, period_number').order('period_number');
  const validPeriodId = periods[0].id;

  // Get valid active students for validClassId
  const { data: validStudents } = await adminClient
    .from('students')
    .select('id, roll_number')
    .eq('class_id', validClassId)
    .neq('is_active', false);
  console.log(`[DATA] Valid Students for Class count: ${validStudents.length}`);

  // Get foreign student from another class
  const { data: foreignStudents } = await adminClient
    .from('students')
    .select('id, roll_number, class_id')
    .neq('class_id', validClassId)
    .limit(1);
  const foreignStudent = foreignStudents[0];
  console.log(`[DATA] Foreign Student from another class: ${foreignStudent.roll_number} [${foreignStudent.id}] in Class [${foreignStudent.class_id}]\n`);

  const results = [];

  // =========================================================================
  // TEST SUITE: LAYER A — API SECURITY & ABUSE TESTS
  // =========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('   LAYER A: API AUTHORIZATION & ABUSE TESTING                          ');
  console.log('------------------------------------------------------------------------');

  // --- SEC-01: Unauthenticated request ---
  const res1 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: '2026-08-28',
      attendance: [{ student_id: validStudents[0].id, status: 'present' }],
    }),
  });
  const sec01Pass = res1.status === 401;
  results.push({ id: 'SEC-01', name: 'Unauthenticated Request', expected: '401 Unauthorized', actual: `${res1.status}`, pass: sec01Pass });
  console.log(`SEC-01: Unauthenticated Request -> Status ${res1.status} (${sec01Pass ? 'PASS' : 'FAIL'})`);

  // --- SEC-02: Student Token Access ---
  const res2 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: '2026-08-28',
      attendance: [{ student_id: validStudents[0].id, status: 'present' }],
    }),
  });
  const sec02Pass = res2.status === 403;
  results.push({ id: 'SEC-02', name: 'Student Token Access', expected: '403 Forbidden', actual: `${res2.status}`, pass: sec02Pass });
  console.log(`SEC-02: Student Token Access -> Status ${res2.status} (${sec02Pass ? 'PASS' : 'FAIL'})`);

  // --- SEC-03: Teacher B attempting to save Teacher A's assigned class/subject ---
  const res3 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherBToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: '2026-08-28',
      attendance: [{ student_id: validStudents[0].id, status: 'present' }],
    }),
  });
  const sec03Pass = res3.status === 403;
  results.push({ id: 'SEC-03', name: 'Cross-Teacher Assignment Tampering', expected: '403 Forbidden', actual: `${res3.status}`, pass: sec03Pass });
  console.log(`SEC-03: Cross-Teacher Assignment Tampering -> Status ${res3.status} (${sec03Pass ? 'PASS' : 'FAIL'})`);

  // --- SEC-04: Fail-Closed Foreign Student Tampering ---
  // Teacher A submits valid student + 1 foreign student from another cohort
  const res4 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherAToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: '2026-08-28',
      attendance: [
        { student_id: validStudents[0].id, status: 'present' },
        { student_id: foreignStudent.id, status: 'present' }, // FOREIGN STUDENT INJECTION
      ],
    }),
  });
  const res4Json = await res4.json();
  const sec04Pass = res4.status === 403 || res4.status === 400;
  results.push({ id: 'SEC-04', name: 'Fail-Closed Foreign Student Tampering', expected: '403/400 (Atomic Rejection)', actual: `${res4.status}: ${res4Json.error}`, pass: sec04Pass });
  console.log(`SEC-04: Fail-Closed Foreign Student Tampering -> Status ${res4.status} (${res4Json.error}) (${sec04Pass ? 'PASS' : 'FAIL'})`);

  // Verify that NO partial session or attendance was written for SEC-04
  const { data: phantomSession } = await adminClient
    .from('attendance_sessions')
    .select('id')
    .eq('teacher_id', teacherAId)
    .eq('session_date', '2026-08-28')
    .eq('period_id', validPeriodId);
  const sec04AtomicPass = (!phantomSession || phantomSession.length === 0);
  console.log(`SEC-04-B: Verified Zero Partial Writes in DB -> ${sec04AtomicPass ? 'PASS (0 records created)' : 'FAIL'}`);

  // --- SEC-05: Invalid Period ID ---
  const res5 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherAToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: '00000000-0000-0000-0000-000000000000',
      session_date: '2026-08-28',
      attendance: [{ student_id: validStudents[0].id, status: 'present' }],
    }),
  });
  const sec05Pass = res5.status === 400;
  results.push({ id: 'SEC-05', name: 'Invalid Period ID', expected: '400 Bad Request', actual: `${res5.status}`, pass: sec05Pass });
  console.log(`SEC-05: Invalid Period ID -> Status ${res5.status} (${sec05Pass ? 'PASS' : 'FAIL'})`);

  // --- SEC-06: Invalid Status Value ---
  const res6 = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherAToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: '2026-08-28',
      attendance: [{ student_id: validStudents[0].id, status: 'cheated_excused' }],
    }),
  });
  const sec06Pass = res6.status === 400;
  results.push({ id: 'SEC-06', name: 'Invalid Status Value', expected: '400 Bad Request', actual: `${res6.status}`, pass: sec06Pass });
  console.log(`SEC-06: Invalid Status Value -> Status ${res6.status} (${sec06Pass ? 'PASS' : 'FAIL'})`);

  // --- SEC-07: Teacher Token Access to Admin Endpoint ---
  const res7 = await fetch(`${BASE_URL}/api/admin/reports-data`, {
    headers: { 'Authorization': `Bearer ${teacherAToken}` },
  });
  const sec07Pass = res7.status === 403;
  results.push({ id: 'SEC-07', name: 'Teacher Calling Admin Reports', expected: '403 Forbidden', actual: `${res7.status}`, pass: sec07Pass });
  console.log(`SEC-07: Teacher Calling Admin Reports -> Status ${res7.status} (${sec07Pass ? 'PASS' : 'FAIL'})\n`);


  // =========================================================================
  // TEST SUITE: LAYER B — FUNCTIONAL & DATA CONSISTENCY TESTS
  // =========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('   LAYER B: FUNCTIONAL RESOLUTION & DOWNSTREAM VERIFICATION            ');
  console.log('------------------------------------------------------------------------');

  // Choose a clean test date: '2026-08-26'
  const testDate = '2026-08-26';
  // Cleanup any old test session on testDate for this teacher & slot
  const { data: existingClean } = await adminClient
    .from('attendance_sessions')
    .select('id')
    .eq('teacher_id', teacherAId)
    .eq('class_id', validClassId)
    .eq('subject_id', validSubjectId)
    .eq('period_id', validPeriodId)
    .eq('session_date', testDate);

  if (existingClean && existingClean.length > 0) {
    await adminClient.from('attendance_sessions').delete().in('id', existingClean.map(s => s.id));
  }

  // --- FUNC-01: Authorized Teacher Successfully Resolves Missed Attendance ---
  const attendancePayload = validStudents.map((st, i) => ({
    student_id: st.id,
    status: i === 0 ? 'absent' : 'present', // Student 0 is Absent, others Present
  }));

  const resSave = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherAToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: testDate,
      attendance: attendancePayload,
    }),
  });

  const saveJson = await resSave.json();
  const func01Pass = resSave.status === 200 && saveJson.success === true && saveJson.session_id;
  results.push({ id: 'FUNC-01', name: 'Authorized Missed Attendance Resolution', expected: '200 Success + session_id', actual: `${resSave.status} (id: ${saveJson.session_id})`, pass: func01Pass });
  console.log(`FUNC-01: Authorized Missed Attendance Resolution -> Status ${resSave.status}, Session ID: ${saveJson.session_id} (${func01Pass ? 'PASS' : 'FAIL'})`);

  const createdSessionId = saveJson.session_id;

  // --- FUNC-02: Duplicate Session Prevention (Conflict / Idempotence) ---
  const resDup = await fetch(`${BASE_URL}/api/teacher/save-missed-attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherAToken}`,
    },
    body: JSON.stringify({
      class_id: validClassId,
      subject_id: validSubjectId,
      period_id: validPeriodId,
      session_date: testDate,
      attendance: attendancePayload,
    }),
  });
  const func02Pass = resDup.status === 409;
  results.push({ id: 'FUNC-02', name: 'Duplicate Session Prevention', expected: '409 Conflict', actual: `${resDup.status}`, pass: func02Pass });
  console.log(`FUNC-02: Duplicate Session Prevention -> Status ${resDup.status} (${func02Pass ? 'PASS' : 'FAIL'})`);

  // --- FUNC-03: Database State Verification ---
  const { data: dbSession } = await adminClient
    .from('attendance_sessions')
    .select('id, teacher_id, class_id, subject_id, status, finalized_at')
    .eq('id', createdSessionId)
    .single();

  const { data: dbPeriodAttendance } = await adminClient
    .from('period_attendance')
    .select('id, student_id, status, face_verified, override_by_teacher')
    .eq('session_id', createdSessionId);

  const presentCount = dbPeriodAttendance.filter(r => r.status === 'present').length;
  const absentCount = dbPeriodAttendance.filter(r => r.status === 'absent').length;

  const func03Pass = dbSession && dbSession.status === 'finalized' && dbPeriodAttendance.length === validStudents.length && absentCount === 1;
  results.push({ id: 'FUNC-03', name: 'Database Canonical Records Consistency', expected: `finalized status, ${validStudents.length} rows, 1 absent`, actual: `status: ${dbSession?.status}, rows: ${dbPeriodAttendance?.length}, absent: ${absentCount}`, pass: func03Pass });
  console.log(`FUNC-03: Database Canonical Records Consistency -> Status=${dbSession?.status}, Rows=${dbPeriodAttendance?.length}, Present=${presentCount}, Absent=${absentCount} (${func03Pass ? 'PASS' : 'FAIL'})`);

  // --- FUNC-04: Teacher Analytics Verification ---
  const resAnalytics = await fetch(`${BASE_URL}/api/teacher/analytics?period=All%20Time`, {
    headers: { 'Authorization': `Bearer ${teacherAToken}` },
  });
  const analyticsJson = await resAnalytics.json();
  const subjectCard = analyticsJson.subjectCards.find(c => c.subjectId === validSubjectId && c.classId === validClassId);
  const func04Pass = resAnalytics.status === 200 && subjectCard && subjectCard.totalClasses > 0;
  results.push({ id: 'FUNC-04', name: 'Teacher Analytics Integration', expected: 'Subject Card with totalClasses > 0', actual: `totalClasses: ${subjectCard?.totalClasses}, percentage: ${subjectCard?.percentage}%`, pass: func04Pass });
  console.log(`FUNC-04: Teacher Analytics Integration -> Subject: ${subjectCard?.subjectName}, Total Classes: ${subjectCard?.totalClasses}, Pct: ${subjectCard?.percentage}% (${func04Pass ? 'PASS' : 'FAIL'})`);

  // --- FUNC-05: Absence Notifications Integration ---
  const resPendingAbsence = await fetch(`${BASE_URL}/api/teacher/absence-notifications/pending`, {
    headers: { 'Authorization': `Bearer ${teacherAToken}` },
  });
  const pendingAbsenceJson = await resPendingAbsence.json();
  const absentRecord = pendingAbsenceJson.find(r => r.sessionId === createdSessionId);
  const func05Pass = resPendingAbsence.status === 200 && !!absentRecord && absentRecord.studentId === validStudents[0].id;
  results.push({ id: 'FUNC-05', name: 'Absence Notification Eligibility', expected: 'Absent student in pending list', actual: `Found: ${absentRecord ? absentRecord.studentName : 'None'} (${absentRecord?.rollNumber})`, pass: func05Pass });
  console.log(`FUNC-05: Absence Notification Eligibility -> Student: ${absentRecord?.studentName} (${absentRecord?.rollNumber}) (${func05Pass ? 'PASS' : 'FAIL'})`);

  // --- FUNC-06: Admin Reports RPC Execution ---
  const resAdminReports = await fetch(`${BASE_URL}/api/admin/reports-data?dateRange=all`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const adminReportsJson = await resAdminReports.json();
  const totalSessions = adminReportsJson.overview?.totalSessionsConducted ?? 0;
  const func06Pass = resAdminReports.status === 200 && totalSessions > 0;
  results.push({ id: 'FUNC-06', name: 'Admin Reports & RPC Aggregation', expected: 'totalSessionsConducted > 0', actual: `totalSessions: ${totalSessions}, campusPct: ${adminReportsJson.overview?.campusAttendancePct}%`, pass: func06Pass });
  console.log(`FUNC-06: Admin Reports & RPC Aggregation -> Total Sessions: ${totalSessions}, Campus Pct: ${adminReportsJson.overview?.campusAttendancePct}% (${func06Pass ? 'PASS' : 'FAIL'})`);

  // --- FUNC-07: Student App History Query ---
  const studentTestId = validStudents[1].id; // student marked present
  const { data: studentPeriodAttendance } = await adminClient
    .from('period_attendance')
    .select('id, status, session:attendance_sessions(session_date, subject:subjects(name))')
    .eq('student_id', studentTestId)
    .eq('session_id', createdSessionId);

  const func07Pass = studentPeriodAttendance && studentPeriodAttendance.length === 1 && studentPeriodAttendance[0].status === 'present';
  results.push({ id: 'FUNC-07', name: 'Student App Query Reflection', expected: '1 record with status present', actual: `status: ${studentPeriodAttendance?.[0]?.status}`, pass: func07Pass });
  console.log(`FUNC-07: Student App Query Reflection -> Status: ${studentPeriodAttendance?.[0]?.status} (${func07Pass ? 'PASS' : 'FAIL'})\n`);

  console.log('========================================================================');
  console.log('                        TEST SUMMARY MATRIX                             ');
  console.log('========================================================================');
  console.table(results);

  const allPassed = results.every(r => r.pass);
  console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'ALL TESTS PASSED WITH 100% SUCCESS' : 'SOME TESTS FAILED'}`);
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
