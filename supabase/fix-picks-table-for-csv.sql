-- Migration to ensure picks table accepts CSV-generated predictions
-- Run this in your Supabase SQL Editor

-- 1. Ensure all optional columns exist and allow NULL
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS spread_prediction TEXT,
ADD COLUMN IF NOT EXISTS ou_prediction TEXT,
ADD COLUMN IF NOT EXISTS schedule_id TEXT,
ADD COLUMN IF NOT EXISTS monte_carlo_results JSONB,
ADD COLUMN IF NOT EXISTS ats_result TEXT CHECK (ats_result IN ('win', 'loss', 'push', 'pending')),
ADD COLUMN IF NOT EXISTS ou_result TEXT CHECK (ou_result IN ('win', 'loss', 'push', 'pending')),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 2. Make user_id nullable (since CSV predictions may not have a user)
-- First drop existing foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'picks_user_id_fkey' 
        AND table_name = 'picks'
    ) THEN
        ALTER TABLE picks DROP CONSTRAINT picks_user_id_fkey;
    END IF;
END $$;

-- Re-add foreign key constraint that allows NULL
ALTER TABLE picks 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE picks
ADD CONSTRAINT picks_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- 3. Set defaults for result fields
ALTER TABLE picks 
ALTER COLUMN result SET DEFAULT 'pending';

UPDATE picks 
SET result = 'pending' 
WHERE result IS NULL;

UPDATE picks 
SET ats_result = 'pending' 
WHERE ats_result IS NULL AND spread_prediction IS NOT NULL;

UPDATE picks 
SET ou_result = 'pending' 
WHERE ou_result IS NULL AND ou_prediction IS NOT NULL;

-- 4. Ensure game_info JSONB can contain all necessary fields
-- No changes needed - JSONB is flexible

-- 5. Verify the schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN (
    'user_id', 'prediction', 'spread_prediction', 'ou_prediction',
    'confidence', 'reasoning', 'result', 'ats_result', 'ou_result',
    'week', 'game_info', 'monte_carlo_results', 'schedule_id', 'is_pinned'
)
ORDER BY column_name;

-- Expected result:
-- user_id: uuid, nullable
-- prediction: text, not null
-- spread_prediction: text, nullable
-- ou_prediction: text, nullable
-- confidence: integer, not null
-- reasoning: text, not null
-- result: text, default 'pending'
-- ats_result: text, nullable
-- ou_result: text, nullable
-- week: integer, nullable
-- game_info: jsonb, not null
-- monte_carlo_results: jsonb, nullable
-- schedule_id: text, nullable
-- is_pinned: boolean, default false
