const { io } = require('socket.io-client');
const assert = require('assert');

async function testParticipantBarGraph() {
  console.log('🧪 Testing Realtime Participant Answer Bar Graph Broadcast...');

  const serverUrl = 'http://localhost:3000';
  const hostSocket = io(serverUrl, { reconnection: false });
  const playerSocket = io(serverUrl, { reconnection: false });

  await new Promise(resolve => hostSocket.on('connect', resolve));
  await new Promise(resolve => playerSocket.on('connect', resolve));

  const roomData = await new Promise(resolve => {
    hostSocket.emit('create_game', { quizId: 'q1' });
    hostSocket.on('game_created', resolve);
  });

  await new Promise(resolve => {
    playerSocket.emit('join_game', { roomCode: roomData.roomCode, nickname: 'BarGraphPlayer' });
    playerSocket.on('joined_successfully', resolve);
  });

  // Host starts game
  hostSocket.emit('start_game', { roomCode: roomData.roomCode });

  const questionEndPromise = new Promise(resolve => {
    playerSocket.on('question_end', (data) => {
      console.log('✓ Participant received question_end bar graph data:', {
        type: data.type,
        options: data.options,
        optionCounts: data.optionCounts,
        totalAnswered: data.totalAnswered
      });
      resolve(data);
    });
  });

  // Player submits answer
  playerSocket.emit('submit_answer', {
    roomCode: roomData.roomCode,
    optionIndex: 1,
    timeTakenMs: 1500
  });

  const payload = await questionEndPromise;
  assert(payload.options && payload.options.length > 0, 'Must include options array');
  assert(payload.optionCounts !== undefined, 'Must include optionCounts object');
  assert(payload.totalAnswered >= 1, 'Must count total responses');

  console.log('\n🎉 ALL PARTICIPANT BAR GRAPH BROADCAST TESTS PASSED 100%!\n');
  hostSocket.disconnect();
  playerSocket.disconnect();
  process.exit(0);
}

testParticipantBarGraph();
