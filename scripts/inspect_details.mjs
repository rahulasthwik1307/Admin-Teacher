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

async function inspectDetails() {
  console.log("=== CHECKING TEACHERS & TEST USERS ===");
  const { data: users } = await supabase.from('users').select('id, email, full_name, role').limit(10);
  console.log("Users:", users);

  console.log("\n=== CHECKING DEPARTMENTS ===");
  const { data: depts } = await supabase.from('departments').select('id, name, code');
  console.log("Departments:", depts);

  console.log("\n=== CHECKING CLASSES (WITH DEPT & YEAR) ===");
  const { data: classes } = await supabase.from('classes').select('id, name, section, year, department_id');
  console.log("Classes:", classes);

  console.log("\n=== CHECKING TEACHER ASSIGNMENTS ===");
  const { data: asgns } = await supabase.from('teacher_assignments').select('id, teacher_id, subject_id, class_id, year');
  console.log("Assignments:", asgns);

  console.log("\n=== CHECKING TIMETABLES ===");
  const { data: tt, count: ttCount } = await supabase.from('timetables').select('id, class_id, subject_id, teacher_id, period_id, day_of_week', { count: 'exact' });
  console.log(`Timetables (Total ${ttCount}):`, tt?.slice(0, 5));

  console.log("\n=== CHECKING STUDENTS SAMPLE ===");
  const { data: students, count: stCount } = await supabase.from('students').select('id, roll_number, class_id, is_active, is_approved, year', { count: 'exact' });
  console.log(`Students (Total ${stCount}):`, students?.slice(0, 5));
}

inspectDetails().catch(console.error);
