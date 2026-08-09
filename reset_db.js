const path = require('path');
const fs = require('fs');

console.log('🧹 [ZERO BASELINE RESET] Cleaning all database records and duplicate data...\n');

// 1. Wipe SQLite Database if quizverse.db exists
const dbPath = path.join(__dirname, 'quizverse.db');
if (fs.existsSync(dbPath)) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    
    db.exec(`
      DELETE FROM question_responses;
      DELETE FROM topic_stats;
      DELETE FROM scheduled_tests;
      DELETE FROM classrooms;
      DELETE FROM users;
      DELETE FROM quizzes;
      VACUUM;
    `);

    // Re-seed clean default quizzes (1 copy of World Capitals Challenge)
    const seedQuiz = {
      id: 'q1',
      title: 'World Capitals Challenge',
      category: 'Geography',
      difficulty: 'Medium',
      time_limit: 20,
      thumbnail: '🌍',
      questions_json: JSON.stringify([
        { id: 'q1_1', text: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Melbourne', 'Brisbane'], correct: 1, points: 1000, explanation: 'Canberra is Australia\'s capital city.' },
        { id: 'q1_2', text: 'Which city is the capital of Brazil?', options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], correct: 2, points: 1000, explanation: 'Brasília has been Brazil\'s capital since 1960.' }
      ])
    };

    db.prepare(`
      INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(seedQuiz.id, seedQuiz.title, seedQuiz.category, seedQuiz.difficulty, seedQuiz.time_limit, seedQuiz.thumbnail, seedQuiz.questions_json);

    console.log('✅ SQLite quizverse.db completely wiped and reset to clean zero state!');
  } catch (e) {
    console.warn('SQLite reset notice:', e.message);
  }
} else {
  console.log('ℹ️ SQLite file quizverse.db not found (using in-memory store).');
}

console.log('🎉 ALL DUPLICATE DATA AND TEST RECORDS PURGED! APP IS NOW AT ZERO BASELINE!');
