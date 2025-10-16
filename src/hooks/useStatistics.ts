/**
 * useStatistics Hook
 * Handles statistical calculations with memoization
 */

import { useMemo } from 'react';
import { Pick, NFLWeek } from '../types';
import * as statsService from '../services/statsCalculation';

export interface UseStatisticsReturn {
  
  overallStats: statsService.OverallStats;
  
  
  weeklyStats: statsService.WeeklyStats[];
  availableWeeks: NFLWeek[];
  
  
  teamStats: statsService.TeamStats[];
  availableTeams: string[];
  
  
  winStreaks: {
    current: number;
    longest: number;
    type: 'moneyline' | 'ats' | 'ou';
  };
  units: {
    moneyline: number;
    ats: number;
    ou: number;
  };
  roi: {
    moneyline: number;
    ats: number;
    ou: number;
  };
  
  
  bestTeams: statsService.TeamStats[];
  worstTeams: statsService.TeamStats[];
  
  
  getStatsForWeek: (week: NFLWeek) => statsService.OverallStats;
  getStatsForTeam: (teamName: string) => statsService.OverallStats;
}

export function useStatistics(picks: Pick[], betSize: number = 1): UseStatisticsReturn {
  
  const overallStats = useMemo(() => {
    return statsService.calculateOverallStats(picks);
  }, [picks]);

  
  const weeklyStats = useMemo(() => {
    return statsService.calculateWeeklyStats(picks);
  }, [picks]);

  
  const availableWeeks = useMemo(() => {
    return statsService.getUniqueWeeks(picks);
  }, [picks]);

  
  const teamStats = useMemo(() => {
    return statsService.calculateTeamStats(picks);
  }, [picks]);

  
  const availableTeams = useMemo(() => {
    return statsService.getUniqueTeams(picks);
  }, [picks]);

  
  const winStreaks = useMemo(() => {
    return statsService.calculateWinStreaks(picks);
  }, [picks]);

  
  const units = useMemo(() => {
    return statsService.calculateUnits(picks, betSize);
  }, [picks, betSize]);

  
  const roi = useMemo(() => {
    return statsService.calculateROI(picks, betSize);
  }, [picks, betSize]);

  
  const bestTeams = useMemo(() => {
    return statsService.getBestTeams(picks);
  }, [picks]);

  
  const worstTeams = useMemo(() => {
    return statsService.getWorstTeams(picks);
  }, [picks]);

  
  const getStatsForWeek = useMemo(() => {
    return (week: NFLWeek) => statsService.calculateStatsForWeek(picks, week);
  }, [picks]);

  
  const getStatsForTeam = useMemo(() => {
    return (teamName: string) => statsService.calculateStatsForTeam(picks, teamName);
  }, [picks]);

  return {
    overallStats,
    weeklyStats,
    availableWeeks,
    teamStats,
    availableTeams,
    winStreaks,
    units,
    roi,
    bestTeams,
    worstTeams,
    getStatsForWeek,
    getStatsForTeam
  };
}
