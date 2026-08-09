// ── LANDING PAGE CONTROLLER ─────────────────────────────────
window.QVLandingPage = {
  render(container) {
    container.innerHTML = `
      <section class="hero-section animate-fade-in">
        <h1 class="hero-title">Realtime Gamified Quizzes Powered by AI</h1>
        <p class="hero-subtitle">
          Host ultra-fast multiplayer quiz battles, convert documents (PDF/DOCX/PPT) to instant AI quizzes, and manage classrooms with restricted student tests.
        </p>

        <div class="join-widget">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem;">Enter Room Code to Join</h3>
          <div class="input-group">
            <input type="text" id="landing-room-code" class="input" placeholder="e.g. 8A9X2K" style="text-transform: uppercase; font-size: 1.2rem; text-align: center; letter-spacing: 0.1em;">
          </div>
          <div class="input-group">
            <input type="text" id="landing-nickname" class="input" placeholder="Your Nickname" value="${window.QVData.user ? window.QVData.user.name : ''}">
          </div>
          <button class="btn btn-primary btn-lg w-full" onclick="QVLandingPage.joinRoom()">Join Game Room 🚀</button>
        </div>
      </section>

      <div class="feature-grid">
        <div class="card feature-card card-hover">
          <div class="feature-icon">⚡</div>
          <h3 style="font-family: var(--font-heading);">Realtime Multiplayer</h3>
          <p class="text-secondary" style="font-size: 0.9rem;">Live timer synchronization, answer streaks, realtime option distribution counters, and podium finish.</p>
        </div>

        <div class="card feature-card card-hover">
          <div class="feature-icon">📄</div>
          <h3 style="font-family: var(--font-heading);">AI Document Question Generator</h3>
          <p class="text-secondary" style="font-size: 0.9rem;">Upload PDF, Word (DOCX) or PowerPoint (PPT/PPTX) files, choose the exact number of questions, and let AI build your quiz.</p>
        </div>

        <div class="card feature-card card-hover">
          <div class="feature-icon">🏫</div>
          <h3 style="font-family: var(--font-heading);">Classrooms & Restricted Tests</h3>
          <p class="text-secondary" style="font-size: 0.9rem;">Create classrooms and host tests exclusively for enrolled class students with access code validation.</p>
        </div>
      </div>
    `;
  },

  joinRoom() {
    const code = document.getElementById('landing-room-code').value.trim();
    const nickname = document.getElementById('landing-nickname').value.trim() || 'Player';

    if (!code) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter a room code', 'warning');
      return;
    }

    if (window.QVGameEngine) {
      window.QVGameEngine.joinGame(code, nickname);
    }
  }
};
