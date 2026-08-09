// ── LEADERBOARD PAGE CONTROLLER ─────────────────────────────
window.QVLeaderboardPage = {
  async render(container) {
    const user = window.QVData.user || {};

    let leaders = [
      { id: 'm1', name: 'Alex Morgan', level: 14, xp: 14250, badge: '👑 Grandmaster' },
      { id: 'm2', name: 'Sophia Chen', level: 11, xp: 11800, badge: '⭐ Quiz Master' },
      { id: 'm3', name: 'David Miller', level: 9, xp: 9400, badge: '🔥 Challenger' },
      { id: 'm4', name: 'Emma Watson', level: 4, xp: 4100, badge: '💡 Explorer' }
    ];

    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
        leaders = data.leaderboard;
      }
    } catch (e) {
      console.warn('Leaderboard API fetch notice:', e.message);
    }

    // Identify or append current user
    const userKey = (user.name || '').toLowerCase().trim();
    let foundCurrent = false;

    leaders.forEach(l => {
      if ((l.name || '').toLowerCase().trim() === userKey || l.id === user.id) {
        l.isCurrent = true;
        l.level = Math.max(l.level || 1, user.level || 1);
        l.xp = Math.max(l.xp || 0, user.xp || 0);
        foundCurrent = true;
      }
    });

    if (!foundCurrent && user.name) {
      leaders.push({
        id: user.id || 'curr',
        name: user.name,
        level: user.level || 1,
        xp: user.xp || 0,
        badge: (user.level >= 10) ? '👑 Grandmaster' : '🚀 Rookie',
        isCurrent: true
      });
    }

    // STRICT DEDUPLICATION: Group by normalized name, keeping entry with highest XP
    const uniqueMap = new Map();
    leaders.forEach(item => {
      const key = (item.name || '').toLowerCase().trim();
      const existing = uniqueMap.get(key);
      if (!existing || item.xp > existing.xp || item.isCurrent) {
        // preserve isCurrent flag if matched
        if (existing && existing.isCurrent) item.isCurrent = true;
        uniqueMap.set(key, item);
      }
    });

    const deduplicatedLeaders = Array.from(uniqueMap.values())
      .sort((a, b) => b.xp - a.xp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <div>
          <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800;">Global Level & XP Leaderboard</h1>
          <p class="text-secondary">Top QuizVerse champions ranked by Level progression and Total XP earned.</p>
        </div>

        <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="leaderboard-list">
            ${deduplicatedLeaders.map(player => `
              <div class="leaderboard-item ${player.isCurrent ? 'highlight' : ''}">
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; width: 30px; text-align: center; color: ${player.rank === 1 ? '#fdcb6e' : player.rank === 2 ? '#a0aec0' : player.rank === 3 ? '#ed8936' : 'var(--text-secondary)'};">
                    ${player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '#' + player.rank}
                  </span>
                  <div>
                    <div style="font-weight: 700; font-size: 1.05rem;">${player.name} ${player.isCurrent ? '<span class="level-badge">You</span>' : ''}</div>
                    <div class="text-secondary" style="font-size: 0.85rem;">${player.badge || '🚀 Champion'}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem;">
                  <span class="level-badge" style="font-size: 0.85rem; padding: 0.2rem 0.6rem;">Lvl ${player.level}</span>
                  <span class="text-cyan font-bold" style="font-size: 1.1rem; width: 90px; text-align: right;">${player.xp} XP</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }
};
