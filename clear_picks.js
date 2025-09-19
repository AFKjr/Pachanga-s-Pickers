// Clear All Picks Script
// Run with: node clear_picks.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllPicks() {
  console.log('🗑️ Starting to clear all picks...\n');

  try {
    // First, get count of current picks
    const { data: picks, error: countError } = await supabase
      .from('picks')
      .select('id');

    if (countError) {
      console.error('❌ Error getting picks count:', countError.message);
      return;
    }

    const totalPicks = picks?.length || 0;
    console.log(`📊 Found ${totalPicks} picks to delete`);

    if (totalPicks === 0) {
      console.log('✅ No picks to delete - database is already empty');
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL picks permanently!');
    console.log('Press Ctrl+C to cancel...');

    // Wait 3 seconds for user to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🗑️ Deleting picks...');

    // Delete all picks
    const { error: deleteError } = await supabase
      .from('picks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (this condition is always true)

    if (deleteError) {
      console.error('❌ Error deleting picks:', deleteError.message);
      return;
    }

    // Verify deletion
    const { data: remainingPicks, error: verifyError } = await supabase
      .from('picks')
      .select('id');

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
    } else {
      const remaining = remainingPicks?.length || 0;
      console.log(`✅ Successfully deleted ${totalPicks - remaining} picks`);
      console.log(`📊 Remaining picks: ${remaining}`);

      if (remaining === 0) {
        console.log('🎉 Database is now empty!');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the clear function
clearAllPicks();