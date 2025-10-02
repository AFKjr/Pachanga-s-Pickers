-- Quick migration: Add spread_prediction and ou_prediction columns to picks table
-- Run this in Supabase SQL Editor

ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS spread_prediction TEXT,
ADD COLUMN IF NOT EXISTS ou_prediction TEXT;
