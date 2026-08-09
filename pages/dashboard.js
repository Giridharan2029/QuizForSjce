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
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <!-- Dashboard Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800;">
              Welcome back, <span class="text-accent">${user.name || 'Host'}</span> 👋
            </h1>
            <p class="text-secondary">Track your game stats, level progress, manage created quizzes, and manage classrooms.</p>
          </div>

          <div style="display: flex; gap: 1rem;">
            <button class="btn btn-primary btn-lg" onclick="QVApp.navigateTo('quiz-builder')">
              <span>➕</span> Create New Quiz
            </button>
            <button class="btn btn-secondary btn-lg" onclick="QVApp.navigateTo('classroom')">
              <span>🏫</span> Manage Classrooms
            </button>
          </div>
        </div>

        <!-- Metric Stat Cards (Total Player Reached REMOVED as requested!) -->
        <div class="stat-grid">
          
          <!-- 1. Total Games Hosted -->
          <div class="card stat-card card-hover">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="stat-icon" style="color: #6c5ce7; background: rgba(108, 92, 231, 0.15);">🎮</div>
              <span class="text-secondary" style="font-size: 0.8rem; font-weight: 600;">ACTIVE HOST</span>
            </div>
            <div class="stat-value" id="dash-games-hosted">${gamesHosted}</div>
            <div class="stat-label">Total Games Hosted</div>
          </div>

          <!-- 2. Quizzes Created -->
          <div class="card stat-card card-hover">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="stat-icon" style="color: #00cec9; background: rgba(0, 206, 201, 0.15);">💡</div>
              <span class="text-secondary" style="font-size: 0.8rem; font-weight: 600;">QUIZ STORE</span>
            </div>
            <div class="stat-value">${quizzes.length}</div>
            <div class="stat-label">Quizzes Created & Ready</div>
          </div>

          <!-- 3. Level & XP Progress Card -->
          <div class="card stat-card card-hover" style="grid-column: span 2;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="stat-icon" style="color: #fdcb6e; background: rgba(253, 203, 110, 0.15);">⭐</div>
                <div>
                  <div style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700;">Level ${userLevel} Master</div>
                  <div class="text-secondary" style="font-size: 0.85rem;">Total XP: <span class="text-cyan font-bold">${currentXp} XP</span></div>
                </div>
              </div>
              <span class="level-badge" style="font-size: 0.9rem; padding: 0.25rem 0.75rem;">Level ${userLevel}</span>
            </div>

            <div style="margin-top: 0.75rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                <span class="text-secondary">Level Progress</span>
                <span class="text-accent font-bold">${xpProgressInLevel} / 1000 XP (${xpPercent}%)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${xpPercent}%;"></div>
              </div>
            </div>
          </div>

        </div>

        <!-- Section 1: Manage Quizzes (Option to Delete Quiz Created) -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;">Manage Quizzes</h2>
              <p class="text-secondary" style="font-size: 0.9rem;">View, launch live hosting, or delete created quizzes.</p>
            </div>
            <button class="btn btn-secondary" onclick="QVApp.navigateTo('quiz-builder')">➕ Build Quiz</button>
          </div>

          <div id="quiz-manage-list">
            ${this.renderQuizTable(quizzes)}
          </div>
        </div>

        <!-- Section 2: Classrooms Overview -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;">Active Classrooms</h2>
              <p class="text-secondary" style="font-size: 0.9rem;">Classrooms allow specific class students to attend hosted tests.</p>
            </div>
            <button class="btn btn-primary" onclick="QVApp.navigateTo('classroom')">🏫 Open Classroom Manager</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
            ${classrooms.length === 0 ? `
              <div class="text-secondary" style="padding: 1rem; text-align: center; grid-column: 1 / -1;">
                No classrooms created yet. Create a classroom to host tests for specific student groups.
              </div>
            ` : classrooms.map(c => {
              let members = [];
              try { members = typeof c.members_json === 'string' ? JSON.parse(c.members_json) : (c.members_json || []); } catch(e) {}
              return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div style="font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem;">${c.name}</div>
                    <span class="room-code-badge" style="font-size: 0.9rem; padding: 0.15rem 0.5rem;">${c.code}</span>
                  </div>
                  <div class="text-secondary" style="font-size: 0.85rem;">👨‍🎓 Enrolled Students: <span style="color: #fff; font-weight: 600;">${members.length}</span></div>
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
