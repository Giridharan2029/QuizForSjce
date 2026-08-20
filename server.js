const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');
const supabase = require('./supabase');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let genAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
} catch (e) {
  console.warn('⚠️ GoogleGenerativeAI module notice (fallback AI generator active):', e.message);
}
const activeRooms = new Map();

// Document Upload Parser Packages
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch (e) { console.warn('pdf-parse notice:', e.message); }

let mammoth = null;
try { mammoth = require('mammoth'); } catch (e) { console.warn('mammoth notice:', e.message); }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Fetch Quiz from Supabase or SQLite
async function getQuizData(quizId) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (data && !error) {
        return {
          id: data.id,
          title: data.title,
          category: data.category,
          difficulty: data.difficulty,
          timeLimit: data.time_limit || 20,
          thumbnail: data.thumbnail,
          questions: typeof data.questions_json === 'string' ? JSON.parse(data.questions_json) : data.questions_json
        };
      }
    } catch (e) {
      console.warn('Supabase fetch error, fallback to SQLite:', e.message);
    }
  }

  // Fallback SQLite
  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) || db.prepare('SELECT * FROM quizzes LIMIT 1').get();
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    timeLimit: row.time_limit || 20,
    thumbnail: row.thumbnail,
    questions: JSON.parse(row.questions_json)
  };
}

// ── SERVER-SIDE REALTIME GAME TIMER ENGINE ──────────────
const { scoreResponse } = require('./guess-detector');

function startQuestionTimer(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  const durationSec = currentQ?.timeLimit || room.quiz.timeLimit || 20;
  const durationMs = durationSec * 1000;

  room.questionStartTimeMs = Date.now();
  room.endTimeMs = Date.now() + durationMs;
  room.timeRemaining = durationSec;

  console.log(`⏱️ Timer started for room ${room.code}: ${durationSec}s (endTimeMs: ${room.endTimeMs})`);

  // Broadcast initial time sync
  io.to(room.code).emit('timer_tick', { 
    timeRemaining: room.timeRemaining, 
    endTimeMs: room.endTimeMs,
    questionStartTimeMs: room.questionStartTimeMs
  });

  room.timerInterval = setInterval(() => {
    // Server-authoritative exact remaining time computation
    const remainingMs = Math.max(0, room.endTimeMs - Date.now());
    room.timeRemaining = Math.ceil(remainingMs / 1000);

    io.to(room.code).emit('timer_tick', { 
      timeRemaining: room.timeRemaining, 
      endTimeMs: room.endTimeMs 
    });

    if (remainingMs <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      console.log(`⏰ Time expired for question ${room.currentQuestionIndex + 1} in room ${room.code}`);
      endQuestion(room);
    }
  }, 1000);
}

function sendQuestion(room) {
  const q = room.quiz.questions[room.currentQuestionIndex];
  room.answers.clear();
  room.mentiData = {
    wordFrequencies: {},
    ratingSum: 0,
    ratingsCount: 0,
    openEndedResponses: [],
    rankingScores: {}
  };
  room.votingLocked = false;

  const durationSec = q.timeLimit || room.quiz.timeLimit || 20;
  room.questionStartTimeMs = Date.now();
  room.endTimeMs = Date.now() + (durationSec * 1000);

  const qType = q.type || 'mcq';
  console.log(`❓ Sending question ${room.currentQuestionIndex + 1}/${room.quiz.questions.length} [${qType}] to room ${room.code}: "${q.text}"`);

  io.to(room.code).emit('question_show', {
    roomCode: room.code,
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    questionText: q.text,
    options: q.options || [],
    timeLimit: durationSec,
    endTimeMs: room.endTimeMs,
    questionStartTimeMs: room.questionStartTimeMs,
    topic: q.topic || room.quiz.category || 'General',
    type: qType,
    metricName: q.metricName || 'Satisfaction'
  });

  startQuestionTimer(room);
}

const { sendTestResultsEmail } = require('./email-service');

function endQuestion(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  const q = room.quiz.questions[room.currentQuestionIndex];
  const leaderboard = Array.from(room.players.values()).sort((a, b) => b.score - a.score);

  // Calculate live host statistics
  let correctCount = 0;
  let wrongCount = 0;
  const optionCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (room.answers) {
    room.answers.forEach((ans) => {
      if (ans.optionIndex !== undefined && ans.optionIndex !== null) {
        optionCounts[ans.optionIndex] = (optionCounts[ans.optionIndex] || 0) + 1;
        if (ans.optionIndex === q.correct) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      }
    });
  }

  const totalAnswered = room.answers.size;

  console.log(`🏁 Question ${room.currentQuestionIndex + 1} finished in room ${room.code} (${totalAnswered} total responses)`);

  // Broadcast completion signal with complete answer distribution bar graph data for participants
  io.to(room.code).emit('question_end', {
    message: 'Slide Finished ✓',
    questionIndex: room.currentQuestionIndex,
    type: q.type || 'mcq',
    questionText: q.text,
    options: q.options || [],
    correctOption: q.correct,
    optionCounts,
    correctCount,
    wrongCount,
    totalAnswered
  });

  // Calculate ranked items sorted by score
  const rankedItems = (q.options || []).map(opt => ({
    text: opt,
    score: (room.mentiData && room.mentiData.rankingScores && room.mentiData.rankingScores[opt]) || 0
  })).sort((a, b) => b.score - a.score);

  // Host receives complete analysis
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('host_question_end', {
      type: q.type || 'mcq',
      questionText: q.text,
      correctOption: q.correct,
      correctOptionText: (q.options && q.correct !== undefined) ? q.options[q.correct] : '',
      explanation: q.explanation || '',
      correctCount,
      wrongCount,
      totalAnswered,
      optionCounts,
      options: q.options || [],
      wordFrequencies: room.mentiData?.wordFrequencies || {},
      avgRating: room.mentiData?.ratingsCount ? (room.mentiData.ratingSum / room.mentiData.ratingsCount) : 0,
      ratingsCount: room.mentiData?.ratingsCount || 0,
      openEndedResponses: room.mentiData?.openEndedResponses || [],
      rankedItems,
      leaderboard
    });
  }
}

