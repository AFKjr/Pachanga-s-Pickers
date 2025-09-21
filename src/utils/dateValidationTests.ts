/**
 * Date Validation Test Suite
 * 
 * Tests edge cases and malformed dates to ensure robust handling
 */
import { validateDate, validateGameDate, isValidNFLGameDate } from './dateValidation';

// Run this in browser console to test date validation
function testDateValidation() {
  console.log('🧪 Testing Date Validation Edge Cases');
  
// Test cases for malformed dates
  const testCases: Array<{
    input: any;
    expected: boolean;
    description: string;
  }> = [
    // Invalid dates
    { input: null, expected: false, description: 'null input' },
    { input: undefined, expected: false, description: 'undefined input' },
    { input: '', expected: false, description: 'empty string' },
    { input: '   ', expected: false, description: 'whitespace only' },
    { input: 'invalid-date', expected: false, description: 'invalid string' },
    { input: '2025-13-45', expected: false, description: 'impossible date' },
    { input: '2025-02-30', expected: false, description: 'invalid day for month' },
    { input: '1800-01-01', expected: false, description: 'year too old' },
    { input: '2200-01-01', expected: false, description: 'year too far in future' },
    { input: 'NaN', expected: false, description: 'NaN string' },
    { input: {}, expected: false, description: 'object input' },
    { input: [], expected: false, description: 'array input' },
    
    // Valid dates
    { input: '2025-09-15', expected: true, description: 'valid NFL date' },
    { input: '2025-12-25', expected: true, description: 'Christmas game' },
    { input: new Date('2025-10-01'), expected: true, description: 'Date object' },
    { input: new Date().toISOString(), expected: true, description: 'ISO string' },
    
    // Edge cases
    { input: '2025-02-29', expected: false, description: 'leap day in non-leap year' },
    { input: '2024-02-29', expected: true, description: 'leap day in leap year' },
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    try {
      console.log(`\n${index + 1}. Testing: ${testCase.description}`);
      console.log(`   Input: ${JSON.stringify(testCase.input)}`);
      
      // This would need to be imported in a real test environment
      const result = validateDate(testCase.input);
      // For demonstration, we'll also show the old way vs new way
      
      let isValid = result.isValid;
      try {
        if (testCase.input != null && testCase.input !== '') {
          const date = new Date(testCase.input as string | number | Date);
          isValid = !isNaN(date.getTime()) && 
                   date.getFullYear() >= 1900 && 
                   date.getFullYear() <= 2100;
        }
      } catch (e) {
        isValid = false;
      }
      
      const testPassed = isValid === testCase.expected;
      
      if (testPassed) {
        console.log(`   ✅ PASS - Expected: ${testCase.expected}, Got: ${isValid}`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected: ${testCase.expected}, Got: ${isValid}`);
        failed++;
      }
    } catch (error) {
      console.log(`   💥 ERROR - ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, total: testCases.length };
}

// Test NFL-specific date validation
function testNFLDateValidation() {
  console.log('\n🏈 Testing NFL Date Validation');
  
  const nflTestCases = [
    // NFL season dates
    { input: '2025-09-01', shouldBeValid: true, description: 'Early season' },
    { input: '2025-12-25', shouldBeValid: true, description: 'Christmas games' },
    { input: '2026-01-15', shouldBeValid: true, description: 'Playoffs' },
    { input: '2026-02-10', shouldBeValid: true, description: 'Super Bowl' },
    
    // Off-season dates
    { input: '2025-06-01', shouldBeValid: false, description: 'June off-season' },
    { input: '2025-03-15', shouldBeValid: false, description: 'March off-season' },
    { input: '2024-08-01', shouldBeValid: false, description: 'Previous year' },
  ];

  nflTestCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. NFL Test: ${testCase.description}`);
    console.log(`   Date: ${testCase.input}`);
    console.log(`   Should be valid: ${testCase.shouldBeValid}`);
    
    // Test our isValidNFLGameDate function
    const isValid = isValidNFLGameDate(testCase.input);
    console.log(`   Actual result: ${isValid}`);
    
    const testPassed = isValid === testCase.shouldBeValid;
    console.log(`   ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  });
}

// Test game date parsing with team context
function testGameDateParsing() {
  console.log('\n⚽ Testing Game Date Parsing with Context');
  
  const gameTestCases: Array<{
    gameInfo: { away_team: string; home_team: string; game_date: string | null };
    description: string;
  }> = [
    {
      gameInfo: { away_team: 'Chiefs', home_team: 'Bills', game_date: '2025-09-15' },
      description: 'Valid game'
    },
    {
      gameInfo: { away_team: 'Cowboys', home_team: 'Giants', game_date: 'invalid-date' },
      description: 'Invalid date string'
    },
    {
      gameInfo: { away_team: 'Patriots', home_team: 'Dolphins', game_date: '2025-13-45' },
      description: 'Impossible date'
    },
    {
      gameInfo: { away_team: 'Steelers', home_team: 'Ravens', game_date: null },
      description: 'Null date'
    }
  ];

  gameTestCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Game: ${testCase.gameInfo.away_team} @ ${testCase.gameInfo.home_team}`);
    console.log(`   Date: ${testCase.gameInfo.game_date}`);
    console.log(`   Description: ${testCase.description}`);
    
    try {
      // Test our validateGameDate function
      const result = validateGameDate(testCase.gameInfo.game_date, testCase.gameInfo);
      console.log(`   Valid: ${result.isValid}`);
      if (!result.isValid) {
        console.log(`   Error: ${result.error}`);
      }
      
      // Show the old unsafe way that would crash
      console.log('   🚨 Old unsafe way would do:');
      try {
        if (testCase.gameInfo.game_date !== null) {
          const unsafeDate = new Date(testCase.gameInfo.game_date);
          console.log(`   - new Date() result: ${unsafeDate}`);
          console.log(`   - toLocaleDateString(): ${unsafeDate.toLocaleDateString()}`);
        } else {
          console.log(`   - new Date(null) would create: ${new Date(null as any)}`);
        }
      } catch (e) {
        console.log(`   - Would crash: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (error) {
      console.log(`   💥 Error in test: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

// Extend Window interface for test functions
declare global {
  interface Window {
    testDateValidation: typeof testDateValidation;
    testNFLDateValidation: typeof testNFLDateValidation;
    testGameDateParsing: typeof testGameDateParsing;
  }
}

// Export test functions for browser console use
if (typeof window !== 'undefined') {
  (window as any).testDateValidation = testDateValidation;
  (window as any).testNFLDateValidation = testNFLDateValidation;
  (window as any).testGameDateParsing = testGameDateParsing;
  
  console.log('🧪 Date validation tests loaded!');
  console.log('Run testDateValidation() to test basic date validation');
  console.log('Run testNFLDateValidation() to test NFL-specific validation');
  console.log('Run testGameDateParsing() to test game context validation');
}

export { testDateValidation, testNFLDateValidation, testGameDateParsing };