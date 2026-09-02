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

async function runPostFixVerification() {
  console.log('========================================================================');
  console.log('   ADMIN PASSWORD RESET FIX — 8-POINT VERIFICATION SUITE               ');
  console.log('========================================================================\n');

  // Authenticate Admin
  const adminEmail = 'admin@nnrg.edu.in';
  const { data: adminAuth } = await anonClient.auth.signInWithPassword({
    email: adminEmail,
    password: 'Admin@1234',
  });
  const adminToken = adminAuth.session.access_token;
  console.log(`[AUTH] Admin: ${adminEmail}`);

  // Authenticate Teacher A
  const teacherAEmail = 'tchoo7@nnrg.edu.in';
  const { data: teacherAAuth } = await anonClient.auth.signInWithPassword({
    email: teacherAEmail,
    password: 'Tillu@1307',
  });
  const teacherAToken = teacherAAuth.session.access_token;
  const teacherAId = teacherAAuth.user.id;
  console.log(`[AUTH] Teacher A: ${teacherAEmail} (${teacherAId})`);

  // Target Test Student: 227Z1A6775 (SHASHANK)
  const studentRoll = '227Z1A6775';
  const studentEmail = `${studentRoll.toLowerCase()}@nnrg.student`;
  const { data: studentUser } = await adminClient.from('users').select('id, full_name, role').eq('email', studentEmail).single();
  const studentId = studentUser.id;
  console.log(`[TARGET] Student: ${studentRoll} (${studentId})`);

  // Target Test Teacher B: tcho18@nnrg.edu.in
  const teacherBEmail = 'tcho18@nnrg.edu.in';
  const { data: teacherBUser } = await adminClient.from('users').select('id, full_name, role').eq('email', teacherBEmail).single();
  const teacherBId = teacherBUser.id;
  console.log(`[TARGET] Teacher B: ${teacherBEmail} (${teacherBId})\n`);

  const results = [];

  // =========================================================================
  // TEST 1 — STUDENT RESET
  // =========================================================================
  console.log('--- TEST 1: Student Password Reset ---');
  const resStudentReset = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ userId: studentId }),
  });
  const studentResetJson = await resStudentReset.json();
  const studentResetOk = resStudentReset.status === 200 && studentResetJson.success === true;

  // Test Student@1234
  const { data: authStudentValid, error: errStudentValid } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'Student@1234',
  });
  const studentPassMatches = !!authStudentValid?.user && !errStudentValid;

  // Test Teacher@1234 (must fail)
  const { data: authStudentWrong, error: errStudentWrong } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'Teacher@1234',
  });
  const teacherPassRejected = !authStudentWrong?.user && !!errStudentWrong;

  // Check must_change_password flag
  const { data: studentRow } = await adminClient.from('users').select('must_change_password').eq('id', studentId).single();
  const studentMustChangePass = studentRow?.must_change_password === true;

  const test1Pass = studentResetOk && studentPassMatches && teacherPassRejected && studentMustChangePass;
  results.push({
    test: '1. Student Password Reset',
    details: `API: ${resStudentReset.status}, Student@1234: ${studentPassMatches ? 'OK' : 'FAIL'}, Teacher@1234: ${teacherPassRejected ? 'REJECTED' : 'ACCEPTED'}, must_change: ${studentMustChangePass}`,
    status: test1Pass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 1: Student Reset -> Student@1234=${studentPassMatches ? 'OK' : 'FAIL'}, Teacher@1234=${teacherPassRejected ? 'REJECTED' : 'UNSAFE'}, must_change=${studentMustChangePass} (${test1Pass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 2 — TEACHER RESET
  // =========================================================================
  console.log('\n--- TEST 2: Teacher Password Reset ---');
  const resTeacherReset = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ userId: teacherBId }),
  });
  const teacherResetJson = await resTeacherReset.json();
  const teacherResetOk = resTeacherReset.status === 200 && teacherResetJson.success === true;

  // Test Teacher@1234
  const { data: authTeacherValid, error: errTeacherValid } = await anonClient.auth.signInWithPassword({
    email: teacherBEmail,
    password: 'Teacher@1234',
  });
  const teacherPassMatches = !!authTeacherValid?.user && !errTeacherValid;

  // Test Student@1234 (must fail)
  const { data: authTeacherWrong, error: errTeacherWrong } = await anonClient.auth.signInWithPassword({
    email: teacherBEmail,
    password: 'Student@1234',
  });
  const studentPassRejectedForTeacher = !authTeacherWrong?.user && !!errTeacherWrong;

  // Check must_change_password flag
  const { data: teacherRow } = await adminClient.from('users').select('must_change_password').eq('id', teacherBId).single();
  const teacherMustChangePass = teacherRow?.must_change_password === true;

  const test2Pass = teacherResetOk && teacherPassMatches && studentPassRejectedForTeacher && teacherMustChangePass;
  results.push({
    test: '2. Teacher Password Reset',
    details: `API: ${resTeacherReset.status}, Teacher@1234: ${teacherPassMatches ? 'OK' : 'FAIL'}, Student@1234: ${studentPassRejectedForTeacher ? 'REJECTED' : 'ACCEPTED'}, must_change: ${teacherMustChangePass}`,
    status: test2Pass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 2: Teacher Reset -> Teacher@1234=${teacherPassMatches ? 'OK' : 'FAIL'}, Student@1234=${studentPassRejectedForTeacher ? 'REJECTED' : 'UNSAFE'}, must_change=${teacherMustChangePass} (${test2Pass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 3 — STUDENT FORGOT PASSWORD REGRESSION
  // =========================================================================
  console.log('\n--- TEST 3: Student Forgot Password Route Regression ---');
  const resForgotToken = await fetch(`${BASE_URL}/api/auth/forgot-password-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_number: studentRoll }),
  });
  const forgotTokenJson = await resForgotToken.json();
  const forgotTokenPass = resForgotToken.status === 200 && !!forgotTokenJson.access_token && !!forgotTokenJson.refresh_token;
  results.push({
    test: '3. Student Forgot Password Route',
    details: `Status: ${resForgotToken.status}, Tokens returned: ${forgotTokenPass}`,
    status: forgotTokenPass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 3: Forgot Password Route -> Status ${resForgotToken.status}, Access/Refresh Tokens generated (${forgotTokenPass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 4 — STUDENT ACTIVATION REGRESSION
  // =========================================================================
  console.log('\n--- TEST 4: Student Activation Logic Regression ---');
  // With student having reset password to Student@1234:
  // Account has face approved (is_approved=true), so Activate Account screen detects "already activated"
  const { data: studentApprovalCheck } = await adminClient.from('students').select('is_approved, is_rejected, embedding_a').eq('id', studentId).single();
  const activationLogicPass = studentApprovalCheck && studentApprovalCheck.is_approved === true && studentApprovalCheck.embedding_a !== null;
  results.push({
    test: '4. Student Activation State Consistency',
    details: `is_approved: ${studentApprovalCheck?.is_approved}, has_face: ${!!studentApprovalCheck?.embedding_a}`,
    status: activationLogicPass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 4: Student Activation State -> is_approved=${studentApprovalCheck?.is_approved}, face_embedding=${!!studentApprovalCheck?.embedding_a} (${activationLogicPass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 5 — NORMAL STUDENT SIGN IN
  // =========================================================================
  console.log('\n--- TEST 5: Normal Student Sign In (Existing Credentials) ---');
  // Change student's password to a custom password "CustomPassword@999" to simulate an active existing student
  await adminClient.auth.admin.updateUserById(studentId, { password: 'CustomPassword@999' });
  await adminClient.from('users').update({ must_change_password: false }).eq('id', studentId);

  const { data: authCustom, error: errCustom } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'CustomPassword@999',
  });
  const normalSignInPass = !!authCustom?.user && !errCustom;

  // Restore test student password to Student@1234
  await adminClient.auth.admin.updateUserById(studentId, { password: 'Student@1234' });

  results.push({
    test: '5. Normal Student Sign In',
    details: `Custom password login: ${normalSignInPass ? 'SUCCESS' : 'FAIL'}`,
    status: normalSignInPass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 5: Normal Student Sign In -> Custom password login ${normalSignInPass ? 'OK' : 'FAIL'} (${normalSignInPass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 6 — ADMIN AUTHORIZATION
  // =========================================================================
  console.log('\n--- TEST 6: Admin Reset Authorization Protection ---');
  // 1. Unauthenticated
  const resUnauth = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: studentId }),
  });
  const unauthBlocked = resUnauth.status === 401;

  // 2. Teacher caller
  const resTeacherCall = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherAToken}` },
    body: JSON.stringify({ userId: studentId }),
  });
  const teacherBlocked = resTeacherCall.status === 403;

  const authProtectionPass = unauthBlocked && teacherBlocked;
  results.push({
    test: '6. Admin Endpoint Authorization',
    details: `Unauthenticated: ${resUnauth.status} (expected 401), Teacher: ${resTeacherCall.status} (expected 403)`,
    status: authProtectionPass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 6: Admin Authorization -> Unauthenticated=${resUnauth.status}, Teacher=${resTeacherCall.status} (${authProtectionPass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 7 — AUDIT LOG
  // =========================================================================
  console.log('\n--- TEST 7: Audit Log Verification ---');
  const { data: recentLogs } = await adminClient
    .from('system_logs')
    .select('action_type, description, performed_by, created_at')
    .eq('action_type', 'reset')
    .order('created_at', { ascending: false })
    .limit(2);

  const studentLogEntry = recentLogs?.find(l => l.description.includes('student'));
  const teacherLogEntry = recentLogs?.find(l => l.description.includes('teacher'));

  // Ensure zero plaintext passwords exist in logs
  const noPlaintextInLogs = !recentLogs?.some(l => l.description.includes('Student@1234') || l.description.includes('Teacher@1234'));

  const auditLogPass = !!studentLogEntry && !!teacherLogEntry && noPlaintextInLogs;
  results.push({
    test: '7. Role-Aware Audit Logging',
    details: `Student Log: "${studentLogEntry?.description}", Teacher Log: "${teacherLogEntry?.description}", No plaintext: ${noPlaintextInLogs}`,
    status: auditLogPass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 7: Audit Log -> Student Log: "${studentLogEntry?.description}" | Teacher Log: "${teacherLogEntry?.description}" | No Plaintext=${noPlaintextInLogs} (${auditLogPass ? 'PASS' : 'FAIL'})`);

  // =========================================================================
  // TEST 8 — ATTENDANCE REGRESSION
  // =========================================================================
  console.log('\n--- TEST 8: Attendance System Regression Check ---');
  const resMissed = await fetch(`${BASE_URL}/api/teacher/missed-attendance?days=30`, {
    headers: { 'Authorization': `Bearer ${teacherAToken}` },
  });
  const missedJson = await resMissed.json();
  const attendancePass = resMissed.status === 200 && Array.isArray(missedJson);

  results.push({
    test: '8. Attendance System Non-Regression',
    details: `Missed Attendance API: ${resMissed.status}, Array valid: ${Array.isArray(missedJson)}, Count: ${missedJson?.length ?? 0}`,
    status: attendancePass ? 'PASS' : 'FAIL',
  });
  console.log(`Test 8: Attendance Non-Regression -> Status ${resMissed.status}, ${missedJson?.length} slots intact (${attendancePass ? 'PASS' : 'FAIL'})\n`);

  console.log('========================================================================');
  console.log('                 POST-FIX VERIFICATION SUMMARY MATRIX                   ');
  console.log('========================================================================');
  console.table(results);

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\nOVERALL POST-FIX RESULT: ${allPassed ? 'ALL 8 TESTS PASSED WITH 100% SUCCESS' : 'FAILURES DETECTED'}`);
}

runPostFixVerification().catch(err => {
  console.error('Post-Fix Verification Fatal Error:', err);
  process.exit(1);
});
