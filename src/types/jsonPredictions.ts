/**
 * Type definitions for JSON-based AI prediction parsing
 */

export interface MonteCarloResults {
  moneyline_probability: number;
  spread_probability: number;
  total_probability: number;
  home_win_probability: number;
  away_win_probability: number;
  spread_cover_probability: number;
  over_probability: number;
  under_probability: number;
  predicted_home_score: number;
  predicted_away_score: number;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  ats_wins: number;
  ats_losses: number;
}

export interface MoneylinePrediction {
  pick: string;
  vegas_odds: number;
  confidence: "High" | "Medium" | "Low";
}

export interface SpreadPrediction {
  line: number;
  pick: string;
  confidence: "High" | "Medium" | "Low";
}

export interface TotalPrediction {
  line: number;
  pick: "Over" | "Under";
  predicted_total: number;
  confidence: "High" | "Medium" | "Low";
}

export interface Predictions {
  moneyline: MoneylinePrediction;
  spread: SpreadPrediction;
  total: TotalPrediction;
}

export interface JsonGame {
  away_team: string;
  home_team: string;
  away_record: TeamRecord;
  home_record: TeamRecord;
  monte_carlo_results: MonteCarloResults;
  predictions: Predictions;
  key_factors: string[];
}

export interface PredictionData {
  prediction_timestamp: string;
  games: JsonGame[];
}

export interface JsonParserResult {
  isValid: boolean;
  data?: PredictionData;
  error?: string;
}