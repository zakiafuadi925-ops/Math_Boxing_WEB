-- ==============================================================================
-- MATH BOXING ONLINE - PRODUCTION DATABASE SCHEMA & AUTHENTICATION MIGRATION
-- ==============================================================================
-- File: supabase_schema.sql
-- Run this script in the Supabase SQL Editor to establish relational integrity,
-- foreign keys, automatic user synchronization triggers, and RLS policies.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.profiles
-- Single Source of Truth for Player Profiles linked 1-to-1 with auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL DEFAULT 'Petinju',
  avatar_url TEXT DEFAULT '',
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  matches_played INTEGER NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  highest_combo INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  selected_skin VARCHAR(50) DEFAULT 'boxer_default',
  unlocked_skins JSONB DEFAULT '["boxer_default"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.leaderboard
-- Global ranking table linked directly to public.profiles by user_id UUID
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  avatar_url TEXT DEFAULT '',
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  matches_played INTEGER NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  highest_combo INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON public.leaderboard (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard (user_id);

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.match_history
-- Detailed match logs referencing player profile UUID (1-to-many)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id VARCHAR(64),
  player_name VARCHAR(50) NOT NULL,
  opponent_name VARCHAR(50) NOT NULL,
  player_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  category VARCHAR(30) DEFAULT 'all',
  mode VARCHAR(30) DEFAULT 'quick_match',
  duration INTEGER DEFAULT 300,
  accuracy INTEGER DEFAULT 100,
  highest_combo INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  finish_reason VARCHAR(20) DEFAULT 'time_up',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for player history query
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON public.match_history (user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player_name ON public.match_history (player_name);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON public.match_history (created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. TABLE: public.rooms
-- Live multiplayer and private game rooms with Host, Guest, and Winner UUIDs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id VARCHAR(64) PRIMARY KEY,
  room_code VARCHAR(16) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_game', 'completed', 'abandoned')),
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);

-- ------------------------------------------------------------------------------
-- 6. AUTOMATION TRIGGERS & FUNCTIONS
-- Automatically create profile & leaderboard entry when a new user signs up in auth.users
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name TEXT;
  avatar TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    'Petinju'
  );
  avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (id, username, avatar_url, total_score, wins, matches_played, highest_combo)
  VALUES (NEW.id, display_name, avatar, 0, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  -- 2. Insert into public.leaderboard
  INSERT INTO public.leaderboard (user_id, player_name, avatar_url, total_score, wins, matches_played, highest_combo)
  VALUES (NEW.id, display_name, avatar, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger to sync profiles changes directly to leaderboard
CREATE OR REPLACE FUNCTION public.sync_profile_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leaderboard (
    user_id,
    player_name,
    avatar_url,
    total_score,
    wins,
    matches_played,
    highest_combo,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.username,
    NEW.avatar_url,
    NEW.total_score,
    NEW.wins,
    NEW.matches_played,
    NEW.highest_combo,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    avatar_url = EXCLUDED.avatar_url,
    total_score = EXCLUDED.total_score,
    wins = EXCLUDED.wins,
    matches_played = EXCLUDED.matches_played,
    highest_combo = EXCLUDED.highest_combo,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_leaderboard();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view, users can update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Leaderboard: Public read, authenticated users can insert/update their record
CREATE POLICY "Leaderboard is viewable by everyone"
  ON public.leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can upsert their leaderboard record"
  ON public.leaderboard FOR ALL
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Match History: Public read, users can insert their own matches
CREATE POLICY "Match history is viewable by everyone"
  ON public.match_history FOR SELECT
  USING (true);

CREATE POLICY "Users can insert match records"
  ON public.match_history FOR INSERT
  WITH CHECK (true);

-- Rooms: Public read, users can create and join rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create or update rooms"
  ON public.rooms FOR ALL
  USING (true);
