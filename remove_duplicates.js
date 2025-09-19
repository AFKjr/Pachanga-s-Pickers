// Quick Duplicate Removal Script
// Run with: node remove_duplicates.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function removeDuplicates() {
  console.log('🧹 Starting duplicate removal...\n');

  // Get all picks
  const { data: allPicks, error } = await supabase
    .from('picks')
    .select('id, game_info, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching picks:', error.message);
    return;
  }

  console.log(`📊 Found ${allPicks.length} total picks`);

  // Group by game
  const gameGroups = {};
  allPicks.forEach(pick => {
    const gameKey = `${pick.game_info.away_team}@${pick.game_info.home_team}`;
    if (!gameGroups[gameKey]) {
      gameGroups[gameKey] = [];
    }
    gameGroups[gameKey].push(pick);
  });

  // Find duplicates
  const duplicatesToDelete = [];
  Object.entries(gameGroups).forEach(([gameKey, picks]) => {
    if (picks.length > 1) {
      // Keep the most recent pick, delete the rest
      const sortedPicks = picks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const picksToDelete = sortedPicks.slice(1); // All except the first (most recent)
      duplicatesToDelete.push(...picksToDelete.map(p => p.id));
    }
  });

  console.log(`🗑️ Found ${duplicatesToDelete.length} duplicate picks to delete`);

  if (duplicatesToDelete.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  // Confirm before deletion
  console.log('\n⚠️  This will permanently delete duplicate picks!');
  console.log('Press Ctrl+C to cancel...');

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete duplicates
  console.log('\n🗑️ Deleting duplicates...');
  const { error: deleteError } = await supabase
    .from('picks')
    .delete()
    .in('id', duplicatesToDelete);

  if (deleteError) {
    console.error('❌ Error deleting duplicates:', deleteError.message);
    return;
  }

  console.log(`✅ Successfully deleted ${duplicatesToDelete.length} duplicate picks`);

  // Verify
  const { data: remaining, error: verifyError } = await supabase
    .from('picks')
    .select('count');

  if (!verifyError) {
    console.log(`📊 Remaining picks: ${remaining.length}`);
  }
}

removeDuplicates();