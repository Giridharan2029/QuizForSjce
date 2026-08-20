// ── DASHBOARD PAGE CONTROLLER ─────────────────────────────────
window.QVDashboardPage = {
  async render(container) {
    const user = window.QVData.user || {};
    const quizzes = await window.QVData.fetchQuizzes();
    const classrooms = await window.QVData.fetchClassrooms();

    const gamesHosted = user.gamesPlayed || 0;
    const userLevel = user.level || 1;
    const currentXp = user.xp || 0;
    const xpForNextLevel = userLevel * 1000;
    const xpProgressInLevel = currentXp % 1000;
    const xpPercent = Math.min(100, Math.round((xpProgressInLevel / 1000) * 100));

    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2.25rem;">
        
        <!-- Dashboard Hero Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; background: radial-gradient(circle at 10% 20%, rgba(255, 107, 53, 0.12), transparent 60%); padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div>
            <div class="hero-badge">
              <span>👑</span>
              <span>Host Command Center</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 2.4rem; font-weight: 900; letter-spacing: -0.02em; margin-top: 0.35rem;">
              Welcome back, <span class="text-accent" style="color: var(--text-accent);">${user.name || 'Host'}</span> 👋
            </h1>
            <p class="text-secondary" style="font-size: 1.05rem; margin-top: 0.25rem;">
              Manage your live quizzes, monitor classroom progress, and climb the global ranks.
            </p>
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-lg" onclick="QVApp.navigateTo('quiz-builder')">
              <span>➕</span> Create New Quiz
            </button>
            <button class="btn btn-secondary btn-lg" onclick="QVApp.navigateTo('classroom')">
              <span>🏫</span> Classrooms Hub
            </button>
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div class="stat-grid">
          
          <!-- 1. Total Games Hosted -->
          <div class="card stat-card card-hover" style="border-top: 2px solid #ff6b35;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="stat-icon" style="color: #ff6b35; background: rgba(255, 107, 53, 0.15);">🎮</div>
              <span class="text-secondary" style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;">ACTIVE HOST</span>
            </div>
            <div class="stat-value" id="dash-games-hosted">${gamesHosted}</div>
            <div class="stat-label">Total Games Hosted</div>
          </div>

          <!-- 2. Quizzes Created -->
          <div class="card stat-card card-hover" style="border-top: 2px solid #f48c06;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="stat-icon" style="color: #f48c06; background: rgba(244, 140, 6, 0.15);">💡</div>
              <span class="text-secondary" style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;">QUIZ REPOSITORY</span>
            </div>
            <div class="stat-value">${quizzes.length}</div>
            <div class="stat-label">Quizzes Created & Ready</div>
          </div>

          <!-- 3. Level & XP Progress Card -->
          <div class="card stat-card card-hover" style="grid-column: span 2; border-top: 2px solid #fbbf24;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="stat-icon" style="color: #fbbf24; background: rgba(251, 191, 36, 0.15); font-size: 2rem;">⭐</div>
                <div>
                  <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800;">Level ${userLevel} Master</div>
                  <div class="text-secondary" style="font-size: 0.88rem;">Total Experience: <span class="text-cyan font-bold" style="color: #ff9e64;">${currentXp} XP</span></div>
                </div>
              </div>
              <span class="level-badge" style="background: var(--accent-gradient); color: #fff; font-size: 0.85rem; padding: 0.35rem 0.85rem; font-weight: 800;">Rank Tier ${userLevel}</span>
            </div>

            <div style="margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 0.35rem;">
                <span class="text-secondary">Progress to Next Tier</span>
                <span style="color: #ff9e64; font-weight: 800;">${xpProgressInLevel} / 1000 XP (${xpPercent}%)</span>
              </div>
              <div class="progress-bar-bg" style="height: 10px;">
                <div class="progress-bar-fill" style="width: ${xpPercent}%;"></div>
              </div>
            </div>
          </div>

        </div>

        <!-- Section 1: Manage Quizzes (Option to Delete Quiz Created) -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800;">Quiz Store & Live Presenter</h2>
              <p class="text-secondary" style="font-size: 0.9rem;">Launch live interactive audience sessions or manage questions.</p>
            </div>
            <button class="btn btn-primary" onclick="QVApp.navigateTo('quiz-builder')">➕ Build New Quiz</button>
          </div>

          <div id="quiz-manage-list">
            ${this.renderQuizTable(quizzes)}
          </div>
        </div>

        <!-- Section 2: Classrooms Overview -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800;">Active Classrooms</h2>
              <p class="text-secondary" style="font-size: 0.9rem;">Classrooms allow specific enrolled cohorts to join scheduled tests.</p>
            </div>
            <button class="btn btn-secondary" onclick="QVApp.navigateTo('classroom')">🏫 Open Classroom Hub</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
            ${classrooms.length === 0 ? `
              <div class="text-secondary" style="padding: 2rem; text-align: center; grid-column: 1 / -1; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                No classrooms created yet. Create a digital classroom to organize students.
              </div>
            ` : classrooms.map(c => {
              let members = [];
              try { members = typeof c.members_json === 'string' ? JSON.parse(c.members_json) : (c.members_json || []); } catch(e) {}
              return `
                <div style="background: rgba(28, 20, 14, 0.7); border: 1px solid var(--border-color); padding: 1.35rem; border-radius: var(--radius-md); transition: all 0.25s ease;" class="card-hover">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.15rem; color: #fff;">${c.name}</div>
                    <span class="room-code-badge" style="font-size: 0.85rem; padding: 0.2rem 0.6rem; background: rgba(255, 107, 53, 0.15); color: #ff9e64; border-color: rgba(255, 107, 53, 0.3);">${c.code}</span>
                  </div>
                  <div class="text-secondary" style="font-size: 0.88rem;">👨‍🎓 Enrolled Students: <span style="color: #fff; font-weight: 700;">${members.length}</span></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  },

  renderQuizTable(quizzes) {
    if (!quizzes || quizzes.length === 0) {
      return `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No quizzes created yet. Click "Create New Quiz" or upload a PDF/DOCX/PPT to start!
        </div>
      `;
    }

    return `
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Quiz Title</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Questions</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${quizzes.map(q => {
              const qCount = Array.isArray(q.questions) ? q.questions.length : (typeof q.questions_json === 'string' ? JSON.parse(q.questions_json || '[]').length : 0);
              return `
                <tr>
                  <td style="font-size: 1.5rem; width: 60px;">${q.thumbnail || '💡'}</td>
                  <td style="font-weight: 600;">${q.title}</td>
                  <td><span class="level-badge" style="background: rgba(255,255,255,0.1); color: var(--text-secondary);">${q.category || 'General'}</span></td>
                  <td><span style="color: ${q.difficulty === 'Hard' ? '#ff7675' : q.difficulty === 'Easy' ? '#00b894' : '#fdcb6e'}; font-weight: 600;">${q.difficulty || 'Medium'}</span></td>
                  <td>${qCount} Qs</td>
                  <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.85rem;" onclick="QVDashboardPage.hostQuiz('${q.id}')">🎮 Host Game</button>
                    <button class="btn btn-danger" style="padding: 0.4rem 0.85rem; font-size: 0.85rem;" onclick="QVDashboardPage.confirmDeleteQuiz('${q.id}', '${q.title.replace(/'/g, "\\'")}')">🗑️ Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  hostQuiz(quizId) {
    if (window.QVGameEngine) {
      window.QVGameEngine.createGame(quizId);
    }
  },

  async confirmDeleteQuiz(quizId, quizTitle) {
    if (confirm(`Are you sure you want to delete the quiz "${quizTitle}"? This action cannot be undone.`)) {
      const success = await window.QVData.deleteQuiz(quizId);
      if (success) {
        if (window.QVAnimations) window.QVAnimations.showToast(`Quiz "${quizTitle}" was deleted successfully.`, 'success');
        // Refresh dashboard view
        this.render(document.getElementById('main-content'));
      } else {
        if (window.QVAnimations) window.QVAnimations.showToast('Failed to delete quiz.', 'error');
      }
    }
  }
};
