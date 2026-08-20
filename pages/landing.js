// ── LANDING PAGE CONTROLLER (PREMIUM GAMING & AI DESIGN) ─────────
window.QVLandingPage = {
  render(container) {
    container.innerHTML = `
      <section class="hero-section animate-fade-in">
        
        <!-- Floating Parallax Pills -->
        <div class="floating-hero-pill pill-pos-1 animate-float">
          <span style="font-size: 1.2rem;">⚡</span>
          <span>Ultra-Fast 60fps WebSockets</span>
        </div>

        <div class="floating-hero-pill pill-pos-2 animate-float-reverse">
          <span style="font-size: 1.2rem;">🤖</span>
          <span>Gemini AI Question Engine</span>
        </div>

        <div class="floating-hero-pill pill-pos-3 animate-float">
          <span style="font-size: 1.2rem;">🏆</span>
          <span>Realtime Podium Rankings</span>
        </div>

        <!-- Top Badge -->
        <div class="hero-badge">
          <span>✨</span>
          <span>The Next-Generation Gamified Quiz Platform</span>
        </div>

        <!-- Word-by-Word Hero Reveal Headline -->
        <h1 class="hero-title" id="hero-headline">
          Realtime Gamified Battles <br>
          <span class="highlight-text">Powered by AI & Live Analytics</span>
        </h1>

        <p class="hero-subtitle">
          Experience ultra-responsive multiplayer competitions, turn slides & documents (PDF/DOCX/PPT) into interactive quizzes, and track mastery with knowledge vs. guess detection.
        </p>

        <!-- Glassmorphism Join Room Card with Listening Pulse -->
        <div class="join-widget card">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #fff;">
              🎮 Enter Game Arena
            </div>
            <span class="level-badge" style="background: rgba(6, 182, 212, 0.2); color: var(--accent-cyan);">Live Socket</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <input type="text" id="landing-room-code" class="join-input" placeholder="ROOM CODE (e.g. 8A9X2K)" maxlength="6" style="text-transform: uppercase; font-size: 1.3rem; text-align: center; font-weight: 800; letter-spacing: 0.15em;">
            <input type="text" id="landing-nickname" class="join-input" placeholder="Your Gladiator Nickname" value="${window.QVData.user ? window.QVData.user.name : ''}" style="font-size: 1rem;">
          </div>

          <button class="btn-magnetic" id="btn-join-room" onclick="QVLandingPage.joinRoom()">
            Join Game Room 🚀
          </button>
        </div>
      </section>

      <!-- Feature Grid -->
      <div class="feature-grid">
        <div class="feature-card card">
          <div class="feature-icon-wrapper">⚡</div>
          <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: #fff;">Realtime Multiplayer</h3>
          <p class="text-secondary" style="font-size: 0.95rem; line-height: 1.5;">Sub-millisecond timer sync, answer streaks, live distribution charts, and Mentimeter interactive slide formats.</p>
        </div>

        <div class="feature-card card">
          <div class="feature-icon-wrapper">📄</div>
          <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: #fff;">AI Document Question Engine</h3>
          <p class="text-secondary" style="font-size: 0.95rem; line-height: 1.5;">Upload PDF, DOCX, or PowerPoint decks to automatically synthesize multi-format interactive question decks with Gemini AI.</p>
        </div>

        <div class="feature-card card">
          <div class="feature-icon-wrapper">🏫</div>
          <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: #fff;">Classrooms & Anti-Cheat</h3>
          <p class="text-secondary" style="font-size: 0.95rem; line-height: 1.5;">Manage classes, schedule asynchronous homework tests, and protect exam integrity with active window blur detection.</p>
        </div>
      </div>
    `;

    // Magnetic Button Hover Physics
    const btn = document.getElementById('btn-join-room');
    if (btn && window.innerWidth > 900) {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px) scale(1.03)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px) scale(1)';
      });
    }
  },

  joinRoom() {
    const code = document.getElementById('landing-room-code').value.trim();
    const nickname = document.getElementById('landing-nickname').value.trim() || 'Gladiator';

    if (!code) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter a valid 6-character room code', 'warning');
      return;
    }

    if (window.QVGameEngine) {
      window.QVGameEngine.joinGame(code, nickname);
    }
  }
};
