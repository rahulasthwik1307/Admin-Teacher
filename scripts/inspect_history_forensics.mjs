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

async function main() {
  const deviId = 'ef2dacca-6b84-4781-bbd6-05e94e785f89';

  // 1. Get Devi's teacher details, assignments, and timetable
  const { data: deviTeacher } = await admin.from('teachers').select('id, user:users(id, email, full_name)').eq('id', deviId).single();
  console.log('Teacher:', deviTeacher);

  const { data: deviAssignments } = await admin.from('teacher_assignments').select(`
    id, subject_id, class_id,
    subject:subjects(id, name, code),
    class:classes(id, name, section, year, department:departments(code))
  `).eq('teacher_id', deviId);
  console.log('\n--- DEVI ASSIGNMENTS ---', deviAssignments);

  const { data: deviTimetables } = await admin.from('timetables').select(`
    id, day_of_week, period_id, subject_id, class_id,
    subject:subjects(id, name, code),
    class:classes(id, name, section, year, department:departments(code)),
    period:periods(id, period_number, start_time, end_time)
  `).eq('teacher_id', deviId);
  console.log('\n--- DEVI TIMETABLE SLOTS (Count: ' + deviTimetables?.length + ') ---');
  for (const tt of deviTimetables || []) {
    console.log(`  Day ${tt.day_of_week} | P${tt.period?.period_number} (${tt.period?.start_time}-${tt.period?.end_time}) | ${tt.subject?.name} | ${tt.class?.department?.code} ${tt.class?.year} Sec ${tt.class?.section}`);
  }

  // 2. Check Devi's sessions grouped by subject and class
  const { data: allDeviSessions } = await admin.from('attendance_sessions').select(`
    id, session_date, subject_id, class_id, period_id, status, finalized_at,
    subject:subjects(id, name),
    class:classes(id, name, section, year, department:departments(code)),
    period:periods(period_number, start_time, end_time)
  `).eq('teacher_id', deviId);

  console.log('\n--- ALL SESSIONS IN DB FOR DEVI (Total: ' + allDeviSessions?.length + ') ---');
  const subjClassMap = {};
  for (const s of allDeviSessions || []) {
    const key = `${s.subject?.name} || ${s.class?.department?.code} ${s.class?.year} Sec ${s.class?.section}`;
    subjClassMap[key] = (subjClassMap[key] || 0) + 1;
  }
  console.log('Sessions breakdown by Subject & Class in DB:', subjClassMap);

  // 3. Check period_attendance rows for Devi's sessions
  // Query in chunks of 50
  const sessionIds = (allDeviSessions || []).map(s => s.id);
  const CHUNK_SIZE = 50;
  let totalPresent = 0;
  let totalAbsent = 0;
  const sessionsWithAttendance = new Set();
  const sessionAttendanceCounts = {};

  for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
    const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
    const { data: pRows, error: pErr } = await admin.from('period_attendance').select('session_id, status').in('session_id', chunk);
    if (pErr) console.error('Chunk error:', pErr);
    for (const r of pRows || []) {
      sessionsWithAttendance.add(r.session_id);
      if (!sessionAttendanceCounts[r.session_id]) {
        sessionAttendanceCounts[r.session_id] = { present: 0, absent: 0 };
      }
      if (r.status === 'present') {
        totalPresent++;
        sessionAttendanceCounts[r.session_id].present++;
      } else if (r.status === 'absent') {
        totalAbsent++;
        sessionAttendanceCounts[r.session_id].absent++;
      }
    }
  }

  console.log('\n--- PERIOD ATTENDANCE STATS ---');
  console.log(`Total sessions in DB: ${sessionIds.length}`);
  console.log(`Sessions with period_attendance rows: ${sessionsWithAttendance.size}`);
  console.log(`Sessions with NO period_attendance rows (orphaned 0/0 sessions): ${sessionIds.length - sessionsWithAttendance.size}`);
  console.log(`Total Present Marks: ${totalPresent}`);
  console.log(`Total Absent Marks: ${totalAbsent}`);

  // Sample sessions with actual attendance
  console.log('\nSample sessions that HAVE real attendance data:');
  let count = 0;
  for (const s of allDeviSessions || []) {
    if (sessionAttendanceCounts[s.id]) {
      const counts = sessionAttendanceCounts[s.id];
      const total = counts.present + counts.absent;
      const pct = total > 0 ? Math.round((counts.present / total) * 100) : 0;
      console.log(`  - [${s.session_date}] ${s.subject?.name} (${s.class?.department?.code} ${s.class?.year} Sec ${s.class?.section}) P${s.period?.period_number}: Present=${counts.present}, Absent=${counts.absent}, Total=${total}, Pct=${pct}%`);
      count++;
      if (count >= 10) break;
    }
  }

  // Sample sessions that have NO attendance data (0/0)
  console.log('\nSample sessions that have ZERO attendance data (orphaned):');
  let zeroCount = 0;
  for (const s of allDeviSessions || []) {
    if (!sessionAttendanceCounts[s.id]) {
      console.log(`  - [${s.session_date}] ${s.subject?.name} (${s.class?.department?.code} ${s.class?.year} Sec ${s.class?.section}) P${s.period?.period_number} [ID: ${s.id}]`);
      zeroCount++;
      if (zeroCount >= 5) break;
    }
  }
}

main().catch(console.error);
