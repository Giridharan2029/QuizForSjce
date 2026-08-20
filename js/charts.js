// ── QUIZVERSE CHARTS & MENTI VISUALIZATION ENGINE ───────────
window.QVCharts = {
  renderAccuracyRing(containerId, percentage) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    el.innerHTML = `
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${radius}" stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="none" />
        <circle cx="50" cy="50" r="${radius}" stroke="#6c5ce7" stroke-width="8" fill="none"
          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
          stroke-linecap="round" transform="rotate(-90 50 50)" style="transition: stroke-dashoffset 1s ease;" />
        <text x="50" y="55" font-family="Space Grotesk" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">${percentage}%</text>
      </svg>
    `;
  },

  // 1. Mentimeter Dynamic Word Cloud Visualizer
  renderWordCloud(containerId, wordFrequencyMap = {}) {
    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    const entries = Object.entries(wordFrequencyMap);
    if (entries.length === 0) {
      el.innerHTML = `<div class="text-secondary" style="font-size: 1rem; padding: 2rem; text-align: center;">☁️ Waiting for audience words & phrases...</div>`;
      return;
    }

    const maxCount = Math.max(...entries.map(([, c]) => c), 1);
    const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff7675', '#a29bfe', '#55efc4', '#fd79a8', '#0984e3', '#e17055'];

    el.innerHTML = `
      <div class="word-cloud-container">
        ${entries.map(([word, count], idx) => {
          const ratio = count / maxCount;
          const fontSize = Math.min(3.2, Math.max(1.0, 1.0 + (ratio * 1.8)));
          const color = colors[idx % colors.length];
          const bg = `${color}22`;
          return `
            <span class="word-tag" style="font-size: ${fontSize}rem; color: ${color}; background: ${bg}; border: 1px solid ${color};">
              ${word} ${count > 1 ? `<span style="font-size: 0.7em; opacity: 0.8; background: ${color}; color: #fff; padding: 2px 6px; border-radius: 10px;">${count}</span>` : ''}
            </span>
          `;
        }).join('')}
      </div>
    `;
  },

  // 2. Mentimeter Poll / Survey Bar Chart
  renderPollBars(containerId, options = [], counts = {}, totalVotes = 0) {
    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];
    const total = totalVotes || Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    el.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%;">
        ${options.map((opt, idx) => {
          const count = counts[idx] || 0;
          const pct = Math.round((count / total) * 100);
          const color = colors[idx % colors.length];
          return `
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 600;">
                <span>${opt}</span>
                <span style="color: ${color};">${count} votes (${pct}%)</span>
              </div>
              <div style="width: 100%; height: 16px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${color}; transition: width 0.6s ease; border-radius: var(--radius-full);"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // 3. Mentimeter Rating Scale & Star Gauge
  renderRatingDistribution(containerId, avgRating = 0, ratingsCount = 0, ratingBreakdown = {}) {
    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    const starsHtml = [1, 2, 3, 4, 5].map(star => {
      const isFilled = star <= Math.round(avgRating);
      return `<span style="font-size: 2rem; color: ${isFilled ? '#fdcb6e' : 'rgba(255,255,255,0.2)'}; filter: ${isFilled ? 'drop-shadow(0 0 6px rgba(253, 203, 110, 0.6))' : 'none'};">★</span>`;
    }).join('');

    el.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-size: 3.5rem; font-weight: 800; font-family: var(--font-heading); color: #fdcb6e;">
          ${avgRating.toFixed(1)} <span style="font-size: 1.5rem; color: var(--text-secondary);">/ 5.0</span>
        </div>
        <div style="display: flex; gap: 0.4rem;">${starsHtml}</div>
        <div class="text-secondary" style="font-size: 0.9rem;">Based on <strong class="text-cyan">${ratingsCount}</strong> audience ratings</div>
      </div>
    `;
  },

  // 4. Mentimeter Ranking / Prioritization Podiums
  renderRankingPodium(containerId, rankedItems = []) {
    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    el.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%;">
        ${rankedItems.map((item, idx) => `
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border-left: 4px solid ${idx === 0 ? '#fdcb6e' : idx === 1 ? '#a0aec0' : '#ed8936'}; padding: 0.85rem 1.2rem; border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-weight: 800; font-size: 1.2rem; min-width: 25px;">#${idx + 1}</span>
              <span style="font-weight: 600; font-size: 1.05rem;">${item.text || item.title || item}</span>
            </div>
            <span class="text-cyan font-bold">${item.score || 0} pts</span>
          </div>
        `).join('')}
      </div>
    `;
  }
};

