// src/utils/atsCalculator.ts

import { Pick, NFLWeek } from '../types/index';
import { getPickWeek } from './nflWeeks';

export interface GameScore {
  home: number;
  away: number;
}

export interface CalculatedResults {
  moneyline: 'win' | 'loss' | 'push' | 'pending';
  ats: 'win' | 'loss' | 'push' | 'pending';
  overUnder: 'win' | 'loss' | 'push' | 'pending';
  hasScores: boolean;
}

export interface ATSResult {
  type: 'moneyline' | 'ats' | 'over_under';
  result: 'win' | 'loss' | 'push' | 'pending';
  details?: {
    predictedTeam?: string;
    actualSpread?: number;
    coverMargin?: number;
    totalPoints?: number;
    ou_line?: number;
    ou_type?: 'over' | 'under';
  };
}

export interface ComprehensiveATSRecord {
  totalPicks: number;
  
  // Moneyline tracking
  moneyline: {
    wins: number;
    losses: number;
    winRate: number;
    totalResolved: number;
  };
  
  // Against The Spread tracking
  ats: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalResolved: number;
    coverMargin: number; // Average margin when covering
  };
  
  // Over/Under tracking
  overUnder: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalResolved: number;
    averageTotal: number; // Average total points in games
  };
  
  // Advanced metrics
  roi: {
    estimated: number; // Estimated ROI assuming standard -110 odds
    units: number; // Units won/lost
  };
  
  // Confidence-based performance
  byConfidence: {
    high: { picks: number; winRate: number }; // 80%+
    medium: { picks: number; winRate: number }; // 60-79%
    low: { picks: number; winRate: number }; // <60%
  };
}

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
 * Determines which team was predicted to win based on prediction text
 */
export const extractPredictedTeam = (pick: Pick): 'home' | 'away' | 'unknown' => {
  const predictionLower = pick.prediction.toLowerCase();
  const homeTeamLower = pick.game_info.home_team.toLowerCase();
  const awayTeamLower = pick.game_info.away_team.toLowerCase();
  
  // Extract team city/name for matching
  const homeCity = homeTeamLower.split(' ')[0];
  const awayCity = awayTeamLower.split(' ')[0];
  const homeLastWord = homeTeamLower.split(' ').pop() || '';
  const awayLastWord = awayTeamLower.split(' ').pop() || '';
  
  // Check for specific team mentions
  if (predictionLower.includes(homeCity) || 
      predictionLower.includes(homeLastWord) ||
      predictionLower.includes(homeTeamLower)) {
    return 'home';
  }
  
  if (predictionLower.includes(awayCity) || 
      predictionLower.includes(awayLastWord) ||
      predictionLower.includes(awayTeamLower)) {
    return 'away';
  }
  
  // Check for position-based indicators
  if (predictionLower.includes('home')) return 'home';
  if (predictionLower.includes('away') || predictionLower.includes('road')) return 'away';
  
  return 'unknown';
};

/**
 * Calculate Against The Spread result
 */
export const calculateATSResult = (
  pick: Pick, 
  actualScore: GameScore
): ATSResult => {
  if (!pick.game_info.spread) {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }

  const predictedTeam = extractPredictedTeam(pick);
  if (predictedTeam === 'unknown') {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }

  const spread = pick.game_info.spread;
  const scoreDiff = actualScore.home - actualScore.away;
  
  // Apply spread (positive spread favors away team)
  const adjustedHomeDiff = scoreDiff + spread;
  
  let result: 'win' | 'loss' | 'push';
  
  // Check for push first (within 0.5 points)
  if (Math.abs(adjustedHomeDiff) < 0.5) {
    result = 'push';
  } else {
    // Determine if pick covered the spread
    const homeCovered = adjustedHomeDiff > 0;
    const awayCovered = adjustedHomeDiff < 0;
    
    if ((predictedTeam === 'home' && homeCovered) || 
        (predictedTeam === 'away' && awayCovered)) {
      result = 'win';
    } else {
      result = 'loss';
    }
  }

  return {
    type: 'ats',
    result,
    details: {
      predictedTeam: predictedTeam === 'home' ? pick.game_info.home_team : pick.game_info.away_team,
      actualSpread: spread,
      coverMargin: Math.abs(adjustedHomeDiff)
    }
  };
};

/**
 * Calculate Over/Under result
 */
