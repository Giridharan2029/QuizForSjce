// ── QUIZVERSE CORE DATA STORE & STATE MANAGEMENT ─────────────
window.QVData = {
  // Current active user state
  user: null,

  // Quizzes list cache
  quizzes: [],

  // Classrooms list cache
  classrooms: [],

  // Initializer
  init() {
    const savedUser = localStorage.getItem('qv_user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (e) {
        this.user = this.getDefaultUser();
      }
    } else {
      this.user = this.getDefaultUser();
    }
  },

  getDefaultUser() {
    return {
      id: 'u_' + Date.now(),
      name: 'Guest Player',
      email: 'guest@quizverse.com',
      initials: 'GP',
      avatarColor: '#6c5ce7',
      level: 1,
      xp: 0,
      xpToNext: 1000,
      streak: 0,
      gamesPlayed: 0,
      gamesJoined: 0,
      correctAnswers: 0,
      classrooms: []
    };
  },

  saveUser(userObj) {
    this.user = { ...this.user, ...userObj };
    // Calculate level based on XP (1000 XP per level)
    this.user.level = Math.max(1, Math.floor((this.user.xp || 0) / 1000) + 1);
    this.user.xpToNext = (this.user.level * 1000) - (this.user.xp || 0);

    localStorage.setItem('qv_user', JSON.stringify(this.user));
    if (window.QVApp) window.QVApp.updateHeader();
  },

  // XP progression system
  async addXp(xpGained, gamesHostedInc = 0) {
    if (!this.user) return;
    const oldLevel = this.user.level;

    this.user.xp = (this.user.xp || 0) + xpGained;
    if (gamesHostedInc) {
      this.user.gamesPlayed = (this.user.gamesPlayed || 0) + gamesHostedInc;
    }

    this.saveUser({});

    if (this.user.level > oldLevel && window.QVAnimations) {
      window.QVAnimations.showToast(`🎉 Level Up! You reached Level ${this.user.level}!`, 'success');
    }

    // Sync with backend API
    try {
      await fetch('/api/users/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.user.id,
          xpGained,
          gamesHostedInc
        })
      });
    } catch (e) {
      console.warn('Backend XP sync notice:', e.message);
    }
  },

  // Fetch quizzes list from backend API with instant cache return
  async fetchQuizzes(forceRefresh = false) {
    if (!forceRefresh && this.quizzes && this.quizzes.length > 0) {
      // Return cached instantly and revalidate in background
      this.revalidateQuizzes();
      return this.quizzes;
    }
    return this.revalidateQuizzes();
  },

  async revalidateQuizzes() {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.success && Array.isArray(data.quizzes)) {
        this.quizzes = data.quizzes;
        return this.quizzes;
      }
    } catch (e) {
      console.warn('Error fetching quizzes:', e.message);
    }
    return this.quizzes || [];
  },

  // Delete quiz by ID
  async deleteQuiz(quizId) {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.quizzes = this.quizzes.filter(q => q.id !== quizId);
        return true;
      }
    } catch (e) {
      console.error('Delete quiz error:', e.message);
    }
    return false;
  },

  // Fetch classrooms list with instant cache
  async fetchClassrooms(forceRefresh = false) {
    if (!forceRefresh && this.classrooms && this.classrooms.length > 0) {
      this.revalidateClassrooms();
      return this.classrooms;
    }
    return this.revalidateClassrooms();
  },

  async revalidateClassrooms() {
    try {
      const res = await fetch('/api/classrooms');
      const data = await res.json();
      if (data.classrooms) {
        this.classrooms = data.classrooms;
        return this.classrooms;
      }
    } catch (e) {
      console.warn('Error fetching classrooms:', e.message);
    }
    return this.classrooms || [];
  },

  // Create classroom
  async createClassroom(name) {
    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          hostId: this.user.id,
          hostName: this.user.name
        })
      });
      const data = await res.json();
      if (data.success && data.classroom) {
        this.classrooms.unshift(data.classroom);
        // Add to user enrolled classrooms
        if (!this.user.classrooms) this.user.classrooms = [];
        this.user.classrooms.push(data.classroom.id);
        this.saveUser({});
        return data.classroom;
      }
    } catch (e) {
      console.error('Create classroom error:', e.message);
    }
    return null;
  },

  // Join classroom using code
  async joinClassroom(code) {
    try {
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          studentId: this.user.id,
          studentName: this.user.name
        })
      });
      const data = await res.json();
      if (data.success && data.classroom) {
        if (!this.user.classrooms) this.user.classrooms = [];
        if (!this.user.classrooms.includes(data.classroom.id)) {
          this.user.classrooms.push(data.classroom.id);
          this.saveUser({});
        }
        return data.classroom;
      } else {
        throw new Error(data.error || 'Failed to join classroom');
      }
    } catch (e) {
      throw e;
    }
  }
};

window.QVData.init();
