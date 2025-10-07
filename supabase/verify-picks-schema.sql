-- Verify the current schema of the picks table
-- Run this in Supabase SQL Editor to see all columns and their constraints

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY ordinal_position;

-- Check constraints
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'picks'::regclass;
