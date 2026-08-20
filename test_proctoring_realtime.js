async function testProctoringAlerts() {
  console.log('🧪 Testing Realtime Anti-Cheat Tab & Window Switch Proctoring Alerts...');

  const serverUrl = 'http://localhost:3000';
  const hostSocket = io(serverUrl, { reconnection: false });
  const playerSocket = io(serverUrl, { reconnection: false });

  await new Promise(resolve => hostSocket.on('connect', resolve));
  console.log('✓ Host connected:', hostSocket.id);

  await new Promise(resolve => playerSocket.on('connect', resolve));
  console.log('✓ Player connected:', playerSocket.id);

  // Host creates game
  const roomData = await new Promise(resolve => {
    hostSocket.emit('create_game', { quizId: 'q1', hostNickname: 'Professor Host' });
    hostSocket.on('game_created', resolve);
  });
  console.log(`✓ Game room created: ${roomData.roomCode}`);

  // Set up proctoring alert listener on host
  const alertPromise = new Promise(resolve => {
    hostSocket.on('host_proctoring_alert', (data) => {
      console.log('✓ Host received realtime proctoring alert:', data.navEvent);
      resolve(data);
    });
  });

  // Player joins room
  await new Promise(resolve => {
    playerSocket.emit('join_game', { roomCode: roomData.roomCode, nickname: 'Alice Student' });
    playerSocket.on('joined_successfully', resolve);
  });
  console.log('✓ Player joined successfully.');

  // Simulate tab switch
  console.log('📡 Player emitting student_tab_switched...');
  playerSocket.emit('student_tab_switched', {
    roomCode: roomData.roomCode,
    studentName: 'Alice Student',
    switchCount: 1,
    targetInfo: 'Background Tab / Browser Window Switched',
    timestamp: new Date().toLocaleTimeString()
  });

  const receivedAlert = await alertPromise;
  assert(receivedAlert && receivedAlert.navEvent, 'Alert must have navEvent');
  assert.strictEqual(receivedAlert.navEvent.studentName, 'Alice Student', 'Must match student name');
  assert.strictEqual(receivedAlert.navEvent.targetInfo, 'Background Tab / Browser Window Switched', 'Must match target info');

  console.log('\n🎉 ALL PROCTORING REALTIME ALERT TESTS PASSED 100%!\n');
  hostSocket.disconnect();
  playerSocket.disconnect();
  process.exit(0);
}

testProctoringAlerts();
