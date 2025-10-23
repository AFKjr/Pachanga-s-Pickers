/**
 * Test the Enhanced Reasoning Generator
 *
 * This demonstrates the complete system with team stats and trends.
 */

import { generateReasoningForPick } from './supabase/functions/generate-predictions/lib/utils/reasoning-generator';
import { fetchTeamTrends } from './src/utils/trendDataFetcher';
import { fetchTeamStats } from './src/utils/teamStatsHelpers';

// Sample pick data for testing
const samplePick = {
  id: 'test-pick-1',
  prediction: 'Kansas City Chiefs',
  spread_prediction: 'Kansas City Chiefs -3.5',
  confidence: 68,
  moneyline_edge: 5.4,
  spread_edge: 3.2,
  ou_edge: -1.1,
  game_info: {
    home_team: 'Kansas City Chiefs',
    away_team: 'Buffalo Bills',
    favorite_team: 'Kansas City Chiefs',
    underdog_team: 'Buffalo Bills',
    spread: 3.5,
    over_under: 47.5,
    game_date: '2025-10-23'
  },
  monte_carlo_results: {
    home_win_probability: 68,
    away_win_probability: 32,
    spread_probability: 62,
    over_probability: 48,
    under_probability: 52,
    predicted_home_score: 27.5,
    predicted_away_score: 21.2
  }
};

async function testEnhancedReasoning() {
  console.log('🧪 Testing Enhanced Reasoning Generator\n');

  try {
    // Test trend fetching
    console.log('📊 Testing Trend Fetcher...');
    const trends = await fetchTeamTrends('Kansas City Chiefs');
    console.log('Trends found:', Object.keys(trends).filter(key => trends[key as keyof typeof trends] !== null));
    console.log('Best trend:', trends ? 'Found trends' : 'No trends');
    console.log('');

    // Test team stats fetching
    console.log('📈 Testing Team Stats Fetcher...');
    const teamStats = await fetchTeamStats('Kansas City Chiefs');
    console.log('Team stats found:', teamStats ? '✅ Yes' : '❌ No');
    if (teamStats) {
      console.log(`PPG: ${teamStats.points_per_game}, PAPG: ${teamStats.points_allowed_per_game}`);
    }
    console.log('');

    // Test complete reasoning generation
    console.log('🤖 Testing Complete Reasoning Generation...');
    const reasoning = await generateReasoningForPick(samplePick, 'moneyline');
    console.log('Generated Reasoning:');
    console.log(`"${reasoning}"`);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedReasoning();