import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { buildConsolidatedAbsenceEmail } from '../lib/email-templates/absence-digest.js';

async function testEmailBuilder() {
  console.log('Testing consolidated absence email template rendering...');
  const result = buildConsolidatedAbsenceEmail({
    studentName: 'RAHUL',
    subjectGroups: [
      {
        subjectName: 'Machine Learning',
        records: [
          { date: 'Sep 2, 2026', period: 3, startTime: '11:10', endTime: '12:00' },
          { date: 'Aug 20, 2026', period: 4, startTime: '12:00', endTime: '12:50' }
        ],
        attended: 8,
        total: 10
      }
    ],
    overallAttended: 24,
    overallTotal: 30
  });

  console.log('Email subject:', result.subject);
  console.log('HTML length:', result.html.length);
  if (result.html.includes('Dear RAHUL') && result.html.includes('Machine Learning') && result.html.includes('Period 3')) {
    console.log('✓ Email template rendered with all student details correctly!');
  } else {
    throw new Error('Email template missing required content');
  }
}

testEmailBuilder().catch(console.error);
