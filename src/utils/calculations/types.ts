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
  
  
  moneyline: {
    wins: number;
    losses: number;
    winRate: number;
    totalResolved: number;
  };
  
  
  ats: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalResolved: number;
    coverMargin: number; 
  };
  
  
  overUnder: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalResolved: number;
    averageTotal: number; 
  };
  
  
  roi: {
    estimated: number; 
    units: number; 
  };
  
  
  byConfidence: {
    high: { picks: number; winRate: number }; 
    medium: { picks: number; winRate: number }; 
    low: { picks: number; winRate: number }; 
  };
}

export interface BettingEfficiency {
  breakEvenRate: number;
  actualAdvantage: number; 
  kellyPercent: number; 
  confidenceAccuracy: number; 
  valueGames: number; 
}

export type { Pick };
