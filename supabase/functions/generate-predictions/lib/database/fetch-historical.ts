// supabase/functions/generate-predictions/lib/database/fetch-historical.ts

export interface HistoricalGame {
  home_team: string;
  away_team: string;
  game_date: string;
  spread: number;
  over_under: number;
  home_ml_odds?: number;
  away_ml_odds?: number;
  spread_odds?: number;
  over_odds?: number;
  under_odds?: number;
}

export async function fetchHistoricalGames(
  week: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<HistoricalGame[] | null> {
  try {
    console.log(`📚 Fetching historical games for Week ${week} from database...`);

    const query = `${supabaseUrl}/rest/v1/picks?week=eq.${week}&season_year=eq.2025&order=created_at.desc&select=game_info`;

    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch historical games: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`No historical games found for Week ${week}`);
      return null;
    }

    
    const gamesMap = new Map();

    for (const pick of data) {
      const gameInfo = pick.game_info;
      const gameKey = `${gameInfo.away_team}_${gameInfo.home_team}`;

      
      if (gameInfo.home_ml_odds || gameInfo.spread_odds || gameInfo.over_odds) {
        if (!gamesMap.has(gameKey)) {
          gamesMap.set(gameKey, {
            home_team: gameInfo.home_team,
            away_team: gameInfo.away_team,
            game_date: gameInfo.game_date,
            spread: gameInfo.spread || 0,
            over_under: gameInfo.over_under || 45,
            home_ml_odds: gameInfo.home_ml_odds,
            away_ml_odds: gameInfo.away_ml_odds,
            spread_odds: gameInfo.spread_odds,
            over_odds: gameInfo.over_odds,
            under_odds: gameInfo.under_odds
          });
        }
      }
    }

    const games = Array.from(gamesMap.values());
    console.log(`✅ Found ${games.length} historical games with stored odds for Week ${week}`);

    return games;

  } catch (error) {
    console.error(`Error fetching historical games:`, error);
    return null;
  }
}
