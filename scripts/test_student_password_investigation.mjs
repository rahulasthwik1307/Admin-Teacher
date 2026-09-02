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

async function investigate() {
  console.log('=== ADMIN STUDENT PASSWORD RESET INVESTIGATION ===\n');

  // Authenticate Admin
  const adminEmail = 'admin@nnrg.edu.in';
  const { data: adminAuth, error: aErr } = await anonClient.auth.signInWithPassword({
    email: adminEmail,
    password: 'Admin@1234',
  });
  if (aErr) throw new Error(`Admin login failed: ${aErr.message}`);
  const adminToken = adminAuth.session.access_token;
  console.log(`[AUTH] Admin authenticated (${adminEmail})\n`);

  // Target test student
  const testRoll = '227Z1A6775';
  const testEmail = `${testRoll.toLowerCase()}@nnrg.student`;
  const { data: studentUser } = await adminClient.from('users').select('id, full_name, role').eq('email', testEmail).single();
  console.log(`[TEST STUDENT] ID: ${studentUser.id}, Name: ${studentUser.full_name}, Role: ${studentUser.role}`);

  // 1. Call Admin Reset Password API
  console.log('\nStep 1: Calling POST /api/admin/reset-password for student...');
  const resReset = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ userId: studentUser.id }),
  });
  const resetJson = await resReset.json();
  console.log(`Admin Reset API Response Status: ${resReset.status}`, resetJson);

  // 2. Try to log in with Student@1234
  console.log('\nStep 2: Testing login with canonical Student@1234...');
  const { data: authStudentPass, error: errStudentPass } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: 'Student@1234',
  });
  console.log(`Login with "Student@1234": ${authStudentPass?.user ? 'SUCCESS' : 'FAILED'}`);
  if (errStudentPass) console.log(`  -> Error: ${errStudentPass.message} (status ${errStudentPass.status})`);

  // 3. Try to log in with Teacher@1234
  console.log('\nStep 3: Testing login with Teacher@1234...');
  const { data: authTeacherPass, error: errTeacherPass } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: 'Teacher@1234',
  });
  console.log(`Login with "Teacher@1234": ${authTeacherPass?.user ? 'SUCCESS' : 'FAILED'}`);
  if (authTeacherPass?.user) {
    console.log(`  -> PROVEN: The password was actually reset to "Teacher@1234"!`);
  }

  // 4. Restore test student password back to Student@1234 for safety
  await adminClient.auth.admin.updateUserById(studentUser.id, { password: 'Student@1234' });
  console.log('\n[RESTORED] Test student password restored to Student@1234.');
}

investigate().catch(err => console.error('Investigation error:', err));
