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
  const today = new Date().toISOString().split('T')[0];
  console.log('Today:', today);
  const { data: futureSessions } = await admin
    .from('attendance_sessions')
    .select('id, session_date, status, teacher_id')
    .gt('session_date', today);

  console.log('Future sessions to delete:', futureSessions);
  if (futureSessions && futureSessions.length > 0) {
    const ids = futureSessions.map(f => f.id);
    await admin.from('period_attendance').delete().in('session_id', ids);
    await admin.from('attendance_sessions').delete().in('id', ids);
    console.log('Successfully deleted future sessions!');
  }
}

main().catch(console.error);
