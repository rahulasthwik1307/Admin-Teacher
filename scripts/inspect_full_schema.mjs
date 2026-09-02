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
  console.log("=== CHECKING ALL KNOWN TABLES ===");
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
    'user_active_sessions',
    'academic_years',
    'users'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(2);
    if (error) {
      console.log(`Table ${table} -> ERROR: ${error.message}`);
    } else {
      console.log(`\n--- TABLE: ${table} (Found ${data.length} sample rows) ---`);
      if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
        console.log("Sample 1:", JSON.stringify(data[0], null, 2));
      }
    }
  }
}

inspect().catch(console.error);
