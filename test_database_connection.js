// Database Connection Test Script
// Run this with: node test_database_connection.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please check your .env file has:');
  console.error('VITE_SUPABASE_URL=your-supabase-url');
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
  console.log('🔍 Starting Database Audit...\n');

  try {
    // Test 1: Check connection
    console.log('1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('picks')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Test 2: Check picks table structure
    console.log('2. Checking picks table...');
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .limit(1);

    if (picksError) {
      console.error('❌ Picks table error:', picksError.message);
    } else {
      console.log('✅ Picks table exists');
      if (picks && picks.length > 0) {
        console.log('📋 Sample pick structure:', Object.keys(picks[0]));
      }
    }

    // Test 3: Check result distribution
    console.log('\n3. Checking pick results distribution...');
    const { data: results, error: resultsError } = await supabase
      .from('picks')
      .select('result');

    if (!resultsError && results) {
      const distribution = results.reduce((acc, pick) => {
        acc[pick.result] = (acc[pick.result] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Results distribution:', distribution);
    }

    // Test 4: Check profiles table
    console.log('\n4. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles table exists');
    }

    // Test 5: Test RLS policies
    console.log('\n5. Testing RLS policies...');
    const { data: testPick, error: testError } = await supabase
      .from('picks')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('⚠️  RLS may be blocking access:', testError.message);
    } else {
      console.log('✅ RLS policies allow read access');
    }

    console.log('\n🎉 Database audit complete!');

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

// Run the audit
auditDatabase();