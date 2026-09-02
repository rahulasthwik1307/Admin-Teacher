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

async function inspectTimetables() {
  const { data: tt } = await supabase.from('timetables').select('day_of_week');
  const dows = [...new Set((tt || []).map(t => t.day_of_week))];
  console.log("Distinct day_of_week in timetables:", dows.sort());
}

inspectTimetables().catch(console.error);
