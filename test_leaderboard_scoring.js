const assert = require('assert');
const { io: ioClient } = require('socket.io-client');

console.log('🧪 Running Test Suite for Mid-Game Leaderboard & Speed-Based Correctness Scoring...\n');

async function testLeaderboardAndScoring() {
  const SERVER_URL = 'http://localhost:3000';

  const hostSocket = ioClient(SERVER_URL, { reconnection: false });
  const fastPlayerSocket = ioClient(SERVER_URL, { reconnection: false });
  const slowPlayerSocket = ioClient(SERVER_URL, { reconnection: false });
  const wrongPlayerSocket = ioClient(SERVER_URL, { reconnection: false });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { connected++; if (connected === 4) resolve(); };
    hostSocket.on('connect', check);
    fastPlayerSocket.on('connect', check);
    slowPlayerSocket.on('connect', check);
    wrongPlayerSocket.on('connect', check);
  });

  console.log('✓ All 4 sockets (Host + 3 Players) connected.');

  const testQuiz = {
    id: 'quiz_speed_lb_test',
    title: 'Speed & Leaderboard Test',
    timeLimit: 20,
    questions: [
      {
        id: 'q1',
        text: 'What is 5 + 5?',
        type: 'mcq',
        options: ['10', '15', '20', '25'],
        correct: 0,
        points: 1000
      },
      {
        id: 'q2',
        text: 'What is 2 + 2?',
        type: 'mcq',
        options: ['3', '4', '5', '6'],
        correct: 1,
        points: 1000
      }
    ]
  };

  // 1. Host creates game
  let roomCode = null;
  await new Promise((resolve) => {
    hostSocket.emit('create_game', { quizId: testQuiz.id, quiz: testQuiz });
    hostSocket.on('game_created', (data) => {
      roomCode = data.roomCode;
      console.log(`✓ Room created: ${roomCode}`);
      resolve();
    });
  });

  // 2. Players join: FastPlayer, SlowPlayer, WrongPlayer (all start with 0 points)
  await Promise.all([
    new Promise(res => { fastPlayerSocket.emit('join_game', { roomCode, nickname: 'FastAlice' }); fastPlayerSocket.once('joined_successfully', res); }),
    new Promise(res => { slowPlayerSocket.emit('join_game', { roomCode, nickname: 'SlowBob' }); slowPlayerSocket.once('joined_successfully', res); }),
    new Promise(res => { wrongPlayerSocket.emit('join_game', { roomCode, nickname: 'WrongCharlie' }); wrongPlayerSocket.once('joined_successfully', res); })
  ]);

  console.log('✓ 3 Players joined. Starting scores are 0.');

  // 3. Start Game -> Question 1
  await new Promise((resolve) => {
    fastPlayerSocket.once('question_show', () => resolve());
    hostSocket.emit('start_game', { roomCode });
  });
  console.log('✓ Game started, Q1 active.');

  // 4. Submit Answers:
  // - FastAlice: Correct (opt 0), fast time (1000ms out of 20000ms)
  // - SlowBob: Correct (opt 0), slow time (15000ms out of 20000ms)
  // - WrongCharlie: Wrong (opt 1), fast time (1000ms)
  fastPlayerSocket.emit('submit_answer', { roomCode, optionIndex: 0, timeTakenMs: 1000, timeRemaining: 19, nickname: 'FastAlice' });
  slowPlayerSocket.emit('submit_answer', { roomCode, optionIndex: 0, timeTakenMs: 15000, timeRemaining: 5, nickname: 'SlowBob' });
  wrongPlayerSocket.emit('submit_answer', { roomCode, optionIndex: 1, timeTakenMs: 1000, timeRemaining: 19, nickname: 'WrongCharlie' });

  // Wait a moment for submissions to register
  await new Promise(r => setTimeout(r, 600));

  // 5. Test Host Mid-Game Leaderboard Show
  const lbData = await new Promise((resolve) => {
    fastPlayerSocket.once('leaderboard_show', (data) => {
      resolve(data);
    });
    hostSocket.emit('show_leaderboard', { roomCode });
  });

  console.log('✓ Leaderboard broadcast received by players.');
  const lb = lbData.leaderboard;
  console.log('  Rankings:', lb.map(p => `${p.nickname}: ${p.score} pts (streak: ${p.streak})`));

  const fastAlice = lb.find(p => p.nickname === 'FastAlice');
  const slowBob = lb.find(p => p.nickname === 'SlowBob');
  const wrongCharlie = lb.find(p => p.nickname === 'WrongCharlie');

  // Verify:
  // 1) Fast Alice scored MORE than Slow Bob because of speed
  assert(fastAlice.score > slowBob.score, `FastAlice (${fastAlice.score}) should score higher than SlowBob (${slowBob.score})`);
  // 2) Wrong Charlie got ZERO points despite answering fast
  assert.strictEqual(wrongCharlie.score, 0, `WrongCharlie should have 0 points, got ${wrongCharlie.score}`);
  // 3) Fast Alice is #1
  assert.strictEqual(lb[0].nickname, 'FastAlice', 'FastAlice should be ranked #1');

  console.log('✓ Fast player got more points than slow player (Speed-based factor confirmed).');
  console.log('✓ Wrong player got 0 points despite fast response.');
  console.log('✓ Mid-game leaderboard correctly sorted by score.');

  hostSocket.disconnect();
  fastPlayerSocket.disconnect();
  slowPlayerSocket.disconnect();
  wrongPlayerSocket.disconnect();

  console.log('\n🎉 ALL TESTS PASSED: Speed scoring & Mid-game Leaderboard verified 100%!\n');
}

testLeaderboardAndScoring().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
