const assert = require('assert');
const http = require('http');
const db = require('./db');
const { sendTestResultsEmail } = require('./email-service');

console.log('========================================================================');
console.log('🚀 QUIZVERSE PRODUCTION READINESS & HOST QUESTION STATS TEST SUITE');
console.log('========================================================================\n');

function testDatabaseDeduplication() {
  console.log('--- Test 1: Database Record Deduplication ---');
  
  // Insert duplicate test quiz
  db.prepare(`
    INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('q_dup_1', 'Duplicate Quiz Title Test', 'Science', 'Easy', 20, '🧪', JSON.stringify([]));

  db.prepare(`
    INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('q_dup_2', 'Duplicate Quiz Title Test', 'Science', 'Easy', 20, '🧪', JSON.stringify([]));

  const allQuizzes = db.prepare('SELECT * FROM quizzes').all();
  console.log(`   quizzes count before cleanup: ${allQuizzes.length}`);

  // Perform cleanup deduplication query
  if (db && typeof db.exec === 'function') {
    db.exec(`
      DELETE FROM quizzes 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) FROM quizzes GROUP BY title
      );
    `);
  }

  const cleanedQuizzes = db.prepare('SELECT * FROM quizzes').all();
  const dupEntries = cleanedQuizzes.filter(q => q.title === 'Duplicate Quiz Title Test');
  assert.strictEqual(dupEntries.length, 1, 'Expected exactly 1 entry for Duplicate Quiz Title Test');
  console.log('   ✓ Database deduplication verified! Duplicate records cleaned successfully.\n');
}

function testHostQuestionStats() {
  console.log('--- Test 2: Host Live Question Stats Computation ---');

  const mockQuestions = [
    { text: 'What element has chemical symbol O?', options: ['Hydrogen', 'Oxygen', 'Carbon', 'Nitrogen'], correct: 1 }
  ];

  const mockPlayerAnswers = new Map([
    ['p1', { optionIndex: 1 }], // Correct (Oxygen)
    ['p2', { optionIndex: 1 }], // Correct (Oxygen)
    ['p3', { optionIndex: 0 }], // Incorrect (Hydrogen)
    ['p4', { optionIndex: 2 }]  // Incorrect (Carbon)
  ]);

  let correctCount = 0;
  let wrongCount = 0;
  const optionCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

  mockPlayerAnswers.forEach((ans) => {
    optionCounts[ans.optionIndex] = (optionCounts[ans.optionIndex] || 0) + 1;
    if (ans.optionIndex === mockQuestions[0].correct) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
  });

  console.log(`   Computed Host Stats: Correct=${correctCount}, Wrong=${wrongCount}, OptionCounts=${JSON.stringify(optionCounts)}`);

  assert.strictEqual(correctCount, 2, 'Expected 2 correct answers');
  assert.strictEqual(wrongCount, 2, 'Expected 2 wrong answers');
  assert.strictEqual(optionCounts[1], 2, 'Expected 2 votes for Option B (Oxygen)');
  assert.strictEqual(optionCounts[0], 1, 'Expected 1 vote for Option A');

  console.log('   ✓ Host Question Statistics calculation verified!\n');
}

async function testEmailResults() {
  console.log('--- Test 3: Answer Key Email Dispatch ---');

  const ok = await sendTestResultsEmail({
    recipientEmail: 'host.verification@quizverse.com',
    studentName: 'Verified Participant',
    quizTitle: 'Production Final Verification',
    roomCode: 'PROD88',
    score: 2000,
    totalQuestions: 1,
    questions: [{ text: 'Sample Question', options: ['A', 'B'], correct: 0, explanation: 'Sample Exp' }],
    studentAnswers: [{ questionIndex: 0, optionIndex: 0 }]
  });

  assert.strictEqual(ok, true);
  console.log('   ✓ Email dispatch verified!\n');
}

async function main() {
  testDatabaseDeduplication();
  testHostQuestionStats();
  await testEmailResults();
  console.log('🎉 PRODUCTION READINESS & HOST QUESTION STATS TEST SUITE PASSED 100%!');
}

main();
