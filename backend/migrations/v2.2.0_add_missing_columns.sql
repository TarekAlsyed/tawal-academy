-- ============================================
-- Tawal Academy — Migration Script v2.2.0
-- Run this ONCE in the Supabase SQL Editor
-- Adds missing columns that were removed from runtime ALTER TABLE
-- ============================================

-- 1. Add last_active_at to users table (for heartbeat/presence tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Column last_active_at added to users table';
    ELSE
        RAISE NOTICE 'Column last_active_at already exists — skipping';
    END IF;
END $$;

-- 2. Add question_bank_id to questions table (for question bank linking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'question_bank_id'
    ) THEN
        ALTER TABLE questions ADD COLUMN question_bank_id INTEGER;
        RAISE NOTICE 'Column question_bank_id added to questions table';
    ELSE
        RAISE NOTICE 'Column question_bank_id already exists — skipping';
    END IF;
END $$;

-- 3. Create index for question_bank_id lookups (prevents slow full table scans)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'questions' AND indexname = 'idx_questions_question_bank_id'
    ) THEN
        CREATE INDEX idx_questions_question_bank_id ON questions(question_bank_id) WHERE question_bank_id IS NOT NULL;
        RAISE NOTICE 'Index idx_questions_question_bank_id created';
    ELSE
        RAISE NOTICE 'Index idx_questions_question_bank_id already exists — skipping';
    END IF;
END $$;

-- 4. Create index for last_active_at queries (student presence dashboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'idx_users_last_active_at'
    ) THEN
        CREATE INDEX idx_users_last_active_at ON users(last_active_at) WHERE last_active_at IS NOT NULL;
        RAISE NOTICE 'Index idx_users_last_active_at created';
    ELSE
        RAISE NOTICE 'Index idx_users_last_active_at already exists — skipping';
    END IF;
END $$;

-- 5. Create index for blacklist performance (used by cache refresh)
-- NOTE: Cannot use CURRENT_TIMESTAMP in partial index (not IMMUTABLE)
-- A simple index on ip_address is sufficient for the cache refresh query
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ip_blacklist' AND indexname = 'idx_ip_blacklist_ip_address'
    ) THEN
        CREATE INDEX idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);
        RAISE NOTICE 'Index idx_ip_blacklist_ip_address created';
    ELSE
        RAISE NOTICE 'Index idx_ip_blacklist_ip_address already exists — skipping';
    END IF;
END $$;

-- ============================================
-- Verification: Run this SELECT to confirm everything is in place
-- ============================================
SELECT 
    'users.last_active_at' as column_check,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_active_at') as exists
UNION ALL
SELECT 
    'questions.question_bank_id',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='question_bank_id')
;
