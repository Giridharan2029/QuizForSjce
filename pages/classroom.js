// ── CLASSROOM MANAGER PAGE CONTROLLER ─────────────────────────
window.QVClassroomPage = {
  async render(container) {
    const classrooms = await window.QVData.fetchClassrooms();
    const user = window.QVData.user || {};

    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2.25rem;">
        
        <!-- Header -->
        <div style="background: radial-gradient(circle at 10% 20%, rgba(255, 107, 53, 0.12), transparent 60%); padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div class="hero-badge">
              <span>🏫</span>
              <span>Student Cohort Management</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 2.4rem; font-weight: 900; letter-spacing: -0.02em; margin-top: 0.35rem;">
              Classroom Hub
            </h1>
            <p class="text-secondary" style="font-size: 1.05rem; margin-top: 0.25rem;">
              Create cohorts, distribute join codes, and host scheduled or live quizzes exclusively for enrolled students.
            </p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
          
          <!-- Host Action: Create Classroom -->
          <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem; border-top: 2px solid #ff6b35;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="stat-icon" style="color: #ff6b35; background: rgba(255, 107, 53, 0.15);">➕</div>
              <h2 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800;">Create New Classroom</h2>
            </div>
            <div class="input-group">
              <label class="input-label">Classroom Name</label>
              <input type="text" id="cls-create-name" class="input" placeholder="e.g. Grade 10 Science - Section A">
            </div>
            <button class="btn btn-primary btn-lg" onclick="QVClassroomPage.createClassroom()">Create Classroom & Code 🚀</button>
          </div>

          <!-- Student Action: Join Classroom with Code -->
          <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem; border-top: 2px solid #f48c06;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="stat-icon" style="color: #f48c06; background: rgba(244, 140, 6, 0.15);">🔑</div>
              <h2 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800;">Join Classroom via Code</h2>
            </div>
            <div class="input-group">
              <label class="input-label">Classroom Access Code</label>
              <input type="text" id="cls-join-code" class="input" placeholder="e.g. CLS-8A9X2" style="text-transform: uppercase;">
            </div>
            <button class="btn btn-secondary btn-lg" onclick="QVClassroomPage.joinClassroom()">Join Classroom 🎓</button>
          </div>

        </div>

        <!-- Classrooms List -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800;">Active Classrooms (${classrooms.length})</h2>
            <span class="text-secondary" style="font-size: 0.9rem;">Organized by active session cohorts</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
            ${classrooms.length === 0 ? `
              <div class="text-secondary" style="padding: 2.5rem; text-align: center; grid-column: 1 / -1; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                No classrooms found. Create one above to restrict hosted tests to specific student classes!
              </div>
            ` : classrooms.map(c => {
              let members = [];
              try { members = typeof c.members_json === 'string' ? JSON.parse(c.members_json) : (c.members_json || []); } catch (e) {}
              const isHost = c.host_id === user.id;

              return `
                <div style="background: rgba(28, 20, 14, 0.75); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; transition: all 0.25s ease;" class="card-hover">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #fff;">${c.name}</div>
                      <div class="text-secondary" style="font-size: 0.85rem; margin-top: 0.2rem;">Host: ${c.host_name || 'Host'} ${isHost ? '<span class="level-badge" style="background: var(--accent-gradient); font-size: 0.7rem;">You</span>' : ''}</div>
                    </div>
                    <span class="room-code-badge" style="font-size: 0.9rem; padding: 0.25rem 0.75rem; background: rgba(255, 107, 53, 0.15); color: #ff9e64; border-color: rgba(255, 107, 53, 0.35);">${c.code}</span>
                  </div>

                  <div style="border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
                    <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                      <span>Enrolled Students</span>
                      <span style="color: #ff9e64; font-weight: 800;">${members.length} Members</span>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 100px; overflow-y: auto;">
                      ${members.length === 0 ? `
                        <span class="text-muted" style="font-size: 0.825rem;">No students joined yet. Share code <strong>${c.code}</strong></span>
                      ` : members.map(m => `
                        <span class="player-chip" style="font-size: 0.8rem; padding: 0.25rem 0.6rem; background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.25); color: #ffebd2;">👤 ${m.name}</span>
                      `).join('')}
                    </div>
                  </div>

                  ${isHost ? `
                    <button class="btn btn-primary" style="margin-top: 0.5rem; font-size: 0.875rem;" onclick="QVClassroomPage.hostClassroomTest('${c.id}')">
                      🎯 Host Class-Restricted Test
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  },

  async createClassroom() {
    const name = document.getElementById('cls-create-name').value.trim();
    if (!name) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter a classroom name.', 'warning');
      return;
    }

    const cls = await window.QVData.createClassroom(name);
    if (cls) {
      if (window.QVAnimations) window.QVAnimations.showToast(`Classroom "${name}" created with code ${cls.code}!`, 'success');
      this.render(document.getElementById('main-content'));
    }
  },

  async joinClassroom() {
    const code = document.getElementById('cls-join-code').value.trim();
    if (!code) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter classroom code.', 'warning');
      return;
    }

    try {
      const cls = await window.QVData.joinClassroom(code);
      if (window.QVAnimations) window.QVAnimations.showToast(`Successfully joined classroom "${cls.name}"!`, 'success');
      this.render(document.getElementById('main-content'));
    } catch (e) {
      if (window.QVAnimations) window.QVAnimations.showToast(e.message, 'error');
    }
  },

  hostClassroomTest(classroomId) {
    if (window.QVGameEngine) {
      window.QVGameEngine.createGame('q1', null, classroomId);
    }
  }
};
