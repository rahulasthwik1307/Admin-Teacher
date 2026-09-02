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

async function testTokens() {
  console.log("=== CHECKING AUTH USERS ===");
  const { data: authUsers, error } = await adminSupabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
    return;
  }
  console.log(`Found ${authUsers.users.length} auth users:`);
  for (const u of authUsers.users.slice(0, 10)) {
    console.log(`- ${u.email} (${u.id})`);
  }
}

testTokens().catch(console.error);
