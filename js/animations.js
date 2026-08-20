// ── QUIZVERSE ADVANCED ANIMATION, LENIS & GSAP ENGINE ─────────
window.QVAnimations = {
  lenis: null,
  spotlightEl: null,

  initGlobalEffects() {
    // 1. Lenis Smooth Scrolling setup
    if (typeof Lenis !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        this.lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true
        });

        const raf = (time) => {
          this.lenis.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      } catch (e) {
        console.warn('Lenis init notice:', e.message);
      }
    }

    // 2. Animated Aurora Background Layer
    if (!document.getElementById('aurora-background')) {
      const aurora = document.createElement('div');
      aurora.id = 'aurora-background';
      aurora.innerHTML = `
        <div class="aurora-blob blob-1"></div>
        <div class="aurora-blob blob-2"></div>
        <div class="aurora-blob blob-3"></div>
      `;
      document.body.prepend(aurora);
    }

    // 3. Cursor Follow Glow / Spotlight
    if (!document.getElementById('cursor-spotlight') && window.innerWidth > 900) {
      this.spotlightEl = document.createElement('div');
      this.spotlightEl.id = 'cursor-spotlight';
      document.body.prepend(this.spotlightEl);

      window.addEventListener('pointermove', (e) => {
        if (this.spotlightEl) {
          this.spotlightEl.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
      });
    }

    // 4. Navbar Scroll Shrink & Frosted Blur
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.navbar');
      if (nav) {
        if (window.scrollY > 25) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      }
    });

    // 5. Initialize 3D Card Tilt on all cards
    this.init3DTilt();
  },

  init3DTilt() {
    if (window.innerWidth <= 900 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.card, .join-widget, .leaderboard-item').forEach(card => {
      if (card.dataset.tiltInit) return;
      card.dataset.tiltInit = 'true';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  },

  animateCount(element, target, duration = 1200) {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.floor(start + (target - start) * easeProgress);

      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString();
      }
    };
    requestAnimationFrame(update);
  },

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
      success: 'rgba(16, 185, 129, 0.95)',
      error: 'rgba(239, 68, 68, 0.95)',
      info: 'rgba(139, 92, 246, 0.95)',
      warning: 'rgba(245, 158, 11, 0.95)'
    };

    toast.style.cssText = `
      background: ${bgColors[type] || bgColors.info};
      color: #fff;
      padding: 0.9rem 1.4rem;
      border-radius: var(--radius-md, 14px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(139, 92, 246, 0.3);
      font-family: var(--font-body, sans-serif);
      font-weight: 700;
      font-size: 0.925rem;
      backdrop-filter: blur(12px);
      animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 400px;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px) scale(0.95)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#06b6d4', '#fbbf24', '#ec4899', '#10b981']
      });
      return;
    }

    // Fallback Canvas Confetti
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
    const colors = ['#8b5cf6', '#06b6d4', '#fbbf24', '#ec4899', '#10b981'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
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
        p.vy += 0.25;
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

document.addEventListener('DOMContentLoaded', () => {
  window.QVAnimations.initGlobalEffects();
});
