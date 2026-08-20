// ── QUIZVERSE AI QUESTION ENGINE ─────────────────────────────
window.QVAI = {
  // Topic-based AI generation
  async generateTopicQuiz(topic, count = 5, difficulty = 'Medium', format = 'mixed') {
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, difficulty, format })
      });
      const data = await res.json();
      if (data.success && data.quiz) {
        return data.quiz;
      } else {
        throw new Error(data.message || 'AI generation failed');
      }
    } catch (e) {
      throw e;
    }
  },

  // Document File Upload AI generation (.pdf, .docx, .ppt, .pptx, .txt)
  async generateFromFile(file, count = 5, types = 'mcq,true_false') {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('count', count);
      formData.append('types', types);

      const res = await fetch('/api/ai/generate-from-file', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.questions) {
        return {
          title: data.title || file.name.replace(/\.[^/.]+$/, ""),
          questions: data.questions
        };
      } else {
        throw new Error(data.error || 'Failed to extract questions from document');
      }
    } catch (e) {
      throw e;
    }
  }
};
