-- Restore proper security policies after clearing picks
-- Run this in Supabase SQL Editor to restore security

-- Remove the temporary policy
DROP POLICY IF EXISTS "Temp delete policy" ON picks;

-- Restore the proper security policies
CREATE POLICY "Users can delete their own picks" ON picks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any pick" ON picks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Verify the policies were restored
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'picks'
  AND cmd = 'DELETE';