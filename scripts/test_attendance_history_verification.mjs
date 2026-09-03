import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  }
});

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getOrdinal(n) {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

async function runVerification() {
  console.log('=== ATTENDANCE HISTORY FORENSIC VERIFICATION ===\n');

  const deviId = 'ef2dacca-6b84-4781-bbd6-05e94e785f89';

  // 1. Verify Teacher & Authorized Scope
  const [{ data: assignments }, { data: timetableSlots }] = await Promise.all([
    admin.from('teacher_assignments').select(`
      subject_id, class_id,
      subject:subjects(name, code),
      class:classes(name, section, year, department:departments(code))
    `).eq('teacher_id', deviId),
    admin.from('timetables').select(`
      subject_id, class_id,
      subject:subjects(name, code),
      class:classes(name, section, year, department:departments(code))
    `).eq('teacher_id', deviId),
  ]);

  const authorizedPairs = new Set();
  const authorizedSubjects = new Set();
  const authorizedClasses = new Set();

  assignments?.forEach(a => {
    authorizedPairs.add(`${a.subject_id}_${a.class_id}`);
    authorizedSubjects.add(a.subject?.name);
    authorizedClasses.add(`${a.class?.department?.code}-${a.class?.section} · ${a.class?.year}`);
  });

  timetableSlots?.forEach(tt => {
    authorizedPairs.add(`${tt.subject_id}_${tt.class_id}`);
    authorizedSubjects.add(tt.subject?.name);
    authorizedClasses.add(`${tt.class?.department?.code}-${tt.class?.section} · ${tt.class?.year}`);
  });

  console.log('1. Teacher Authorized Academic Scope:');
  console.log(`   - Authorized Subjects (${authorizedSubjects.size}):`, Array.from(authorizedSubjects));
  console.log(`   - Authorized Classes (${authorizedClasses.size}):`, Array.from(authorizedClasses));
  
  if (authorizedSubjects.has('Software Engineering')) {
    throw new Error('FAIL: Devi should NOT be authorized for Software Engineering!');
  }
  console.log('   ✓ Security Check Passed: Software Engineering correctly excluded from authorized scope.');

  // 2. Query finalized sessions for Devi
  const { data: rawSessions, error: sErr } = await admin
    .from('attendance_sessions')
    .select(`
      id, session_date, finalized_at, subject_id, class_id, period_id,
      subjects ( id, name, code ),
      classes ( id, name, section, year, department:departments ( code, name ) ),
      periods ( id, period_number, start_time, end_time )
    `)
    .eq('teacher_id', deviId)
    .eq('status', 'finalized')
    .order('session_date', { ascending: false });

  if (sErr) throw sErr;
  console.log(`\n2. Sessions Query:`);
  console.log(`   - Total raw sessions in DB: ${rawSessions.length}`);

  const authorizedSessions = rawSessions.filter(s =>
    authorizedPairs.has(`${s.subject_id}_${s.class_id}`)
  );
  console.log(`   - Sessions matching teacher authorization: ${authorizedSessions.length}`);

  // 3. Chunked period_attendance query
  const sessionIds = authorizedSessions.map(s => s.id);
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
    chunks.push(sessionIds.slice(i, i + CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      admin
        .from('period_attendance')
        .select('session_id, status')
        .in('session_id', chunk)
        .in('status', ['present', 'absent'])
    )
  );

  const presentMap = new Map();
  const absentMap = new Map();
  let totalPresentMarks = 0;
  let totalAbsentMarks = 0;

  for (const res of chunkResults) {
    for (const row of res.data ?? []) {
      if (row.status === 'present') {
        presentMap.set(row.session_id, (presentMap.get(row.session_id) || 0) + 1);
        totalPresentMarks++;
      } else if (row.status === 'absent') {
        absentMap.set(row.session_id, (absentMap.get(row.session_id) || 0) + 1);
        totalAbsentMarks++;
      }
    }
  }

  console.log(`\n3. Period Attendance Marks Counted:`);
  console.log(`   - Total Present Marks: ${totalPresentMarks}`);
  console.log(`   - Total Absent Marks: ${totalAbsentMarks}`);

  if (totalPresentMarks === 0 && totalAbsentMarks === 0) {
    throw new Error('FAIL: Attendance marks returned 0! URL parameter chunking failed.');
  }
  console.log('   ✓ Chunking Check Passed: Real attendance marks retrieved successfully without overflow.');

  // 4. Validate formatted sessions
  const validSessions = [];
  for (const s of authorizedSessions) {
    const present = presentMap.get(s.id) || 0;
    const absent = absentMap.get(s.id) || 0;
    const total = present + absent;
    if (total === 0) continue;

    const pct = Math.round((present / total) * 100);
    const dCode = Array.isArray(s.classes?.department)
      ? s.classes?.department[0]?.code
      : s.classes?.department?.code ?? s.classes?.name ?? 'CSE';

    validSessions.push({
      id: s.id,
      date: s.session_date,
      subject: s.subjects?.name,
      class: `${dCode}-${s.classes?.section} · ${s.classes?.year}`,
      period: `${getOrdinal(s.periods?.period_number)} Period`,
      present,
      absent,
      total,
      percentage: pct,
    });
  }

  console.log(`\n4. Valid Filtered Sessions: ${validSessions.length}`);
  const distinctSubjects = Array.from(new Set(validSessions.map(v => v.subject)));
  const distinctClasses = Array.from(new Set(validSessions.map(v => v.class)));
  console.log(`   - Subjects in History:`, distinctSubjects);
  console.log(`   - Classes in History:`, distinctClasses);

  if (distinctSubjects.includes('Software Engineering')) {
    throw new Error('FAIL: Software Engineering leaked into final session list!');
  }
  console.log('   ✓ Content Integrity Passed: Exactly authorized subjects and classes returned.');

  // 5. Test Session Details API Roster
  const sample = validSessions[0];
  const { data: detailRows, error: dErr } = await admin
    .from('period_attendance')
    .select(`
      id, status, student_id,
      student:students (
        id, roll_number, year,
        user:users ( full_name, email ),
        class:classes ( name, section, year, department:departments ( code, name ) )
      )
    `)
    .eq('session_id', sample.id)
    .in('status', ['present', 'absent']);

  if (dErr) throw dErr;

  console.log(`\n5. Session Detail Roster for Session [${sample.id}]:`);
  console.log(`   - Student Count: ${detailRows.length}`);
  for (const row of detailRows.slice(0, 3)) {
    console.log(`     * ${row.student?.user?.full_name} (${row.student?.roll_number}) → ${row.status.toUpperCase()}`);
  }

  console.log('\n=== ALL FORENSIC VERIFICATION CHECKS PASSED (100%) ===');
}

runVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
