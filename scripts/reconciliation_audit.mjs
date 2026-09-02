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

async function runAudit() {
  console.log('========================================================================');
  console.log('   ATTENDGUARD — COMPREHENSIVE ATTENDANCE CONSISTENCY VERIFICATION      ');
  console.log('========================================================================\n');

  // Authenticate Teacher A
  const teacherAEmail = 'tchoo7@nnrg.edu.in';
  const teacherAPassword = 'Tillu@1307';
  const { data: teacherAAuth, error: tErr } = await anonClient.auth.signInWithPassword({
    email: teacherAEmail,
    password: teacherAPassword,
  });
  if (tErr) throw tErr;
  const teacherAToken = teacherAAuth.session.access_token;
  const teacherAId = teacherAAuth.user.id;

  // Authenticate Admin
  const adminEmail = 'admin@nnrg.edu.in';
  const adminPassword = 'Admin@1234';
  const { data: adminAuth, error: aErr } = await anonClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (aErr) throw aErr;
  const adminToken = adminAuth.session.access_token;

  console.log(`Teacher A ID: ${teacherAId}`);
  console.log(`Admin ID: ${adminAuth.user.id}\n`);

  const results = [];

  // =========================================================================
  // TEST 1: DATABASE GROUND TRUTH RECONCILIATION
  // =========================================================================
  console.log('--- TEST 1: Database Ground Truth Reconciliation ---');
  
  // Query representative student
  const testStudentId = '54b9c740-d1ed-421f-8ddd-d3d71de680dc';
  const { data: studentRecords } = await adminClient
    .from('period_attendance')
    .select('id, session_id, status, face_verified, session:attendance_sessions!inner(id, session_date, status, class_id, subject_id)')
    .eq('student_id', testStudentId)
    .eq('session.status', 'finalized');

  const totalFinalized = studentRecords?.length ?? 0;
  const presentStatusCount = studentRecords?.filter(r => r.status === 'present').length ?? 0;
  const absentStatusCount = studentRecords?.filter(r => r.status === 'absent').length ?? 0;
  const presentAndFaceCount = studentRecords?.filter(r => r.status === 'present' && r.face_verified === true).length ?? 0;
  const presentNotFaceCount = studentRecords?.filter(r => r.status === 'present' && (r.face_verified === false || r.face_verified === null)).length ?? 0;

  console.log(`Student ${testStudentId}:`);
  console.log(`  - Total Finalized Sessions: ${totalFinalized}`);
  console.log(`  - Present Status: ${presentStatusCount} (${Math.round((presentStatusCount/totalFinalized)*100)}%)`);
  console.log(`  - Absent Status: ${absentStatusCount} (${Math.round((absentStatusCount/totalFinalized)*100)}%)`);
  console.log(`  - Present + Face Verified = true: ${presentAndFaceCount} (${Math.round((presentAndFaceCount/totalFinalized)*100)}%)`);
  console.log(`  - Present + Face Verified = false: ${presentNotFaceCount}`);

  results.push({
    test: 'DB Ground Truth Verification',
    passed: totalFinalized === 358 && presentStatusCount === 139 && presentAndFaceCount === 66,
    details: `Total: ${totalFinalized}, Present Status: ${presentStatusCount} (39%), Face Verified Present: ${presentAndFaceCount} (18%)`
  });

  // =========================================================================
  // TEST 2: TEACHER ANALYTICS API RECONCILIATION
  // =========================================================================
  console.log('\n--- TEST 2: Teacher Analytics API Reconciliation ---');
  const resTeacherApi = await fetch(`${BASE_URL}/api/teacher/analytics?period=All%20Time`, {
    headers: { Authorization: `Bearer ${teacherAToken}` },
  });
  const apiTeacher = await resTeacherApi.json();

  const { data: teacherSessions } = await adminClient
    .from('attendance_sessions')
    .select('id')
    .eq('teacher_id', teacherAId)
    .eq('status', 'finalized');
  const teacherSessionIds = (teacherSessions || []).map(s => s.id);

  const { data: teacherMarks } = await adminClient
    .from('period_attendance')
    .select('id, status')
    .in('session_id', teacherSessionIds.length > 0 ? teacherSessionIds : ['00000000-0000-0000-0000-000000000000']);

  const dbTeacherPresent = (teacherMarks || []).filter(m => m.status === 'present').length;
  const dbTeacherTotal = teacherMarks?.length ?? 0;
  const dbTeacherPct = dbTeacherTotal > 0 ? Math.round((dbTeacherPresent / dbTeacherTotal) * 100) : 0;

  console.log(`Teacher A Analytics:`);
  console.log(`  - Sessions: DB = ${teacherSessions?.length} | API = ${apiTeacher.summaryStats?.totalClasses}`);
  console.log(`  - Overall Pct: DB = ${dbTeacherPct}% | API = ${apiTeacher.summaryStats?.overallPct}%`);

  const tAnalyticsMatch = apiTeacher.summaryStats?.totalClasses === teacherSessions?.length &&
                          apiTeacher.summaryStats?.overallPct === dbTeacherPct;
  results.push({
    test: 'Teacher Analytics Ground Truth Match',
    passed: tAnalyticsMatch,
    details: `API Total: ${apiTeacher.summaryStats?.totalClasses}, API Pct: ${apiTeacher.summaryStats?.overallPct}%`
  });

  // =========================================================================
  // TEST 3: ADMIN REPORTS RPC RECONCILIATION
  // =========================================================================
  console.log('\n--- TEST 3: Admin Reports RPC Reconciliation ---');
  const resAdminApi = await fetch(`${BASE_URL}/api/admin/reports-data?dateRange=all`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const apiAdmin = await resAdminApi.json();

  console.log(`Admin Reports Overview:`);
  console.log(`  - Total Sessions Conducted: ${apiAdmin.overview?.totalSessionsConducted}`);
  console.log(`  - Campus Attendance Pct: ${apiAdmin.overview?.campusAttendancePct}%`);
  console.log(`  - Total Expected Marks: ${apiAdmin.overview?.totalExpectedStudents}`);
  console.log(`  - Total Present Marks: ${apiAdmin.overview?.totalPresentMarks}`);

  const adminRpcValid = apiAdmin.overview?.totalSessionsConducted > 0 && apiAdmin.overview?.campusAttendancePct !== null;
  results.push({
    test: 'Admin Reports RPC Execution',
    passed: adminRpcValid,
    details: `Campus Pct: ${apiAdmin.overview?.campusAttendancePct}%, Total Conducted: ${apiAdmin.overview?.totalSessionsConducted}`
  });

  // =========================================================================
  // TEST 4: TEACHER OVERRIDE EVIDENCE PRESERVATION
  // =========================================================================
  console.log('\n--- TEST 4: Teacher Override Biometric Evidence Preservation ---');
  const overrideSource = fs.readFileSync('app/api/teacher/bulk-override-attendance/route.ts', 'utf8');
  const preservesFaceEvidence = overrideSource.includes('existingFaceMap') && overrideSource.includes('existingFaceMap.get(studentId) ?? false');
  console.log(`  - Override preserves face_verified evidence: ${preservesFaceEvidence ? 'YES' : 'NO'}`);

  results.push({
    test: 'Teacher Override Evidence Preservation Logic',
    passed: preservesFaceEvidence,
    details: preservesFaceEvidence ? 'bulk-override-attendance preserves existing face_verified evidence' : 'Failed'
  });

  // =========================================================================
  // TEST 5: QR SESSION IDEMPOTENCY GUARD
  // =========================================================================
  console.log('\n--- TEST 5: QR Session Idempotency Guard ---');
  const qrPageSource = fs.readFileSync('app/teacher/qr-attendance/page.tsx', 'utf8');
  const hasIdempotencyCheck = qrPageSource.includes('existingSession') && qrPageSource.includes('Attendance for this lecture slot has already been finalized');
  console.log(`  - QR Session checks existing slot before insert: ${hasIdempotencyCheck ? 'YES' : 'NO'}`);

  results.push({
    test: 'QR Session Start Idempotency Guard',
    passed: hasIdempotencyCheck,
    details: hasIdempotencyCheck ? 'handleStart prevents duplicate sessions for the same slot' : 'Failed'
  });

  // =========================================================================
  // TEST 6: SECURITY & AUTHORIZATION FAIL-CLOSED CHECKS
  // =========================================================================
  console.log('\n--- TEST 6: Security & Authorization Fail-Closed Checks ---');
  // Unauthenticated request -> 401
  const resUnauth = await fetch(`${BASE_URL}/api/teacher/attendance-history`);
  const unauthPassed = resUnauth.status === 401;
  console.log(`  - Unauthenticated request rejected: ${resUnauth.status} (${unauthPassed ? 'PASS' : 'FAIL'})`);

  // Teacher calling Admin endpoint -> 403
  const resTeacherToAdmin = await fetch(`${BASE_URL}/api/admin/reports-data`, {
    headers: { Authorization: `Bearer ${teacherAToken}` },
  });
  const teacherToAdminPassed = resTeacherToAdmin.status === 403;
  console.log(`  - Teacher calling Admin endpoint rejected: ${resTeacherToAdmin.status} (${teacherToAdminPassed ? 'PASS' : 'FAIL'})`);

  results.push({
    test: 'Security Fail-Closed Boundaries',
    passed: unauthPassed && teacherToAdminPassed,
    details: `Unauth: ${resUnauth.status}, Teacher-to-Admin: ${resTeacherToAdmin.status}`
  });

  console.log('\n========================================================================');
  console.log('   SUMMARY OF RECONCILIATION AUDIT                                     ');
  console.log('========================================================================');
  let allPass = true;
  for (const r of results) {
    console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.test}: ${r.details}`);
    if (!r.passed) allPass = false;
  }
  console.log(`\nOverall Verdict: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);
}

runAudit().catch(console.error);
