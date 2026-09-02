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

async function checkTeachers() {
  const emails = ['tchoo7@nnrg.edu.in', 'tch006@nnrg.edu.in', 'tcho18@nnrg.edu.in', 'tcho10@nnrg.edu.in', 'tcho15@nnrg.edu.in', '227z1a6775@nnrg.student'];
  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Tillu@1307'
    });
    if (error) {
      // try other common test password
      const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
        email,
        password: 'Admin@1234'
      });
      if (e2) {
        console.log(`${email}: FAILED (${error.message} / ${e2.message})`);
      } else {
        console.log(`${email}: SUCCESS with Admin@1234 (id: ${d2.user.id})`);
      }
    } else {
      console.log(`${email}: SUCCESS with Tillu@1307 (id: ${data.user.id})`);
    }
  }
}

checkTeachers().catch(console.error);