export const calculateOverUnderResult = (
  pick: Pick, 
  actualScore: GameScore
): ATSResult => {
  if (!pick.game_info.over_under) {
    return {
      type: 'over_under',
      result: 'pending'
    };
  }

  const predictionLower = pick.prediction.toLowerCase();
  let ouType: 'over' | 'under' | 'unknown' = 'unknown';
  
  // Determine if prediction is for over or under
  if (predictionLower.includes('over') || 
      predictionLower.includes('high scoring') ||
      predictionLower.includes('shootout') ||
      predictionLower.includes('points')) {
    ouType = 'over';
  } else if (predictionLower.includes('under') || 
             predictionLower.includes('low scoring') ||
             predictionLower.includes('defensive') ||
             predictionLower.includes('ugly')) {
    ouType = 'under';
  }

  if (ouType === 'unknown') {
    return {
      type: 'over_under',
      result: 'pending'
    };
  }

  const totalPoints = actualScore.home + actualScore.away;
  const line = pick.game_info.over_under;
  
  let result: 'win' | 'loss' | 'push';
  
  // Check for push first (within 0.5 points)
  if (Math.abs(totalPoints - line) < 0.5) {
    result = 'push';
  } else if ((totalPoints > line && ouType === 'over') || 
             (totalPoints < line && ouType === 'under')) {
    result = 'win';
  } else {
    result = 'loss';
  }

  return {
    type: 'over_under',
    result,
    details: {
      totalPoints,
      ou_line: line,
      ou_type: ouType
    }
  };
};

/**
 * Calculate moneyline result
 */
export const calculateMoneylineResult = (pick: Pick): ATSResult => {
  return {
    type: 'moneyline',
    result: (pick.result || 'pending') as any
  };
};

/**
 * Generate realistic scores for demonstration purposes
 * In production, this would be replaced with actual API data
 */
export const generateRealisticScore = (pick: Pick): GameScore | null => {
  if (!pick.result || pick.result === 'pending') return null;
  
  // Generate realistic NFL scores (14-35 range typically)
  const baseHome = 17 + Math.floor(Math.random() * 14);
  const baseAway = 14 + Math.floor(Math.random() * 17);
  
  // Adjust based on actual moneyline result
  if (pick.result === 'win') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome + 7, away: baseAway };
    } else if (predictedTeam === 'away') {
      return { home: baseHome, away: baseAway + 7 };
    }
  } else if (pick.result === 'loss') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome - 3, away: baseAway + 4 };
    } else if (predictedTeam === 'away') {
      return { home: baseHome + 4, away: baseAway - 3 };
    }
  }
  
  // For pushes or unknown, return close game
  return { home: baseHome, away: baseHome + 1 };
};

/**
 * Calculate comprehensive ATS record for a set of picks
 */
export const calculateComprehensiveATSRecord = (
  picks: Pick[],
  getScoreFunction: (pick: Pick) => GameScore | null = generateRealisticScore
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
        // Push = no loss, no win on units
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
): Array<{ week: NFLWeek; record: ComprehensiveATSRecord }> => {
  
  const weeklyPicks: Record<number, Pick[]> = {};
  
  picks.forEach(pick => {
    const week = getPickWeek(pick);
    if (!weeklyPicks[week]) weeklyPicks[week] = [];
    weeklyPicks[week].push(pick);
  });

  return Object.entries(weeklyPicks).map(([week, weekPicks]) => ({
    week: parseInt(week) as NFLWeek,
    record: calculateComprehensiveATSRecord(weekPicks, getScoreFunction)
  })).sort((a, b) => b.week - a.week);
};

/**
 * Calculate team-specific ATS records
 */
export const calculateTeamATSRecords = (
  picks: Pick[],
  getScoreFunction?: (pick: Pick) => GameScore | null
): Array<{ team: string; record: ComprehensiveATSRecord }> => {
  
  const teamPicks: Record<string, Pick[]> = {};
  
  picks.forEach(pick => {
    // Add pick to both teams' records
    [pick.game_info.home_team, pick.game_info.away_team].forEach(team => {
      if (!teamPicks[team]) teamPicks[team] = [];
      teamPicks[team].push(pick);
    });
  });

  return Object.entries(teamPicks)
    .map(([team, teamSpecificPicks]) => ({
      team,
      record: calculateComprehensiveATSRecord(teamSpecificPicks, getScoreFunction)
    }))
    .filter(tr => tr.record.totalPicks >= 2) // Only teams with 2+ picks
    .sort((a, b) => b.record.ats.winRate - a.record.ats.winRate);
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
    .filter(pick => pick.result && pick.result !== 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, count);
    
  return calculateComprehensiveATSRecord(recentPicks, getScoreFunction);
};

/**
 * Calculate betting efficiency metrics
 */
export interface BettingEfficiency {
  breakEvenRate: number; // Win rate needed to break even at -110
  actualAdvantage: number; // How much above/below break-even
  kellyPercent: number; // Suggested Kelly betting percentage
  confidenceAccuracy: number; // How well confidence correlates with results
  valueGames: number; // Games where confidence > 75% and won
}

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
 * Export utility for easy importing
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
  generateRealisticScore
};