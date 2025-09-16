-- Add foreign key relationship between picks and profiles
-- This migration adds the missing foreign key constraint

-- First, ensure that the profiles table has the correct primary key reference
-- The profiles table should already have id as primary key referencing auth.users(id)

-- Add foreign key constraint from picks.user_id to profiles.id
-- Since both picks.user_id and profiles.id reference auth.users(id), we can create a direct relationship

-- Note: We can't directly add a foreign key from picks.user_id to profiles.id 
-- because they both reference the same table (auth.users)
-- Instead, we'll update the picks table to reference profiles directly

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE picks DROP CONSTRAINT IF EXISTS picks_user_id_fkey;

-- Add new foreign key constraint to profiles
ALTER TABLE picks ADD CONSTRAINT picks_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update the RLS policies to work with the new relationship
-- The existing policies should still work since the relationship structure is the same