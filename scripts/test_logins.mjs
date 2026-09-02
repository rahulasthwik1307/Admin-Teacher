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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testAuth() {
  console.log("=== TESTING AUTH LOGINS ===");
  // Test admin
  const { data: adminAuth, error: adminErr } = await supabase.auth.signInWithPassword({
    email: 'admin@nnrg.edu.in',
    password: 'Admin@1234'
  });
  console.log("Admin login:", adminErr ? adminErr.message : `SUCCESS (${adminAuth.user.id})`);

  // Test teacher
  const { data: teacherAuth, error: teacherErr } = await supabase.auth.signInWithPassword({
    email: 'tcho07@nnrg.edu.in',
    password: 'Tillu@1307'
  });
  console.log("Teacher login (tcho07):", teacherErr ? teacherErr.message : `SUCCESS (${teacherAuth.user.id})`);
}

testAuth().catch(console.error);
