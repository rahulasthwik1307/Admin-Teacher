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

async function inspectPoliciesAndRPCs() {
  console.log("=== INSPECTING RLS POLICIES ===");
  // Query pg_policies using an RPC or direct SQL if possible, or test table operations
  // Let's check if there are RPC functions in the database
  const testRPCs = [
    'get_admin_reports_analytics',
    'get_teacher_attendance_stats',
    'get_student_attendance_summary',
    'check_active_session',
    'student_insert_period_attendance',
    'rotate_qr_token',
    'finalize_attendance_session',
    'execute_sql'
  ];

  for (const rpc of testRPCs) {
    const { data, error } = await supabase.rpc(rpc, {});
    if (error) {
      console.log(`RPC '${rpc}' status: ${error.code} - ${error.message}`);
    } else {
      console.log(`RPC '${rpc}' exists and responded:`, data);
    }
  }
}

inspectPoliciesAndRPCs().catch(console.error);
