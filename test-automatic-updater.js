const { createClient } = require('@supabase/supabase-js');

// Test the automatic results updater
async function testAutomaticResultsUpdater() {
  console.log('🧪 Testing Automatic Results Updater...\n');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  try {
    // Test 1: Fetch pending picks
    console.log('1️⃣ Testing fetch pending picks...');
    const { data: pendingPicks, error: fetchError } = await supabase
      .from('picks')
      .select('*')
      .eq('result', 'pending');

    if (fetchError) {
      console.error('❌ Failed to fetch pending picks:', fetchError);
      return;
    }

    console.log(`✅ Found ${pendingPicks?.length || 0} pending picks`);

    // Test 2: Test team name to abbreviation mapping
    console.log('\n2️⃣ Testing team name mapping...');
    const testTeams = [
      'Kansas City Chiefs',
      'Buffalo Bills',
      'Detroit Lions',
      'Unknown Team'
    ];

    testTeams.forEach(team => {
      const abbrev = teamNameToAbbreviation(team);
      console.log(`   ${team} → ${abbrev}`);
    });

    // Test 3: Test pick result determination logic
    console.log('\n3️⃣ Testing pick result determination...');

    const mockPick = {
      prediction: 'Chiefs will win against the Bills',
      game_info: {
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills'
      }
    };

    const mockGameResult = {
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Buffalo Bills',
      homeScore: 27,
      awayScore: 20,
      status: 'final',
      gameDate: '2024-01-01'
    };

    const result = determinePickResult(mockPick, mockGameResult);
    console.log(`   Prediction: "${mockPick.prediction}"`);
    console.log(`   Game Result: Chiefs ${mockGameResult.homeScore} - Bills ${mockGameResult.awayScore}`);
    console.log(`   Determined Result: ${result}`);

    // Test 4: Test SportsData API (if key is available)
    console.log('\n4️⃣ Testing SportsData API...');
    const apiKey = process.env.VITE_SPORTS_DATA_API_KEY;

    if (apiKey) {
      console.log('   API key found, testing API call...');

      try {
        const response = await fetch(
          `https://api.sportsdata.io/v2/json/GamesBySeason/2024?key=${apiKey}`
        );

        if (response.ok) {
          const games = await response.json();
          console.log(`   ✅ API call successful, found ${games.length} games`);
        } else {
          console.log(`   ❌ API call failed: ${response.status} ${response.statusText}`);
        }
      } catch (apiError) {
        console.log(`   ❌ API call error: ${apiError.message}`);
      }
    } else {
      console.log('   ⚠️  No SportsData API key found - add VITE_SPORTS_DATA_API_KEY to test API');
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper functions (copied from automaticResultsUpdater.ts)
function determinePickResult(pick, gameResult) {
  const prediction = pick.prediction.toLowerCase();
  const gameInfo = pick.game_info;

  // Determine which team was predicted to win
  let predictedWinner = '';
  if (prediction.includes(gameInfo.home_team.toLowerCase().split(' ')[0]) ||
      prediction.includes(gameInfo.home_team.toLowerCase()) ||
      prediction.includes('home')) {
    predictedWinner = gameInfo.home_team;
  } else if (prediction.includes(gameInfo.away_team.toLowerCase().split(' ')[0]) ||
             prediction.includes(gameInfo.away_team.toLowerCase()) ||
             prediction.includes('away')) {
    predictedWinner = gameInfo.away_team;
  }

  // Determine actual winner
  let actualWinner = '';
  if (gameResult.homeScore > gameResult.awayScore) {
    actualWinner = gameInfo.home_team;
  } else if (gameResult.awayScore > gameResult.homeScore) {
    actualWinner = gameInfo.away_team;
  }

  // Check for push (tie)
  if (gameResult.homeScore === gameResult.awayScore) {
    return 'push';
  }

  // Compare prediction with actual result
  if (predictedWinner === actualWinner) {
    return 'win';
  } else {
    return 'loss';
  }
}

function teamNameToAbbreviation(teamName) {
  const teamMap = {
    'Kansas City Chiefs': 'KC',
    'Buffalo Bills': 'BUF',
    'Detroit Lions': 'DET',
    'Philadelphia Eagles': 'PHI',
    'San Francisco 49ers': 'SF',
    'Dallas Cowboys': 'DAL',
    'Miami Dolphins': 'MIA',
    'Cleveland Browns': 'CLE',
    'Jacksonville Jaguars': 'JAX',
    'New England Patriots': 'NE',
    'Pittsburgh Steelers': 'PIT',
    'Cincinnati Bengals': 'CIN',
    'Seattle Seahawks': 'SEA',
    'Arizona Cardinals': 'ARI',
    'Tampa Bay Buccaneers': 'TB',
    'Green Bay Packers': 'GB',
    'New Orleans Saints': 'NO',
    'Atlanta Falcons': 'ATL',
    'Chicago Bears': 'CHI',
    'New York Giants': 'NYG',
    'Washington Commanders': 'WAS',
    'New York Jets': 'NYJ',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Denver Broncos': 'DEN',
    'Indianapolis Colts': 'IND',
    'Tennessee Titans': 'TEN',
    'Carolina Panthers': 'CAR',
    'Baltimore Ravens': 'BAL',
    'Los Angeles Rams': 'LAR',
    'Minnesota Vikings': 'MIN'
  };

  return teamMap[teamName] || teamName.split(' ').pop() || teamName;
}

// Run the test
testAutomaticResultsUpdater();