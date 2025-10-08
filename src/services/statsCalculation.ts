/**
 * Statistics Calculation Service
 * Centralizes all statistical calculations for picks
 */

import { Pick, NFLWeek } from '../types';
import { ATSCalculator, ComprehensiveATSRecord } from '../utils/calculations';
import { getPickWeek } from '../utils/nflWeeks';

// Re-export the comprehensive stats type from calculations
export type OverallStats = ComprehensiveATSRecord;

export interface WeeklyStats {
  week: NFLWeek;
  stats: OverallStats;
}

export interface TeamStats {
  team: string;
  stats: OverallStats;
}

/**
 * Calculate overall statistics for a set of picks
 */
export function calculateOverallStats(picks: Pick[]): OverallStats {
  return ATSCalculator.calculateComprehensiveATSRecord(picks);
}

/**
 * Calculate statistics grouped by week
 */
export function calculateWeeklyStats(picks: Pick[]): WeeklyStats[] {
  const weeklyRecords = ATSCalculator.calculateWeeklyATSRecords(picks);
  
  return Object.entries(weeklyRecords)
    .map(([week, data]) => ({
      week: parseInt(week) as NFLWeek,
      stats: data.record
    }))
    .sort((a, b) => b.week - a.week); // Most recent first
}

/**
 * Calculate statistics grouped by team
 */
export function calculateTeamStats(picks: Pick[]): TeamStats[] {
  const teamRecords = ATSCalculator.calculateTeamATSRecords(picks);
  
  return Object.entries(teamRecords)
    .map(([team, stats]) => ({
      team,
      stats
    }))
    .sort((a, b) => b.stats.moneyline.winRate - a.stats.moneyline.winRate);
}

/**
 * Get statistics for a specific week
 */
export function calculateStatsForWeek(picks: Pick[], week: NFLWeek): OverallStats {
  const weekPicks = picks.filter(pick => getPickWeek(pick) === week);
  return calculateOverallStats(weekPicks);
}

/**
 * Get statistics for a specific team
 */
export function calculateStatsForTeam(picks: Pick[], teamName: string): OverallStats {
  const normalizedTeamName = teamName.toLowerCase().trim();
  const teamPicks = picks.filter(pick => {
    const homeTeam = pick.game_info.home_team.toLowerCase().trim();
    const awayTeam = pick.game_info.away_team.toLowerCase().trim();
    return homeTeam.includes(normalizedTeamName) || awayTeam.includes(normalizedTeamName);
  });
  
  return calculateOverallStats(teamPicks);
}

/**
 * Get list of unique weeks from picks
 */
export function getUniqueWeeks(picks: Pick[]): NFLWeek[] {
  const weeks = [...new Set(picks.map(pick => getPickWeek(pick)))];
  return weeks.sort((a, b) => b - a) as NFLWeek[]; // Most recent first
}

/**
 * Get list of unique teams from picks
 */
export function getUniqueTeams(picks: Pick[]): string[] {
  const teams = new Set<string>();
  
  picks.forEach(pick => {
    teams.add(pick.game_info.home_team);
    teams.add(pick.game_info.away_team);
  });
  
  return Array.from(teams).sort();
}

/**
 * Calculate win streaks (current and longest)
 */
export function calculateWinStreaks(picks: Pick[]): {
  current: number;
  longest: number;
  type: 'moneyline' | 'ats' | 'ou';
} {
  // Sort picks by date (most recent first)
  const sortedPicks = [...picks].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (from most recent)
  for (const pick of sortedPicks) {
    if (pick.result === 'win') {
      if (currentStreak === 0) {
        currentStreak++;
      } else {
        currentStreak++;
      }
    } else if (pick.result === 'loss') {
      break;
    }
    // Skip pending/push
  }

  // Calculate longest streak
  for (const pick of sortedPicks) {
    if (pick.result === 'win') {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (pick.result === 'loss') {
      tempStreak = 0;
    }
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    type: 'moneyline'
  };
}

/**
 * Calculate betting units (profit/loss)
 * Assumes standard -110 odds for simplicity
 */
export function calculateUnits(picks: Pick[], betSize: number = 1): {
  moneyline: number;
  ats: number;
  ou: number;
} {
  const moneylineUnits = picks.reduce((total, pick) => {
    if (pick.result === 'win') return total + betSize;
    if (pick.result === 'loss') return total - (betSize * 1.1); // Standard vig
    return total; // Push or pending
  }, 0);

  const atsUnits = picks.reduce((total, pick) => {
    if (pick.ats_result === 'win') return total + betSize;
    if (pick.ats_result === 'loss') return total - (betSize * 1.1);
    return total;
  }, 0);

  const ouUnits = picks.reduce((total, pick) => {
    if (pick.ou_result === 'win') return total + betSize;
    if (pick.ou_result === 'loss') return total - (betSize * 1.1);
    return total;
  }, 0);

  return {
    moneyline: Number(moneylineUnits.toFixed(2)),
    ats: Number(atsUnits.toFixed(2)),
    ou: Number(ouUnits.toFixed(2))
  };
}

/**
 * Calculate ROI (Return on Investment)
 */
export function calculateROI(picks: Pick[], betSize: number = 1): {
  moneyline: number;
  ats: number;
  ou: number;
} {
  const completedPicks = picks.filter(p => p.result !== 'pending');
  const totalInvested = completedPicks.length * betSize;

  if (totalInvested === 0) {
    return { moneyline: 0, ats: 0, ou: 0 };
  }

  const units = calculateUnits(picks, betSize);

  return {
    moneyline: Number(((units.moneyline / totalInvested) * 100).toFixed(2)),
    ats: Number(((units.ats / totalInvested) * 100).toFixed(2)),
    ou: Number(((units.ou / totalInvested) * 100).toFixed(2))
  };
}

/**
 * Get best performing teams
 */
export function getBestTeams(picks: Pick[], limit: number = 5): TeamStats[] {
  const teamStats = calculateTeamStats(picks);
  return teamStats
    .filter(team => team.stats.moneyline.totalResolved >= 3) // At least 3 games
    .slice(0, limit);
}

/**
 * Get worst performing teams
 */
export function getWorstTeams(picks: Pick[], limit: number = 5): TeamStats[] {
  const teamStats = calculateTeamStats(picks);
  return teamStats
    .filter(team => team.stats.moneyline.totalResolved >= 3)
    .sort((a, b) => a.stats.moneyline.winRate - b.stats.moneyline.winRate)
    .slice(0, limit);
}
