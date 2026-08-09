// ── QUIZVERSE CHARTS ENGINE ─────────────────────────────────
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
  }
};
