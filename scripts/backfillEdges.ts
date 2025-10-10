// scripts/backfillEdges.ts
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { calculatePickEdges } from '../src/utils/edgeCalculator.js';
import type { Pick } from '../src/types/index.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Backfill edge values for existing picks
 * Run this script once after deploying edge calculation feature
 */
async function backfillEdges() {
  console.log('🔄 Starting edge backfill process...');
  
  // Fetch all picks without edge calculations
  const { data: picks, error } = await supabase
    .from('picks')
    .select('*')
    .is('moneyline_edge', null);
  
  if (error) {
    console.error('❌ Failed to fetch picks:', error);
    return;
  }
  
  if (!picks || picks.length === 0) {
    console.log('✅ No picks need edge backfill');
    return;
  }
  
  console.log(`📊 Found ${picks.length} picks to backfill`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const pick of picks) {
    try {
      // Skip if missing required data
      if (!pick.monte_carlo_results || !pick.game_info) {
        console.log(`⏭️  Skipping pick ${pick.id} - missing monte carlo or game info`);
        skipCount++;
        continue;
      }
      
      // Calculate edges
      const edges = calculatePickEdges(
        pick as Pick,
        pick.monte_carlo_results,
        pick.game_info
      );
      
      // Update in database
      const { error: updateError } = await supabase
        .from('picks')
        .update({
          moneyline_edge: edges.moneyline_edge,
          spread_edge: edges.spread_edge,
          ou_edge: edges.ou_edge
        })
        .eq('id', pick.id);
      
      if (updateError) {
        console.error(`❌ Failed to update pick ${pick.id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
        console.log(`✅ Updated pick ${pick.id}: ML ${edges.moneyline_edge}%, ATS ${edges.spread_edge}%, O/U ${edges.ou_edge}%`);
      }
      
    } catch (err) {
      console.error(`❌ Error processing pick ${pick.id}:`, err);
      errorCount++;
    }
  }
  
  console.log('\n📊 Backfill Summary:');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total processed: ${picks.length}`);
}

// Run the backfill
backfillEdges()
  .then(() => {
    console.log('✨ Backfill complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Backfill failed:', err);
    process.exit(1);
  });

export { backfillEdges };
