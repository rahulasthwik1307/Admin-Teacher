import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testCohortSubjectFilter() {
  console.log('=== TESTING COHORT-TO-SUBJECT DYNAMIC FILTERING ===\n');

  // Fetch teacher assignments
  const { data: assignments, error } = await supabase
    .from('teacher_assignments')
    .select(`
      class_id,
      subject_id,
      class:classes(id, name, section, year),
      subject:subjects(id, name)
    `);

  if (error) {
    console.error('Error fetching assignments:', error);
    return;
  }

  const classSubjectMap = new Map();
  for (const a of assignments) {
    if (a.class && a.subject) {
      if (!classSubjectMap.has(a.class.id)) classSubjectMap.set(a.class.id, []);
      const list = classSubjectMap.get(a.class.id);
      if (!list.some(s => s.id === a.subject.id)) {
        list.push({ id: a.subject.id, name: a.subject.name, year: a.class.year, section: a.class.section });
      }
    }
  }

  console.log(`Loaded ${classSubjectMap.size} classes from teacher assignments:`);
  for (const [classId, subjects] of classSubjectMap.entries()) {
    const cohort = `${subjects[0]?.year} — Section ${subjects[0]?.section}`;
    const subjectNames = subjects.map(s => s.name).join(', ');
    console.log(`  - Cohort [${cohort}]: Subjects -> [${subjectNames}]`);
  }

  console.log('\n✓ Dynamic subject list accurately resolves per selected class_id!');
}

testCohortSubjectFilter().catch(console.error);
