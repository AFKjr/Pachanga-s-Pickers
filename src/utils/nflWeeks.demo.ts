// src/utils/nflWeeks.demo.ts

import { getNFLWeekFromDate, getPickWeek, isValidNFLDate, getCurrentNFLWeek } from './nflWeeks';

// Demo of the new NFL weeks utility
console.log('NFL Weeks Utility Demo - 2025 Season');
console.log('==========================================');

// Test cases that would fail with the old system
console.log('\n📅 Week Detection Examples:');
console.log('Week 1 (Thu 9/4 - Mon 9/8):');
console.log(`  Thu 9/4 opener: Week ${getNFLWeekFromDate('2025-09-04')}`);
console.log(`  Fri 9/5 Brazil: Week ${getNFLWeekFromDate('2025-09-05')}`);
console.log(`  Mon 9/8 night:  Week ${getNFLWeekFromDate('2025-09-08')}`);

console.log('\n🌍 International Games:');
console.log(`  Dublin (9/28):   Week ${getNFLWeekFromDate('2025-09-28')}`);
console.log(`  London (10/5):   Week ${getNFLWeekFromDate('2025-10-05')}`);
console.log(`  Berlin (11/9):   Week ${getNFLWeekFromDate('2025-11-09')}`);
console.log(`  Madrid (11/16):  Week ${getNFLWeekFromDate('2025-11-16')}`);

console.log('\n🎄 Holiday Games:');
console.log(`  Thanksgiving:    Week ${getNFLWeekFromDate('2025-11-27')}`);
console.log(`  Black Friday:    Week ${getNFLWeekFromDate('2025-11-28')}`);
console.log(`  Christmas:       Week ${getNFLWeekFromDate('2025-12-25')}`);

console.log('\n📍 Saturday Games:');
console.log(`  Week 16 Sat:     Week ${getNFLWeekFromDate('2025-12-20')}`);
console.log(`  Week 17 Sat:     Week ${getNFLWeekFromDate('2025-12-27')}`);

console.log('\n🏁 Final Week:');
console.log(`  Week 18 Sat:     Week ${getNFLWeekFromDate('2026-01-03')}`);
console.log(`  Week 18 Sun:     Week ${getNFLWeekFromDate('2026-01-05')}`);

console.log('\n❌ Invalid Dates (should return null):');
console.log(`  Before season:   ${getNFLWeekFromDate('2025-08-01')}`);
console.log(`  After season:    ${getNFLWeekFromDate('2026-02-01')}`);
console.log(`  Invalid format:  ${getNFLWeekFromDate('invalid-date')}`);

console.log('\n🔄 Pick Week Detection Priority:');

// Example pick with stored week (highest priority)
const pickWithWeek = {
  week: 5,
  game_info: {
    game_date: '2025-09-14', // Would be Week 2 by date
    away_team: 'Cowboys',
    home_team: 'Giants'
  }
};
console.log(`  Stored week priority: Week ${getPickWeek(pickWithWeek as any)} (ignores date)`);

// Example pick without stored week (uses date mapping)
const pickWithoutWeek = {
  game_info: {
    game_date: '2025-09-14', // Week 2
    away_team: 'Cowboys', 
    home_team: 'Giants'
  }
};
console.log(`  Date mapping:         Week ${getPickWeek(pickWithoutWeek as any)} (from schedule)`);

console.log('\n✅ Season Validation:');
console.log(`  Season start valid:   ${isValidNFLDate('2025-09-04')}`);
console.log(`  Mid-season valid:     ${isValidNFLDate('2025-12-01')}`);
console.log(`  Season end valid:     ${isValidNFLDate('2026-01-05')}`);
console.log(`  Off-season invalid:   ${isValidNFLDate('2025-07-01')}`);

console.log('\n📊 Current Week Detection:');
console.log(`  Today's NFL week:     ${getCurrentNFLWeek() || 'Not in season'}`);

console.log('\n🆚 Old vs New System Comparison:');
console.log('==========================================');
console.log('Old System Issues Fixed:');
console.log('❌ Assumed exactly 7 days between weeks');
console.log('❌ Hard-coded season start date');
console.log('❌ Miscategorized Thursday/Friday/Saturday games');
console.log('❌ Failed on international games');
console.log('❌ Broke on holiday scheduling');
console.log('❌ Would break next season without updates');

console.log('\nNew System Benefits:');
console.log('✅ Official NFL schedule mapping');
console.log('✅ Handles irregular scheduling');
console.log('✅ Supports international games');
console.log('✅ Holiday game support');
console.log('✅ Saturday game support');
console.log('✅ Graceful fallback for unmapped dates');
console.log('✅ Future-proof with easy schedule updates');
console.log('✅ Comprehensive error handling');

export {}; // Make this a module