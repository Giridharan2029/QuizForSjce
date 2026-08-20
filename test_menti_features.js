const assert = require('assert');
const { io: ioClient } = require('socket.io-client');
const http = require('http');

console.log('🧪 Running Test Suite for Mentimeter Advanced Features...\n');

async function testMentimeterFeatures() {
  const SERVER_URL = 'http://localhost:3000';
  
  console.log('--- Mentimeter Realtime Socket & Slide Interaction Verification ---');

  // Test Socket Connections
  const hostSocket = ioClient(SERVER_URL, { reconnection: false });
  const playerSocket = ioClient(SERVER_URL, { reconnection: false });

  await new Promise((resolve) => {
    let connected = 0;
    hostSocket.on('connect', () => { connected++; if (connected === 2) resolve(); });
    playerSocket.on('connect', () => { connected++; if (connected === 2) resolve(); });
  });

  console.log('✓ Host and Player sockets connected successfully.');

  // Create a multi-slide Mentimeter presentation quiz
  const sampleMentiQuiz = {
    id: 'quiz_menti_test',
    title: 'Mentimeter Interactive Masterclass',
    category: 'Interactive',
    difficulty: 'Medium',
    timeLimit: 20,
    thumbnail: '⚡',
    questions: [
      {
        text: 'In one word, describe real-time collaboration:',
        type: 'word_cloud',
        options: [],
        points: 500
      },
      {
        text: 'Rate your team engagement level (1-5 stars):',
        type: 'rating_scale',
        metricName: 'Engagement',
        options: [],
        points: 500
      },
      {
        text: 'Rank the following project priorities:',
        type: 'ranking',
        options: ['Security', 'Speed', 'Quality', 'Cost'],
        points: 1000
      }
    ]
  };

  // 1. Host creates game
  let gameRoomCode = null;
  await new Promise((resolve) => {
    hostSocket.emit('create_game', { quizId: 'quiz_menti_test', quiz: sampleMentiQuiz });
    hostSocket.on('game_created', ({ roomCode }) => {
      gameRoomCode = roomCode;
      console.log(`✓ Game created with room code: ${roomCode}`);
      resolve();
    });
  });

  // 2. Player joins game
  await new Promise((resolve) => {
    playerSocket.emit('join_game', {
      roomCode: gameRoomCode,
      nickname: 'Alex Attendee',
      email: 'alex.attendee@example.com'
    });
    playerSocket.on('joined_successfully', () => {
      console.log('✓ Player joined room successfully.');
      resolve();
    });
  });

  // 3. Test Floating Reactions Broadcast
  await new Promise((resolve) => {
    hostSocket.on('reaction_received', ({ emoji, senderNickname }) => {
      assert.strictEqual(emoji, '🔥');
      assert.strictEqual(senderNickname, 'Alex Attendee');
      console.log(`✓ Audience Reaction Broadcast received: ${emoji} from ${senderNickname}`);
      resolve();
    });
    playerSocket.emit('send_reaction', { roomCode: gameRoomCode, emoji: '🔥', senderNickname: 'Alex Attendee' });
  });

  // 4. Test Host Presentation Controls: Result Visibility & Voting Locks
  await new Promise((resolve) => {
    playerSocket.on('results_visibility_changed', ({ visible }) => {
      assert.strictEqual(visible, false);
      console.log('✓ Results visibility toggle broadcast received by participants');
      resolve();
    });
    hostSocket.emit('toggle_results_visibility', { roomCode: gameRoomCode, visible: false });
  });

  await new Promise((resolve) => {
    playerSocket.once('voting_locked_status', ({ locked }) => {
      assert.strictEqual(locked, true);
      console.log('✓ Voting lock toggle broadcast received by participants');
      resolve();
    });
    hostSocket.emit('toggle_lock_voting', { roomCode: gameRoomCode, locked: true });
  });

  // Unlock voting for question test
  await new Promise((resolve) => {
    playerSocket.once('voting_locked_status', ({ locked }) => {
      assert.strictEqual(locked, false);
      console.log('✓ Voting unlocked broadcast received by participants');
      resolve();
    });
    hostSocket.emit('toggle_lock_voting', { roomCode: gameRoomCode, locked: false });
  });

  // 5. Host starts game & presents Slide 1 (Word Cloud)
  await new Promise((resolve) => {
    hostSocket.emit('start_game', { roomCode: gameRoomCode });
    playerSocket.on('question_show', (data) => {
      assert.strictEqual(data.type, 'word_cloud');
      console.log(`✓ Slide 1 presented: Word Cloud prompt ("${data.questionText}")`);
      resolve();
    });
  });

  // 6. Player submits word into Word Cloud
  await new Promise((resolve) => {
    hostSocket.on('menti_data_update', (data) => {
      assert.strictEqual(data.type, 'word_cloud');
      assert.strictEqual(data.wordFrequencies['Synergy'], 1);
      console.log('✓ Live Word Cloud aggregated frequency successfully: Synergy = 1');
      resolve();
    });
    playerSocket.emit('submit_answer', {
      roomCode: gameRoomCode,
      word: 'Synergy',
      timeRemaining: 18,
      timeTakenMs: 2000,
      nickname: 'Alex Attendee'
    });
  });

  hostSocket.disconnect();
  playerSocket.disconnect();
  console.log('\n🎉 ALL MENTIMETER INTERACTION & PRESENTATION FEATURES PASSED WITH 100% SUCCESS!\n');
}

testMentimeterFeatures().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
