const path = require('path');

let db = null;

try {
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'quizverse.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'host',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      games_joined INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      avatar_color TEXT DEFAULT '#6c5ce7',
      title TEXT DEFAULT 'Quiz Rookie',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      difficulty TEXT DEFAULT 'Medium',
      time_limit INTEGER DEFAULT 20,
      thumbnail TEXT DEFAULT '💡',
      creator_id TEXT,
      questions_json TEXT NOT NULL,
      plays INTEGER DEFAULT 0,
      downloads_count INTEGER DEFAULT 0,
      classroom_id TEXT DEFAULT NULL,
      is_marketplace_public INTEGER DEFAULT 1,
      scheduled_at TEXT DEFAULT NULL,
      scheduled_duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      host_id TEXT NOT NULL,
      host_name TEXT NOT NULL,
      members_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_tests (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      title TEXT NOT NULL,
      host_id TEXT NOT NULL,
      classroom_id TEXT DEFAULT NULL,
      scheduled_at TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      quiz_id TEXT,
      host_id TEXT,
      player_count INTEGER DEFAULT 0,
      avg_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS question_responses (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT,
      question_id TEXT,
      topic TEXT DEFAULT 'General',
      quiz_id TEXT,
      room_code TEXT,
      selected_option INTEGER,
      is_correct INTEGER NOT NULL,
      time_taken_ms INTEGER NOT NULL,
      answer_switches INTEGER DEFAULT 0,
      switch_timestamps TEXT DEFAULT '[]',
      confidence_rating INTEGER,
      guess_probability REAL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topic_stats (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      correct_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      avg_time_ms REAL DEFAULT 0.0
    );
  `);

  try { db.exec('ALTER TABLE quizzes ADD COLUMN downloads_count INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE quizzes ADD COLUMN classroom_id TEXT DEFAULT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE quizzes ADD COLUMN is_marketplace_public INTEGER DEFAULT 1'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "host"'); } catch (e) {}

  const quizCount = db.prepare('SELECT count(*) as count FROM quizzes').get().count;
  if (quizCount === 0) {
    console.log('🌱 Seeding initial quizzes into SQLite database...');
    const insertQuiz = db.prepare(`
      INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuiz.run(
      'q1',
      'World Capitals Challenge',
      'Geography',
      'Medium',
      20,
      '🌍',
      JSON.stringify([
        { id: 'q1_1', text: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Melbourne', 'Brisbane'], correct: 1, points: 1000, explanation: 'Canberra is Australia\'s capital city.' },
        { id: 'q1_2', text: 'Which city is the capital of Brazil?', options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], correct: 2, points: 1000, explanation: 'Brasília has been Brazil\'s capital since 1960.' },
        { id: 'q1_3', text: 'What is the capital of Canada?', options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'], correct: 3, points: 1000, explanation: 'Ottawa is Canada\'s capital city.' }
      ])
    );

    insertQuiz.run(
      'q2',
      'Science & Space Exploration',
      'Science',
      'Hard',
      25,
      '🚀',
      JSON.stringify([
        { id: 'q2_1', text: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], correct: 1, points: 800, explanation: 'There are 8 planets in our solar system.' },
        { id: 'q2_2', text: 'What is the hottest planet in our solar system?', options: ['Mercury', 'Venus', 'Mars', 'Jupiter'], correct: 1, points: 1000, explanation: 'Venus is the hottest planet due to runaway greenhouse gases.' }
      ])
    );
  }

} catch (err) {
  console.warn('⚠️ SQLite better-sqlite3 native driver notice (using in-memory data store):', err.message);

  // In-memory Fallback DB Store
  const store = {
    users: [],
    quizzes: [
      {
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
      }
    ],
    classrooms: [],
    scheduled_tests: [],
    question_responses: [],
    topic_stats: []
  };

  db = {
    prepare(sql) {
      const lowerSql = sql.toLowerCase();
      return {
        get(...params) {
          if (lowerSql.includes('from users')) {
            if (lowerSql.includes('email =')) return store.users.find(u => u.email === params[0]);
            if (lowerSql.includes('id =')) return store.users.find(u => u.id === params[0]);
            return store.users[0];
          }
          if (lowerSql.includes('from quizzes')) {
            if (lowerSql.includes('count(*)')) return { count: store.quizzes.length };
            if (lowerSql.includes('id =')) return store.quizzes.find(q => q.id === params[0]);
            return store.quizzes[0];
          }
          if (lowerSql.includes('from classrooms')) {
            if (lowerSql.includes('code =')) return store.classrooms.find(c => c.code === params[0]);
            if (lowerSql.includes('id =')) return store.classrooms.find(c => c.id === params[0]);
            return store.classrooms[0];
          }
          if (lowerSql.includes('from topic_stats')) {
            return store.topic_stats.find(t => t.student_id === params[0] && t.topic === params[1]);
          }
          return null;
        },
        all(...params) {
          if (lowerSql.includes('from quizzes')) return store.quizzes;
          if (lowerSql.includes('from classrooms')) return store.classrooms;
          if (lowerSql.includes('from scheduled_tests')) return store.scheduled_tests;
          if (lowerSql.includes('from question_responses')) {
            if (lowerSql.includes('room_code =')) return store.question_responses.filter(r => r.room_code === params[0]);
            if (lowerSql.includes('student_id =')) return store.question_responses.filter(r => r.student_id === params[0]);
            return store.question_responses;
          }
          if (lowerSql.includes('from topic_stats')) return store.topic_stats;
          return [];
        },
        run(...params) {
          if (lowerSql.includes('insert into quizzes') || lowerSql.includes('replace into quizzes')) {
            const idx = store.quizzes.findIndex(q => q.id === params[0]);
            const item = { id: params[0], title: params[1], category: params[2], difficulty: params[3], time_limit: params[4], thumbnail: params[5], questions_json: params[6] };
            if (idx >= 0) store.quizzes[idx] = item;
            else store.quizzes.unshift(item);
          } else if (lowerSql.includes('delete from quizzes')) {
            store.quizzes = store.quizzes.filter(q => q.id !== params[0]);
          } else if (lowerSql.includes('insert into classrooms')) {
            store.classrooms.unshift({ id: params[0], name: params[1], code: params[2], host_id: params[3], host_name: params[4], members_json: params[5] });
          } else if (lowerSql.includes('update classrooms')) {
            const cls = store.classrooms.find(c => c.id === params[1]);
            if (cls) cls.members_json = params[0];
          } else if (lowerSql.includes('insert into users')) {
            store.users.push({ id: params[0], name: params[1], username: params[2], email: params[3], password_hash: params[4], level: 1, xp: 0 });
          } else if (lowerSql.includes('insert into question_responses')) {
            const colMatch = sql.match(/\(([^)]+)\)\s*values/i);
            const item = {};
            if (colMatch) {
              const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase());
              cols.forEach((col, idx) => {
                item[col] = params[idx];
              });
            } else {
              item.id = params[0];
              item.student_id = params[1];
              item.student_name = params[2];
              item.label = params[params.length - 1];
              item.guess_probability = params[params.length - 2];
            }
            store.question_responses.push(item);
          } else if (lowerSql.includes('insert into topic_stats')) {
            store.topic_stats.push({ id: params[0], student_id: params[1], topic: params[2], correct_count: params[3], total_count: params[4], avg_time_ms: params[5] });
          }
          return { changes: 1 };
        }
      };
    },
    exec() {}
  };
}

function cleanDuplicateRecords() {
  try {
    if (db && typeof db.exec === 'function' && db.pragma) {
      db.exec(`
        DELETE FROM quizzes 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM quizzes GROUP BY title
        );
        DELETE FROM topic_stats 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM topic_stats GROUP BY student_id, topic
        );
        DELETE FROM question_responses 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM question_responses GROUP BY room_code, student_id, question_id
        );
      `);
      console.log('🧹 [DATABASE CLEANUP] Duplicate records deduplicated successfully.');
    }
  } catch (err) {
    console.warn('Database cleanup notice:', err.message);
  }
}

cleanDuplicateRecords();

module.exports = db;
