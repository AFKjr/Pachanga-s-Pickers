/**
 * Test script for LLM Sports API
 * Run this to verify the LLM-based sports data service is working
 */

import { llmSportsAPI } from './llmSportsAPI';

async function testLLMSportsAPI() {
  console.log('🧪 Testing LLM Sports API...\n');

  try {
    // Test 1: Fetch current week schedule
    console.log('📅 Test 1: Fetching current week schedule...');
    const schedule = await llmSportsAPI.fetchCurrentWeekSchedule();
    console.log(`✅ Got schedule for Week ${schedule.week}, Season ${schedule.season}`);
    console.log(`📊 Found ${schedule.games.length} games`);
    console.log(`🕒 Last updated: ${schedule.lastUpdated}\n`);

    // Test 2: Display first few games
    console.log('🏈 Test 2: Sample games from schedule:');
    schedule.games.slice(0, 3).forEach((game, index) => {
      console.log(`${index + 1}. ${game.awayTeam} @ ${game.homeTeam}`);
      console.log(`   📍 ${game.venue}, ${game.location}`);
      console.log(`   📅 ${new Date(game.date).toLocaleString()}\n`);
    });

    // Test 3: Save to database
    console.log('💾 Test 3: Saving schedule to database...');
    await llmSportsAPI.saveScheduleToDatabase(schedule);
    console.log('✅ Schedule saved successfully\n');

    // Test 4: Load from database
    console.log('📖 Test 4: Loading schedule from database...');
    const loadedSchedule = await llmSportsAPI.loadScheduleFromDatabase();
    if (loadedSchedule) {
      console.log(`✅ Loaded schedule with ${loadedSchedule.games.length} games\n`);
    } else {
      console.log('❌ Failed to load schedule from database\n');
    }

    // Test 5: Get current week games
    console.log('🎯 Test 5: Getting current week games...');
    const games = await llmSportsAPI.getCurrentWeekGames();
    console.log(`✅ Retrieved ${games.length} games for current week\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n💡 Note: If you see mock data, the LLM API may not be configured correctly.');
    console.log('   Make sure your VITE_OPENAI_API_KEY is set in the .env file.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your VITE_OPENAI_API_KEY in .env file');
    console.log('2. Ensure you have internet connection');
    console.log('3. Verify Supabase is configured correctly');
  }
}

// Run the test
testLLMSportsAPI();