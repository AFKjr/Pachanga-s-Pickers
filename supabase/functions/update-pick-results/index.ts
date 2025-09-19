import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GameResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  gameDate: string;
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sportsDataApiKey = Deno.env.get('SPORTS_DATA_API_KEY')

    console.log('Starting automatic results update...')

    // Get all pending picks
    const { data: pendingPicks, error: fetchError } = await supabaseClient
      .from('picks')
      .select('*')
      .eq('result', 'pending')

    if (fetchError) {
      console.error('Failed to fetch pending picks:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending picks', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingPicks || pendingPicks.length === 0) {
      console.log('No pending picks to update')
      return new Response(
        JSON.stringify({ message: 'No pending picks to update', updated: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingPicks.length} pending picks`)

    let updated = 0
    const errors: string[] = []

    // Group picks by game for efficiency
    const gameGroups = groupPicksByGame(pendingPicks)

    // Process each unique game
    for (const [gameKey, picks] of gameGroups.entries()) {
      try {
        const result = await fetchGameResult(gameKey, sportsDataApiKey)

        if (result && result.status === 'final') {
          const pickResult = determinePickResult(picks[0], result)

          // Update all picks for this game
          for (const pick of picks) {
            try {
              const { error: updateError } = await supabaseClient
                .from('picks')
                .update({ result: pickResult })
                .eq('id', pick.id)

              if (updateError) {
                errors.push(`Failed to update pick ${pick.id}: ${updateError.message}`)
              } else {
                updated++
                console.log(`Updated pick ${pick.id} to ${pickResult}`)
              }
            } catch (updateErr: any) {
              errors.push(`Failed to update pick ${pick.id}: ${updateErr.message}`)
            }
          }
        }
      } catch (gameError: any) {
        errors.push(`Failed to process game ${gameKey}: ${gameError.message}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const response = {
      message: `Updated ${updated} picks`,
      updated,
      errors,
      timestamp: new Date().toISOString()
    }

    console.log('Update completed:', response)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function groupPicksByGame(picks: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>()

  for (const pick of picks) {
    const gameInfo = pick.game_info
    const gameKey = `${gameInfo.home_team}|${gameInfo.away_team}|${gameInfo.game_date}`

    if (!groups.has(gameKey)) {
      groups.set(gameKey, [])
    }
    groups.get(gameKey)!.push(pick)
  }

  return groups
}

async function fetchGameResult(gameKey: string, apiKey?: string): Promise<GameResult | null> {
  const [homeTeam, awayTeam, gameDate] = gameKey.split('|')

  if (!apiKey) {
    console.warn('No SportsData API key provided')
    return null
  }

  try {
    // Convert team names to abbreviations
    const homeAbbrev = teamNameToAbbreviation(homeTeam)
    const awayAbbrev = teamNameToAbbreviation(awayTeam)

    const response = await fetch(
      `https://api.sportsdata.io/v2/json/GamesBySeason/2024?key=${apiKey}`
    )

    if (!response.ok) {
      console.error(`SportsData API error: ${response.status}`)
      return null
    }

    const games = await response.json()
    const game = games.find((g: any) =>
      g.HomeTeam === homeAbbrev &&
      g.AwayTeam === awayAbbrev &&
      g.Date.includes(gameDate.split('T')[0])
    )

    if (!game) {
      console.log(`Game not found: ${homeTeam} vs ${awayTeam} on ${gameDate}`)
      return null
    }

    return {
      homeTeam,
      awayTeam,
      homeScore: game.HomeTeamScore || 0,
      awayScore: game.AwayTeamScore || 0,
      status: game.Status === 'Final' ? 'final' : game.Status === 'InProgress' ? 'in_progress' : 'scheduled',
      gameDate
    }
  } catch (error) {
    console.error('SportsData API error:', error)
    return null
  }
}

function determinePickResult(pick: any, gameResult: GameResult): 'win' | 'loss' | 'push' {
  const prediction = pick.prediction.toLowerCase()
  const gameInfo = pick.game_info

  // Determine which team was predicted to win
  let predictedWinner = ''
  if (prediction.includes(gameInfo.home_team.toLowerCase().split(' ')[0]) ||
      prediction.includes(gameInfo.home_team.toLowerCase()) ||
      prediction.includes('home')) {
    predictedWinner = gameInfo.home_team
  } else if (prediction.includes(gameInfo.away_team.toLowerCase().split(' ')[0]) ||
             prediction.includes(gameInfo.away_team.toLowerCase()) ||
             prediction.includes('away')) {
    predictedWinner = gameInfo.away_team
  }

  // Determine actual winner
  let actualWinner = ''
  if (gameResult.homeScore > gameResult.awayScore) {
    actualWinner = gameInfo.home_team
  } else if (gameResult.awayScore > gameResult.homeScore) {
    actualWinner = gameInfo.away_team
  }

  // Check for push (tie)
  if (gameResult.homeScore === gameResult.awayScore) {
    return 'push'
  }

  // Compare prediction with actual result
  if (predictedWinner === actualWinner) {
    return 'win'
  } else {
    return 'loss'
  }
}

function teamNameToAbbreviation(teamName: string): string {
  const teamMap: { [key: string]: string } = {
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
  }

  return teamMap[teamName] || teamName.split(' ').pop() || teamName
}