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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log("--- TABLES & ROW COUNTS ---");
  const knownTables = [
    'attendance_sessions',
    'attendance_records',
    'attendance_events',
    'attendance_audit_logs',
    'timetable_slots',
    'class_schedules',
    'users',
    'profiles',
    'students',
    'teachers',
    'subjects',
    'departments',
    'academic_years',
    'classes',
    'sections',
    'teacher_assignments',
    'student_classes',
    'notifications',
    'student_notifications',
    'student_push_tokens',
    'push_tokens',
    'system_logs',
    'audit_logs',
    'user_active_sessions'
  ];

  for (const tbl of knownTables) {
    const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table: ${tbl} -> count: ${count}`);
    } else {
      // console.log(`Table ${tbl} error:`, error.message);
    }
  }

  for (const tbl of ['attendance_sessions', 'attendance_records', 'timetable_slots', 'teacher_assignments', 'students', 'classes', 'system_logs', 'student_notifications']) {
    const { data, error } = await supabase.from(tbl).select('*').limit(1);
    if (!error && data && data.length > 0) {
      console.log(`\nSample row for ${tbl}:`, Object.keys(data[0]));
      console.log(JSON.stringify(data[0], null, 2));
    } else if (!error && data) {
      console.log(`\nEmpty table ${tbl} (0 rows)`);
    } else {
      console.log(`\nError fetching ${tbl}:`, error?.message);
    }
  }
}

inspect().catch(console.error);
