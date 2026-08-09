// ── QUIZVERSE SOCKET.IO REALTIME GAME ENGINE ──────────────────
window.QVGameEngine = {
  socket: null,
  roomCode: null,
  isHost: false,
  quiz: null,
  classroom: null,
  currentQuestionIndex: 0,
  players: [],
  timerRemaining: 20,
  endTimeMs: null,
  questionStartTimeMs: null,

  initSocket() {
    if (this.socket) return this.socket;
    if (typeof io !== 'undefined') {
      this.socket = io();
      this.bindSocketEvents();
    }
    return this.socket;
  },

  bindSocketEvents() {
    if (!this.socket) return;

    this.socket.on('game_created', ({ roomCode, quiz, classroom }) => {
      this.roomCode = roomCode;
      this.quiz = quiz;
      this.classroom = classroom;
      this.isHost = true;
      if (window.QVApp) window.QVApp.navigateTo('host-panel', { roomCode, quiz, classroom });
    });

    this.socket.on('joined_successfully', ({ roomCode, nickname }) => {
      this.roomCode = roomCode;
      this.isHost = false;
      if (window.QVApp) window.QVApp.navigateTo('player-lobby', { roomCode, nickname });
    });

    this.socket.on('player_list_update', ({ playerList, playerCount }) => {
      this.players = playerList;
      if (window.QVHostPanel) window.QVHostPanel.updatePlayers(playerList, playerCount);
      if (window.QVPlayerGame) window.QVPlayerGame.updateLobbyPlayers(playerList);
    });

    this.socket.on('game_started', ({ totalQuestions }) => {
      if (window.QVPlayerGame) window.QVPlayerGame.onGameStart(totalQuestions);
    });

    this.socket.on('question_show', (data) => {
      this.endTimeMs = data.endTimeMs || (Date.now() + (data.timeLimit * 1000));
      this.questionStartTimeMs = data.questionStartTimeMs || Date.now();
      if (window.QVPlayerGame) window.QVPlayerGame.renderQuestion(data);
      if (window.QVHostPanel) window.QVHostPanel.onQuestionShow(data);
    });

    this.socket.on('timer_tick', (data) => {
      if (data.endTimeMs) this.endTimeMs = data.endTimeMs;
      // Calculate server-authoritative time remaining based on Date.now()
      if (this.endTimeMs) {
        this.timerRemaining = Math.max(0, Math.ceil((this.endTimeMs - Date.now()) / 1000));
      } else {
        this.timerRemaining = data.timeRemaining;
      }
      if (window.QVPlayerGame) window.QVPlayerGame.updateTimer(this.timerRemaining);
      if (window.QVHostPanel) window.QVHostPanel.updateTimer(this.timerRemaining);
    });

    this.socket.on('answer_count_update', (data) => {
      if (window.QVHostPanel) window.QVHostPanel.updateAnswerCounts(data);
    });

    this.socket.on('host_guess_analysis_update', (data) => {
      if (window.QVHostPanel) window.QVHostPanel.updateGuessAnalysis(data);
    });

    this.socket.on('question_end', (data) => {
      if (window.QVPlayerGame) window.QVPlayerGame.onQuestionEnd(data);
    });

    this.socket.on('host_question_end', (data) => {
      if (window.QVHostPanel) window.QVHostPanel.onQuestionEnd(data);
    });

    this.socket.on('game_finished', (data) => {
      if (window.QVData && !this.isHost) {
        window.QVData.addXp(150); // +150 XP completion reward
      }
      if (window.QVPlayerGame) window.QVPlayerGame.onGameFinished(data);
      if (window.QVHostPanel) window.QVHostPanel.onGameFinished(data);
    });

    this.socket.on('error_message', ({ message }) => {
      if (window.QVAnimations) window.QVAnimations.showToast(message, 'error');
    });
  },

  // Host Action: Create Game Room
  createGame(quizId, quizData, classroomId = null) {
    this.initSocket();
    this.socket.emit('create_game', { quizId, quiz: quizData, classroomId });
  },

  // Player Action: Join Room Code
  joinGame(roomCode, nickname, color, email) {
    this.initSocket();
    const user = window.QVData ? window.QVData.user : null;
    this.socket.emit('join_game', {
      roomCode,
      nickname: nickname || (user ? user.name : 'Player'),
      email: email || (user ? user.email : null),
      color: color || '#6c5ce7',
      studentId: user ? user.id : null,
      studentClassrooms: user ? (user.classrooms || []) : []
    });
  },

  // Host Action: Start Game
  startGame() {
    if (this.socket && this.roomCode) {
      if (window.QVData) {
        window.QVData.addXp(100, 1);
      }
      this.socket.emit('start_game', { roomCode: this.roomCode });
    }
  },

  // Host Action: Next Question
  nextQuestion() {
    if (this.socket && this.roomCode) {
      this.socket.emit('next_question', { roomCode: this.roomCode });
    }
  },

  // Player Action: Submit Answer with option switch signal telemetry
  submitAnswer(optionIndex, timeTakenMs, answerSwitches = 0, switchTimestamps = []) {
    if (this.socket && this.roomCode) {
      const user = window.QVData ? window.QVData.user : null;
      this.socket.emit('submit_answer', {
        roomCode: this.roomCode,
        optionIndex,
        timeRemaining: this.timerRemaining,
        timeTakenMs: timeTakenMs || (Date.now() - (this.questionStartTimeMs || Date.now())),
        answerSwitches,
        switchTimestamps,
        studentId: user ? user.id : null,
        nickname: user ? user.name : 'Student'
      });
    }
  }
};
