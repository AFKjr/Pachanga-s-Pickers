// supabase/functions/generate-predictions/lib/odds/fetch-odds.ts
import type { OddsData } from '../types.ts';

export async function fetchNFLOdds(): Promise<OddsData[]> {
  const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY');
  
  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY environment variable is not set');
  }

  const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

  // Fetch ALL upcoming games without date filtering
  // The live-predictions generator will filter by week if needed
  console.log(`📅 Fetching all upcoming NFL games from The Odds API...`);

  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/americanfootball_nfl/odds/?` +
    `apiKey=${ODDS_API_KEY}&` +
    `regions=us&` +
    `markets=h2h,spreads,totals&` +
    `oddsFormat=american`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!response.ok) {
    throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Check if response includes pagination info
  console.log(`📄 API Response metadata:`, {
    responseType: typeof data,
    hasPagination: !!data.pagination,
    totalGames: Array.isArray(data) ? data.length : (data.data ? data.data.length : 'N/A'),
    pagination: data.pagination || 'No pagination info'
  });
  
  // Handle different response formats
  let allGames: OddsData[] = [];
  if (Array.isArray(data)) {
    allGames = data;
  } else if (data.data && Array.isArray(data.data)) {
    allGames = data.data;
  } else {
    console.warn('⚠️ Unexpected API response format:', typeof data);
    return [];
  }
  
  // If there's pagination, fetch additional pages
  if (data.pagination && data.pagination.total > data.pagination.per_page) {
    const totalPages = Math.ceil(data.pagination.total / data.pagination.per_page);
    console.log(`📄 Fetching ${totalPages} pages of odds data...`);
    
    for (let page = 2; page <= totalPages; page++) {
      console.log(`📄 Fetching page ${page}/${totalPages}...`);
      
      const pageResponse = await fetch(
        `${ODDS_API_BASE_URL}/sports/americanfootball_nfl/odds/?` +
        `apiKey=${ODDS_API_KEY}&` +
        `regions=us&` +
        `markets=h2h,spreads,totals&` +
        `oddsFormat=american&` +
        `commenceTimeFrom=${commenceTimeFrom}&` +
        `commenceTimeTo=${commenceTimeTo}&` +
        `page=${page}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );
      
      if (pageResponse.ok) {
        const pageData = await pageResponse.json();
        let pageGames: OddsData[] = [];
        if (Array.isArray(pageData)) {
          pageGames = pageData;
        } else if (pageData.data && Array.isArray(pageData.data)) {
          pageGames = pageData.data;
        }
        allGames = allGames.concat(pageGames);
        console.log(`📄 Page ${page}: added ${pageGames.length} games`);
      } else {
        console.warn(`⚠️ Failed to fetch page ${page}: ${pageResponse.status}`);
      }
    }
  }

  return allGames;
}

export interface ExtractedOdds {
  homeSpread?: number;  // Made optional to handle missing spread data
  awaySpread?: number;  // Added for completeness
  total?: number;  // Made optional to handle missing total data
  homeMLOdds?: number;
  awayMLOdds?: number;
  homeSpreadOdds?: number;  // Renamed for clarity
  awaySpreadOdds?: number;  // Added for completeness
  overOdds?: number;
  underOdds?: number;
}

export function extractOddsFromGame(game: OddsData): ExtractedOdds {
  // Try to find DraftKings first, then fall back to any available bookmaker
  const bookmaker = game.bookmakers?.find(bm => bm.key === 'draftkings') || game.bookmakers?.[0];
  
  // If no bookmaker data available, log warning and return empty odds
  // The validateGameOdds function will provide fallback values
  if (!bookmaker) {
    console.warn(`⚠️ No bookmaker data available for ${game.away_team} @ ${game.home_team} - will use fallback odds`);
    return {
      homeSpread: undefined,
      awaySpread: undefined,
      total: undefined,
      homeMLOdds: undefined,
      awayMLOdds: undefined,
      homeSpreadOdds: undefined,
      awaySpreadOdds: undefined,
      overOdds: undefined,
      underOdds: undefined
    };
  }

  // Log if using non-DraftKings bookmaker
  if (bookmaker.key !== 'draftkings') {
    console.warn(`⚠️ Using ${bookmaker.key} odds for ${game.away_team} @ ${game.home_team} (DraftKings not available)`);
  }

  const spreadsMarket = bookmaker.markets.find(market => market.key === 'spreads');
  const totalsMarket = bookmaker.markets.find(market => market.key === 'totals');
  const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');

  const homeSpread = spreadsMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.point;
  const awaySpread = spreadsMarket?.outcomes.find(outcome => outcome.name === game.away_team)?.point;
  const total = totalsMarket?.outcomes[0]?.point;
  const homeMLOdds = h2hMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.price;
  const awayMLOdds = h2hMarket?.outcomes.find(outcome => outcome.name === game.away_team)?.price;
  const homeSpreadOdds = spreadsMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.price;
  const awaySpreadOdds = spreadsMarket?.outcomes.find(outcome => outcome.name === game.away_team)?.price;
  const overOdds = totalsMarket?.outcomes.find(outcome => outcome.name === 'Over')?.price;
  const underOdds = totalsMarket?.outcomes.find(outcome => outcome.name === 'Under')?.price;

  return {
    homeSpread,
    awaySpread,
    total,
    homeMLOdds,
    awayMLOdds,
    homeSpreadOdds,
    awaySpreadOdds,
    overOdds,
    underOdds
  };
}
