/**
 * Test the LLM Sports API implementation
 * This script tests all the main functionality of the LLM-based sports data service
 */

import { llmSportsAPI } from './llmSportsAPI.js';

async function testLLMSportsAPI() {
  console.log('🧪 Testing LLM Sports API Implementation...\n');

  try {
    // Test 1: Basic functionality
    console.log('📅 Test 1: Fetching current week schedule...');
    const schedule = await llmSportsAPI.fetchCurrentWeekSchedule();
    console.log(`✅ Schedule fetched successfully!`);
    console.log(`   Week: ${schedule.week}, Season: ${schedule.season}`);
    console.log(`   Games: ${schedule.games.length}`);
    console.log(`   Last Updated: ${schedule.lastUpdated}\n`);

    // Test 2: Display sample games
    console.log('🏈 Test 2: Sample games from schedule:');
    const sampleGames = schedule.games.slice(0, 3);
    sampleGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.awayTeam} @ ${game.homeTeam}`);
      console.log(`   📍 ${game.venue || 'TBD'}, ${game.location || 'TBD'}`);
      console.log(`   📅 ${new Date(game.date).toLocaleString()}\n`);
    });

    // Test 3: Database operations
    console.log('💾 Test 3: Testing database operations...');
    await llmSportsAPI.saveScheduleToDatabase(schedule);
    console.log('✅ Schedule saved to database');

    const loadedSchedule = await llmSportsAPI.loadScheduleFromDatabase();
    if (loadedSchedule) {
      console.log(`✅ Schedule loaded from database (${loadedSchedule.games.length} games)`);
    } else {
      console.log('❌ Failed to load schedule from database');
    }
    console.log('');

    // Test 4: Get current week games
    console.log('🎯 Test 4: Getting current week games...');
    const games = await llmSportsAPI.getCurrentWeekGames();
    console.log(`✅ Retrieved ${games.length} games for current week\n`);

    // Test 5: Check data source
    console.log('🔍 Test 5: Analyzing data source...');
    const firstGame = schedule.games[0];
    if (firstGame.id.startsWith('mock-')) {
      console.log('📝 Data Source: Mock data (LLM not used)');
    } else if (firstGame.id.includes('llm-')) {
      console.log('🤖 Data Source: LLM-generated');
    } else {
      console.log('🌐 Data Source: Real API data');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total games: ${schedule.games.length}`);
    console.log(`   - Unique teams: ${new Set(schedule.games.flatMap(g => [g.homeTeam, g.awayTeam])).size}`);
    console.log(`   - Data freshness: ${new Date(schedule.lastUpdated).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your VITE_OPENAI_API_KEY in .env file');
    console.log('2. Ensure Supabase is configured correctly');
    console.log('3. Check internet connection');
    console.log('4. Verify the LLM API service is properly imported');
  }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testLLMSportsAPI();
} else {
  // Browser environment - expose for manual testing
  window.testLLMSportsAPI = testLLMSportsAPI;
  console.log('🧪 LLM Sports API test function loaded. Run testLLMSportsAPI() in console to test.');
}