import 'dotenv/config';

console.log('VITE_ODDS_API_KEY:', process.env.VITE_ODDS_API_KEY ? 'EXISTS' : 'MISSING');
console.log('ODDS_API_KEY:', process.env.ODDS_API_KEY ? 'EXISTS' : 'MISSING');

// Your serverless function looks for this one:
if (process.env.ODDS_API_KEY) {
  console.log('✅ Serverless function will work!');
} else {
  console.log('❌ Serverless function will NOT see API key');
}