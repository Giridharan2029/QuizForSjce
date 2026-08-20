// ── LEADERBOARD PAGE CONTROLLER (DUOLINGO LEAGUES & VALORANT TIERS) ───
window.QVLeaderboardPage = {
  currentTab: 'global',
  searchQuery: '',
  allLeaders: [],

  async render(container) {
    const user = window.QVData.user || {};

    let leaders = [];

    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
        leaders = data.leaderboard.map(item => ({
          ...item,
          tier: item.level >= 12 ? 'grandmaster' : item.level >= 9 ? 'quizmaster' : item.level >= 6 ? 'challenger' : item.level >= 4 ? 'explorer' : 'rookie',
          change: '+1',
          streak: item.streak || 0,
          winRate: `${Math.min(98, 55 + (item.level || 1) * 3)}%`
        }));
      }
    } catch (e) {
      console.warn('Leaderboard API fetch notice:', e.message);
    }

    // Append / sync current logged in user
    const userKey = (user.name || '').toLowerCase().trim();
    let foundCurrent = false;

    // Deduplicate & Sync in one unified Map
    const uniqueMap = new Map();

    leaders.forEach(item => {
      const normalizedKey = (item.name || '').toLowerCase().trim();
      if (!normalizedKey) return;

      const isUserMatch = (normalizedKey === userKey || (user.id && item.id === user.id));
      if (isUserMatch) {
        item.isCurrent = true;
        item.level = Math.max(item.level || 1, user.level || 1);
        item.xp = Math.max(item.xp || 0, user.xp || 0);
        item.tier = item.level >= 12 ? 'grandmaster' : item.level >= 9 ? 'quizmaster' : item.level >= 6 ? 'challenger' : item.level >= 4 ? 'explorer' : 'rookie';
        foundCurrent = true;
      }

      const existing = uniqueMap.get(normalizedKey);
      if (!existing || item.xp > existing.xp || item.isCurrent) {
        if (existing && existing.isCurrent) item.isCurrent = true;
        uniqueMap.set(normalizedKey, item);
      }
    });

    if (!foundCurrent && user.name && user.name !== 'Guest') {
      const normalizedKey = userKey;
      uniqueMap.set(normalizedKey, {
        id: user.id || 'curr',
        name: user.name,
        level: user.level || 1,
        xp: user.xp || 0,
        badge: (user.level >= 12) ? '👑 Grandmaster' : (user.level >= 9) ? '⭐ Quiz Master' : (user.level >= 6) ? '🔥 Challenger' : (user.level >= 4) ? '💡 Explorer' : '🚀 Rookie',
        tier: user.level >= 12 ? 'grandmaster' : user.level >= 9 ? 'quizmaster' : user.level >= 6 ? 'challenger' : user.level >= 4 ? 'explorer' : 'rookie',
        streak: user.streak || 0,
        change: '+1',
        winRate: '75%',
        isCurrent: true
      });
    }

    this.allLeaders = Array.from(uniqueMap.values())
      .sort((a, b) => b.xp - a.xp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    this.renderLeaderboardView(container);
  },

  renderLeaderboardView(container) {
    const query = (this.searchQuery || '').toLowerCase().trim();
    const filteredLeaders = this.allLeaders.filter(p => p.name.toLowerCase().includes(query));

    const top1 = filteredLeaders[0] || this.allLeaders[0];
    const top2 = filteredLeaders[1] || this.allLeaders[1];
    const top3 = filteredLeaders[2] || this.allLeaders[2];
    const restList = filteredLeaders.filter(p => p.rank > 3);

    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2rem; position: relative;">
        
        <!-- Header & Segment Controls -->
        <div class="leaderboard-header-section">
          <div>
            <div class="hero-badge">
              <span>🏆</span>
              <span>Diamond Tier Tournament Season</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 900; letter-spacing: -0.02em;">
              Global Level & XP League
            </h1>
            <p class="text-secondary" style="font-size: 1.05rem; margin-top: 0.25rem;">
              Compete, climb the ranks, and earn exclusive league tier badges.
            </p>
          </div>

          <!-- Animated League Tab Switcher -->
          <div class="league-tabs-container">
            <button class="league-tab-btn ${this.currentTab === 'global' ? 'active' : ''}" onclick="QVLeaderboardPage.setTab('global')">🌐 Global</button>
            <button class="league-tab-btn ${this.currentTab === 'weekly' ? 'active' : ''}" onclick="QVLeaderboardPage.setTab('weekly')">⚡ This Week</button>
            <button class="league-tab-btn ${this.currentTab === 'classroom' ? 'active' : ''}" onclick="QVLeaderboardPage.setTab('classroom')">🏫 Classrooms</button>
          </div>
        </div>

        <!-- Search Bar -->
        <div style="display: flex; align-items: center; gap: 1rem; width: 100%; max-width: 480px;">
          <input type="text" class="input" placeholder="🔍 Search champion by nickname..." value="${this.searchQuery}" oninput="QVLeaderboardPage.onSearch(this.value)" style="border-radius: var(--radius-full); padding: 0.75rem 1.4rem; font-size: 0.95rem;">
        </div>

        <!-- ── VISUAL TOP 3 PODIUM ── -->
        ${!this.searchQuery && filteredLeaders.length === 0 ? `
          <div class="card" style="text-align: center; padding: 3rem 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.6;">🏆</div>
            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">No Champions Yet</h2>
            <p class="text-secondary" style="font-size: 1rem; max-width: 400px; margin: 0 auto;">Be the first to sign up and claim the #1 spot on the leaderboard!</p>
            <button class="btn btn-primary" style="margin-top: 1.25rem;" onclick="window.location.hash='#login'">Sign Up & Start Playing 🚀</button>
          </div>
        ` : ''}
        ${!this.searchQuery && top1 ? `
          <div class="podium-container">
            
            <!-- 2nd Place (Silver) -->
            ${top2 ? `
              <div class="podium-step podium-2 card" onclick="QVLeaderboardPage.openProfileModal('${top2.id}')">
                <div class="podium-avatar-ring" style="background: linear-gradient(135deg, #cbd5e1, #94a3b8);">
                  <div class="podium-avatar-inner">${top2.name.slice(0, 2).toUpperCase()}</div>
                </div>
                <div style="font-size: 2rem;" class="animate-medal">🥈</div>
                <div style="font-weight: 800; font-size: 1.1rem; color: #fff; margin-top: 0.25rem;">${top2.name}</div>
                <span class="tier-badge tier-${top2.tier}" style="margin: 0.35rem 0;">${top2.badge}</span>
                <div class="text-cyan font-bold" style="font-size: 1.1rem;">${top2.xp.toLocaleString()} XP</div>
                <div class="text-secondary" style="font-size: 0.8rem; margin-top: 0.2rem;">Lvl ${top2.level}</div>
              </div>
            ` : ''}

            <!-- 1st Place (Champion Gold) -->
            <div class="podium-step podium-1 card" onclick="QVLeaderboardPage.openProfileModal('${top1.id}')">
              <div class="podium-avatar-ring" style="background: linear-gradient(135deg, #fbbf24, #f59e0b);">
                <div class="podium-avatar-inner" style="color: #fbbf24;">👑</div>
              </div>
              <div style="font-size: 2.6rem;" class="animate-medal">🥇</div>
              <div style="font-weight: 900; font-size: 1.25rem; color: #fff; margin-top: 0.25rem;">${top1.name}</div>
              <span class="tier-badge tier-${top1.tier}" style="margin: 0.4rem 0;">${top1.badge}</span>
              <div style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 900; color: #fbbf24;">${top1.xp.toLocaleString()} XP</div>
              <div class="text-secondary" style="font-size: 0.85rem; margin-top: 0.2rem;">Lvl ${top1.level} Champion</div>
            </div>

            <!-- 3rd Place (Bronze) -->
            ${top3 ? `
              <div class="podium-step podium-3 card" onclick="QVLeaderboardPage.openProfileModal('${top3.id}')">
                <div class="podium-avatar-ring" style="background: linear-gradient(135deg, #f97316, #ea580c);">
                  <div class="podium-avatar-inner">${top3.name.slice(0, 2).toUpperCase()}</div>
                </div>
                <div style="font-size: 1.8rem;" class="animate-medal">🥉</div>
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff; margin-top: 0.25rem;">${top3.name}</div>
                <span class="tier-badge tier-${top3.tier}" style="margin: 0.35rem 0;">${top3.badge}</span>
                <div class="text-cyan font-bold" style="font-size: 1.05rem;">${top3.xp.toLocaleString()} XP</div>
                <div class="text-secondary" style="font-size: 0.8rem; margin-top: 0.2rem;">Lvl ${top3.level}</div>
              </div>
            ` : ''}

          </div>
        ` : ''}

        <!-- ── RANKED LIST (4th place & rest) ── -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700;">
              League Standings (${filteredLeaders.length} Players)
            </h3>
            <span class="text-secondary" style="font-size: 0.85rem;">Click player for combat profile</span>
          </div>

          <div class="leaderboard-list" id="leaderboard-rows-container">
            ${filteredLeaders.map(player => `
              <div class="leaderboard-row ${player.isCurrent ? 'current-user-row' : ''}" id="user-rank-row-${player.rank}" onclick="QVLeaderboardPage.openProfileModal('${player.id}')">
                
                <div style="display: flex; align-items: center; gap: 1.25rem;">
                  <!-- Rank indicator with Medal or Number -->
                  <div style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 900; width: 36px; text-align: center; color: ${player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#cbd5e1' : player.rank === 3 ? '#f97316' : 'var(--text-secondary)'};">
                    ${player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '#' + player.rank}
                  </div>

                  <!-- Rank Change Indicator -->
                  <span style="font-size: 0.8rem; font-weight: 800; color: ${player.change.startsWith('+') ? '#10b981' : player.change.startsWith('-') ? '#ef4444' : '#64748b'};">
                    ${player.change.startsWith('+') ? '▲' : player.change.startsWith('-') ? '▼' : '•'} ${player.change}
                  </span>

                  <!-- Avatar / Name -->
                  <div>
                    <div style="font-weight: 800; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                      <span>${player.name}</span>
                      ${player.isCurrent ? '<span class="level-badge" style="background: var(--accent-gradient); font-size: 0.65rem;">YOU</span>' : ''}
                      ${player.streak > 2 ? `<span class="animate-fire" title="${player.streak} Win Streak">🔥</span>` : ''}
                    </div>
                    <div style="margin-top: 0.2rem;">
                      <span class="tier-badge tier-${player.tier}">${player.badge}</span>
                    </div>
                  </div>
                </div>

                <!-- XP & Level Stats -->
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                  <span class="level-badge" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #fff;">
                    Lvl ${player.level}
                  </span>
                  <div style="text-align: right; min-width: 100px;">
                    <div class="text-cyan font-bold" style="font-size: 1.15rem;">
                      ${player.xp.toLocaleString()} XP
                    </div>
                    <div class="text-secondary" style="font-size: 0.75rem;">Winrate: ${player.winRate}</div>
                  </div>
                </div>

              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sticky "Jump to my rank" Floating Pill -->
        <button class="jump-to-rank-btn" onclick="QVLeaderboardPage.jumpToMyRank()">
          <span>🎯</span>
          <span>Jump to My Rank</span>
        </button>

      </div>

      <!-- Mini-Profile Modal -->
      <div id="player-profile-modal" class="modal-overlay hidden" style="z-index: 99999;">
        <div class="modal" id="player-profile-modal-content" style="max-width: 440px;">
          <!-- Loaded dynamically -->
        </div>
      </div>
    `;

    // Reinitialize 3D tilt effects
    if (window.QVAnimations) window.QVAnimations.init3DTilt();
  },

  setTab(tab) {
    this.currentTab = tab;
    if (window.QVAnimations) window.QVAnimations.showToast(`Switched to ${tab.toUpperCase()} league standings`, 'info');
    const mainEl = document.getElementById('main-content');
    if (mainEl) this.renderLeaderboardView(mainEl);
  },

  onSearch(val) {
    this.searchQuery = val;
    const mainEl = document.getElementById('main-content');
    if (mainEl) this.renderLeaderboardView(mainEl);
  },

  jumpToMyRank() {
    const userRow = document.querySelector('.current-user-row');
    if (userRow) {
      userRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      userRow.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.9)';
      setTimeout(() => { userRow.style.boxShadow = ''; }, 1600);
      if (window.QVAnimations) window.QVAnimations.showToast('Jumped to your rank standing! 🎯', 'success');
    }
  },

  openProfileModal(playerId) {
    const player = this.allLeaders.find(p => p.id === playerId) || this.allLeaders[0];
    if (!player) return;

    const modal = document.getElementById('player-profile-modal');
    const content = document.getElementById('player-profile-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; color: #fff;">
            ${player.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 class="modal-title" style="font-size: 1.2rem;">${player.name}</h3>
            <span class="tier-badge tier-${player.tier}">${player.badge}</span>
          </div>
        </div>
        <button class="modal-close" onclick="document.getElementById('player-profile-modal').classList.add('hidden')">✕</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.8rem; color: var(--text-secondary);">LEAGUE RANK</div>
            <div style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 900; color: #fbbf24;">#${player.rank}</div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.8rem; color: var(--text-secondary);">TOTAL XP</div>
            <div style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 900; color: var(--accent-cyan);">${player.xp.toLocaleString()}</div>
          </div>
        </div>

        <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
            <span>Level ${player.level} Progress</span>
            <span class="text-cyan font-bold">${player.xp % 1000} / 1,000 XP</span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${(player.xp % 1000) / 10}%; background: var(--accent-gradient); border-radius: var(--radius-full);"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 0.5rem 0;">
          <span class="text-secondary">Current Win Streak:</span>
          <strong style="color: #f59e0b;">🔥 ${player.streak} Wins</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 0.5rem 0; border-top: 1px solid var(--border-color);">
          <span class="text-secondary">Accuracy / Win Rate:</span>
          <strong style="color: var(--accent-green);">${player.winRate}</strong>
        </div>

        <button class="btn btn-primary w-full" onclick="document.getElementById('player-profile-modal').classList.add('hidden')">
          Done ✓
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
  }
};
