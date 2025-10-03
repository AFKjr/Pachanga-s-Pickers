/**
 * Main entry point for betting calculations
 * Re-exports all calculation functions for backward compatibility
 */

// Export all types
export * from './types';

// Export utilities
export * from './scoreUtils';

// Export specific calculators
export * from './moneylineCalculator';
export * from './atsCalculator';
export * from './overUnderCalculator';

// Import for comprehensive calculations
import { Pick } from '../../types/index';
import { GameScore, CalculatedResults, ComprehensiveATSRecord, BettingEfficiency } from './types';
import { extractPredictedTeam, getActualScores } from './scoreUtils';
import { calculateMoneylineResult } from './moneylineCalculator';
import { calculateATSResult } from './atsCalculator';
import { calculateOverUnderResult } from './overUnderCalculator';
import { getPickWeek } from '../nflWeeks';

/**
 * Calculate all results (Moneyline, ATS, O/U) from actual game scores
 * This is the main function to use when updating pick results
 */
export const calculateAllResultsFromScores = (pick: Pick): CalculatedResults => {
  const homeScore = pick.game_info.home_score;
  const awayScore = pick.game_info.away_score;
  
  // If no scores provided, everything is pending
  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return {
      moneyline: 'pending',
      ats: 'pending',
      overUnder: 'pending',
      hasScores: false
    };
  }

  const actualScore: GameScore = { home: homeScore, away: awayScore };
  const predictedTeam = extractPredictedTeam(pick);

  // Calculate Moneyline Result
  let moneylineResult: 'win' | 'loss' | 'push' | 'pending';
  if (homeScore === awayScore) {
    moneylineResult = 'push';
  } else {
    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;
    
    if ((predictedTeam === 'home' && homeWon) || (predictedTeam === 'away' && awayWon)) {
      moneylineResult = 'win';
    } else if (predictedTeam === 'unknown') {
      moneylineResult = 'pending';
    } else {
      moneylineResult = 'loss';
    }
  }

  // Calculate ATS Result
  let atsResult: 'win' | 'loss' | 'push' | 'pending' = 'pending';
  if (pick.game_info.spread !== undefined && predictedTeam !== 'unknown') {
    const atsCalc = calculateATSResult(pick, actualScore);
    atsResult = atsCalc.result;
  }

  // Calculate O/U Result
  let overUnderResult: 'win' | 'loss' | 'push' | 'pending' = 'pending';
  if (pick.game_info.over_under !== undefined) {
    const ouCalc = calculateOverUnderResult(pick, actualScore);
    overUnderResult = ouCalc.result;
  }

  return {
    moneyline: moneylineResult,
    ats: atsResult,
    overUnder: overUnderResult,
    hasScores: true
  };
};

/**
 * Calculate comprehensive betting record across all markets
 */
export const calculateComprehensiveATSRecord = (
  picks: Pick[],
  getScoreFunction: (pick: Pick) => GameScore | null = getActualScores
): ComprehensiveATSRecord => {
  
  let moneylineWins = 0, moneylineLosses = 0;
  let atsWins = 0, atsLosses = 0, atsPushes = 0;
  let ouWins = 0, ouLosses = 0, ouPushes = 0;
  let totalCoverMargin = 0, atsGamesCount = 0;
  let totalPoints = 0, ouGamesCount = 0;
  let estimatedUnits = 0;
  
  // Confidence buckets
  const confidenceStats = {
    high: { picks: 0, wins: 0 },    // 80%+
    medium: { picks: 0, wins: 0 },  // 60-79%
    low: { picks: 0, wins: 0 }      // <60%
  };

  picks.forEach(pick => {
    if (!pick.result || pick.result === 'pending') return;
    
    const actualScore = getScoreFunction(pick);
    if (!actualScore) return;
    
    // Confidence categorization
    let confidenceLevel: 'high' | 'medium' | 'low';
    if (pick.confidence >= 80) confidenceLevel = 'high';
    else if (pick.confidence >= 60) confidenceLevel = 'medium';
    else confidenceLevel = 'low';
    
    confidenceStats[confidenceLevel].picks++;
    
    // Moneyline tracking
    const mlResult = calculateMoneylineResult(pick);
    if (mlResult.result === 'win') {
      moneylineWins++;
      confidenceStats[confidenceLevel].wins++;
      estimatedUnits += 0.91; // Assuming -110 odds
    } else if (mlResult.result === 'loss') {
      moneylineLosses++;
      estimatedUnits -= 1.0;
    }
    
    // ATS tracking
    if (pick.game_info.spread) {
      const atsResult = calculateATSResult(pick, actualScore);
      if (atsResult.result === 'win') {
        atsWins++;
        estimatedUnits += 0.91;
        if (atsResult.details?.coverMargin) {
          totalCoverMargin += atsResult.details.coverMargin;
          atsGamesCount++;
        }
      } else if (atsResult.result === 'loss') {
        atsLosses++;
        estimatedUnits -= 1.0;
        if (atsResult.details?.coverMargin) {
          atsGamesCount++;
        }
      } else if (atsResult.result === 'push') {
        atsPushes++;
      }
    }
    
    // Over/Under tracking
    if (pick.game_info.over_under) {
      const ouResult = calculateOverUnderResult(pick, actualScore);
      if (ouResult.result === 'win') {
        ouWins++;
        estimatedUnits += 0.91;
      } else if (ouResult.result === 'loss') {
        ouLosses++;
        estimatedUnits -= 1.0;
      } else if (ouResult.result === 'push') {
        ouPushes++;
      }
      
      if (ouResult.details?.totalPoints) {
        totalPoints += ouResult.details.totalPoints;
        ouGamesCount++;
      }
    }
  });

  const mlResolved = moneylineWins + moneylineLosses;
  const atsResolved = atsWins + atsLosses;
  const ouResolved = ouWins + ouLosses;

  return {
    totalPicks: picks.length,
    
    moneyline: {
      wins: moneylineWins,
      losses: moneylineLosses,
      winRate: mlResolved > 0 ? (moneylineWins / mlResolved) * 100 : 0,
      totalResolved: mlResolved
    },
    
    ats: {
      wins: atsWins,
      losses: atsLosses,
      pushes: atsPushes,
      winRate: atsResolved > 0 ? (atsWins / atsResolved) * 100 : 0,
      totalResolved: atsResolved,
      coverMargin: atsGamesCount > 0 ? totalCoverMargin / atsGamesCount : 0
    },
    
    overUnder: {
      wins: ouWins,
      losses: ouLosses,
      pushes: ouPushes,
      winRate: ouResolved > 0 ? (ouWins / ouResolved) * 100 : 0,
      totalResolved: ouResolved,
      averageTotal: ouGamesCount > 0 ? totalPoints / ouGamesCount : 0
    },
    
    roi: {
      estimated: estimatedUnits,
      units: estimatedUnits
    },
    
    byConfidence: {
      high: {
        picks: confidenceStats.high.picks,
        winRate: confidenceStats.high.picks > 0 ? 
          (confidenceStats.high.wins / confidenceStats.high.picks) * 100 : 0
      },
      medium: {
        picks: confidenceStats.medium.picks,
        winRate: confidenceStats.medium.picks > 0 ? 
          (confidenceStats.medium.wins / confidenceStats.medium.picks) * 100 : 0
      },
      low: {
        picks: confidenceStats.low.picks,
        winRate: confidenceStats.low.picks > 0 ? 
          (confidenceStats.low.wins / confidenceStats.low.picks) * 100 : 0
      }
    }
  };
};

