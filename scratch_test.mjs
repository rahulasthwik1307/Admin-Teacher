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

async function run() {
  const { data, error } = await supabase
    .from('period_attendance')
    .select('id, session_id, student_id, status, scanned_at, face_verified')
    .not('scanned_at', 'is', null)
    .order('scanned_at', { ascending: false })
    .limit(10);

  console.log('Error:', error);
function formatScanTime(timeStr) {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

console.log('formatScanTime test with 2026-08-20T11:58:31.019252+00:00:', formatScanTime('2026-08-20T11:58:31.019252+00:00'));
console.log('formatScanTime test with already formatted 5:34 PM:', formatScanTime('5:34 PM'));
}

run();

