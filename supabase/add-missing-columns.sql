-- Add missing columns to picks table
-- Run this in Supabase SQL Editor

-- Add is_pinned column (used to highlight important picks)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add user_id column (to track which user created the pick)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add author_username column (denormalized for performance)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS author_username TEXT;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY column_name;
