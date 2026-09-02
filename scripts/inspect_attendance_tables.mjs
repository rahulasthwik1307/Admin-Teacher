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

async function inspectAttendance() {
  console.log("=== ATTENDANCE_SESSIONS ===");
  const { data: sess, count: sessCount } = await supabase.from('attendance_sessions').select('*', { count: 'exact' }).limit(3);
  console.log("Count:", sessCount);
  console.log("Sample:", sess);

  console.log("\n=== PERIOD_ATTENDANCE ===");
  const { data: pa, count: paCount } = await supabase.from('period_attendance').select('*', { count: 'exact' }).limit(3);
  console.log("Count:", paCount);
  console.log("Sample:", pa);

  console.log("\n=== DAILY_ATTENDANCE ===");
  const { data: da, count: daCount } = await supabase.from('daily_attendance').select('*', { count: 'exact' }).limit(3);
  console.log("Count:", daCount);
  console.log("Sample:", da);
}

inspectAttendance().catch(console.error);
