-- Quick test to verify picks table is ready for CSV predictions
-- Run this in Supabase SQL Editor AFTER running fix-picks-table-for-csv.sql

-- 1. Check if all required columns exist
SELECT 
    CASE 
        WHEN COUNT(*) = 17 THEN '✅ All columns present'
        ELSE '❌ Missing columns: ' || (17 - COUNT(*))::text
    END as column_check
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN (
    'id', 'user_id', 'game_info', 'prediction', 'spread_prediction', 'ou_prediction',
    'confidence', 'reasoning', 'result', 'ats_result', 'ou_result', 
    'week', 'schedule_id', 'monte_carlo_results', 'is_pinned',
    'created_at', 'updated_at'
);

-- 2. Verify user_id is nullable
SELECT 
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ user_id is nullable'
        ELSE '❌ user_id is NOT nullable - Run fix-picks-table-for-csv.sql'
    END as user_id_check
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name = 'user_id';

-- 3. Check constraints on result fields
SELECT 
    column_name,
    CASE 
        WHEN is_nullable = 'YES' OR column_default IS NOT NULL THEN '✅'
        ELSE '❌'
    END as status,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN ('result', 'ats_result', 'ou_result')
ORDER BY column_name;

-- 4. Test insert with minimal data (CSV prediction style)
-- This should succeed if the schema is correct
DO $$
DECLARE
    test_user_id uuid;
    test_pick_id uuid;
BEGIN
    -- Get an admin user ID (or use NULL if user_id is nullable)
    SELECT id INTO test_user_id 
    FROM profiles 
    WHERE is_admin = true 
    LIMIT 1;

    -- Try to insert a test pick
    INSERT INTO picks (
        game_info,
        prediction,
        confidence,
        reasoning,
        result,
        week,
        user_id
    ) VALUES (
        '{"home_team": "Test Team A", "away_team": "Test Team B", "league": "NFL", "game_date": "2025-10-12"}'::jsonb,
        'Test Team A to win',
        75,
        'This is a test prediction to verify the schema',
        'pending',
        5,
        test_user_id  -- Will be NULL if no admin user exists
    ) RETURNING id INTO test_pick_id;

    -- Clean up the test pick
    DELETE FROM picks WHERE id = test_pick_id;

    RAISE NOTICE '✅ Test insert succeeded! Schema is ready for CSV predictions.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
        RAISE NOTICE 'You need to run fix-picks-table-for-csv.sql first';
END $$;

-- 5. Summary of column configuration
SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN '✅ Nullable' ELSE '❌ Required' END as nullable_status,
    COALESCE(column_default, 'No default') as default_value
FROM information_schema.columns 
WHERE table_name = 'picks'
ORDER BY 
    CASE column_name
        WHEN 'id' THEN 1
        WHEN 'user_id' THEN 2
        WHEN 'game_info' THEN 3
        WHEN 'prediction' THEN 4
        WHEN 'spread_prediction' THEN 5
        WHEN 'ou_prediction' THEN 6
        WHEN 'confidence' THEN 7
        WHEN 'reasoning' THEN 8
        WHEN 'result' THEN 9
        WHEN 'ats_result' THEN 10
        WHEN 'ou_result' THEN 11
        WHEN 'week' THEN 12
        WHEN 'schedule_id' THEN 13
        WHEN 'monte_carlo_results' THEN 14
        WHEN 'is_pinned' THEN 15
        WHEN 'created_at' THEN 16
        WHEN 'updated_at' THEN 17
        ELSE 99
    END;
