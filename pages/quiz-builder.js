// ── QUIZ BUILDER & AI GENERATOR PAGE CONTROLLER ─────────────
window.QVQuizBuilderPage = {
  activeTab: 'ai-document', // 'manual', 'ai-topic', 'ai-document'
  questions: [],
  selectedFile: null,

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 2.25rem;">
        
        <!-- Header -->
        <div style="background: radial-gradient(circle at 10% 20%, rgba(255, 107, 53, 0.12), transparent 60%); padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div class="hero-badge">
              <span>⚡</span>
              <span>AI Question Studio</span>
            </div>
            <h1 style="font-family: var(--font-heading); font-size: 2.4rem; font-weight: 900; letter-spacing: -0.02em; margin-top: 0.35rem;">
              Quiz Builder Studio
            </h1>
            <p class="text-secondary" style="font-size: 1.05rem; margin-top: 0.25rem;">
              Generate interactive questions from PDFs, DOCX, PPT slides, Gemini AI prompts, or custom manual decks.
            </p>
          </div>
        </div>

        <!-- Mode Selector Tabs -->
        <div style="display: flex; gap: 0.75rem; background: rgba(22, 16, 11, 0.85); padding: 0.4rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); width: fit-content; max-width: 100%; flex-wrap: wrap;">
          <button class="btn ${this.activeTab === 'ai-document' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: var(--radius-full);" onclick="QVQuizBuilderPage.switchTab('ai-document')">
            📄 Upload Document (PDF / DOCX / PPT)
          </button>
          <button class="btn ${this.activeTab === 'ai-topic' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: var(--radius-full);" onclick="QVQuizBuilderPage.switchTab('ai-topic')">
            🤖 AI Topic Prompt
          </button>
          <button class="btn ${this.activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: var(--radius-full);" onclick="QVQuizBuilderPage.switchTab('manual')">
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
                <option value="45">45 Seconds</option>
                <option value="60">60 Seconds</option>
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

          <!-- Question Types Selector for AI Generation -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div class="input-group">
              <label class="input-label" style="font-weight: 700; color: #fff;">Number of Questions to Generate</label>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <input type="range" id="file-q-count-slider" min="3" max="50" step="1" value="10" class="input" style="flex: 1;" oninput="document.getElementById('file-q-count-val').textContent = this.value">
                <span id="file-q-count-val" class="text-cyan font-bold" style="font-size: 1.25rem; min-width: 40px; text-align: center; color: #ff9e64;">10</span> Qs
              </div>
            </div>

            <div class="input-group">
              <label class="input-label" style="font-weight: 700; color: #fff;">Question / Slide Formats</label>
              <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                  <input type="checkbox" id="chk-mcq" checked> 📊 MCQ
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                  <input type="checkbox" id="chk-tf" checked> ⚖️ True/False
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                  <input type="checkbox" id="chk-wc" checked> ☁️ Word Cloud
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                  <input type="checkbox" id="chk-poll" checked> 🗳️ Poll
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                  <input type="checkbox" id="chk-rate" checked> ⭐ Rating
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
            <input type="text" id="ai-topic-input" class="input" placeholder="e.g. Quantum Physics, Agile Leadership, Environmental Science">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center;">
            <div class="input-group">
              <label class="input-label">Number of Questions</label>
              <select id="ai-topic-count" class="input">
                <option value="5">5 Questions</option>
                <option value="10" selected>10 Questions</option>
                <option value="20">20 Questions</option>
                <option value="30">30 Questions</option>
                <option value="40">40 Questions</option>
                <option value="50">50 Questions</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Primary Slide Focus</label>
              <select id="ai-topic-format" class="input">
                <option value="mixed" selected>Mixed (MCQ + Word Cloud + Poll + Rating)</option>
                <option value="mcq">Standard Quiz (MCQ & True/False)</option>
                <option value="interactive">Interactive Workshop (Word Cloud & Polls)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary btn-lg" onclick="QVQuizBuilderPage.generateFromTopicAI()">
            ⚡ Generate Multi-Format Mentimeter Quiz with AI
          </button>
        </div>
      `;
    } else {
      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
          <p class="text-secondary">Click the buttons below to add any Mentimeter slide type to your quiz presentation.</p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('mcq')">📊 + Multiple Choice</button>
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('word_cloud')">☁️ + Word Cloud</button>
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('poll')">🗳️ + Live Poll / Vote</button>
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('rating_scale')">⭐ + Rating Scale</button>
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('ranking')">🔢 + Ranking / Order</button>
            <button class="btn btn-secondary" onclick="QVQuizBuilderPage.addQuestionWithType('open_ended')">💬 + Open Q&A</button>
          </div>
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
    const types = [];
    if (document.getElementById('chk-mcq')?.checked) types.push('mcq');
    if (document.getElementById('chk-tf')?.checked) types.push('true_false');
    if (document.getElementById('chk-wc')?.checked) types.push('word_cloud');
    if (document.getElementById('chk-poll')?.checked) types.push('poll');
    if (document.getElementById('chk-rate')?.checked) types.push('rating_scale');

    const btn = document.getElementById('btn-generate-file-ai');
    btn.disabled = true;
    btn.textContent = '⏳ AI is analyzing file & generating questions...';

    try {
      const result = await window.QVAI.generateFromFile(this.selectedFile, count, types.join(','));
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
    const format = document.getElementById('ai-topic-format')?.value || 'mixed';
    
    try {
      if (window.QVAnimations) window.QVAnimations.showToast('Generating AI Mentimeter presentation quiz...', 'info');
      const quiz = await window.QVAI.generateTopicQuiz(topic, count, 'Medium', format);
      this.questions = quiz.questions || [];
      document.getElementById('builder-quiz-title').value = quiz.title || `${topic} Interactive Deck`;
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
          No questions generated or added yet. Upload a file above or click "+ Add Question".
        </div>
      `;
    }

    return this.questions.map((q, idx) => {
      const type = q.type || 'mcq';
      const typeLabels = {
        mcq: '📊 Multiple Choice',
        true_false: '⚖️ True / False',
        word_cloud: '☁️ Word Cloud',
        poll: '🗳️ Live Poll',
        rating_scale: '⭐ Rating Scale',
        ranking: '🔢 Ranking / Prioritization',
        open_ended: '💬 Open-ended Q&A'
      };

      let typeBody = '';

      if (type === 'mcq' || type === 'poll') {
        typeBody = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            ${(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => `
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${type === 'mcq' ? `<input type="radio" name="correct_${idx}" ${q.correct === optIdx ? 'checked' : ''} onchange="QVQuizBuilderPage.questions[${idx}].correct = ${optIdx}">` : '<span style="color:var(--text-secondary);">🗳️</span>'}
                <input type="text" class="input" value="${(opt || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].options[${optIdx}] = this.value" style="font-size: 0.9rem;">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'word_cloud') {
        typeBody = `
          <div style="background: rgba(0, 206, 201, 0.06); border: 1px dashed var(--accent-cyan); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--accent-cyan);">
            ☁️ Audience will submit free-form keywords and live tags. Word frequency will scale dynamically on presentation screen.
          </div>
        `;
      } else if (type === 'rating_scale') {
        typeBody = `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span class="text-secondary" style="font-size: 0.85rem;">Scale: 1 to 5 Stars</span>
            <input type="text" class="input" placeholder="Optional rating metric name (e.g. Confidence, Relevance, Clarity)" value="${(q.metricName || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].metricName = this.value" style="flex: 1; font-size: 0.85rem;">
          </div>
        `;
      } else if (type === 'ranking') {
        typeBody = `
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <span class="text-secondary" style="font-size: 0.8rem;">Items for audience to rank in priority order:</span>
            ${(q.options || ['Priority 1', 'Priority 2', 'Priority 3']).map((opt, optIdx) => `
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="text-cyan font-bold" style="font-size: 0.85rem; width: 20px;">${optIdx + 1}.</span>
                <input type="text" class="input" value="${(opt || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].options[${optIdx}] = this.value" style="font-size: 0.85rem;">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'open_ended') {
        typeBody = `
          <div style="background: rgba(108, 92, 231, 0.06); border: 1px dashed var(--accent-primary); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: #a29bfe;">
            💬 Audience will submit long-form responses that appear in realtime on the presentation question wall.
          </div>
        `;
      }

      return `
        <div style="background: rgba(10, 14, 26, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-family: var(--font-heading); font-weight: 700; color: var(--accent-cyan);">Question ${idx + 1}</span>
              <span class="level-badge" style="font-size: 0.75rem;">${typeLabels[type] || type}</span>
            </div>
            <button class="btn btn-danger" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick="QVQuizBuilderPage.removeQuestion(${idx})">Remove</button>
          </div>

          <input type="text" class="input" placeholder="Enter question or presentation prompt..." value="${(q.text || '').replace(/"/g, '&quot;')}" onchange="QVQuizBuilderPage.questions[${idx}].text = this.value">

          ${typeBody}
        </div>
      `;
    }).join('');
  },

  addBlankQuestion() {
    this.addQuestionWithType('mcq');
  },

  addQuestionWithType(type = 'mcq') {
    const defaultData = {
      mcq: { text: 'New Multiple Choice Question?', type: 'mcq', options: ['Option A', 'Option B', 'Option C', 'Option D'], correct: 0, points: 1000 },
      word_cloud: { text: 'In one word, describe your thoughts on this topic:', type: 'word_cloud', options: [], points: 500 },
      poll: { text: 'Live Audience Poll: Which strategy do you prefer?', type: 'poll', options: ['Strategy A', 'Strategy B', 'Strategy C', 'Neutral'], points: 0 },
      rating_scale: { text: 'Rate your confidence / agreement with this statement (1-5):', type: 'rating_scale', options: [], metricName: 'Satisfaction', points: 500 },
      ranking: { text: 'Rank these priorities from most to least important:', type: 'ranking', options: ['Security & Privacy', 'Speed & Performance', 'Feature Richness', 'Ease of Use'], points: 1000 },
      open_ended: { text: 'Q&A: What questions or ideas do you have?', type: 'open_ended', options: [], points: 500 }
    };

    this.questions.push(defaultData[type] || defaultData.mcq);
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
