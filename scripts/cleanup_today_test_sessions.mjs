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

async function cleanupTodaySessions() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[CLEANUP] Targeting sessions for today: ${today}`);

  // 1. Fetch sessions for today
  const { data: sessions, error: fetchErr } = await supabase
    .from('attendance_sessions')
    .select('id, session_date, status, class_id, subject_id, period_id')
    .eq('session_date', today);

  if (fetchErr) {
    console.error('[ERROR] Failed to query today sessions:', fetchErr);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('[INFO] No attendance sessions found for today. Database is already clean.');
    return;
  }

  const sessionIds = sessions.map(s => s.id);
  console.log(`[INFO] Found ${sessionIds.length} session(s) to delete:`, sessionIds);

  // 2. Delete child records in period_attendance
  const { error: deleteAttendanceErr, count: deletedAttendanceCount } = await supabase
    .from('period_attendance')
    .delete({ count: 'exact' })
    .in('session_id', sessionIds);

  if (deleteAttendanceErr) {
    console.error('[ERROR] Failed to delete period_attendance child rows:', deleteAttendanceErr);
    return;
  }
  console.log(`[SUCCESS] Deleted ${deletedAttendanceCount ?? 0} child row(s) from period_attendance.`);

  // 3. Delete attendance_sessions
  const { error: deleteSessionsErr, count: deletedSessionsCount } = await supabase
    .from('attendance_sessions')
    .delete({ count: 'exact' })
    .in('id', sessionIds);

  if (deleteSessionsErr) {
    console.error('[ERROR] Failed to delete attendance_sessions rows:', deleteSessionsErr);
    return;
  }
  console.log(`[SUCCESS] Deleted ${deletedSessionsCount ?? 0} row(s) from attendance_sessions.`);

  // 4. Verify clean state
  const { data: verifySessions } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('session_date', today);

  console.log(`[VERIFICATION] Remaining sessions for today: ${verifySessions?.length || 0}`);
}

cleanupTodaySessions().catch(console.error);
