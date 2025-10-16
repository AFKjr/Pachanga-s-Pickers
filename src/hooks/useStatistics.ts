/**
 * useStatistics Hook
 * Handles statistical calculations with memoization
 */

import { useMemo } from 'react';
import { Pick, NFLWeek } from '../types';
import * as statsService from '../services/statsCalculation';

export interface UseStatisticsReturn {
  // Overall stats
  overallStats: statsService.OverallStats;
  
  // Weekly breakdown
  weeklyStats: statsService.WeeklyStats[];
  availableWeeks: NFLWeek[];
  
  // Team breakdown
  teamStats: statsService.TeamStats[];
  availableTeams: string[];
  
  // Performance metrics
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
  
  // Best/worst performers
  bestTeams: statsService.TeamStats[];
  worstTeams: statsService.TeamStats[];
  
  // Utility functions
  getStatsForWeek: (week: NFLWeek) => statsService.OverallStats;
  getStatsForTeam: (teamName: string) => statsService.OverallStats;
}

export function useStatistics(picks: Pick[], betSize: number = 1): UseStatisticsReturn {
  // Calculate overall stats
  const overallStats = useMemo(() => {
    return statsService.calculateOverallStats(picks);
  }, [picks]);

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    return statsService.calculateWeeklyStats(picks);
  }, [picks]);

  // Get available weeks
  const availableWeeks = useMemo(() => {
    return statsService.getUniqueWeeks(picks);
  }, [picks]);

  // Calculate team stats
  const teamStats = useMemo(() => {
    return statsService.calculateTeamStats(picks);
  }, [picks]);

  // Get available teams
  const availableTeams = useMemo(() => {
    return statsService.getUniqueTeams(picks);
  }, [picks]);

  // Calculate win streaks
  const winStreaks = useMemo(() => {
    return statsService.calculateWinStreaks(picks);
  }, [picks]);

  // Calculate units
  const units = useMemo(() => {
    return statsService.calculateUnits(picks, betSize);
  }, [picks, betSize]);

  // Calculate ROI
  const roi = useMemo(() => {
    return statsService.calculateROI(picks, betSize);
  }, [picks, betSize]);

  // Get best teams
  const bestTeams = useMemo(() => {
    return statsService.getBestTeams(picks);
  }, [picks]);

  // Get worst teams
  const worstTeams = useMemo(() => {
    return statsService.getWorstTeams(picks);
  }, [picks]);

  // Utility function: get stats for a specific week
  const getStatsForWeek = useMemo(() => {
    return (week: NFLWeek) => statsService.calculateStatsForWeek(picks, week);
  }, [picks]);

  // Utility function: get stats for a specific team
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
