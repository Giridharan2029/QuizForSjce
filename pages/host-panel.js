// ── HOST PANEL PAGE CONTROLLER ─────────────────────────────────
window.QVHostPanelPage = {
  params: {},
  hostAnalysisData: [],

  render(container, params = {}) {
    this.params = params;
    const roomCode = params.roomCode || (window.QVGameEngine ? window.QVGameEngine.roomCode : 'XXXXXX');
    const quiz = params.quiz || (window.QVGameEngine ? window.QVGameEngine.quiz : null);
    const classroom = params.classroom || (window.QVGameEngine ? window.QVGameEngine.classroom : null);

    container.innerHTML = `
      <div class="animate-fade-in game-container" style="max-width: 1000px;">
        
        <!-- Room Header Bar -->
        <div class="room-header">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">HOST CONTROL ROOM</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700;">${quiz ? quiz.title : 'Quiz Battle'}</h2>
            ${classroom ? `<span class="level-badge" style="background: rgba(0, 206, 201, 0.2); color: var(--accent-cyan);">🔒 Restricted to Classroom: ${classroom.name}</span>` : '<span class="level-badge" style="background: rgba(255,255,255,0.1); color: var(--text-secondary);">🌐 Public Game</span>'}
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--text-secondary);">GAME ROOM CODE</div>
            <div class="room-code-badge">${roomCode}</div>
          </div>
        </div>

        <!-- Host Action Buttons -->
        <div style="display: flex; gap: 1rem; width: 100%;">
          <button class="btn btn-primary btn-lg w-full" id="host-start-btn" onclick="QVHostPanelPage.startGame()">
            🚀 Start Game Battle (+100 XP)
          </button>
          <button class="btn btn-secondary btn-lg" id="host-next-btn" style="display: none;" onclick="QVHostPanelPage.nextQuestion()">
            ⏩ Next Question
          </button>
        </div>

        <!-- Timer & Question Info -->
        <div id="host-question-area" style="width: 100%; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <div class="timer-circle" id="host-timer-display">20</div>

          <div class="question-box" id="host-question-text">
            Waiting for host to start the game...
          </div>
        </div>

        <!-- Realtime Answer Counters -->
        <div class="card" style="width: 100%; text-align: center;">
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 0.5rem;">Realtime Answer Submissions</h4>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-cyan);" id="host-answer-progress">
            0 / 0 Players Answered
          </div>
        </div>

        <!-- HOST-ONLY: KNOWLEDGE VS. GUESS SIGNALS DASHBOARD -->
        <div class="card" style="width: 100%; display: flex; flex-direction: column; gap: 1.5rem; border-color: var(--accent-primary-hover);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.25rem;">🔍</span>
                <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700;">Knowledge vs. Guess Signals</h3>
                <span class="level-badge" style="background: rgba(253, 121, 168, 0.2); color: var(--accent-pink);">Host-Only View</span>
              </div>
              <p class="text-secondary" style="font-size: 0.875rem; margin-top: 0.2rem;">
                Analyzes response times, choice switching, and topic history to detect likely misconceptions vs. lucky guesses.
              </p>
            </div>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="QVHostPanelPage.fetchGuessAnalysis()">
              🔄 Refresh Analysis
            </button>
          </div>

          <!-- Heatmap Section -->
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 1rem; margin-bottom: 0.75rem; color: #fff;">
              Student Topic Confidence & Mastery Heatmap
            </h4>
            <div id="host-heatmap-container" style="overflow-x: auto;">
              <div class="text-muted" style="font-size: 0.85rem; padding: 1rem; text-align: center;">
                No student response signals recorded yet for this session. Answers will populate here live!
              </div>
            </div>
          </div>

          <!-- Actionable Lists -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            
            <!-- Confident Wrong (Likely Misconceptions) -->
            <div style="background: rgba(255, 118, 117, 0.08); border: 1px solid rgba(255, 118, 117, 0.3); border-radius: var(--radius-md); padding: 1rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <div style="font-family: var(--font-heading); font-weight: 700; color: #ff7675; font-size: 0.95rem;">
                  🔴 Likely Misconceptions (Confident Wrong)
                </div>
                <span class="text-muted" style="font-size: 0.75rem;">Needs Re-teaching</span>
              </div>
              <div id="host-list-confident-wrong" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto;">
                <div class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem;">No misconceptions detected yet.</div>
              </div>
            </div>

            <!-- Lucky Guesses -->
            <div style="background: rgba(253, 203, 110, 0.08); border: 1px solid rgba(253, 203, 110, 0.3); border-radius: var(--radius-md); padding: 1rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <div style="font-family: var(--font-heading); font-weight: 700; color: #fdcb6e; font-size: 0.95rem;">
                  🟡 Likely Lucky Guesses
                </div>
                <span class="text-muted" style="font-size: 0.75rem;">Needs Reinforcement</span>
              </div>
              <div id="host-list-lucky-guesses" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto;">
                <div class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem;">No lucky guesses detected yet.</div>
              </div>
            </div>

          </div>

        </div>

        <!-- Joined Players Grid -->
        <div class="card" style="width: 100%;">
          <h3 style="font-family: var(--font-heading); font-size: 1.2rem; margin-bottom: 1rem;">
            Joined Players (<span id="host-player-count">0</span>)
          </h3>
          <div class="player-chips-grid" id="host-player-chips">
            <div class="text-secondary" style="font-size: 0.9rem;">Share Room Code <strong class="text-cyan">${roomCode}</strong> with players to join!</div>
          </div>
        </div>

      </div>
    `;

    window.QVHostPanel = this;
    this.fetchGuessAnalysis();
  },

  updatePlayers(playerList, count) {
    const countEl = document.getElementById('host-player-count');
    const chipsEl = document.getElementById('host-player-chips');

    if (countEl) countEl.textContent = count;
    if (chipsEl) {
      chipsEl.innerHTML = playerList.length === 0 ? `
        <div class="text-secondary" style="font-size: 0.9rem;">Share Room Code <strong class="text-cyan">${this.params.roomCode || ''}</strong> with players!</div>
      ` : playerList.map(p => `
        <div class="player-chip">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${p.color};"></span>
          <span>${p.nickname}</span>
        </div>
      `).join('');
    }
  },

  startGame() {
    if (window.QVGameEngine) {
      window.QVGameEngine.startGame();
    }
    const startBtn = document.getElementById('host-start-btn');
    const nextBtn = document.getElementById('host-next-btn');
    if (startBtn) startBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'inline-flex';
  },

  nextQuestion() {
    if (window.QVGameEngine) {
      window.QVGameEngine.nextQuestion();
    }
  },

  onQuestionShow(data) {
    const qBox = document.getElementById('host-question-text');
    const timerDisplay = document.getElementById('host-timer-display');
    const progressEl = document.getElementById('host-answer-progress');

    if (qBox) qBox.textContent = `Q${data.questionIndex + 1}/${data.totalQuestions} (${data.topic || 'General'}): ${data.questionText}`;
    if (timerDisplay) timerDisplay.textContent = data.timeLimit || 20;
    if (progressEl) progressEl.textContent = `0 / ${window.QVGameEngine ? window.QVGameEngine.players.length : 0} Players Answered`;
  },

  updateTimer(timeRemaining) {
    const timerDisplay = document.getElementById('host-timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = timeRemaining;
      if (timeRemaining <= 5) timerDisplay.classList.add('timer-critical');
      else timerDisplay.classList.remove('timer-critical');
    }
  },

  updateAnswerCounts(data) {
    const progressEl = document.getElementById('host-answer-progress');
    if (progressEl) progressEl.textContent = `${data.answered} / ${data.total} Players Answered`;
  },

  updateGuessAnalysis(data) {
    if (data && data.hostAnalysis) {
      this.hostAnalysisData = data.hostAnalysis;
      this.renderGuessAnalysisUI(data.hostAnalysis);
    }
  },

  async fetchGuessAnalysis() {
    const roomCode = this.params.roomCode || (window.QVGameEngine ? window.QVGameEngine.roomCode : '');
    try {
      const res = await fetch(`/api/host/guess-analysis${roomCode ? '?roomCode=' + roomCode : ''}`);
      const data = await res.json();
      if (data.success && data.responses) {
        this.renderGuessAnalysisUI(data.responses);
      }
    } catch (e) {
      console.warn('Error fetching guess analysis:', e.message);
    }
  },

  renderGuessAnalysisUI(responses) {
    const heatmapEl = document.getElementById('host-heatmap-container');
    const cwListEl = document.getElementById('host-list-confident-wrong');
    const lgListEl = document.getElementById('host-list-lucky-guesses');

    if (!responses || responses.length === 0) return;

    // Build Heatmap data: student x topic
    const studentsMap = {};
    responses.forEach(r => {
      const sName = r.studentName || r.student_name || 'Student';
      const topic = r.topic || 'General';
      if (!studentsMap[sName]) studentsMap[sName] = {};
      if (!studentsMap[sName][topic]) studentsMap[sName][topic] = { correct: 0, total: 0, lastLabel: r.label, guessProb: r.guess_probability || r.guessProbability || 0 };
      
      studentsMap[sName][topic].total += 1;
      if (r.is_correct || r.isCorrect) studentsMap[sName][topic].correct += 1;
      studentsMap[sName][topic].lastLabel = r.label;
      studentsMap[sName][topic].guessProb = r.guess_probability || r.guessProbability || 0;
    });

    const studentNames = Object.keys(studentsMap);
    const topics = Array.from(new Set(responses.map(r => r.topic || 'General')));

    if (heatmapEl) {
      heatmapEl.innerHTML = `
        <table class="data-table" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th>Student</th>
              ${topics.map(t => `<th>${t}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${studentNames.map(sName => `
              <tr>
                <td style="font-weight: 600;">👤 ${sName}</td>
                ${topics.map(t => {
                  const stat = studentsMap[sName][t];
                  if (!stat) return `<td class="text-muted">-</td>`;
                  const acc = Math.round((stat.correct / stat.total) * 100);
                  const lbl = stat.lastLabel || 'knowledge';
                  const bg = lbl === 'confident_wrong' ? 'rgba(255, 118, 117, 0.25)' : lbl === 'lucky_guess' ? 'rgba(253, 203, 110, 0.25)' : lbl === 'guess' ? 'rgba(108, 92, 231, 0.25)' : 'rgba(0, 184, 148, 0.25)';
                  const textColor = lbl === 'confident_wrong' ? '#ff7675' : lbl === 'lucky_guess' ? '#fdcb6e' : '#a29bfe';
                  return `
                    <td>
                      <div style="background: ${bg}; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid ${textColor}; text-align: center;">
                        <span style="font-weight: 700; color: ${textColor};">${acc}%</span>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: capitalize;">${lbl.replace('_', ' ')}</div>
                      </div>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Filter Confident Wrong & Lucky Guesses
    const confidentWrong = responses.filter(r => r.label === 'confident_wrong');
    const luckyGuesses = responses.filter(r => r.label === 'lucky_guess');

    if (cwListEl) {
      cwListEl.innerHTML = confidentWrong.length === 0 ? `
        <div class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem;">No likely misconceptions detected! 🎉</div>
      ` : confidentWrong.map(r => `
        <div style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border-left: 3px solid #ff7675; font-size: 0.825rem;">
          <div style="font-weight: 700; color: #fff;">👤 ${r.studentName || r.student_name} — <span style="color: #ff7675;">Topic: ${r.topic}</span></div>
          <div class="text-secondary" style="font-size: 0.75rem; margin-top: 0.2rem;">
            Answered fast (${Math.round((r.time_taken_ms || r.timeTakenMs || 0)/1000)}s) & confident, but incorrect. Likely misconception.
          </div>
        </div>
      `).join('');
    }

    if (lgListEl) {
      lgListEl.innerHTML = luckyGuesses.length === 0 ? `
        <div class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem;">No lucky guesses detected!</div>
      ` : luckyGuesses.map(r => `
        <div style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border-left: 3px solid #fdcb6e; font-size: 0.825rem;">
          <div style="font-weight: 700; color: #fff;">👤 ${r.studentName || r.student_name} — <span style="color: #fdcb6e;">Topic: ${r.topic}</span></div>
          <div class="text-secondary" style="font-size: 0.75rem; margin-top: 0.2rem;">
            Correct answer with high guess signals (Prob: ${(r.guess_probability || r.guessProbability || 0.6)}). Needs reinforcement.
          </div>
        </div>
      `).join('');
    }
  },

  onQuestionEnd(data) {
    const qBox = document.getElementById('host-question-text');
    if (qBox) {
      const correctOptionLetter = String.fromCharCode(65 + (data.correctOption !== undefined ? data.correctOption : 0));
      const correctText = data.correctOptionText ? `${correctOptionLetter}. ${data.correctOptionText}` : `Option ${correctOptionLetter}`;

      qBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left; width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-green);">🏁 Question Finished Results</div>
            <span class="level-badge" style="background: rgba(0, 184, 148, 0.2); color: var(--accent-green);">
              Correct Answer: ${correctText}
            </span>
          </div>

          <!-- Host Summary Metrics: Correct vs Wrong Students -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="background: rgba(0, 184, 148, 0.15); border: 1px solid var(--accent-green); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 2.2rem; font-weight: 800; color: var(--accent-green);">${data.correctCount || 0}</div>
              <div style="font-size: 0.9rem; font-weight: 700; color: var(--accent-green);">Students Correct ✓</div>
            </div>

            <div style="background: rgba(255, 118, 117, 0.15); border: 1px solid var(--accent-red); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 2.2rem; font-weight: 800; color: var(--accent-red);">${data.wrongCount || 0}</div>
              <div style="font-size: 0.9rem; font-weight: 700; color: var(--accent-red);">Wrong Answers ✗</div>
            </div>
          </div>

          <!-- Correct Option Banner -->
          <div style="background: rgba(255,255,255,0.04); border-left: 4px solid var(--accent-green); padding: 0.75rem 1rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">CORRECT ANSWER</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-top: 0.2rem;">
              ${correctText}
            </div>
            ${data.explanation ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.4rem;">${data.explanation}</div>` : ''}
          </div>

          <!-- Option Response Distribution Chart -->
          ${data.options ? `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.3rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Option Response Breakdown:</div>
              ${data.options.map((optText, idx) => {
                const count = (data.optionCounts && data.optionCounts[idx]) || 0;
                const isCorrectOpt = idx === data.correctOption;
                const total = data.totalAnswered || 1;
                const pct = data.totalAnswered ? Math.round((count / total) * 100) : 0;
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; background: ${isCorrectOpt ? 'rgba(0, 184, 148, 0.2)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isCorrectOpt ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)'}; padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem;">
                    <span>${String.fromCharCode(65 + idx)}. ${optText} ${isCorrectOpt ? '✓ (Correct)' : ''}</span>
                    <span style="font-weight: 700; color: ${isCorrectOpt ? 'var(--accent-green)' : '#fff'};">${count} Students (${pct}%)</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    this.fetchGuessAnalysis();
  },

  onGameFinished(data) {
    const qBox = document.getElementById('host-question-text');
    if (qBox) {
      qBox.innerHTML = `
        <div style="color: var(--accent-amber); font-size: 2rem;">🏆 Game Finished!</div>
        <p class="text-secondary" style="font-size: 1rem;">Congratulations to all participants!</p>
      `;
    }
    this.fetchGuessAnalysis();
  }
};
