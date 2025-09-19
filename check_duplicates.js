// Check for duplicate picks
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate picks...\n');

  const { data, error } = await supabase
    .from('picks')
    .select('id, game_info, week');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Total picks: ${data.length}`);

  // Check for duplicate IDs
  const ids = data.map(pick => pick.id);
  const uniqueIds = new Set(ids);
  console.log(`🆔 Unique IDs: ${uniqueIds.size}`);
  console.log(`🔄 Duplicate IDs: ${data.length - uniqueIds.size}`);

  // Check for duplicate games
  const gameKeys = data.map(pick => `${pick.game_info.away_team}@${pick.game_info.home_team}`);
  const uniqueGames = new Set(gameKeys);
  console.log(`🏈 Unique games: ${uniqueGames.size}`);
  console.log(`🔄 Duplicate games: ${data.length - uniqueGames.size}`);

  // Show week distribution
  const weekCounts = data.reduce((acc, pick) => {
    acc[pick.week] = (acc[pick.week] || 0) + 1;
    return acc;
  }, {});
  console.log(`📅 Week distribution:`, weekCounts);

  // Show sample of potential duplicates
  if (data.length !== uniqueGames.size) {
    console.log('\n⚠️  Potential duplicate games:');
    const gameCount = {};
    data.forEach(pick => {
      const key = `${pick.game_info.away_team}@${pick.game_info.home_team}`;
      gameCount[key] = (gameCount[key] || 0) + 1;
    });

    Object.entries(gameCount)
      .filter(([_, count]) => count > 1)
      .slice(0, 5)
      .forEach(([game, count]) => {
        console.log(`   ${game}: ${count} picks`);
      });
  }
}

checkDuplicates();