-- Temporarily allow deletion without authentication (for development/testing)
-- Run this in Supabase SQL Editor to enable clearing picks

-- ⚠️ WARNING: This temporarily disables security for testing purposes
-- Remember to re-enable proper security after clearing!

-- Temporarily allow all authenticated users to delete any pick
-- (This bypasses the ownership check for development)
DROP POLICY IF EXISTS "Users can delete their own picks" ON picks;
DROP POLICY IF EXISTS "Admins can delete any pick" ON picks;

-- Create temporary policy allowing deletion for all authenticated users
CREATE POLICY "Temporary delete policy for testing" ON picks
  FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: Allow deletion without authentication (less secure)
-- CREATE POLICY "Allow all deletes for testing" ON picks
--   FOR DELETE USING (true);

-- Now you can run your clear script and it should work
-- After clearing, remember to restore proper security!