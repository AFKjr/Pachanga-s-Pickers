-- Quick verification that ESPN scraper tables were created successfully
-- Run this to confirm all tables now exist

-- Check if all ESPN scraper tables now exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats_offense') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as team_stats_offense,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats_defense') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as team_stats_defense,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'injury_reports') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as injury_reports,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_lines') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as betting_lines,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraper_metadata') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as scraper_metadata;

-- Verify the views were created
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'latest_team_stats') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as latest_team_stats_view,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'current_injuries') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as current_injuries_view,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'latest_betting_lines') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as latest_betting_lines_view;

-- Check that tables are empty (as expected)
SELECT 
    (SELECT COUNT(*) FROM team_stats_offense) as offense_records,
    (SELECT COUNT(*) FROM team_stats_defense) as defense_records,
    (SELECT COUNT(*) FROM injury_reports) as injury_records,
    (SELECT COUNT(*) FROM betting_lines) as betting_records,
    (SELECT COUNT(*) FROM scraper_metadata) as metadata_records;