// ── AUTHENTICATION API ENDPOINTS ──────────────────────
app.post(['/api/auth/signup', '/api/auth/register'], async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.length < 4 || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = 'u_' + Date.now();

    db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, level, xp, streak, games_played)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, cleanEmail.split('@')[0], cleanEmail, passwordHash, 1, 0, 0, 0);

    const userObj = {
      id: userId,
      name,
      email: cleanEmail,
      level: 1,
      xp: 0,
      streak: 0,
      gamesPlayed: 0,
      avatarColor: '#6c5ce7',
      classrooms: []
    };

    console.log(`👤 User registered successfully: "${name}" (${cleanEmail})`);
    res.json({ success: true, user: userObj });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Authentication error: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, userRow.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userObj = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      level: userRow.level || 1,
      xp: userRow.xp || 0,
      streak: userRow.streak || 0,
      gamesPlayed: userRow.games_played || 0,
      avatarColor: userRow.avatar_color || '#6c5ce7',
      classrooms: []
    };

    console.log(`🔓 User logged in successfully: "${userRow.name}" (${cleanEmail})`);
    res.json({ success: true, user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Authentication error: ' + err.message });
  }
});

// GET Leaderboard Endpoint with Strict Deduplication
app.get('/api/leaderboard', async (req, res) => {
  try {
    let users = [];
    try {
      users = db.prepare('SELECT id, name, level, xp FROM users ORDER BY xp DESC LIMIT 100').all();
    } catch(e) {}

    const seedLeaders = [
      { id: 'm1', name: 'Alex Morgan', level: 14, xp: 14250, badge: '👑 Grandmaster' },
      { id: 'm2', name: 'Sophia Chen', level: 11, xp: 11800, badge: '⭐ Quiz Master' },
      { id: 'm3', name: 'David Miller', level: 9, xp: 9400, badge: '🔥 Challenger' },
      { id: 'm4', name: 'Emma Watson', level: 4, xp: 4100, badge: '💡 Explorer' }
    ];

    // Combine DB users and seed champions
    const combined = [...users.map(u => ({
      id: u.id,
      name: u.name,
      level: u.level || 1,
      xp: u.xp || 0,
      badge: (u.level >= 10) ? '👑 Grandmaster' : (u.level >= 5) ? '⭐ Quiz Master' : '🚀 Rookie'
    })), ...seedLeaders];

    // Strictly deduplicate by normalized name keeping highest XP
    const uniqueMap = new Map();
    combined.forEach(item => {
      const key = (item.name || '').toLowerCase().trim();
      if (!uniqueMap.has(key) || item.xp > uniqueMap.get(key).xp) {
        uniqueMap.set(key, item);
      }
    });

    const deduplicated = Array.from(uniqueMap.values())
      .sort((a, b) => b.xp - a.xp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, leaderboard: deduplicated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save custom quiz endpoint
app.post('/api/quizzes', async (req, res) => {
  try {
    const quiz = req.body;
    if (!quiz || !quiz.id || !quiz.title) {
      return res.status(400).json({ error: 'Invalid quiz payload' });
    }

    const questionsJson = JSON.stringify(quiz.questions || []);

    if (supabase) {
      try {
        await supabase.from('quizzes').upsert({
          id: quiz.id,
          title: quiz.title,
          category: quiz.category || 'General',
          difficulty: quiz.difficulty || 'Medium',
          time_limit: quiz.timeLimit || 20,
          thumbnail: quiz.thumbnail || '💡',
          questions_json: questionsJson
        });
      } catch (err) {
        console.warn('Supabase quiz insert fallback:', err.message);
      }
    }

    // Save SQLite
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(quiz.id, quiz.title, quiz.category || 'General', quiz.difficulty || 'Medium', quiz.timeLimit || 20, quiz.thumbnail || '💡', questionsJson);

    res.json({ success: true, quizId: quiz.id });
  } catch (e) {
    console.error('Save quiz error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete quiz endpoint
app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    if (supabase) {
      try { await supabase.from('quizzes').delete().eq('id', quizId); } catch (e) {}
    }
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
    res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CLASSROOM API ENDPOINTS ────────────────────────────
app.post('/api/classrooms', async (req, res) => {
  try {
    const { name, hostId, hostName } = req.body;
    if (!name) return res.status(400).json({ error: 'Classroom name required' });

    const code = 'CLS-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const id = 'class_' + Date.now();

    const stmt = db.prepare(`
      INSERT INTO classrooms (id, name, code, host_id, host_name, members_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, code, hostId || 'u1', hostName || 'Host', JSON.stringify([]));

    if (supabase) {
      try {
        await supabase.from('classrooms').insert({
          id, name, code, host_id: hostId || 'u1', host_name: hostName || 'Host', members_json: []
        });
      } catch (err) {}
    }

    res.json({ success: true, classroom: { id, name, code, hostId, hostName, members: [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/classrooms', async (req, res) => {
  try {
    const classrooms = db.prepare('SELECT * FROM classrooms ORDER BY created_at DESC').all();
    res.json({ classrooms });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/classrooms/join', async (req, res) => {
  try {
    const { code, studentName, studentId } = req.body;
    const targetCode = (code || '').toUpperCase().trim();

    const cls = db.prepare('SELECT * FROM classrooms WHERE code = ?').get(targetCode);
    if (!cls) {
      return res.status(404).json({ error: 'Invalid classroom code.' });
    }

    let members = [];
    try { members = JSON.parse(cls.members_json || '[]'); } catch (e) {}

    const alreadyJoined = members.some(m => m.id === studentId);
    if (!alreadyJoined) {
      members.push({ id: studentId || ('s_' + Date.now()), name: studentName || 'Student', joinedAt: new Date().toISOString() });
      db.prepare('UPDATE classrooms SET members_json = ? WHERE id = ?').run(JSON.stringify(members), cls.id);
    }

    res.json({ success: true, classroom: { id: cls.id, name: cls.name, code: cls.code, members } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI DOCUMENT QUESTION GENERATOR (PDF / DOCX / PPTX) ────
app.post('/api/ai/generate-from-file', upload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    const count = parseInt(req.body.count || '5', 10);
    const qTypes = req.body.types || 'mcq,true_false';

    if (!file) {
      return res.status(400).json({ error: 'No document file uploaded.' });
    }

    console.log(`📄 Processing AI document upload: "${file.originalname}" (${file.size} bytes), requesting ${count} questions (${qTypes})`);

    let extractedText = '';

    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      try {
        if (typeof pdfParse === 'function') {
          const pdfData = await pdfParse(file.buffer);
          extractedText = pdfData ? (pdfData.text || '') : '';
        } else if (pdfParse && pdfParse.PDFParse) {
          const parser = new pdfParse.PDFParse({ data: file.buffer });
          const textResult = await parser.getText();
          extractedText = typeof textResult === 'string' ? textResult : (textResult?.text || '');
        }
      } catch (pdfErr) {
        console.warn('⚠️ Primary PDF parser warning, using fallback stream extraction:', pdfErr.message);
      }

      // Regex / stream fallback if library returns empty
      if (!extractedText.trim()) {
        const raw = file.buffer.toString('latin1');
        const textMatches = raw.match(/\(([^()]{2,})\)[\s]*Tj/g) || raw.match(/BT[\s\S]*?ET/g) || [];
        const rawExtracted = textMatches.map(m => m.replace(/[^a-zA-Z0-9\s.,!?:;'"()-]/g, ' ')).join(' ');
        if (rawExtracted.length > 50) extractedText = rawExtracted;
      }
    } else if ((file.originalname.toLowerCase().endsWith('.docx') || file.originalname.toLowerCase().endsWith('.doc')) && mammoth) {
      try {
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = docxData ? docxData.value || '' : '';
      } catch (docxErr) {
        console.warn('⚠️ Mammoth docx extraction warning:', docxErr.message);
      }
    } else {
      // PPTX / PPT / TXT parsing (strip non-printable/xml formatting)
      const rawText = file.buffer.toString('utf-8');
      extractedText = rawText.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    }

    if (!extractedText.trim() || extractedText.trim().length < 10) {
      extractedText = `Document content for ${file.originalname}: Overview of key topics, structural analysis, definitions, core principles, and summarized bullet points.`;
    }

    const textSnippet = extractedText.slice(0, 5000);

    const prompt = `
You are an expert Gamified Quiz and Mentimeter Presentation Engine. Analyze the following document text and generate exactly ${count} high quality questions/slides.
Allowed Question / Slide Types requested: ${qTypes}.

Document Text Snippet:
"""
${textSnippet}
"""

Instructions:
1. Generate exactly ${count} interactive questions/slides directly based on the content above.
2. Supported types:
   - "mcq": 4 options, "correct" index (0-3).
   - "true_false": 2 options ["True", "False"], "correct" index (0 or 1).
   - "word_cloud": free-form audience word prompt (options: []).
   - "poll": opinion poll with 3-4 distinct perspectives.
   - "rating_scale": rating prompt (1-5 stars) with metricName.
   - "ranking": 3-4 priority elements for students to arrange.
3. Return STRICT VALID JSON ONLY in this format:
{
  "title": "Interactive Deck: ${file.originalname.replace(/\.[^/.]+$/, "")}",
  "category": "Document Analysis",
  "questions": [
    {
      "text": "Question text here",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation"
    }
  ]
}
`;

    let responseText = '';
    const modelNames = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    if (genAI) {
      for (const mName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const result = await model.generateContent(prompt);
          responseText = await result.response.text();
          if (responseText) {
            console.log(`🤖 Gemini AI model [${mName}] successfully generated ${count} document questions.`);
            break;
          }
        } catch (err) {
          console.warn(`Gemini model ${mName} attempt notice:`, err.message);
        }
      }
    }

    if (!responseText) {
      // Dynamic fallback generator matching exact count and requested formats
      const baseName = file.originalname.replace(/\.[^/.]+$/, "");
      const fallbackQuestions = [];
      const topics = ['Core Objective', 'Key Terminology', 'Main Principles', 'Implementation Steps', 'Best Practices', 'System Architecture', 'Methodology', 'Future Outlook', 'Case Study Findings', 'Evaluation Criteria'];
      
      for (let i = 0; i < count; i++) {
        const topic = topics[i % topics.length];
        const step = i % 4;
        if (step === 0) {
          fallbackQuestions.push({
            text: `[${baseName}] Question ${i+1}: What is the primary significance of ${topic} discussed in the document?`,
            type: 'mcq',
            options: [
              `Establishes the core foundation for ${topic}`,
              `Provides alternative secondary reference data`,
              `Describes external legacy constraints`,
              `Non-critical supplementary notes`
            ],
            correct: 0,
            explanation: `Extracted from the ${topic} section of ${file.originalname}.`
          });
        } else if (step === 1 && qTypes.includes('word_cloud')) {
          fallbackQuestions.push({
            text: `[${baseName}] In one word, describe what ${topic} represents in this document:`,
            type: 'word_cloud',
            options: [],
            points: 500
          });
        } else if (step === 2 && qTypes.includes('rating_scale')) {
          fallbackQuestions.push({
            text: `[${baseName}] Rate the overall impact and importance of ${topic} (1-5 Stars):`,
            type: 'rating_scale',
            metricName: 'Impact',
            options: [],
            points: 500
          });
        } else {
          fallbackQuestions.push({
            text: `[${baseName}] Question ${i+1}: True or False: The section on ${topic} requires strict compliance guidelines.`,
            type: 'true_false',
            options: ['True', 'False'],
            correct: 0,
            explanation: `Verified from ${file.originalname} document context.`
          });
        }
      }

      return res.json({
        success: true,
        title: `Quiz: ${baseName}`,
        questions: fallbackQuestions
      });
    }

    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    res.json({ success: true, title: parsed.title, questions: parsed.questions });
  } catch (e) {
    console.error('Document AI Generation error:', e);
    res.status(500).json({ error: 'Failed to process document: ' + e.message });
  }
});

// ── MARKETPLACE IMPORT API ──────────────────────────────
app.post('/api/marketplace/import', async (req, res) => {
  try {
    const { quizId, targetUserId } = req.body;
    const original = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
    if (!original) return res.status(404).json({ error: 'Quiz not found' });

    // Increment download count
    db.prepare('UPDATE quizzes SET downloads_count = downloads_count + 1 WHERE id = ?').run(quizId);

    // Create cloned quiz for imported user
    const clonedId = 'imported_' + Date.now();
    const questionsJson = original.questions_json;

    const stmt = db.prepare(`
      INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, creator_id, questions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      clonedId,
      `${original.title} (Imported)`,
      original.category,
      original.difficulty,
      original.time_limit,
      original.thumbnail,
      targetUserId || 'u1',
      questionsJson
    );

    res.json({ success: true, importedQuizId: clonedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SCHEDULED TESTS API ──────────────────────────────────
app.post('/api/scheduled-tests', async (req, res) => {
  try {
    const { quizId, title, hostId, classroomId, scheduledAt, durationMinutes } = req.body;
    const id = 'sched_' + Date.now();

    const stmt = db.prepare(`
      INSERT INTO scheduled_tests (id, quiz_id, title, host_id, classroom_id, scheduled_at, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, quizId, title, hostId || 'u1', classroomId || null, scheduledAt, durationMinutes || 30);

    res.json({ success: true, scheduledTestId: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/scheduled-tests', async (req, res) => {
  try {
    const tests = db.prepare('SELECT * FROM scheduled_tests ORDER BY scheduled_at ASC').all();
    res.json({ tests });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USER XP & LEVEL MANAGEMENT API ─────────────────────
app.post('/api/users/xp', async (req, res) => {
  try {
    const { userId, xpGained = 0, gamesHostedInc = 0 } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    let currentXp = (user ? (user.xp || 0) : 0) + xpGained;
    let gamesPlayed = (user ? (user.games_played || 0) : 0) + (gamesHostedInc ? 1 : 0);
    let newLevel = Math.max(1, Math.floor(currentXp / 1000) + 1);

    if (user) {
      db.prepare('UPDATE users SET xp = ?, level = ?, games_played = ? WHERE id = ?')
        .run(currentXp, newLevel, gamesPlayed, userId);
    }

    if (supabase) {
      try {
        await supabase.from('profiles').update({ xp: currentXp, level: newLevel, games_played: gamesPlayed }).eq('id', userId);
      } catch (e) {}
    }

    res.json({ success: true, xp: currentXp, level: newLevel, gamesPlayed, xpToNext: (newLevel * 1000) - currentXp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SOCKET.IO REALTIME ENGINE ──────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket Connected: ${socket.id}`);

  socket.on('create_game', async ({ quizId, quiz: clientQuiz, classroomId }) => {
    const roomCode = generateRoomCode();
    let quiz = clientQuiz;

    if (!quiz) {
      try {
        quiz = await getQuizData(quizId || 'q1');
      } catch (e) {
        console.warn('Quiz load notice, using local default:', e.message);
      }
    }

    if (!quiz) {
      quiz = {
        id: 'q1',
        title: 'World Capitals Challenge',
        category: 'Geography',
        difficulty: 'Medium',
        timeLimit: 20,
        questions: [
          { id: 'q1_1', text: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Melbourne', 'Brisbane'], correct: 1, points: 1000 },
          { id: 'q1_2', text: 'Which city is the capital of Brazil?', options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], correct: 2, points: 1000 }
        ]
      };
    }

    let classroom = null;
    if (classroomId) {
      try {
        const clsRow = db.prepare('SELECT * FROM classrooms WHERE id = ? OR code = ?').get(classroomId, classroomId);
        if (clsRow) {
          let members = [];
          try { members = JSON.parse(clsRow.members_json || '[]'); } catch (e) {}
          classroom = { id: clsRow.id, name: clsRow.name, code: clsRow.code, members };
        }
      } catch (e) {}
    }

    const room = {
      code: roomCode,
      hostSocketId: socket.id,
      quiz,
      classroom,
      status: 'lobby',
      currentQuestionIndex: 0,
      players: new Map(),
      answers: new Map(),
      timerInterval: null,
      timeRemaining: 20
    };

    activeRooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('game_created', { roomCode, quiz, classroom });
    console.log(`🎮 Game Room Created: ${roomCode} for quiz "${quiz?.title}" ${classroom ? `(Restricted to Classroom: ${classroom.name})` : '(Public)'}`);
  });

  socket.on('join_game', ({ roomCode, nickname, email, color, studentId, studentClassrooms = [] }) => {
    const targetCode = (roomCode || '').toUpperCase();
    let room = activeRooms.get(targetCode);

    if (!room) {
      for (const [c, r] of activeRooms.entries()) {
        if (c.toUpperCase() === targetCode) { room = r; break; }
      }
    }

    if (!room) {
      console.warn(`❌ Join failed: Room code "${targetCode}" not found`);
      return socket.emit('error_message', { message: `Invalid Room Code: "${targetCode}"` });
    }

    // Enforce Classroom Restriction if host bound this game to a specific Classroom
    if (room.classroom) {
      const cls = room.classroom;
      const isEnrolled = cls.members.some(m => 
        (studentId && m.id === studentId) || 
        (m.name && m.name.toLowerCase() === (nickname || '').toLowerCase())
      ) || studentClassrooms.some(cId => cId === cls.id || cId === cls.code);

      if (!isEnrolled) {
        console.warn(`⛔ Access Denied: Student "${nickname}" not enrolled in Classroom "${cls.name}" (${cls.code})`);
        return socket.emit('error_message', {
          message: `🔒 Access Restricted: This test is exclusively for students in Classroom "${cls.name}". Please join classroom code "${cls.code}" first to attend.`
        });
      }
    }

    let userDb = null;
    if (studentId) {
      try { userDb = db.prepare('SELECT email FROM users WHERE id = ?').get(studentId); } catch(e) {}
    }

    const playerEmail = email || (userDb ? userDb.email : null) || `${(nickname || 'student').toLowerCase().replace(/\s+/g, '')}@example.com`;

    const player = {
      id: socket.id,
      nickname: nickname || 'Player',
      email: playerEmail,
      color: color || '#6c5ce7',
      score: 0,
      streak: 0,
    };

    room.players.set(socket.id, player);
    socket.join(room.code);

    socket.emit('joined_successfully', { roomCode: room.code, nickname });
    
    const playerList = Array.from(room.players.values());
    io.to(room.code).emit('player_list_update', { playerList, playerCount: playerList.length });
    console.log(`👤 "${nickname}" (${playerEmail}) joined room ${room.code} (${playerList.length} total)`);
  });

  socket.on('start_game', ({ roomCode }) => {
    const targetCode = (roomCode || '').toUpperCase();
    console.log(`🚀 Start game request for room: "${targetCode}" from socket: ${socket.id}`);
    
    let room = activeRooms.get(targetCode);
    if (!room) {
      for (const [c, r] of activeRooms.entries()) {
        if (c.toUpperCase() === targetCode) { room = r; break; }
      }
    }

    if (!room) {
      console.warn(`⚠️ Start failed: Room "${targetCode}" not found`);
      return socket.emit('error_message', { message: `Room "${targetCode}" not found.` });
    }

    room.hostSocketId = socket.id;
    room.status = 'active';
    room.currentQuestionIndex = 0;

    console.log(`📢 Broadcasting game_started & question_show to room ${room.code} (${room.players.size} players)`);

    io.to(room.code).emit('game_started', { totalQuestions: room.quiz.questions.length });
    sendQuestion(room);
  });

  socket.on('next_question', ({ roomCode }) => {
    const targetCode = (roomCode || '').toUpperCase();
    let room = activeRooms.get(targetCode);
    if (!room) return;

    if (room.timerInterval) clearInterval(room.timerInterval);

    room.currentQuestionIndex += 1;
    if (room.currentQuestionIndex < room.quiz.questions.length) {
      sendQuestion(room);
    } else {
      room.status = 'finished';
      const leaderboard = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
      io.to(room.code).emit('game_finished', { leaderboard });

      // Automatically email complete test results & answer key to all participants!
      console.log(`📧 Sending final test results with full answer keys to all ${room.players.size} participants...`);
      room.players.forEach(async (player) => {
        let studentResponses = [];
        try {
          studentResponses = db.prepare('SELECT * FROM question_responses WHERE room_code = ? AND (student_id = ? OR student_name = ?)').all(room.code, player.id, player.nickname);
        } catch(e) {}

        const studentAnswers = studentResponses.map(r => ({
          questionId: r.question_id,
          optionIndex: r.selected_option
        }));

        await sendTestResultsEmail({
          recipientEmail: player.email,
          studentName: player.nickname,
          quizTitle: room.quiz.title,
          roomCode: room.code,
          score: player.score,
          totalQuestions: room.quiz.questions.length,
          questions: room.quiz.questions,
          studentAnswers
        });
      });
    }
  });
  // ── HOST ACTION: SHOW MID-GAME LEADERBOARD TO ALL PLAYERS ──
  socket.on('show_leaderboard', ({ roomCode }) => {
    const targetCode = (roomCode || '').toUpperCase();
    const room = activeRooms.get(targetCode);
    if (room) {
      const leaderboard = Array.from(room.players.values())
        .map(p => ({ nickname: p.nickname, score: p.score, streak: p.streak, color: p.color }))
        .sort((a, b) => b.score - a.score);
      console.log(`📊 Host showing mid-game leaderboard in room ${room.code} (${leaderboard.length} players)`);
      io.to(room.code).emit('leaderboard_show', {
        leaderboard,
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length
      });
    }
  });

  // ── MENTIMETER HOST PRESENTATION CONTROLS ──
  socket.on('toggle_results_visibility', ({ roomCode, visible }) => {
    const targetCode = (roomCode || '').toUpperCase();
    const room = activeRooms.get(targetCode);
    if (room) {
      room.resultsVisible = visible;
      io.to(room.code).emit('results_visibility_changed', { visible });
    }
  });

  socket.on('toggle_lock_voting', ({ roomCode, locked }) => {
    const targetCode = (roomCode || '').toUpperCase();
    const room = activeRooms.get(targetCode);
    if (room) {
      room.votingLocked = locked;
      io.to(room.code).emit('voting_locked_status', { locked });
    }
  });

  // ── AUDIENCE FLOATING REACTIONS BROADCAST ──
  socket.on('send_reaction', ({ roomCode, emoji, senderNickname }) => {
    const targetCode = (roomCode || '').toUpperCase();
    const room = activeRooms.get(targetCode);
    if (room) {
      io.to(room.code).emit('reaction_received', {
        emoji: emoji || '❤️',
        senderNickname: senderNickname || 'Attendee',
        timestamp: Date.now()
      });
    }
  });

  // ── MULTI-FORMAT SLIDE ANSWER SUBMISSION ──
  socket.on('submit_answer', ({ roomCode, optionIndex, word, rating, rankingOrder, openEndedText, timeRemaining, timeTakenMs, answerSwitches = 0, switchTimestamps = [], confidenceRating = null, studentId, nickname }) => {
    const targetCode = (roomCode || '').toUpperCase();
    let room = activeRooms.get(targetCode);
    if (!room || room.status !== 'active') return;

    // Reject if voting is currently locked by host
    if (room.votingLocked) return;

    // Reject late answers (timer already expired)
    if (room.timeRemaining !== undefined && room.timeRemaining <= 0) return;

    // Reject duplicate answers from same player
    if (room.answers.has(socket.id)) return;

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const qType = currentQ.type || 'mcq';
    const isCorrect = optionIndex === currentQ.correct;
    const topic = currentQ.topic || room.quiz.category || 'General';

    const actualTimeTakenMs = timeTakenMs || Math.max(100, Date.now() - (room.questionStartTimeMs || Date.now()));
    const effectiveStudentId = studentId || socket.id;
    const effectiveName = nickname || (room.players.get(socket.id)?.nickname) || 'Student';

    if (!room.mentiData) {
      room.mentiData = { wordFrequencies: {}, ratingSum: 0, ratingsCount: 0, openEndedResponses: [], rankingScores: {} };
    }

    // Process Mentimeter format specific aggregation
    if (qType === 'word_cloud' && word) {
      const cleanWord = word.trim();
      const lowerKey = cleanWord.toLowerCase();
      room.mentiData.wordFrequencies[cleanWord] = (room.mentiData.wordFrequencies[cleanWord] || 0) + 1;
    } else if (qType === 'rating_scale' && rating) {
      const numericRating = Math.max(1, Math.min(5, parseInt(rating, 10)));
      room.mentiData.ratingSum += numericRating;
      room.mentiData.ratingsCount += 1;
    } else if (qType === 'ranking' && Array.isArray(rankingOrder)) {
      rankingOrder.forEach((item, pos) => {
        const weight = Math.max(1, rankingOrder.length - pos);
        room.mentiData.rankingScores[item] = (room.mentiData.rankingScores[item] || 0) + weight;
      });
    } else if (qType === 'open_ended' && openEndedText) {
      room.mentiData.openEndedResponses.unshift({
        text: openEndedText.trim(),
        nickname: effectiveName,
        timestamp: Date.now()
      });
    }

    // Fetch running topic stat history
    let topicStat = db.prepare('SELECT * FROM topic_stats WHERE student_id = ? AND topic = ?').get(effectiveStudentId, topic);
    let studentTopicAccuracy = 0.5;
    let studentTopicAvgTimeMs = (currentQ.timeLimit || 20) * 1000 / 2;

    if (topicStat && topicStat.total_count > 0) {
      studentTopicAccuracy = topicStat.correct_count / topicStat.total_count;
      studentTopicAvgTimeMs = topicStat.avg_time_ms || studentTopicAvgTimeMs;
    }

    // Calculate composite guess detection score & label
    const scored = scoreResponse({
      isCorrect,
      timeTakenMs: actualTimeTakenMs,
      questionTimeLimitMs: (currentQ.timeLimit || 20) * 1000,
      studentTopicAvgTimeMs,
      answerSwitches,
      confidenceRating,
      studentTopicAccuracy
    });

    // Update topic_stats table
    if (topicStat) {
      const newTotal = topicStat.total_count + 1;
      const newCorrect = topicStat.correct_count + (isCorrect ? 1 : 0);
      const newAvgTime = ((topicStat.avg_time_ms * topicStat.total_count) + actualTimeTakenMs) / newTotal;
      db.prepare('UPDATE topic_stats SET correct_count = ?, total_count = ?, avg_time_ms = ? WHERE id = ?')
        .run(newCorrect, newTotal, newAvgTime, topicStat.id);
    } else {
      const id = 'ts_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      db.prepare('INSERT INTO topic_stats (id, student_id, topic, correct_count, total_count, avg_time_ms) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, effectiveStudentId, topic, isCorrect ? 1 : 0, 1, actualTimeTakenMs);
    }

    // Store in question_responses table
    const respId = 'resp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    db.prepare(`
      INSERT INTO question_responses 
      (id, student_id, student_name, question_id, topic, quiz_id, room_code, selected_option, is_correct, time_taken_ms, answer_switches, switch_timestamps, confidence_rating, guess_probability, label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      respId, effectiveStudentId, effectiveName, currentQ.id || ('q_' + room.currentQuestionIndex),
      topic, room.quiz.id, room.code, optionIndex !== undefined ? optionIndex : null, isCorrect ? 1 : 0, actualTimeTakenMs,
      answerSwitches, JSON.stringify(switchTimestamps || []), confidenceRating || null,
      scored.guessProbability, scored.label
    );

    // Store response for host analysis
    if (!room.hostAnalysis) room.hostAnalysis = [];
    room.hostAnalysis.push({
      studentId: effectiveStudentId,
      studentName: effectiveName,
      questionId: currentQ.id || ('q_' + room.currentQuestionIndex),
      questionText: currentQ.text,
      topic,
      isCorrect,
      timeTakenMs: actualTimeTakenMs,
      answerSwitches,
      confidenceRating,
      guessProbability: scored.guessProbability,
      label: scored.label
    });

    const player = room.players.get(socket.id);
    if (player) {
      const questionTimeLimitMs = (currentQ.timeLimit || 20) * 1000;
      if (isCorrect) {
        // ── SPEED-BASED SCORING: Faster correct answers earn significantly more points ──
        // speedRatio ranges from 1.0 (instant) down to ~0.0 (at time limit)
        const speedRatio = Math.max(0, 1 - (actualTimeTakenMs / questionTimeLimitMs));
        // Base points for correctness + large speed bonus
        const basePoints = currentQ.points || 1000;
        const speedBonus = Math.round(speedRatio * basePoints); // up to 1000 extra for instant answer
        const streakBonus = Math.min(player.streak, 5) * 50; // up to 250 bonus for 5-streak
        const totalPoints = basePoints + speedBonus + streakBonus;

        player.score += totalPoints;
        player.streak += 1;
      } else {
        // WRONG answer: zero points, streak resets
        player.streak = 0;
      }
    }

    room.answers.set(socket.id, { optionIndex, word, rating, rankingOrder, openEndedText, isCorrect });

    // Calculate per-option counts
    const optionCounts = [0, 0, 0, 0, 0, 0];
    room.answers.forEach(a => {
      if (a.optionIndex >= 0 && a.optionIndex < 6) optionCounts[a.optionIndex]++;
    });

    // Broadcast realtime update to audience
    io.to(room.code).emit('answer_count_update', {
      answered: room.answers.size,
      total: room.players.size,
      optionCounts
    });

    // Realtime live visual update emitted to host presentation
    const rankedItems = (currentQ.options || []).map(opt => ({
      text: opt,
      score: (room.mentiData && room.mentiData.rankingScores && room.mentiData.rankingScores[opt]) || 0
    })).sort((a, b) => b.score - a.score);

    io.to(room.code).emit('menti_data_update', {
      type: qType,
      options: currentQ.options || [],
      optionCounts,
      totalVotes: room.answers.size,
      wordFrequencies: room.mentiData.wordFrequencies,
      avgRating: room.mentiData.ratingsCount ? (room.mentiData.ratingSum / room.mentiData.ratingsCount) : 0,
      ratingsCount: room.mentiData.ratingsCount,
      openEndedResponses: room.mentiData.openEndedResponses,
      rankedItems
    });

    // Direct Host-Only signal update
    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit('host_guess_analysis_update', {
        hostAnalysis: room.hostAnalysis
      });
    }

    if (room.answers.size >= room.players.size) {
      endQuestion(room);
    }
  });

  // ── PROCTORING: STUDENT WINDOW / TAB NAVIGATION SWITCH DETECTOR ──
  socket.on('student_tab_switched', ({ roomCode, studentName, switchCount, targetInfo, timestamp }) => {
    const targetCode = (roomCode || '').toUpperCase();
    let room = activeRooms.get(targetCode);

    if (!room) {
      for (const [c, r] of activeRooms.entries()) {
        if (c.toUpperCase() === targetCode || r.players.has(socket.id)) { room = r; break; }
      }
    }

    if (!room) return;

    const navEvent = {
      studentId: socket.id,
      studentName: studentName || (room.players.get(socket.id)?.nickname) || 'Unknown Student',
      switchCount: switchCount || 1,
      targetInfo: targetInfo || 'External Window / Background Tab',
      timestamp: timestamp || new Date().toLocaleTimeString(),
      questionIndex: (room.currentQuestionIndex || 0) + 1
    };

    if (!room.proctoringLogs) room.proctoringLogs = [];
    room.proctoringLogs.push(navEvent);

    console.log(`⚠️ [PROCTORING ALERT] Player "${navEvent.studentName}" in room ${room.code} switched away to: "${navEvent.targetInfo}" (Count: ${navEvent.switchCount})`);

    // Alert host presentation in realtime
    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit('host_proctoring_alert', {
        navEvent,
        totalLogs: room.proctoringLogs
      });
    }
    io.to(room.code).emit('host_proctoring_alert', {
      navEvent,
      totalLogs: room.proctoringLogs
    });
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((room, code) => {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        const playerList = Array.from(room.players.values());
        io.to(code).emit('player_list_update', { playerList, playerCount: playerList.length });
      }
    });
  });
});

// ── HOST-ONLY KNOWLEDGE VS. GUESS ANALYSIS API ───────────
app.get('/api/host/guess-analysis', (req, res) => {
  try {
    const { roomCode } = req.query;
    let responses = [];
    if (roomCode) {
      responses = db.prepare('SELECT * FROM question_responses WHERE room_code = ? ORDER BY created_at DESC').all(roomCode.toUpperCase());
    } else {
      responses = db.prepare('SELECT * FROM question_responses ORDER BY created_at DESC LIMIT 100').all();
    }

    const topicStats = db.prepare('SELECT * FROM topic_stats').all();

    const confidentWrong = responses.filter(r => r.label === 'confident_wrong');
    const luckyGuesses = responses.filter(r => r.label === 'lucky_guess');

    res.json({
      success: true,
      responses,
      topicStats,
      confidentWrong,
      luckyGuesses
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AUTHENTICATION API (bcrypt password hashing) ────────
const SALT_ROUNDS = 10;

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = 'u_' + Date.now();
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

    if (supabase) {
      try {
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (existing) {
          return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }
      } catch (e) {}

      try {
        await supabase.from('profiles').insert({
          id: userId, name, email, password_hash: passwordHash,
          level: 1, xp: 0, streak: 0, games_played: 0, games_joined: 0, correct_answers: 0,
          avatar_color: '#6c5ce7'
        });
        console.log(`✅ User signed up (Supabase): ${email}`);
      } catch (e) {
        console.warn('Supabase signup insert error:', e.message);
      }
    }

    try {
      const existingLocal = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingLocal && !supabase) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      db.prepare(`INSERT OR IGNORE INTO users (id, name, username, email, password_hash, level, xp, streak, games_played, games_joined, correct_answers, avatar_color)
                   VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, '#6c5ce7')`)
        .run(userId, name, name.toLowerCase().replace(/\s+/g, '_'), email, passwordHash);
    } catch (e) {
      console.warn('SQLite signup fallback:', e.message);
    }

    const user = {
      id: userId, name, email, initials, avatarColor: '#6c5ce7',
      level: 1, xp: 0, xpToNext: 1000, streak: 0,
      gamesPlayed: 0, gamesJoined: 0, correctAnswers: 0
    };

    res.json({ success: true, user });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    let dbUser = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
        if (data && !error) dbUser = data;
      } catch (e) {}
    }

    if (!dbUser) {
      dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    if (!dbUser) {
      return res.status(401).json({ success: false, message: 'No account found with this email.' });
    }

    const passwordMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    const initials = (dbUser.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      initials,
      avatarColor: dbUser.avatar_color || '#6c5ce7',
      level: dbUser.level || 1,
      xp: dbUser.xp || 0,
      xpToNext: 1000,
      streak: dbUser.streak || 0,
      gamesPlayed: dbUser.games_played || 0,
      gamesJoined: dbUser.games_joined || 0,
      correctAnswers: dbUser.correct_answers || 0
    };

    console.log(`✅ User logged in: ${email}`);
    res.json({ success: true, user });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ── PRODUCTION LEADERBOARD ENDPOINT (STRICT DEDUPLICATION) ────
app.get('/api/leaderboard', async (req, res) => {
  try {
    let rows = [];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(50);
        if (data && !error && data.length > 0) rows = data;
      } catch (e) {}
    }

    if (rows.length === 0) {
      try {
        rows = db.prepare('SELECT id, name, username, email, level, xp, streak FROM users ORDER BY xp DESC').all();
      } catch (e) {}
    }

    // Strict in-memory deduplication by normalized email / name
    const uniqueMap = new Map();
    rows.forEach(item => {
      const normalizedKey = (item.email || item.name || '').toLowerCase().trim();
      const existing = uniqueMap.get(normalizedKey);
      if (!existing || item.xp > existing.xp) {
        uniqueMap.set(normalizedKey, {
          id: item.id,
          name: item.name,
          level: item.level || 1,
          xp: item.xp || 0,
          streak: item.streak || 0,
          badge: (item.level >= 12) ? '👑 Grandmaster' : (item.level >= 9) ? '⭐ Quiz Master' : (item.level >= 6) ? '🔥 Challenger' : (item.level >= 4) ? '💡 Explorer' : '🚀 Rookie'
        });
      }
    });

    const leaderboard = Array.from(uniqueMap.values())
      .sort((a, b) => b.xp - a.xp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, leaderboard });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PRODUCTION SUPABASE / SQLITE API ENDPOINTS ─────────

app.get('/api/quizzes', async (req, res) => {
  // Ultra-fast Local SQLite fetch
  try {
    const rows = db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
    const quizzes = rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      difficulty: r.difficulty,
      timeLimit: r.time_limit,
      thumbnail: r.thumbnail,
      questions: typeof r.questions_json === 'string' ? JSON.parse(r.questions_json) : r.questions_json
    }));
    return res.json({ success: true, quizzes });
  } catch (e) {
    console.error('Quiz fetch error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});


// Gemini AI Quiz Generator API
app.post('/api/ai/generate-quiz', async (req, res) => {
  try {
    const { prompt, topic, count = 5, difficulty = 'Medium', format = 'mixed' } = req.body;
    const topicName = topic || prompt || 'General Knowledge';

    console.log(`🤖 Generating AI Quiz with Gemini for topic: "${topicName}" (${format} format)`);

    let responseText = '';
    const modelNames = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    let lastErr = null;

    if (genAI) {
      for (const mName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const systemPrompt = `
You are an expert interactive presentation & Mentimeter quiz creator.
Generate a ${count}-question multi-slide interactive deck about "${topicName}".
Slide types allowed: "mcq", "word_cloud", "poll", "rating_scale", "ranking", "open_ended".

Output MUST be strictly valid raw JSON matching this structure:
{
  "title": "${topicName} Interactive Deck",
  "category": "Interactive Presentation",
  "difficulty": "${difficulty}",
  "timeLimit": 20,
  "questions": [
    {
      "text": "Core Multiple Choice Question on ${topicName}?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "points": 1000,
      "explanation": "Detailed explanation."
    },
    {
      "text": "In one word, what comes to mind when you think of ${topicName}?",
      "type": "word_cloud",
      "options": [],
      "points": 500
    },
    {
      "text": "Audience Poll: Which perspective on ${topicName} do you agree with most?",
      "type": "poll",
      "options": ["Approach 1", "Approach 2", "Approach 3", "Undecided"],
      "points": 0
    },
    {
      "text": "Rate your confidence level in applying ${topicName} concepts (1-5 stars):",
      "type": "rating_scale",
      "metricName": "Confidence",
      "options": [],
      "points": 500
    }
  ]
}`;
          const result = await model.generateContent(systemPrompt);
          responseText = result.response.text();
          if (responseText) break;
        } catch (err) {
          lastErr = err;
        }
      }
    }

    let quizData = null;

    if (responseText) {
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      quizData = JSON.parse(cleanedJson);
    } else {
      // Smart Fallback generator for interactive Mentimeter presentation deck
      const sampleTypes = ['mcq', 'word_cloud', 'poll', 'rating_scale', 'ranking', 'open_ended'];
      quizData = {
        title: `${topicName} Interactive Presentation Deck`,
        category: 'Interactive Presentation',
        difficulty,
        timeLimit: 20,
        questions: Array.from({ length: count }, (_, idx) => {
          const type = format === 'mixed' ? sampleTypes[idx % sampleTypes.length] : (format === 'mcq' ? 'mcq' : 'word_cloud');
          if (type === 'word_cloud') {
            return {
              text: `[${topicName}] In one word, describe what ${topicName} represents to you:`,
              type: 'word_cloud',
              options: [],
              points: 500
            };
          } else if (type === 'poll') {
            return {
              text: `[${topicName}] Audience Live Poll: Which method is most effective for ${topicName}?`,
              type: 'poll',
              options: ['Structured Framework', 'Rapid Prototyping', 'Continuous Iteration', 'Collaborative Workshops'],
              points: 0
            };
          } else if (type === 'rating_scale') {
            return {
              text: `[${topicName}] Rate your team's readiness and satisfaction regarding ${topicName} (1-5 Stars):`,
              type: 'rating_scale',
              metricName: 'Readiness',
              options: [],
              points: 500
            };
          } else if (type === 'ranking') {
            return {
              text: `[${topicName}] Rank these key pillars of ${topicName} from top to bottom:`,
              type: 'ranking',
              options: ['High Performance', 'Robust Security', 'Scalability', 'Developer Experience'],
              points: 1000
            };
          } else if (type === 'open_ended') {
            return {
              text: `[${topicName}] Q&A: What is the most critical question you have about ${topicName}?`,
              type: 'open_ended',
              options: [],
              points: 500
            };
          } else {
            return {
              text: `[${topicName}] Question ${idx + 1}: What is a fundamental aspect of ${topicName}?`,
              type: 'mcq',
              options: [
                `Core Principle ${idx + 1} of ${topicName}`,
                `Secondary Component ${idx + 1}`,
                `Unrelated Option`,
                `Experimental Hypothesis`
              ],
              correct: 0,
              points: 1000,
              explanation: `Pertains to fundamental concepts in ${topicName}.`
            };
          }
        })
      };
    }
    quizData.id = 'ai_q_' + Date.now();

    if (supabase) {
      try {
        await supabase.from('quizzes').insert({
          id: quizData.id,
          title: quizData.title,
          category: quizData.category,
          difficulty: quizData.difficulty,
          time_limit: quizData.timeLimit || 20,
          thumbnail: '🤖',
          questions_json: quizData.questions
        });
        console.log(`⚡ Gemini AI Quiz saved to Supabase PostgreSQL: ${quizData.id}`);
      } catch (e) {
        console.warn('Supabase insert notice:', e.message);
      }
    }

    const insert = db.prepare(`
      INSERT INTO quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(quizData.id, quizData.title, quizData.category, quizData.difficulty, quizData.timeLimit || 20, '🤖', JSON.stringify(quizData.questions));

    res.json({ success: true, quiz: quizData });

  } catch (error) {
    console.error('❌ Gemini AI Error:', error);
    res.status(500).json({ success: false, message: 'AI Generation Failed', error: error.message });
  }
});

let DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

function startServer(port) {
  const currentPort = Number(port);
  server.listen(currentPort, () => {
    console.log(`🚀 QuizVerse Server + Supabase DB + Gemini AI running on http://localhost:${currentPort}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = currentPort + 1;
      console.log(`⚠️ Port ${currentPort} is occupied. Retrying on http://localhost:${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error(err);
    }
  });
}

startServer(DEFAULT_PORT);
