// ── SCHEDULED TESTS & HOMEWORK ASYNCHRONOUS MODE PAGE ──────────
window.QVScheduledTestsPage = {
  activeTests: [],
  quizzes: [],
  classrooms: [],
  currentTestAttempt: null,
  attemptAnswers: {},
  attemptTimerInterval: null,

  async render(container) {
    const user = window.QVData ? window.QVData.user : {};
    this.quizzes = await window.QVData.fetchQuizzes();
    this.classrooms = await window.QVData.fetchClassrooms();
    this.activeTests = await this.fetchScheduledTests();

    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800;">
              📅 Scheduled Tests & Homework Mode
            </h1>
            <p class="text-secondary">Schedule time-windowed quizzes and assignments for students to complete asynchronously at their own pace.</p>
          </div>

          <button class="btn btn-primary btn-lg" onclick="QVScheduledTestsPage.showCreateModal()">
            ➕ Schedule New Test
          </button>
        </div>

        <!-- Section 1: Active & Upcoming Scheduled Tests -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h2 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700;">
            Active & Available Tests (${this.activeTests.length})
          </h2>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;" id="sched-tests-grid">
            ${this.renderTestsGrid(this.activeTests, user)}
          </div>
        </div>

        <!-- Section 2: Student Async Attempt Container (Rendered when test started) -->
        <div id="async-test-player-container" style="display: none;"></div>

        <!-- Modal to Schedule a new test -->
        <div id="modal-schedule-test" class="modal-overlay hidden">
          <div class="modal" style="max-width: 540px;">
            <div class="modal-header">
              <h3 class="modal-title">Schedule New Quiz Test</h3>
              <button class="modal-close" onclick="document.getElementById('modal-schedule-test').classList.add('hidden')">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="input-group">
                <label class="input-label">Select Quiz Template</label>
                <select id="sched-quiz-select" class="input">
                  ${this.quizzes.map(q => `<option value="${q.id}">${q.title} (${q.questions ? q.questions.length : 0} Qs)</option>`).join('')}
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">Test Title / Description</label>
                <input type="text" id="sched-title-input" class="input" placeholder="e.g. Midterm Physics Assignment #3">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-group">
                  <label class="input-label">Deadline / Availability Date</label>
                  <input type="date" id="sched-date-input" class="input" value="${new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]}">
                </div>
                <div class="input-group">
                  <label class="input-label">Duration (Minutes)</label>
                  <select id="sched-duration-select" class="input">
                    <option value="15">15 Minutes</option>
                    <option value="30" selected>30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Restrict to Classroom (Optional)</label>
                <select id="sched-classroom-select" class="input">
                  <option value="">Public (Open to All Students)</option>
                  ${this.classrooms.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('')}
                </select>
              </div>

              <button class="btn btn-primary btn-lg w-full" onclick="QVScheduledTestsPage.saveScheduledTest()">
                🚀 Confirm & Schedule Test
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  renderTestsGrid(tests, user) {
    if (!tests || tests.length === 0) {
      return `
        <div class="text-secondary" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center;">
          No tests scheduled yet. Click <strong>"➕ Schedule New Test"</strong> to create a homework or async test!
        </div>
      `;
    }

    return tests.map(t => {
      const isHost = t.host_id === user.id;
      return `
        <div style="background: rgba(10, 14, 26, 0.7); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; color: #fff;">${t.title}</div>
              <div class="text-secondary" style="font-size: 0.85rem; margin-top: 0.2rem;">⏱️ Duration: <strong>${t.duration_minutes || 30} mins</strong></div>
            </div>
            <span class="level-badge" style="background: rgba(0, 206, 201, 0.2); color: var(--accent-cyan);">📅 Available</span>
          </div>

          <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem;">
            <div>Due: <strong style="color: #fdcb6e;">${t.scheduled_at}</strong></div>
            <div class="text-secondary" style="font-size: 0.8rem; margin-top: 0.2rem;">Host: ${t.host_id === user.id ? 'You (Instructor)' : 'Teacher / Host'}</div>
          </div>

          <button class="btn btn-primary w-full" onclick="QVScheduledTestsPage.startAsyncAttempt('${t.id}', '${t.quiz_id}')">
            ✍️ Take Test Asynchronously
          </button>
        </div>
      `;
    }).join('');
  },

  showCreateModal() {
    document.getElementById('modal-schedule-test').classList.remove('hidden');
  },

  async fetchScheduledTests() {
    try {
      const res = await fetch('/api/scheduled-tests');
      const data = await res.json();
      if (data && data.tests) return data.tests;
    } catch (e) {
      console.warn('Fetch scheduled tests error:', e.message);
    }
    return [
      { id: 'sched_1', quiz_id: 'q1', title: 'World Capitals Geography Midterm', scheduled_at: '2026-08-25', duration_minutes: 20, host_id: 'u1' },
      { id: 'sched_2', quiz_id: 'q2', title: 'Science & Space Astronomy Assignment', scheduled_at: '2026-08-28', duration_minutes: 30, host_id: 'u1' }
    ];
  },

  async saveScheduledTest() {
    const quizId = document.getElementById('sched-quiz-select').value;
    const title = document.getElementById('sched-title-input').value.trim() || 'Homework Quiz';
    const scheduledAt = document.getElementById('sched-date-input').value;
    const durationMinutes = parseInt(document.getElementById('sched-duration-select').value, 10);
    const classroomId = document.getElementById('sched-classroom-select').value || null;
    const user = window.QVData ? window.QVData.user : {};

    try {
      const res = await fetch('/api/scheduled-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId, title, scheduledAt, durationMinutes, classroomId, hostId: user ? user.id : 'u1'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (window.QVAnimations) window.QVAnimations.showToast(`Test "${title}" scheduled successfully!`, 'success');
        document.getElementById('modal-schedule-test').classList.add('hidden');
        this.render(document.getElementById('main-content'));
      }
    } catch (e) {
      if (window.QVAnimations) window.QVAnimations.showToast(e.message, 'error');
    }
  },

  async startAsyncAttempt(testId, quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId) || (await window.QVData.fetchQuizzes()).find(q => q.id === quizId);
    if (!quiz) {
      if (window.QVAnimations) window.QVAnimations.showToast('Quiz data not found for this test.', 'error');
      return;
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : JSON.parse(quiz.questions_json || '[]');
    this.currentTestAttempt = { testId, quizId, title: quiz.title, questions };
    this.attemptAnswers = {};

    const container = document.getElementById('async-test-player-container');
    if (!container) return;
    container.style.display = 'block';

    container.innerHTML = `
      <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem; border-color: var(--accent-cyan);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="level-badge" style="background: rgba(0, 206, 201, 0.2); color: var(--accent-cyan);">Asynchronous Homework Mode</span>
            <h2 style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; margin-top: 0.3rem;">${quiz.title}</h2>
          </div>
          <button class="btn btn-secondary" onclick="QVScheduledTestsPage.cancelAttempt()">✕ Cancel Attempt</button>
        </div>

        <!-- Warning banner -->
        <div id="async-tab-warning" style="display: none; background: rgba(255, 118, 117, 0.15); border: 1px solid var(--accent-red); border-radius: var(--radius-sm); padding: 0.75rem 1rem; color: #ff7675; font-size: 0.85rem; font-weight: 700;">
          ⚠️ Anti-Cheat Warning: Tab/Window switch detected! Please remain on this screen to complete your test.
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${questions.map((q, idx) => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
              <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.75rem;">
                ${idx + 1}. ${q.text}
              </div>

              ${(q.options || []).map((opt, optIdx) => `
                <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); margin-bottom: 0.4rem; cursor: pointer;">
                  <input type="radio" name="async_q_${idx}" value="${optIdx}" onchange="QVScheduledTestsPage.attemptAnswers[${idx}] = ${optIdx}">
                  <span>${String.fromCharCode(65 + optIdx)}. ${opt}</span>
                </label>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <button class="btn btn-primary btn-lg w-full" onclick="QVScheduledTestsPage.submitAsyncTest()">
          🚀 Submit Homework Test
        </button>
      </div>
    `;

    // Attach focus / blur anti-cheat listener
    this.attachProctoring();
    container.scrollIntoView({ behavior: 'smooth' });
  },

  attachProctoring() {
    window.onblur = () => {
      if (this.currentTestAttempt) {
        const w = document.getElementById('async-tab-warning');
        if (w) w.style.display = 'block';
        if (window.QVAnimations) window.QVAnimations.showToast('⚠️ Window switched! Please remain on the quiz page.', 'error');
      }
    };
    window.onbeforeunload = (e) => {
      if (this.currentTestAttempt) {
        e.preventDefault();
        return 'Test in progress. Leaving will lose your responses.';
      }
    };
  },

  cancelAttempt() {
    this.currentTestAttempt = null;
    window.onblur = null;
    window.onbeforeunload = null;
    document.getElementById('async-test-player-container').style.display = 'none';
  },

  async submitAsyncTest() {
    if (!this.currentTestAttempt) return;
    window.onblur = null;
    window.onbeforeunload = null;
    const questions = this.currentTestAttempt.questions;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      if (this.attemptAnswers[idx] === q.correct) correctCount += 1;
    });

    const score = Math.round((correctCount / questions.length) * 100);
    if (window.QVData) window.QVData.addXp(120);

    const container = document.getElementById('async-test-player-container');
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; border-color: var(--accent-green);">
          <div style="font-size: 3rem;">🎉</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 800; color: var(--accent-green);">
            Homework Test Completed!
          </h2>
          <div style="font-size: 2.5rem; font-weight: 800; color: #fff;">${score}% Score (${correctCount} / ${questions.length} Correct)</div>
          <p class="text-cyan font-bold">+120 XP Added to your Profile! Results logged.</p>
          <button class="btn btn-primary" onclick="document.getElementById('async-test-player-container').style.display = 'none'">Done ✓</button>
        </div>
      `;
    }

    if (window.QVAnimations) window.QVAnimations.triggerConfetti();
    this.currentTestAttempt = null;
  }
};

