import { supabase } from '../lib/supabase';
import type { Pick } from '../types';

export interface TeamRecord {
  team: string;
  moneyline: {
    wins: number;
    losses: number;
    pushes: number;
    winPct: number;
  };
  ats: {
    wins: number;
    losses: number;
    pushes: number;
    coverPct: number;
  };
  overUnder: {
    overs: number;
    unders: number;
    pushes: number;
    overPct: number;
  };
  totalGames: number;
}

/**
 * Determine if a team won or lost the game based on actual scores
 */
function getMoneylineResult(
  pick: Pick,
  teamName: string
): 'win' | 'loss' | 'push' | null {
  const homeScore = pick.game_info.home_score;
  const awayScore = pick.game_info.away_score;

  // Need both scores to determine outcome
  if (homeScore === null || homeScore === undefined ||
      awayScore === null || awayScore === undefined) {
    return null;
  }

  const isHomeTeam = pick.game_info.home_team === teamName;

  if (homeScore === awayScore) {
    return 'push';
  }

  if (isHomeTeam) {
    return homeScore > awayScore ? 'win' : 'loss';
  } else {
    return awayScore > homeScore ? 'win' : 'loss';
  }
}

/**
 * Determine if a team covered the spread based on actual scores
 */
function getATSResult(
  pick: Pick,
  teamName: string
): 'win' | 'loss' | 'push' | null {
  const homeScore = pick.game_info.home_score;
  const awayScore = pick.game_info.away_score;
  const spread = pick.game_info.spread;

  // Need scores and spread to determine ATS result
  if (homeScore === null || homeScore === undefined ||
      awayScore === null || awayScore === undefined ||
      spread === null || spread === undefined) {
    return null;
  }

  const isHomeTeam = pick.game_info.home_team === teamName;

  // Calculate the actual margin
  const actualMargin = homeScore - awayScore;

  // Home team perspective: positive spread means they're underdog
  // Away team perspective: we need to flip the spread
  const teamSpread = isHomeTeam ? spread : -spread;

  // Add spread to team's actual performance
  const adjustedMargin = isHomeTeam ? actualMargin - teamSpread : -actualMargin - (-teamSpread);

  if (adjustedMargin === 0) {
    return 'push';
  }

  return adjustedMargin > 0 ? 'win' : 'loss';
}

/**
 * Determine if the game went over or under the total
 */
function getOverUnderResult(pick: Pick): 'over' | 'under' | 'push' | null {
  const homeScore = pick.game_info.home_score;
  const awayScore = pick.game_info.away_score;
  const total = pick.game_info.over_under;

  if (homeScore === null || homeScore === undefined ||
      awayScore === null || awayScore === undefined ||
      total === null || total === undefined) {
    return null;
  }

  const actualTotal = homeScore + awayScore;

  if (actualTotal === total) {
    return 'push';
  }

  return actualTotal > total ? 'over' : 'under';
}

/**
 * Calculate a team's actual record against Vegas odds
 */
export async function getTeamRecord(teamName: string): Promise<TeamRecord | null> {
  try {
    // Fetch all picks involving this team that have final scores
    const { data: picks, error } = await supabase
      .from('picks')
      .select('*')
      .or(`game_info->>home_team.eq.${teamName},game_info->>away_team.eq.${teamName}`)
      .not('game_info->>home_score', 'is', null)
      .not('game_info->>away_score', 'is', null);

    if (error) throw error;
    if (!picks || picks.length === 0) return null;

    const record: TeamRecord = {
      team: teamName,
      moneyline: { wins: 0, losses: 0, pushes: 0, winPct: 0 },
      ats: { wins: 0, losses: 0, pushes: 0, coverPct: 0 },
      overUnder: { overs: 0, unders: 0, pushes: 0, overPct: 0 },
      totalGames: 0
    };

    picks.forEach((pick: Pick) => {
      const isHomeTeam = pick.game_info.home_team === teamName;
      const isAwayTeam = pick.game_info.away_team === teamName;

      if (!isHomeTeam && !isAwayTeam) return;

      record.totalGames++;

      // Calculate actual moneyline result
      const mlResult = getMoneylineResult(pick, teamName);
      if (mlResult === 'win') {
        record.moneyline.wins++;
      } else if (mlResult === 'loss') {
        record.moneyline.losses++;
      } else if (mlResult === 'push') {
        record.moneyline.pushes++;
      }

      // Calculate actual ATS result
      const atsResult = getATSResult(pick, teamName);
      if (atsResult === 'win') {
        record.ats.wins++;
      } else if (atsResult === 'loss') {
        record.ats.losses++;
      } else if (atsResult === 'push') {
        record.ats.pushes++;
      }

      // Calculate O/U result (same for both teams)
      const ouResult = getOverUnderResult(pick);
      if (ouResult === 'over') {
        record.overUnder.overs++;
      } else if (ouResult === 'under') {
        record.overUnder.unders++;
      } else if (ouResult === 'push') {
        record.overUnder.pushes++;
      }
    });

    // Calculate percentages
    const mlGames = record.moneyline.wins + record.moneyline.losses;
    record.moneyline.winPct = mlGames > 0 ? (record.moneyline.wins / mlGames) * 100 : 0;

    const atsGames = record.ats.wins + record.ats.losses;
    record.ats.coverPct = atsGames > 0 ? (record.ats.wins / atsGames) * 100 : 0;

    const ouGames = record.overUnder.overs + record.overUnder.unders;
    record.overUnder.overPct = ouGames > 0 ? (record.overUnder.overs / ouGames) * 100 : 0;

    return record;
  } catch (error) {
    console.error('Error fetching team record:', error);
    return null;
  }
}

/**
 * Get all team records sorted by win percentage
 */
export async function getAllTeamRecords(): Promise<TeamRecord[]> {
  try {
    // Get all unique teams from picks with scores
    const { data: picks, error } = await supabase
      .from('picks')
      .select('game_info')
      .not('game_info->>home_score', 'is', null)
      .not('game_info->>away_score', 'is', null);

    if (error) throw error;
    if (!picks) return [];

    // Extract unique team names
    const teamNames = new Set<string>();
    picks.forEach((pick: any) => {
      if (pick.game_info.home_team) teamNames.add(pick.game_info.home_team);
      if (pick.game_info.away_team) teamNames.add(pick.game_info.away_team);
    });

    // Get records for all teams
    const records = await Promise.all(
      Array.from(teamNames).map(team => getTeamRecord(team))
    );

    // Filter out nulls and sort by moneyline win percentage
    return records
      .filter((record): record is TeamRecord => record !== null)
      .sort((a, b) => b.moneyline.winPct - a.moneyline.winPct);
  } catch (error) {
    console.error('Error fetching all team records:', error);
    return [];
  }
}

/**
 * Format record as string (e.g., "8-3-1")
 */
export function formatRecord(wins: number, losses: number, pushes: number = 0): string {
  if (pushes > 0) {
    return `${wins}-${losses}-${pushes}`;
  }
  return `${wins}-${losses}`;
}