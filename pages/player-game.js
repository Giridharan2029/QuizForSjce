// ── PLAYER GAME PAGE CONTROLLER ───────────────────────────────
window.QVPlayerGamePage = {
  params: {},
  selectedOption: null,
  hasSubmitted: false,
  answerSwitches: 0,
  switchTimestamps: [],
  questionStartTimeMs: 0,
  localTimerInterval: null,
  endTimeMs: null,

  render(container, params = {}) {
    this.params = params;
    const roomCode = params.roomCode || 'XXXXXX';
    const nickname = params.nickname || (window.QVData.user ? window.QVData.user.name : 'Player');

    container.innerHTML = `
      <div class="animate-fade-in game-container">
        
        <div class="room-header">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">PLAYER LOBBY</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;">${nickname}</h2>
          </div>
          <div class="room-code-badge">${roomCode}</div>
        </div>

        <div id="player-main-view" style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
          
          <div class="card" style="width: 100%; text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎮</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 800;">You are in the Game Lobby!</h2>
            <p class="text-secondary" style="font-size: 1.1rem; margin-top: 0.5rem;">Waiting for the host to start the battle...</p>
          </div>

          <div class="card" style="width: 100%;">
            <h4 style="font-family: var(--font-heading); margin-bottom: 0.75rem;">Connected Players</h4>
            <div class="player-chips-grid" id="player-lobby-chips">
              <span class="player-chip">👤 ${nickname}</span>
            </div>
          </div>

        </div>

      </div>
    `;

    window.QVPlayerGame = this;
  },

  updateLobbyPlayers(playerList) {
    const chipsEl = document.getElementById('player-lobby-chips');
    if (chipsEl) {
      chipsEl.innerHTML = playerList.map(p => `
        <span class="player-chip">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${p.color};"></span>
          <span>${p.nickname}</span>
        </span>
      `).join('');
    }
  },

  onGameStart(totalQuestions) {
    this.cleanupTimer();
    const mainView = document.getElementById('player-main-view');
    if (mainView) {
      mainView.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <h2 style="font-family: var(--font-heading); font-size: 2rem; color: var(--accent-cyan);">🚀 Battle Starting!</h2>
          <p class="text-secondary">Get ready for Question 1...</p>
        </div>
      `;
    }
  },

  renderQuestion(data) {
    this.cleanupTimer();
    this.selectedOption = null;
    this.hasSubmitted = false;
    this.answerSwitches = 0;
    this.switchTimestamps = [];
    this.questionStartTimeMs = data.questionStartTimeMs || Date.now();
    this.endTimeMs = data.endTimeMs || (Date.now() + ((data.timeLimit || 20) * 1000));

    const mainView = document.getElementById('player-main-view');
    if (!mainView) return;

    mainView.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
        
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <span class="level-badge" style="font-size: 0.9rem;">Question ${data.questionIndex + 1} of ${data.totalQuestions} (${data.topic || 'General'})</span>
          <div class="timer-circle" id="player-timer">${data.timeLimit || 20}</div>
        </div>

        <div class="question-box">
          ${data.questionText}
        </div>

        <!-- Options Grid -->
        <div class="options-grid">
          ${(data.options || []).map((opt, idx) => `
            <button class="option-btn opt-${idx}" id="opt-btn-${idx}" onclick="QVPlayerGamePage.selectOption(${idx})">
              <span style="font-weight: 800; opacity: 0.7;">${String.fromCharCode(65 + idx)}.</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <!-- Submit Button -->
        <button class="btn btn-primary btn-lg w-full" id="btn-submit-answer" disabled onclick="QVPlayerGamePage.confirmSubmit()">
          Lock & Submit Answer 🚀
        </button>

        <div id="player-feedback-msg" class="text-secondary" style="font-size: 0.95rem; font-weight: 600;">
          Select an option above before submitting!
        </div>

      </div>
    `;

    // Start server-authoritative local timer tick interval
    this.startLocalTimer();
  },

  selectOption(idx) {
    if (this.hasSubmitted) return;

    if (this.selectedOption !== null && this.selectedOption !== idx) {
      this.answerSwitches += 1;
      this.switchTimestamps.push(Date.now() - this.questionStartTimeMs);
    }

    this.selectedOption = idx;

    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    const btn = document.getElementById(`opt-btn-${idx}`);
    if (btn) btn.classList.add('selected');

    const submitBtn = document.getElementById('btn-submit-answer');
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  },

  confirmSubmit() {
    if (this.hasSubmitted || this.selectedOption === null) return;
    this.hasSubmitted = true;

    const submitBtn = document.getElementById('btn-submit-answer');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitted ✓';
    }

    const timeTakenMs = Math.max(100, Date.now() - this.questionStartTimeMs);

    if (window.QVGameEngine) {
      window.QVGameEngine.submitAnswer(
        this.selectedOption,
        timeTakenMs,
        this.answerSwitches,
        this.switchTimestamps
      );
    }

    // REQUIREMENT 1: Conceal correct answer & result after lock in from participants!
    const feedback = document.getElementById('player-feedback-msg');
    if (feedback) feedback.innerHTML = '<span style="color: var(--accent-cyan); font-size: 1.05rem;">Answer Locked & Submitted ✓. Moving to next question...</span>';
  },

  startLocalTimer() {
    this.cleanupTimer();
    this.localTimerInterval = setInterval(() => {
      if (!this.endTimeMs) return;

      const remainingMs = Math.max(0, this.endTimeMs - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);

      this.updateTimer(remainingSec);

      if (remainingMs <= 0) {
        this.cleanupTimer();
        if (!this.hasSubmitted && this.selectedOption !== null) {
          this.confirmSubmit();
        }
      }
    }, 250);
  },

  cleanupTimer() {
    if (this.localTimerInterval) {
      clearInterval(this.localTimerInterval);
      this.localTimerInterval = null;
    }
  },

  updateTimer(timeRemaining) {
    const timerEl = document.getElementById('player-timer');
    if (timerEl) {
      timerEl.textContent = timeRemaining;
      if (timeRemaining <= 5) timerEl.classList.add('timer-critical');
      else timerEl.classList.remove('timer-critical');
    }
  },

  onQuestionEnd(data) {
    this.cleanupTimer();
    // REQUIREMENT 1: Do NOT reveal correct answer or correctness to participants during test!
    const feedback = document.getElementById('player-feedback-msg');
    if (feedback) {
      feedback.innerHTML = `<span style="color: var(--text-secondary); font-size: 1rem;">Question Finished ✓. Host moving to next question...</span>`;
    }
  },

  onGameFinished(data) {
    this.cleanupTimer();
    if (window.QVAnimations) window.QVAnimations.triggerConfetti();

    const mainView = document.getElementById('player-main-view');
    if (!mainView) return;

    const leaderboard = data.leaderboard || [];

    mainView.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
        
        <div style="text-align: center;">
          <h1 style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; color: var(--accent-amber);">
            🏆 Game Finished!
          </h1>
          <p class="text-cyan font-bold" style="font-size: 1.1rem; margin-top: 0.25rem;">+150 XP Earned for Participating! 🎉</p>
          <p style="color: var(--accent-green); font-size: 0.95rem; font-weight: 600; margin-top: 0.5rem;">
            📧 Full Question Answer Keys & Results have been sent to your Email!
          </p>
        </div>

        <!-- Podium Top 3 -->
        <div class="podium-container">
          ${leaderboard[1] ? `
            <div class="podium-step podium-2">
              <div style="font-size: 1.5rem;">🥈</div>
              <div style="font-weight: 700; font-size: 0.9rem;">${leaderboard[1].nickname}</div>
              <div class="text-accent" style="font-size: 0.8rem;">${leaderboard[1].score} pts</div>
            </div>
          ` : ''}

          ${leaderboard[0] ? `
            <div class="podium-step podium-1">
              <div style="font-size: 2rem;">👑</div>
              <div style="font-weight: 800; font-size: 1.1rem;">${leaderboard[0].nickname}</div>
              <div class="text-amber" style="font-size: 0.9rem; font-weight: 700;">${leaderboard[0].score} pts</div>
            </div>
          ` : ''}

          ${leaderboard[2] ? `
            <div class="podium-step podium-3">
              <div style="font-size: 1.5rem;">🥉</div>
              <div style="font-weight: 700; font-size: 0.9rem;">${leaderboard[2].nickname}</div>
              <div class="text-accent" style="font-size: 0.8rem;">${leaderboard[2].score} pts</div>
            </div>
          ` : ''}
        </div>

        <button class="btn btn-primary btn-lg" onclick="QVApp.navigateTo('dashboard')">
          Return to Dashboard 🏠
        </button>

      </div>
    `;
  }
};
