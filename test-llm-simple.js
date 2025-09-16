/**
 * Simple Node.js test for LLM Sports API
 * Run with: node test-llm-simple.js
 */

import https from 'https';

// Mock the import.meta.env for Node.js
global.import = {
  meta: {
    env: {
      VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY || 'your-api-key-here'
    }
  }
};

// Simple test function
async function testLLMAPI() {
  console.log('🧪 Testing LLM Sports API...\n');

  const apiKey = process.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.log('❌ OpenAI API key not found in environment variables');
    console.log('   Please set VITE_OPENAI_API_KEY in your .env file\n');
    console.log('📝 Testing with mock data instead...\n');

    // Mock test data
    const mockSchedule = {
      week: 1,
      season: 2025,
      games: [
        {
          id: 'mock-1',
          name: 'Kansas City Chiefs at Baltimore Ravens',
          date: '2025-09-15T20:20:00Z',
          homeTeam: 'Baltimore Ravens',
          awayTeam: 'Kansas City Chiefs',
          venue: 'M&T Bank Stadium',
          location: 'Baltimore, MD'
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Mock schedule generated:');
    console.log(`   Week: ${mockSchedule.week}`);
    console.log(`   Games: ${mockSchedule.games.length}`);
    console.log(`   Sample: ${mockSchedule.games[0].awayTeam} @ ${mockSchedule.games[0].homeTeam}`);
    console.log('\n🎯 Mock test completed successfully!');
    return;
  }

  console.log('🤖 Testing with real OpenAI API...\n');

  try {
    const prompt = `Generate a realistic NFL schedule for Week 1 of the 2025 season.
    Return ONLY a JSON array of 3 games with this exact format:
    [
      {
        "id": "game-1",
        "name": "Team A at Team B",
        "date": "2025-09-15T20:20:00Z",
        "homeTeam": "Team B",
        "awayTeam": "Team A",
        "venue": "Stadium Name",
        "location": "City, State"
      }
    ]`;

    const postData = JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      const content = result.choices[0]?.message?.content;

      console.log('✅ OpenAI API call successful!');
      console.log('📄 Generated content:');
      console.log(content);
      console.log('\n🎯 LLM API test completed successfully!');
    } else {
      console.log(`❌ OpenAI API call failed with status: ${response.statusCode}`);
      console.log('Response:', response.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLLMAPI();