// ── QUIZVERSE ANIMATIONS & TOAST UTILITY ──────────────────────
window.QVAnimations = {
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: 9999;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'rgba(0, 184, 148, 0.95)',
      error: 'rgba(255, 118, 117, 0.95)',
      info: 'rgba(108, 92, 231, 0.95)',
      warning: 'rgba(253, 203, 110, 0.95)'
    };

    toast.style.cssText = `
      background: ${bgColors[type] || bgColors.info};
      color: #fff;
      padding: 0.85rem 1.35rem;
      border-radius: var(--radius-md, 12px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      font-family: var(--font-body, sans-serif);
      font-weight: 600;
      font-size: 0.925rem;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s ease forwards;
      max-width: 380px;
    `;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  triggerConfetti() {
    // Simple canvas confetti effect
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 9998;
    `;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#fd79a8', '#00b894'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 12,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }

    let frame = 0;
    function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.alpha -= 0.015;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      frame++;
      if (frame < 60) requestAnimationFrame(anim);
      else canvas.remove();
    }
    anim();
  }
};
