-- Create Admin User Script
-- Run this in your Supabase SQL Editor to create an admin user

-- First, create the user account (this will be done through the signup process)
-- Then run this SQL to make them an admin:

-- Replace 'user@example.com' with the actual email of the user you want to make admin
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'admin@pachanga-picks.com'
);

-- Alternative: Make ALL users admins (for testing purposes)
-- UPDATE profiles SET is_admin = true;

-- Check if the admin was created successfully
SELECT
  p.id,
  p.username,
  p.is_admin,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_admin = true;