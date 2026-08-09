-- ============================================================
-- QuizVerse Supabase PostgreSQL Production Schema & Auth Setup
-- ============================================================

-- 1. Create Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    difficulty TEXT DEFAULT 'Medium',
    time_limit INTEGER DEFAULT 20,
    thumbnail TEXT DEFAULT '💡',
    questions_json JSONB NOT NULL,
    plays INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    classroom_id TEXT DEFAULT NULL,
    is_marketplace_public INTEGER DEFAULT 1,
    scheduled_at TEXT DEFAULT NULL,
    scheduled_duration INTEGER DEFAULT 0,
    creator_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Profiles Table (Synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Classrooms Table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL,
    members_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Scheduled Tests Table
CREATE TABLE IF NOT EXISTS public.scheduled_tests (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    title TEXT NOT NULL,
    host_id TEXT NOT NULL,
    classroom_id TEXT DEFAULT NULL,
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Game Sessions Table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
    player_count INTEGER DEFAULT 0,
    avg_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write on profiles" ON public.profiles FOR ALL USING (true);

-- Seed Initial Default Quiz (Only if table is empty)
INSERT INTO public.quizzes (id, title, category, difficulty, time_limit, thumbnail, questions_json)
VALUES (
    'q1',
    'World Capitals Challenge',
    'Geography',
    'Medium',
    20,
    '🌍',
    '[{"id":"q1_1","text":"What is the capital of Australia?","options":["Sydney","Canberra","Melbourne","Brisbane"],"correct":1,"points":1000},{"id":"q1_2","text":"Which city is the capital of Brazil?","options":["Rio de Janeiro","São Paulo","Brasília","Salvador"],"correct":2,"points":1000}]'::jsonb
) ON CONFLICT (id) DO NOTHING;