/**
 * Calculate weekly ATS records
 */
export const calculateWeeklyATSRecords = (
  picks: Pick[],
  getScoreFunction?: (pick: Pick) => GameScore | null
): Array<{ week: number; record: ComprehensiveATSRecord }> => {
  
  const weeklyPicks: Record<number, Pick[]> = {};
  
  picks.forEach(pick => {
    const week = getPickWeek(pick);
    if (!weeklyPicks[week]) {
      weeklyPicks[week] = [];
    }
    weeklyPicks[week].push(pick);
  });
  
  return Object.entries(weeklyPicks).map(([week, weekPicks]) => ({
    week: parseInt(week),
    record: calculateComprehensiveATSRecord(weekPicks, getScoreFunction)
  })).sort((a, b) => a.week - b.week);
};

/**
 * Calculate team-specific ATS records
 */
export const calculateTeamATSRecords = (
  picks: Pick[],
  getScoreFunction?: (pick: Pick) => GameScore | null
): Record<string, ComprehensiveATSRecord> => {
  
  const teamPicks: Record<string, Pick[]> = {};
  
  picks.forEach(pick => {
    [pick.game_info.home_team, pick.game_info.away_team].forEach(team => {
      if (!teamPicks[team]) {
        teamPicks[team] = [];
      }
      teamPicks[team].push(pick);
    });
  });
  
  const teamRecords: Record<string, ComprehensiveATSRecord> = {};
  Object.entries(teamPicks).forEach(([team, teamSpecificPicks]) => {
    teamRecords[team] = {
      ...calculateComprehensiveATSRecord(teamSpecificPicks, getScoreFunction)
    };
  });
  
  return teamRecords;
};

/**
 * Get recent form (last N picks)
 */
export const getRecentForm = (
  picks: Pick[],
  count: number = 5,
  getScoreFunction?: (pick: Pick) => GameScore | null
): ComprehensiveATSRecord => {
  const recentPicks = picks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, count);
  
  return calculateComprehensiveATSRecord(recentPicks, getScoreFunction);
};

/**
 * Calculate betting efficiency metrics
 */
export const calculateBettingEfficiency = (
  picks: Pick[],
  getScoreFunction?: (pick: Pick) => GameScore | null
): BettingEfficiency => {
  
  const record = calculateComprehensiveATSRecord(picks, getScoreFunction);
  const breakEvenRate = 52.38; // 110/210 = 52.38% needed to break even at -110
  
  let highConfidenceWins = 0;
  let highConfidencePicks = 0;
  
  picks.forEach(pick => {
    if (pick.confidence >= 75 && pick.result && pick.result !== 'pending') {
      highConfidencePicks++;
      if (pick.result === 'win') {
        highConfidenceWins++;
      }
    }
  });
  
  const actualWinRate = record.moneyline.winRate;
  const advantage = actualWinRate - breakEvenRate;
  
  // Simplified Kelly calculation (assumes we know true win probability)
  const kellyPercent = Math.max(0, Math.min(25, advantage / 100 * 2));
  
  return {
    breakEvenRate,
    actualAdvantage: advantage,
    kellyPercent,
    confidenceAccuracy: highConfidencePicks > 0 ? 
      (highConfidenceWins / highConfidencePicks) * 100 : 0,
    valueGames: highConfidenceWins
  };
};

/**
 * Export utility object for easy importing (backward compatibility)
 */
export const ATSCalculator = {
  calculateATSResult,
  calculateOverUnderResult,
  calculateMoneylineResult,
  calculateComprehensiveATSRecord,
  calculateWeeklyATSRecords,
  calculateTeamATSRecords,
  getRecentForm,
  calculateBettingEfficiency,
  extractPredictedTeam,
  getActualScores,
  calculateAllResultsFromScores
};
