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
  tabSwitchCount: 0,
  proctoringActive: false,

  render(container, params = {}) {
    this.params = params;
    const roomCode = params.roomCode || 'XXXXXX';
    const nickname = params.nickname || (window.QVData.user ? window.QVData.user.name : 'Player');
    this.tabSwitchCount = 0;

    container.innerHTML = `
      <div class="animate-fade-in game-container">
        
        <div class="room-header">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">PLAYER LOBBY</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;">${nickname}</h2>
          </div>
          <div class="room-code-badge">${roomCode}</div>
        </div>

        <!-- Anti-Cheat / Focus Warning Banner -->
        <div id="player-tab-warning-banner" style="display: none; width: 100%; background: rgba(255, 118, 117, 0.15); border: 1px solid var(--accent-red); border-radius: var(--radius-md); padding: 0.75rem 1rem; color: #ff7675; font-size: 0.85rem; font-weight: 700; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>⚠️</span>
            <span>Focus Warning: Window switched <span id="player-tab-switch-count">0</span> time(s)! Keep this test window active.</span>
          </div>
          <span class="level-badge" style="background: var(--accent-red); color: #fff;">Anti-Cheat Active</span>
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

      <!-- Proctoring Anti-Cheat Warning Modal -->
      <div id="anti-cheat-warning-modal" class="modal-overlay hidden" style="z-index: 99999;">
        <div class="modal" style="max-width: 480px; text-align: center; border-color: var(--accent-red); box-shadow: 0 0 40px rgba(255, 118, 117, 0.4);">
          <div style="font-size: 3.5rem; animation: pulse 1s infinite;">⚠️</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: #ff7675; margin-top: 0.5rem;">
            Window Switch Warning!
          </h2>
          <p style="color: #fff; font-size: 1rem; margin-top: 0.75rem; line-height: 1.5;">
            You navigated away or switched to another tab/window.
          </p>
          <div style="background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.3); border-radius: var(--radius-sm); padding: 0.75rem; margin: 1rem 0; font-size: 0.85rem; color: #fab1a0;">
            Leaving the test window is tracked and flagged on the host analysis proctoring record. Please stay on this tab to continue.
          </div>
          <button class="btn btn-primary btn-lg w-full" style="background: var(--accent-red); border-color: var(--accent-red);" onclick="QVPlayerGamePage.dismissTabWarning()">
            I Understand — Return to Quiz 🛡️
          </button>
        </div>
      </div>
    `;

    window.QVPlayerGame = this;
    this.initProctoring();
  },

  initProctoring() {
    if (this.proctoringActive) return;
    this.proctoringActive = true;

    // Window Blur / Tab change listener
    window.addEventListener('blur', () => this.handleTabSwitch());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.handleTabSwitch();
    });

    // ── ANTI-COPY PROTECTION (Block Context Menu, Selection, Copy & Inspection Keys) ──
    document.addEventListener('contextmenu', (e) => {
      if (this.currentQuestionData) {
        e.preventDefault();
        if (window.QVAnimations) window.QVAnimations.showToast('🔒 Copying / Context Menu is disabled during test!', 'warning');
        return false;
      }
    });

    document.addEventListener('copy', (e) => {
      if (this.currentQuestionData) {
        e.preventDefault();
        if (window.QVAnimations) window.QVAnimations.showToast('🔒 Question text copy is disabled!', 'warning');
        return false;
      }
    });

    document.addEventListener('selectstart', (e) => {
      if (this.currentQuestionData) {
        e.preventDefault();
        return false;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this.currentQuestionData) {
        // Block Ctrl+C, Ctrl+A, Ctrl+U, F12, PrintScreen
        if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          if (window.QVAnimations) window.QVAnimations.showToast('🔒 Shortcut disabled during quiz!', 'warning');
          return false;
        }
        if (e.key === 'PrintScreen' || e.key === 'F12') {
          e.preventDefault();
          if (window.QVAnimations) window.QVAnimations.showToast('🔒 Screenshot / Inspector key disabled!', 'warning');
          return false;
        }
      }
    });

    // Prevent accidental page redirect / navigation during active test
    window.addEventListener('beforeunload', (e) => {
      if (this.currentQuestionData && !this.hasSubmitted) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your active test progress will be lost.';
        return e.returnValue;
      }
    });
  },

  handleTabSwitch() {
    // Only warn if test is active
    if (!this.currentQuestionData) return;

    this.tabSwitchCount += 1;

    const banner = document.getElementById('player-tab-warning-banner');
    const countEl = document.getElementById('player-tab-switch-count');
    const modal = document.getElementById('anti-cheat-warning-modal');

    if (banner) banner.style.display = 'flex';
    if (countEl) countEl.textContent = this.tabSwitchCount;

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }

    // Inspect active document & window destination state
    const currentTitle = document.title || 'QuizVerse Game';
    let targetInfo = 'External Application / OS Window';
    if (document.hidden) {
      targetInfo = 'Background Tab / Browser Window Switched';
    } else if (!document.hasFocus()) {
      targetInfo = 'DevTools / Secondary Application Window Focused';
    }

    // Transmit tab switch alert to host in realtime
    if (window.QVGameEngine && window.QVGameEngine.socket) {
      window.QVGameEngine.socket.emit('student_tab_switched', {
        roomCode: this.params.roomCode,
        studentName: this.params.nickname || (window.QVData.user ? window.QVData.user.name : 'Player'),
        switchCount: this.tabSwitchCount,
        targetInfo: targetInfo,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    if (window.QVAnimations) {
      window.QVAnimations.showToast(`⚠️ Warning: Tab switch #${this.tabSwitchCount} detected! (${targetInfo})`, 'error');
    }
  },

  dismissTabWarning() {
    const modal = document.getElementById('anti-cheat-warning-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
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
    this.currentQuestionData = data;
    this.selectedOption = null;
    this.wordCloudInput = '';
    this.selectedRating = 0;
    this.rankingOrder = (data.options || []).slice();
    this.openEndedText = '';
    this.hasSubmitted = false;
    this.answerSwitches = 0;
    this.switchTimestamps = [];
    this.questionStartTimeMs = data.questionStartTimeMs || Date.now();
    this.endTimeMs = data.endTimeMs || (Date.now() + ((data.timeLimit || 20) * 1000));

    const mainView = document.getElementById('player-main-view');
    if (!mainView) return;

    const type = data.type || 'mcq';
    let inputHtml = '';

    if (type === 'mcq' || type === 'poll' || type === 'true_false') {
      inputHtml = `
        <div class="options-grid">
          ${(data.options || []).map((opt, idx) => `
            <button class="option-btn opt-${idx}" id="opt-btn-${idx}" onclick="QVPlayerGamePage.selectOption(${idx})">
              <span style="font-weight: 800; opacity: 0.7;">${String.fromCharCode(65 + idx)}.</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else if (type === 'word_cloud') {
      inputHtml = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 1rem;">
          <input type="text" id="player-wc-input" class="input" placeholder="Type your word or short phrase here..." style="font-size: 1.1rem; text-align: center;" oninput="QVPlayerGamePage.onWordCloudInput(this.value)">
          <div class="text-secondary" style="font-size: 0.85rem; text-align: center;">Press Submit to project your phrase onto the live Word Cloud!</div>
        </div>
      `;
    } else if (type === 'rating_scale') {
      inputHtml = `
        <div class="rating-scale-container">
          <div style="font-weight: 700; color: #fff; font-size: 1.1rem;">${data.metricName || 'Rate your score'}</div>
          <div class="star-rating-group">
            ${[1, 2, 3, 4, 5].map(star => `
              <button class="star-btn" id="star-btn-${star}" onclick="QVPlayerGamePage.selectRating(${star})">★</button>
            `).join('')}
          </div>
          <div id="player-rating-lbl" class="text-accent font-bold">Select 1 to 5 Stars</div>
        </div>
      `;
    } else if (type === 'ranking') {
      inputHtml = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 0.75rem;">
          <p class="text-secondary" style="font-size: 0.85rem; text-align: center;">Use arrows to arrange in order of priority (Top = Highest):</p>
          <div class="ranking-list" id="player-ranking-list">
            ${this.renderRankingList()}
          </div>
        </div>
      `;
    } else if (type === 'open_ended') {
      inputHtml = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 0.75rem;">
          <textarea id="player-oe-input" class="input" rows="3" placeholder="Type your message or response for the host presentation..." oninput="QVPlayerGamePage.onOpenEndedInput(this.value)" style="resize: vertical; font-size: 1rem;"></textarea>
        </div>
      `;
    }

    mainView.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
        
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <span class="level-badge" style="font-size: 0.9rem;">Slide ${data.questionIndex + 1} of ${data.totalQuestions} (${(data.type || 'Quiz').toUpperCase()})</span>
          <div class="timer-circle" id="player-timer">${data.timeLimit || 20}</div>
        </div>

        <div class="question-box">
          ${data.questionText}
        </div>

        ${inputHtml}

        <!-- Submit Button -->
        <button class="btn btn-primary btn-lg w-full" id="btn-submit-answer" disabled onclick="QVPlayerGamePage.confirmSubmit()">
          Lock & Submit Response 🚀
        </button>

        <div id="player-feedback-msg" class="text-secondary" style="font-size: 0.95rem; font-weight: 600;">
          Select or enter your response above before submitting!
        </div>

        <!-- Audience Floating Reaction Bar -->
        <div class="reaction-bar">
          <button class="reaction-btn" title="Love it" onclick="QVPlayerGamePage.sendReaction('❤️')">❤️</button>
          <button class="reaction-btn" title="Thumbs up" onclick="QVPlayerGamePage.sendReaction('👍')">👍</button>
          <button class="reaction-btn" title="Applause" onclick="QVPlayerGamePage.sendReaction('👏')">👏</button>
          <button class="reaction-btn" title="Fire" onclick="QVPlayerGamePage.sendReaction('🔥')">🔥</button>
          <button class="reaction-btn" title="Celebrate" onclick="QVPlayerGamePage.sendReaction('🎉')">🎉</button>
          <button class="reaction-btn" title="Great idea" onclick="QVPlayerGamePage.sendReaction('💡')">💡</button>
        </div>

      </div>
    `;

    this.startLocalTimer();
  },

  sendReaction(emoji) {
    if (window.QVGameEngine) {
      window.QVGameEngine.sendReaction(emoji);
    }
  },

  onWordCloudInput(val) {
    this.wordCloudInput = val.trim();
    const btn = document.getElementById('btn-submit-answer');
    if (btn) btn.disabled = !this.wordCloudInput;
  },

  onOpenEndedInput(val) {
    this.openEndedText = val.trim();
    const btn = document.getElementById('btn-submit-answer');
    if (btn) btn.disabled = !this.openEndedText;
  },

  selectRating(star) {
    if (this.hasSubmitted) return;
    this.selectedRating = star;
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`star-btn-${i}`);
      if (el) {
        if (i <= star) el.classList.add('active');
        else el.classList.remove('active');
      }
    }
    const lbl = document.getElementById('player-rating-lbl');
    if (lbl) lbl.textContent = `Selected: ${star} / 5 Stars ⭐`;
    const btn = document.getElementById('btn-submit-answer');
    if (btn) btn.disabled = false;
  },

  renderRankingList() {
    return this.rankingOrder.map((item, idx) => `
      <div class="ranking-item">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 800; color: var(--accent-cyan);">#${idx + 1}</span>
          <span style="font-weight: 600;">${item}</span>
        </div>
        <div class="ranking-btn-group">
          ${idx > 0 ? `<button onclick="QVPlayerGamePage.moveRank(${idx}, -1)">▲</button>` : ''}
          ${idx < this.rankingOrder.length - 1 ? `<button onclick="QVPlayerGamePage.moveRank(${idx}, 1)">▼</button>` : ''}
        </div>
      </div>
    `).join('');
  },

  moveRank(idx, direction) {
    if (this.hasSubmitted) return;
    const target = idx + direction;
    if (target >= 0 && target < this.rankingOrder.length) {
      const temp = this.rankingOrder[idx];
      this.rankingOrder[idx] = this.rankingOrder[target];
      this.rankingOrder[target] = temp;
      const list = document.getElementById('player-ranking-list');
      if (list) list.innerHTML = this.renderRankingList();
      const btn = document.getElementById('btn-submit-answer');
      if (btn) btn.disabled = false;
    }
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
    if (this.hasSubmitted) return;
    const type = this.currentQuestionData?.type || 'mcq';

    this.hasSubmitted = true;
    const submitBtn = document.getElementById('btn-submit-answer');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitted ✓';
    }

    const timeTakenMs = Math.max(100, Date.now() - this.questionStartTimeMs);

    if (window.QVGameEngine) {
      if (type === 'word_cloud') {
        window.QVGameEngine.submitMentiResponse({ word: this.wordCloudInput, timeTakenMs });
      } else if (type === 'rating_scale') {
        window.QVGameEngine.submitMentiResponse({ rating: this.selectedRating, timeTakenMs });
      } else if (type === 'ranking') {
        window.QVGameEngine.submitMentiResponse({ rankingOrder: this.rankingOrder, timeTakenMs });
      } else if (type === 'open_ended') {
        window.QVGameEngine.submitMentiResponse({ openEndedText: this.openEndedText, timeTakenMs });
      } else {
        window.QVGameEngine.submitAnswer(
          this.selectedOption,
          timeTakenMs,
          this.answerSwitches,
          this.switchTimestamps
        );
      }
    }

    const feedback = document.getElementById('player-feedback-msg');
    if (feedback) feedback.innerHTML = '<span style="color: var(--accent-cyan); font-size: 1.05rem;">Response Submitted ✓. Live results updating with host...</span>';
  },

  onVotingLockChanged(locked) {
    const submitBtn = document.getElementById('btn-submit-answer');
    if (submitBtn && !this.hasSubmitted) {
      submitBtn.disabled = locked;
    }
    const feedback = document.getElementById('player-feedback-msg');
    if (feedback) {
      feedback.innerHTML = locked ? '<span style="color: #ff7675;">🔒 Host has locked voting for this slide.</span>' : '<span style="color: var(--text-secondary);">Voting is active.</span>';
    }
  },

  onResultsVisibilityChanged(visible) {
    // Handled seamlessly
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
        if (!this.hasSubmitted) {
          const type = this.currentQuestionData?.type || 'mcq';
          if (type === 'mcq' && this.selectedOption !== null) this.confirmSubmit();
          else if (type === 'rating_scale' && this.selectedRating > 0) this.confirmSubmit();
          else if (type === 'word_cloud' && this.wordCloudInput) this.confirmSubmit();
          else if (type === 'ranking') this.confirmSubmit();
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
    if (!timerEl) return;

    timerEl.textContent = timeRemaining;

    // Shift color dynamically based on time remaining
    const totalTime = this.currentQuestionData?.timeLimit || 20;
    const ratio = timeRemaining / totalTime;

    if (ratio > 0.5) {
      timerEl.style.color = '#10b981';
      timerEl.style.borderColor = '#10b981';
      timerEl.classList.remove('timer-critical');
    } else if (ratio > 0.25) {
      timerEl.style.color = '#f59e0b';
      timerEl.style.borderColor = '#f59e0b';
      timerEl.classList.remove('timer-critical');
    } else {
      timerEl.style.color = '#ef4444';
      timerEl.style.borderColor = '#ef4444';
      timerEl.classList.add('timer-critical');
    }
  },

  onQuestionEnd(data) {
    this.cleanupTimer();
    const feedback = document.getElementById('player-feedback-msg');
    
    // Check if this was a scored quiz question
    if (this.selectedOption !== null && data.correctOption !== undefined) {
      const isCorrect = this.selectedOption === data.correctOption;
      if (isCorrect) {
        if (window.QVAnimations) window.QVAnimations.triggerConfetti();
        if (feedback) feedback.innerHTML = `<span style="color: var(--accent-green); font-size: 1.15rem; font-weight: 800;">🎉 Correct Answer! Points Added to Podium.</span>`;
      } else {
        const questionCard = document.querySelector('.game-container');
        if (questionCard) {
          questionCard.style.animation = 'timerPulse 0.3s 2';
          setTimeout(() => { questionCard.style.animation = ''; }, 600);
        }
        if (feedback) feedback.innerHTML = `<span style="color: var(--accent-red); font-size: 1.05rem; font-weight: 700;">✗ Incorrect. Correct Option was ${String.fromCharCode(65 + data.correctOption)}.</span>`;
      }
    } else {
      if (feedback) {
        feedback.innerHTML = `<span style="color: var(--text-secondary); font-size: 1rem;">Slide Concluded ✓. Host navigating presentation...</span>`;
      }
    }
  },

  onLeaderboardShow(data) {
    const feedback = document.getElementById('player-feedback-msg');
    const allPlayers = data.leaderboard || [];
    const top6 = allPlayers.slice(0, 6);
    
    // Check if player modal exists or create it
    let lbModal = document.getElementById('player-mid-leaderboard-modal');
    if (!lbModal) {
      lbModal = document.createElement('div');
      lbModal.id = 'player-mid-leaderboard-modal';
      lbModal.className = 'modal-overlay';
      document.body.appendChild(lbModal);
    }

    lbModal.classList.remove('hidden');
    lbModal.style.display = 'flex';
    lbModal.innerHTML = `
      <div class="modal" style="max-width: 500px; width: 90%; border-color: var(--accent-amber);">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="color: var(--accent-amber);">🏆 Live Leaderboard</h3>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Top ${top6.length} of ${allPlayers.length} Players</div>
          </div>
          <button class="modal-close" onclick="document.getElementById('player-mid-leaderboard-modal').style.display='none'">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 380px; overflow-y: auto;">
          ${top6.length === 0 ? `
            <div class="text-secondary" style="text-align: center; padding: 1.5rem;">Scores will update after the first correct answer!</div>
          ` : top6.map((p, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: ${idx < 3 ? 'rgba(253, 203, 110, 0.1)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${idx < 3 ? 'rgba(253, 203, 110, 0.3)' : 'var(--border-color)'};">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-weight: 800; font-size: 1.1rem; width: 1.8rem;">${medal}</span>
                  <span style="font-weight: 700; color: #fff;">${p.nickname}</span>
                </div>
                <div style="font-family: var(--font-heading); font-weight: 800; color: var(--accent-amber); font-size: 1.15rem;">
                  ${p.score.toLocaleString()} pts
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-secondary w-full" style="margin-top: 1rem;" onclick="document.getElementById('player-mid-leaderboard-modal').style.display='none'">
          Close Leaderboard
        </button>
      </div>
    `;

    if (feedback) {
      feedback.innerHTML = `<span style="color: var(--accent-amber); font-size: 0.95rem; font-weight: 700;">📊 Host is displaying the live leaderboard (Top 6)!</span>`;
    }
  },

  onQuestionEnd(data) {
    this.cleanupTimer();
    const feedback = document.getElementById('player-feedback-msg');
    if (feedback) {
      feedback.innerHTML = `<span style="color: var(--text-secondary); font-size: 1rem;">Slide Concluded ✓. Host navigating presentation...</span>`;
    }
  },

  onGameFinished(data) {
    this.cleanupTimer();
    if (window.QVAnimations) window.QVAnimations.triggerConfetti();

    const mainView = document.getElementById('player-main-view');
    if (!mainView) return;

    const allPlayers = data.leaderboard || [];
    const top6 = allPlayers.slice(0, 6);

    mainView.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
        
        <div style="text-align: center;">
          <h1 style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; color: var(--accent-amber);">
            🏆 Presentation & Game Complete!
          </h1>
          <p class="text-cyan font-bold" style="font-size: 1.1rem; margin-top: 0.25rem;">+150 XP Earned for Participating! 🎉</p>
          <p style="color: var(--accent-green); font-size: 0.95rem; font-weight: 600; margin-top: 0.5rem;">
            📧 Full Question Answer Keys & Summary have been sent to your Email!
          </p>
        </div>

        <!-- Podium Top 3 -->
        <div class="podium-container">
          ${top6[1] ? `
            <div class="podium-step podium-2">
              <div style="font-size: 1.5rem;">🥈</div>
              <div style="font-weight: 700; font-size: 0.9rem;">${top6[1].nickname}</div>
              <div class="text-accent" style="font-size: 0.8rem;">${top6[1].score.toLocaleString()} pts</div>
            </div>
          ` : ''}

          ${top6[0] ? `
            <div class="podium-step podium-1">
              <div style="font-size: 2rem;">👑</div>
              <div style="font-weight: 800; font-size: 1.1rem;">${top6[0].nickname}</div>
              <div class="text-amber" style="font-size: 0.9rem; font-weight: 700;">${top6[0].score.toLocaleString()} pts</div>
            </div>
          ` : ''}

          ${top6[2] ? `
            <div class="podium-step podium-3">
              <div style="font-size: 1.5rem;">🥉</div>
              <div style="font-weight: 700; font-size: 0.9rem;">${top6[2].nickname}</div>
              <div class="text-accent" style="font-size: 0.8rem;">${top6[2].score.toLocaleString()} pts</div>
            </div>
          ` : ''}
        </div>

        <!-- Top 4-6 Runners-Up -->
        ${top6.length > 3 ? `
          <div style="width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
              Top 4 - ${top6.length} Finalists:
            </div>
            ${top6.slice(3, 6).map((p, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 1rem; border-radius: var(--radius-md); background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-weight: 800; color: var(--accent-cyan);">#${i + 4}</span>
                  <span style="font-weight: 600; color: #fff;">${p.nickname}</span>
                </div>
                <div style="font-weight: 700; color: var(--accent-amber);">${p.score.toLocaleString()} pts</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <button class="btn btn-primary btn-lg" onclick="QVApp.navigateTo('dashboard')">
          Return to Dashboard 🏠
        </button>

      </div>
    `;
  }
};

