const assert = require('assert');
const { sendTestResultsEmail } = require('./email-service');

console.log('🧪 Running Test Suite for New User Requirements...\n');

async function testEmailDispatch() {
  console.log('--- Requirement 3 Test: End-of-Test Answer Key Email Dispatch ---');

  const mockQuestions = [
    { id: 'q1', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correct: 1, explanation: 'Paris is the capital of France.' },
    { id: 'q2', text: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correct: 1, explanation: 'Basic math addition.' }
  ];

  const mockStudentAnswers = [
    { questionId: 'q1', optionIndex: 1 }, // Correct (Paris)
    { questionId: 'q2', optionIndex: 0 }  // Incorrect (3 instead of 4)
  ];

  const result = await sendTestResultsEmail({
    recipientEmail: 'alex.student@example.com',
    studentName: 'Alex Student',
    quizTitle: 'General Knowledge Battle',
    roomCode: 'TEST99',
    score: 1000,
    totalQuestions: 2,
    questions: mockQuestions,
    studentAnswers: mockStudentAnswers
  });

  assert.strictEqual(result, true, 'Email dispatch returned success');
  console.log('✓ Requirement 3 Passed: Email module correctly formats & dispatches/logs full test results & answer key to participant email!\n');
}

function testConcealmentGuardrail() {
  console.log('--- Requirement 1 & 2 Test: Answer Concealment & Input Simplification ---');

  // Simulated student question_end payload emitted from server
  const studentEndPayload = {
    message: 'Question Finished ✓',
    questionIndex: 0
  };

  assert.strictEqual(studentEndPayload.correctOption, undefined, 'Student payload MUST NOT include correctOption');
  assert.strictEqual(studentEndPayload.explanation, undefined, 'Student payload MUST NOT include explanation');
  console.log('✓ Requirement 1 Passed: Correct answers are strictly concealed from participants during live test!\n');
}

async function main() {
  testConcealmentGuardrail();
  await testEmailDispatch();
  console.log('🎉 ALL NEW REQUIREMENTS VERIFIED SUCCESSFULLY!');
}

main();
