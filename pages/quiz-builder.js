// ── QUIZ BUILDER & AI GENERATOR PAGE CONTROLLER ─────────────
window.QVQuizBuilderPage = {
  activeTab: 'ai-document', // 'manual', 'ai-topic', 'ai-document'
  questions: [],
  selectedFile: null,

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <div>
          <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800;">Quiz Builder Studio</h1>
          <p class="text-secondary">Create quizzes manually, with AI topic prompts, or by uploading PDF, DOCX, or PPT documents.</p>
        </div>

        <!-- Mode Selector Tabs -->
        <div style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <button class="btn ${this.activeTab === 'ai-document' ? 'btn-primary' : 'btn-secondary'}" onclick="QVQuizBuilderPage.switchTab('ai-document')">
            📄 Upload Document (PDF / DOCX / PPT)
          </button>
          <button class="btn ${this.activeTab === 'ai-topic' ? 'btn-primary' : 'btn-secondary'}" onclick="QVQuizBuilderPage.switchTab('ai-topic')">
            🤖 AI Topic Prompt
          </button>
          <button class="btn ${this.activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}" onclick="QVQuizBuilderPage.switchTab('manual')">
            ✏️ Manual Creator
          </button>
        </div>

        <!-- Tab Content Container -->
        <div id="tab-content-area">
          ${this.renderTabContent()}
        </div>

        <!-- Questions Preview & Save Editor -->
        <div class="card" id="quiz-editor-card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;">Quiz Questions (<span id="q-count-badge">${this.questions.length}</span>)</h2>
              <p class="text-secondary" style="font-size: 0.875rem;">Review, modify, or add questions before saving to your quiz store.</p>
            </div>
            
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addBlankQuestion()">➕ Add Question</button>
              <button class="btn btn-primary btn-lg" onclick="QVQuizBuilderPage.saveQuiz()">💾 Save Quiz</button>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Quiz Title</label>
            <input type="text" id="builder-quiz-title" class="input" placeholder="e.g. World History Fundamentals" value="My New AI Quiz">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div class="input-group">
              <label class="input-label">Category</label>
              <input type="text" id="builder-quiz-category" class="input" value="General Knowledge">
            </div>
            <div class="input-group">
              <label class="input-label">Difficulty</label>
              <select id="builder-quiz-difficulty" class="input">
                <option value="Easy">Easy</option>
                <option value="Medium" selected>Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Timer Per Question</label>
              <select id="builder-quiz-timer" class="input">
                <option value="15">15 Seconds</option>
                <option value="20" selected>20 Seconds</option>
                <option value="30">30 Seconds</option>
              </select>
            </div>
          </div>

          <!-- Questions List -->
          <div id="questions-editor-list" style="display: flex; flex-direction: column; gap: 1.25rem;">
            ${this.renderQuestionsList()}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.render(document.getElementById('main-content'));
  },

  renderTabContent() {
    if (this.activeTab === 'ai-document') {
      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Upload PDF, DOCX, or PPT to AI Question Generator</h3>
            <p class="text-secondary" style="font-size: 0.9rem;">Upload your study material or presentation slides. AI will analyze the file and generate your requested number of questions.</p>
          </div>

          <!-- File Upload Dropzone -->
          <div class="dropzone" id="file-dropzone" onclick="document.getElementById('file-input').click()">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;" id="file-label-text">
              Click or drag & drop PDF, Word (DOCX), or PowerPoint (PPT/PPTX) file here
            </div>
            <div class="text-secondary" style="font-size: 0.85rem; margin-top: 0.5rem;">Supported formats: .pdf, .docx, .doc, .ppt, .pptx, .txt (Up to 15MB)</div>
            <input type="file" id="file-input" style="display: none;" accept=".pdf,.docx,.doc,.ppt,.pptx,.txt" onchange="QVQuizBuilderPage.handleFileSelect(event)">
          </div>

          <!-- Number of Questions Selector (as specified in handwritten notes!) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div class="input-group">
              <label class="input-label" style="font-weight: 700; color: #fff;">Number of Questions Host Wants to Generate</label>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <input type="range" id="file-q-count-slider" min="3" max="20" step="1" value="5" class="input" style="flex: 1;" oninput="document.getElementById('file-q-count-val').textContent = this.value">
                <span id="file-q-count-val" class="text-cyan font-bold" style="font-size: 1.25rem; min-width: 40px; text-align: center;">5</span> Qs
              </div>
            </div>

            <div class="input-group">
              <label class="input-label" style="font-weight: 700; color: #fff;">Question Types</label>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="chk-mcq" checked> Multiple Choice (MCQ)
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="chk-tf" checked> True / False
                </label>
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-lg w-full" id="btn-generate-file-ai" onclick="QVQuizBuilderPage.generateFromFileAI()">
            🚀 Analyze Document & Generate Questions
          </button>
        </div>
      `;
    } else if (this.activeTab === 'ai-topic') {
      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Generate Quiz from Topic Prompt</h3>
          <div class="input-group">
            <label class="input-label">Topic or Subject</label>
            <input type="text" id="ai-topic-input" class="input" placeholder="e.g. Quantum Physics, Solar System, JavaScript ES6">
          </div>
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div class="input-group" style="flex: 1;">
              <label class="input-label">Number of Questions</label>
              <select id="ai-topic-count" class="input">
                <option value="3">3 Questions</option>
                <option value="5" selected>5 Questions</option>
                <option value="10">10 Questions</option>
              </select>
            </div>
            <button class="btn btn-primary btn-lg" style="margin-top: 1.4rem;" onclick="QVQuizBuilderPage.generateFromTopicAI()">
              ⚡ Generate with AI
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="card">
          <p class="text-secondary">Use the question editor below to manually construct your custom quiz questions and options.</p>
        </div>
      `;
    }
  },

  bindEvents() {
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-primary)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color-glow)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.selectedFile = e.dataTransfer.files[0];
          document.getElementById('file-label-text').textContent = `Selected File: ${this.selectedFile.name} (${Math.round(this.selectedFile.size / 1024)} KB)`;
        }
      });
    }
  },

  handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this.selectedFile = e.target.files[0];
      document.getElementById('file-label-text').textContent = `Selected File: ${this.selectedFile.name} (${Math.round(this.selectedFile.size / 1024)} KB)`;
    }
  },

  async generateFromFileAI() {
    if (!this.selectedFile) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please select a PDF, DOCX, or PPT document file first.', 'warning');
      return;
    }

    const count = parseInt(document.getElementById('file-q-count-slider').value || '5', 10);
    const btn = document.getElementById('btn-generate-file-ai');
    btn.disabled = true;
    btn.textContent = '⏳ AI is analyzing file & generating questions...';

    try {
      const result = await window.QVAI.generateFromFile(this.selectedFile, count);
      this.questions = result.questions || [];

      document.getElementById('builder-quiz-title').value = result.title || `Quiz: ${this.selectedFile.name.replace(/\.[^/.]+$/, "")}`;
      document.getElementById('questions-editor-list').innerHTML = this.renderQuestionsList();
      document.getElementById('q-count-badge').textContent = this.questions.length;

      if (window.QVAnimations) window.QVAnimations.showToast(`Successfully generated ${this.questions.length} questions from document!`, 'success');
      window.scrollTo({ top: document.getElementById('quiz-editor-card').offsetTop - 80, behavior: 'smooth' });
    } catch (e) {
      if (window.QVAnimations) window.QVAnimations.showToast(`Error: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🚀 Analyze Document & Generate Questions';
    }
  },

  async generateFromTopicAI() {
    const topic = document.getElementById('ai-topic-input').value.trim();
    if (!topic) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter a topic', 'warning');
      return;
    }
    const count = parseInt(document.getElementById('ai-topic-count').value || '5', 10);
    
    try {
      if (window.QVAnimations) window.QVAnimations.showToast('Generating AI quiz...', 'info');
      const quiz = await window.QVAI.generateTopicQuiz(topic, count);
      this.questions = quiz.questions || [];
      document.getElementById('builder-quiz-title').value = quiz.title || `${topic} Quiz`;
      document.getElementById('questions-editor-list').innerHTML = this.renderQuestionsList();
      document.getElementById('q-count-badge').textContent = this.questions.length;
    } catch (e) {
      if (window.QVAnimations) window.QVAnimations.showToast(`AI Error: ${e.message}`, 'error');
    }
  },

  renderQuestionsList() {
    if (this.questions.length === 0) {
      return `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No questions generated or added yet. Upload a file above or click "Add Question".
        </div>
      `;
    }

    return this.questions.map((q, idx) => `
      <div style="background: rgba(10, 14, 26, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-family: var(--font-heading); font-weight: 700; color: var(--accent-cyan);">Question ${idx + 1}</span>
          <button class="btn btn-danger" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick="QVQuizBuilderPage.removeQuestion(${idx})">Remove</button>
        </div>

        <input type="text" class="input" value="${(q.text || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].text = this.value">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          ${(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="radio" name="correct_${idx}" ${q.correct === optIdx ? 'checked' : ''} onchange="QVQuizBuilderPage.questions[${idx}].correct = ${optIdx}">
              <input type="text" class="input" value="${(opt || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].options[${optIdx}] = this.value" style="font-size: 0.9rem;">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  addBlankQuestion() {
    this.questions.push({
      text: 'New Question Text?',
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      points: 1000
    });
    document.getElementById('questions-editor-list').innerHTML = this.renderQuestionsList();
    document.getElementById('q-count-badge').textContent = this.questions.length;
  },

  removeQuestion(idx) {
    this.questions.splice(idx, 1);
    document.getElementById('questions-editor-list').innerHTML = this.renderQuestionsList();
    document.getElementById('q-count-badge').textContent = this.questions.length;
  },

  async saveQuiz() {
    const title = document.getElementById('builder-quiz-title').value.trim();
    if (!title) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please enter a quiz title.', 'warning');
      return;
    }
    if (this.questions.length === 0) {
      if (window.QVAnimations) window.QVAnimations.showToast('Please add at least 1 question before saving.', 'warning');
      return;
    }

    const quizObj = {
      id: 'quiz_' + Date.now(),
      title,
      category: document.getElementById('builder-quiz-category').value.trim() || 'General',
      difficulty: document.getElementById('builder-quiz-difficulty').value,
      timeLimit: parseInt(document.getElementById('builder-quiz-timer').value, 10),
      thumbnail: '💡',
      questions: this.questions
    };

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizObj)
      });
      const data = await res.json();
      if (data.success) {
        // Award XP for creating a quiz!
        if (window.QVData) window.QVData.addXp(50);
        if (window.QVAnimations) window.QVAnimations.showToast(`Quiz "${title}" saved successfully!`, 'success');
        window.QVApp.navigateTo('dashboard');
      } else {
        throw new Error(data.error || 'Failed to save quiz');
      }
    } catch (e) {
      if (window.QVAnimations) window.QVAnimations.showToast(`Error saving quiz: ${e.message}`, 'error');
    }
  }
};
