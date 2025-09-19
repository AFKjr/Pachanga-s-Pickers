-- Database Audit Queries for Supabase
-- Run these queries in your Supabase SQL Editor to audit your database

-- 1. Check if picks table exists and its structure
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'picks';

-- 2. Get picks table column details
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'picks'
ORDER BY ordinal_position;

-- 3. Check if game_result enum type exists
SELECT
  n.nspname AS schema_name,
  t.typname AS type_name,
  string_agg(e.enumlabel, ', ') AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'game_result'
GROUP BY n.nspname, t.typname;

-- 4. Count total picks and their results
SELECT
  result,
  COUNT(*) as count
FROM picks
GROUP BY result
ORDER BY result;

-- 5. Check Row Level Security policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'picks'
ORDER BY policyname;

-- 6. Check indexes on picks table
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'picks'
ORDER BY indexname;

-- 7. Check foreign key constraints
SELECT
  tc.table_schema,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'picks';

-- 8. Check if profiles table exists
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'profiles';

-- 9. Check recent picks (last 10)
SELECT
  id,
  game_info->>'home_team' as home_team,
  game_info->>'away_team' as away_team,
  result,
  confidence,
  created_at
FROM picks
ORDER BY created_at DESC
LIMIT 10;

-- 10. Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'picks';