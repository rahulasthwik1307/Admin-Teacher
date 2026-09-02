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
  const tables = [
    'attendance_sessions',
    'period_attendance',
    'daily_attendance',
    'classes',
    'departments',
    'subjects',
    'teachers',
    'students',
    'teacher_assignments',
    'timetables',
    'periods',
    'notifications',
    'student_push_tokens',
    'system_logs',
    'user_active_sessions'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`Table ${table} -> ERROR: ${error.message}`);
    } else {
      console.log(`\n=== TABLE: ${table} (Total rows: ${count}) ===`);
      if (data && data.length > 0) {
        const row = { ...data[0] };
        if (row.face_embedding) row.face_embedding = `[Float32Array(${row.face_embedding.length})]`;
        console.log("Columns:", Object.keys(data[0]));
        console.log("Sample:", JSON.stringify(row, null, 2));
      } else {
        console.log("(0 rows)");
      }
    }
  }
}

inspect().catch(console.error);
