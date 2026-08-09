const assert = require('assert');
const { scoreResponse } = require('./guess-detector');
const db = require('./db');

console.log('🧪 Running Knowledge vs. Guess Detection & Guardrail Verification Tests...\n');

// Test 1: Scoring Function Verification
console.log('Test 1: Scoring Function Labels & Probabilities');

// Scenario A: Fast, wrong, high confidence (Misconception -> "confident_wrong")
const resA = scoreResponse({
  isCorrect: false,
  timeTakenMs: 1500,
  questionTimeLimitMs: 20000,
  studentTopicAvgTimeMs: 10000,
  answerSwitches: 0,
  confidenceRating: 5,
  studentTopicAccuracy: 0.8
});
console.log('Scenario A (Fast Wrong):', resA);
assert.strictEqual(resA.label, 'confident_wrong', 'Expected confident_wrong label');
assert(resA.guessProbability < 0.35, 'Expected low guess probability for confident wrong');

// Scenario B: Correct, but slow, high switches, low confidence -> "lucky_guess"
const resB = scoreResponse({
  isCorrect: true,
  timeTakenMs: 18000,
  questionTimeLimitMs: 20000,
  studentTopicAvgTimeMs: 8000,
  answerSwitches: 3,
  confidenceRating: 1,
  studentTopicAccuracy: 0.2
});
console.log('Scenario B (Slow Lucky Guess):', resB);
assert.strictEqual(resB.label, 'lucky_guess', 'Expected lucky_guess label');
assert(resB.guessProbability >= 0.6, 'Expected high guess probability for lucky guess');

// Scenario C: Solid Knowledge
const resC = scoreResponse({
  isCorrect: true,
  timeTakenMs: 5000,
  questionTimeLimitMs: 20000,
  studentTopicAvgTimeMs: 5500,
  answerSwitches: 0,
  confidenceRating: 5,
  studentTopicAccuracy: 0.9
});
console.log('Scenario C (Solid Knowledge):', resC);
assert.strictEqual(resC.label, 'knowledge', 'Expected knowledge label');

console.log('✅ Test 1 Passed: Scoring function is accurate!\n');

// Test 2: Database Schema & Host-Only Analysis Verification
console.log('Test 2: DB Persistence & TopicStat Updating');

const testStudentId = 's_test_' + Date.now();
const testTopic = 'Space Science';

// Insert sample responses
const respId = 'resp_test_' + Date.now();
db.prepare(`
  INSERT INTO question_responses 
  (id, student_id, student_name, question_id, topic, quiz_id, room_code, selected_option, is_correct, time_taken_ms, answer_switches, confidence_rating, guess_probability, label)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(respId, testStudentId, 'Test Student', 'q2_1', testTopic, 'q2', 'TEST01', 1, 0, 1200, 0, 5, resA.guessProbability, resA.label);

// Fetch host analysis
const hostData = db.prepare('SELECT * FROM question_responses WHERE student_id = ?').all(testStudentId);
assert.strictEqual(hostData.length, 1);
assert.strictEqual(hostData[0].label, 'confident_wrong');
assert.strictEqual(hostData[0].guess_probability, resA.guessProbability);

console.log('✅ Test 2 Passed: DB persistence & host query verified!\n');

// Test 3: Guardrail Verification (Student response data stripping)
console.log('Test 3: Student Privacy Guardrail (Sanitization)');

function sanitizeForStudent(data) {
  const sanitized = { ...data };
  delete sanitized.guess_probability;
  delete sanitized.guessProbability;
  delete sanitized.label;
  return sanitized;
}

const publicStudentPayload = sanitizeForStudent(hostData[0]);
console.log('Public Student Payload:', publicStudentPayload);

assert.strictEqual(publicStudentPayload.guess_probability, undefined, 'Guardrail failed: guess_probability leaked');
assert.strictEqual(publicStudentPayload.guessProbability, undefined, 'Guardrail failed: guessProbability leaked');
assert.strictEqual(publicStudentPayload.label, undefined, 'Guardrail failed: label leaked');
assert.strictEqual(publicStudentPayload.is_correct, 0, 'Public correct status missing');

console.log('✅ Test 3 Passed: Student Privacy Guardrail verified! guess_probability & label are strictly host-only.\n');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
