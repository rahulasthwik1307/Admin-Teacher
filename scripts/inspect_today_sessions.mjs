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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const today = new Date().toISOString().split('T')[0];
  console.log('--- Today Date UTC ---', today);
  const { data: sessions, error } = await supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      status,
      opened_at,
      class_id,
      subject_id,
      period_id,
      classes(id, name, section, year),
      subjects(id, name),
      periods(id, period_number)
    `)
    .eq('session_date', today);

  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log(`Found ${sessions?.length || 0} sessions for today (${today}):`);
  sessions?.forEach((s, idx) => {
    console.log(`\n[Session ${idx + 1}]`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Class: ${s.classes?.name}-${s.classes?.section} (${s.classes?.year})`);
    console.log(`  Subject: ${s.subjects?.name}`);
    console.log(`  Period: ${s.periods?.period_number}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Opened At: ${s.opened_at}`);
  });
}

check().catch(console.error);
