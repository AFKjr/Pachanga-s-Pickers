// api/lib/odds/fetch-odds.ts
import type { OddsData } from '../types';

export async function fetchNFLOdds(): Promise<OddsData[]> {
  const ODDS_API_KEY = process.env.ODDS_API_KEY;
  
  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY environment variable is not set');
  }

  const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

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

  return await response.json();
}

export interface ExtractedOdds {
  homeSpread: number;
  total: number;
  homeMLOdds?: number;
  awayMLOdds?: number;
  spreadOdds: number;
  overOdds: number;
  underOdds: number;
}

export function extractOddsFromGame(game: OddsData): ExtractedOdds {
  const bookmaker = game.bookmakers.find(bm => bm.key === 'draftkings') || game.bookmakers[0];
  
  if (!bookmaker) {
    throw new Error(`No bookmaker data available for ${game.away_team} @ ${game.home_team}`);
  }

  const spreadsMarket = bookmaker.markets.find(market => market.key === 'spreads');
  const totalsMarket = bookmaker.markets.find(market => market.key === 'totals');
  const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');

  const homeSpread = spreadsMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.point || 0;
  const total = totalsMarket?.outcomes[0]?.point || 45;
  const homeMLOdds = h2hMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.price;
  const awayMLOdds = h2hMarket?.outcomes.find(outcome => outcome.name === game.away_team)?.price;
  const spreadOdds = spreadsMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.price || -110;
  const overOdds = totalsMarket?.outcomes.find(outcome => outcome.name === 'Over')?.price || -110;
  const underOdds = totalsMarket?.outcomes.find(outcome => outcome.name === 'Under')?.price || -110;

  return {
    homeSpread,
    total,
    homeMLOdds,
    awayMLOdds,
    spreadOdds,
    overOdds,
    underOdds
  };
}
