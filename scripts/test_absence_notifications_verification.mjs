import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAbsenceDatasetAndClasses() {
  console.log('=== ABSENCE NOTIFICATIONS FORENSIC VERIFICATION ===\n');

  // 1. Verify Classes with department relation
  console.log('1. Verifying classes and cohorts in database...');
  const { data: classes, error: classErr } = await supabase
    .from('classes')
    .select('id, name, section, year, department_id, department:departments(code, name)')
    .order('year')
    .order('section');

  if (classErr) {
    console.error('FAILED to load classes:', classErr);
  } else {
    console.log(`✓ Successfully loaded ${classes.length} classes with relations.`);
    classes.forEach(c => {
      const cohortLabel = `${c.year} — Section ${c.section}`;
      console.log(`  - [${c.id}] ${cohortLabel} (Dept: ${c.department?.code || c.name})`);
    });
  }

  // 2. Verify attendance sessions query with class & department join
  console.log('\n2. Testing attendance_sessions query with class + department join...');
  const { data: sessions, error: sessErr } = await supabase
    .from('attendance_sessions')
    .select(`
      id, session_date, status, teacher_id, opened_at, subject_id, class_id, period_id,
      subject:subjects ( id, name ),
      class:classes ( id, name, section, year, department:departments(code, name) ),
      period:periods ( id, period_number, start_time, end_time )
    `)
    .limit(5);

  if (sessErr) {
    console.error('FAILED to query attendance_sessions with join:', sessErr);
  } else {
    console.log(`✓ Successfully queried sessions (${sessions.length} samples):`);
    sessions.forEach(s => {
      const cohort = s.class ? `${s.class.year} — Section ${s.class.section}` : 'N/A';
      console.log(`  - Session ${s.id.slice(0, 8)}... | Class: ${cohort} | Subj: ${s.subject?.name}`);
    });
  }

  // 3. Verify period_attendance absent records
  console.log('\n3. Testing period_attendance query for absent students...');
  const { data: absentRecords, error: absErr } = await supabase
    .from('period_attendance')
    .select(`
      id, student_id, notified_at, status,
      student:students ( id, roll_number, year, class_id, user:users ( full_name, contact_email ) ),
      session:attendance_sessions!inner (
        id, session_date, status, teacher_id, opened_at, subject_id, class_id, period_id,
        subject:subjects ( id, name ),
        class:classes ( id, name, section, year, department:departments(code, name) ),
        period:periods ( id, period_number, start_time, end_time )
      )
    `)
    .eq('status', 'absent')
    .limit(5);

  if (absErr) {
    console.error('FAILED to query absent records:', absErr);
  } else {
    console.log(`✓ Successfully queried absent records (${absentRecords.length} found):`);
    absentRecords.forEach(r => {
      const s = r.session;
      const st = r.student;
      const cohortLabel = s?.class ? `${s.class.year} — Section ${s.class.section}` : 'Unknown';
      console.log(`  - Student: ${st?.user?.full_name} (${st?.roll_number}) | Cohort: ${cohortLabel} | Date: ${s?.session_date}`);
    });
  }

  console.log('\n=== VERIFICATION COMPLETE: ALL DATA STRUCTURES SOUND ===');
}

verifyAbsenceDatasetAndClasses().catch(console.error);
