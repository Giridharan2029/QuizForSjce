const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('⚡ Connected to Supabase PostgreSQL Cloud Database!');
  } catch (e) {
    console.warn('⚠️ Could not connect to Supabase, fallback active:', e.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not set in .env. Ready for SUPABASE_URL and SUPABASE_ANON_KEY insertion.');
}

module.exports = supabase;