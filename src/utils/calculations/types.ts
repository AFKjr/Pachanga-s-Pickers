/**
 * Shared types for betting calculations
 */
import { Pick } from '../../types/index';

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

export interface BettingEfficiency {
  breakEvenRate: number;
  actualAdvantage: number; // How much above/below break-even
  kellyPercent: number; // Suggested Kelly betting percentage
  confidenceAccuracy: number; // How well confidence correlates with results
  valueGames: number; // Games where confidence > 75% and won
}

export type { Pick };
