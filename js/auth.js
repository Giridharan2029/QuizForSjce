// ── QUIZVERSE AUTHENTICATION ENGINE ──────────────────────────
window.QVAuth = {
  async signUp(name, email, password) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Signup failed');
      }
      window.QVData.saveUser(data.user);
      if (window.QVAnimations) window.QVAnimations.showToast(`Welcome to QuizVerse, ${data.user.name}! 🎉`, 'success');
      return data.user;
    } catch (e) {
      throw e;
    }
  },

  async logIn(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }
      window.QVData.saveUser(data.user);
      if (window.QVAnimations) window.QVAnimations.showToast(`Logged in successfully! Welcome back ${data.user.name}.`, 'success');
      return data.user;
    } catch (e) {
      throw e;
    }
  },

  logOut() {
    localStorage.removeItem('qv_user');
    window.QVData.init();
    if (window.QVApp) {
      window.QVApp.updateHeader();
      window.QVApp.navigateTo('landing');
    }
    if (window.QVAnimations) window.QVAnimations.showToast('You have logged out.', 'info');
  }
};
