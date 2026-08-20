// ── QUIZVERSE CORE SPA ROUTER & FRAMEWORK ─────────────────────
window.QVApp = {
  currentRoute: 'landing',
  routeParams: {},

  init() {
    this.renderLayout();
    this.navigateTo('landing');
  },

  renderLayout() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = `
      <header class="navbar">
        <a class="nav-brand" onclick="QVApp.navigateTo('landing')">
          <span style="font-size: 1.8rem;">⚡</span>
          <span>QuizVerse</span>
        </a>

          <div class="nav-links">
          <a class="nav-item" id="nav-landing" onclick="QVApp.navigateTo('landing')">Home</a>
          <a class="nav-item" id="nav-dashboard" onclick="QVApp.navigateTo('dashboard')">Dashboard</a>
          <a class="nav-item" id="nav-quiz-builder" onclick="QVApp.navigateTo('quiz-builder')">Create Quiz</a>
          <a class="nav-item" id="nav-classroom" onclick="QVApp.navigateTo('classroom')">Classrooms</a>
          <a class="nav-item" id="nav-scheduled-tests" onclick="QVApp.navigateTo('scheduled-tests')">Scheduled Tests</a>
          <a class="nav-item" id="nav-leaderboard" onclick="QVApp.navigateTo('leaderboard')">Leaderboard</a>

          <div id="user-header-profile" class="user-level-pill" onclick="QVApp.toggleUserDropdown()">
            <span class="level-badge" id="hdr-user-level">Lvl 1</span>
            <span id="hdr-user-name" style="color: #fff;">Guest</span>
            <span id="hdr-user-xp" class="text-cyan" style="font-size: 0.8rem; font-weight: 700;">0 XP</span>
          </div>

          <button class="btn btn-primary" id="hdr-login-btn" onclick="window.openAuthModal(false)">Log In</button>
        </div>
      </header>

      <main id="main-content" class="container"></main>

      <footer style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.875rem; border-top: 1px solid var(--border-color); margin-top: auto;">
        QuizVerse &copy; 2026 — Realtime Gamified Learning Platform
      </footer>
    `;

    this.updateHeader();
  },

  updateHeader() {
    const user = window.QVData ? window.QVData.user : null;
    const levelEl = document.getElementById('hdr-user-level');
    const nameEl = document.getElementById('hdr-user-name');
    const xpEl = document.getElementById('hdr-user-xp');
    const loginBtn = document.getElementById('hdr-login-btn');

    if (user && user.name !== 'Guest Player') {
      if (levelEl) levelEl.textContent = `Lvl ${user.level || 1}`;
      if (nameEl) nameEl.textContent = user.name;
      if (xpEl) xpEl.textContent = `${user.xp || 0} XP`;
      if (loginBtn) {
        loginBtn.textContent = 'Log Out';
        loginBtn.onclick = () => window.QVAuth.logOut();
      }
    } else {
      if (levelEl) levelEl.textContent = `Lvl ${user ? user.level : 1}`;
      if (nameEl) nameEl.textContent = 'Guest';
      if (xpEl) xpEl.textContent = `${user ? user.xp : 0} XP`;
      if (loginBtn) {
        loginBtn.textContent = 'Log In';
        loginBtn.onclick = () => window.openAuthModal(false);
      }
    }
  },

  navigateTo(routeName, params = {}) {
    this.currentRoute = routeName;
    this.routeParams = params;

    // Trigger Top Route Progress Bar
    let bar = document.getElementById('route-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'route-progress-bar';
      document.body.prepend(bar);
    }
    bar.style.opacity = '1';
    bar.style.width = '30%';
    setTimeout(() => { bar.style.width = '75%'; }, 80);

    // Update nav link active styles
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${routeName}`);
    if (activeNav) activeNav.classList.add('active');

    const mainEl = document.getElementById('main-content');
    if (!mainEl) return;

    window.scrollTo(0, 0);

    // Route controllers
    switch (routeName) {
      case 'landing':
        if (window.QVLandingPage) window.QVLandingPage.render(mainEl);
        break;
      case 'dashboard':
        if (window.QVDashboardPage) window.QVDashboardPage.render(mainEl);
        break;
      case 'quiz-builder':
        if (window.QVQuizBuilderPage) window.QVQuizBuilderPage.render(mainEl);
        break;
      case 'classroom':
        if (window.QVClassroomPage) window.QVClassroomPage.render(mainEl);
        break;
      case 'scheduled-tests':
        if (window.QVScheduledTestsPage) window.QVScheduledTestsPage.render(mainEl);
        break;
      case 'host-panel':
        if (window.QVHostPanelPage) window.QVHostPanelPage.render(mainEl, params);
        break;
      case 'player-game':
      case 'player-lobby':
        if (window.QVPlayerGamePage) window.QVPlayerGamePage.render(mainEl, params);
        break;
      case 'leaderboard':
        if (window.QVLeaderboardPage) window.QVLeaderboardPage.render(mainEl);
        break;
      default:
        if (window.QVLandingPage) window.QVLandingPage.render(mainEl);
    }

    // Complete Progress Bar
    setTimeout(() => {
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => { bar.style.width = '0%'; }, 300);
      }, 200);
    }, 150);

    // Reinitialize 3D tilt and GSAP effects on newly mounted route elements
    if (window.QVAnimations) {
      setTimeout(() => window.QVAnimations.init3DTilt(), 100);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.QVApp.init();
});
