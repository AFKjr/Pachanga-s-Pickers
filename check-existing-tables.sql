-- Check what tables already exist in your Supabase database
-- Run this in your Supabase SQL Editor to see current schema

-- List all tables in the public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if ESPN scraper tables exist specifically
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

-- Check existing columns for any ESPN scraper tables that do exist
-- (Simplified version - check each table separately)

-- Check if team_stats_offense exists and show its columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats_offense') 
        THEN 'team_stats_offense table EXISTS - columns below:'
        ELSE 'team_stats_offense table MISSING'
    END as team_stats_offense_status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'team_stats_offense' 
ORDER BY ordinal_position;

-- Check if team_stats_defense exists and show its columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats_defense') 
        THEN 'team_stats_defense table EXISTS - columns below:'
        ELSE 'team_stats_defense table MISSING'
    END as team_stats_defense_status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'team_stats_defense' 
ORDER BY ordinal_position;

-- Check if injury_reports exists and show its columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'injury_reports') 
        THEN 'injury_reports table EXISTS - columns below:'
        ELSE 'injury_reports table MISSING'
    END as injury_reports_status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'injury_reports' 
ORDER BY ordinal_position;

-- Check if betting_lines exists and show its columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'betting_lines') 
        THEN 'betting_lines table EXISTS - columns below:'
        ELSE 'betting_lines table MISSING'
    END as betting_lines_status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'betting_lines' 
ORDER BY ordinal_position;

-- Show existing picks table structure (from your main app)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY ordinal_position;

-- Show existing profiles table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;