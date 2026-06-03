const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const envLines = envFile.split('\n');
const envVars = {};
for (const line of envLines) {
  if (line && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('Fetching geofence settings...');
  const { data, error } = await supabase
    .from('geofence_settings')
    .select('id, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data.length <= 1) {
    console.log('No old rows to delete. Total rows:', data.length);
    return;
  }

  const latestId = data[0].id;
  console.log(`Latest ID is ${latestId}. Keeping this one.`);

  const idsToDelete = data.slice(1).map(row => row.id);
  console.log('Deleting older rows:', idsToDelete);

  const { error: deleteError } = await supabase
    .from('geofence_settings')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting rows:', deleteError);
  } else {
    console.log('Successfully deleted old rows.');
  }
}

cleanup();
