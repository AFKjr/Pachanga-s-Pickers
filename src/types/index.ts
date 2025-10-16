// Database Types
export interface Pick {
  id: string;
  prediction: string;
  spread_prediction?: string;
  ou_prediction?: string;
  confidence: number;
  reasoning: string;
  result: 'win' | 'loss' | 'push' | 'pending';
  ats_result?: 'win' | 'loss' | 'push' | 'pending';
  ou_result?: 'win' | 'loss' | 'push' | 'pending';
  created_at: string;
  updated_at: string;
  week: number;
  schedule_id: string | null;
  game_info: GameInfo;
  monte_carlo_results?: MonteCarloResults;
  
  // Edge values for each bet type
  moneyline_edge?: number;
  spread_edge?: number;
  ou_edge?: number;
  
  weather?: {
    temperature: number;
    wind_speed: number;
    condition: string;
    impact_rating: 'none' | 'low' | 'medium' | 'high' | 'extreme';
    description: string;
  } | null;
  weather_impact?: string;
  // UI/Display fields (optional)
  is_pinned?: boolean;
  user_id?: string;
  author_username?: string;
  comments_count?: number;
}

export interface MonteCarloResults {
  moneyline_probability: number;
  spread_probability: number;
  total_probability: number;
  home_win_probability: number;
  away_win_probability: number;
  spread_cover_probability: number;  // DEPRECATED: Use favorite_cover_probability
  favorite_cover_probability: number;  // NEW: Probability favorite covers spread
  underdog_cover_probability: number;  // NEW: Probability underdog covers spread
  over_probability: number;
  under_probability: number;
  predicted_home_score: number;
  predicted_away_score: number;
}

export interface GameInfo {
  home_team: string;
  away_team: string;
  league: string;
  game_date: string;
  spread?: number;
  over_under?: number;
  home_score?: number | null;
  away_score?: number | null;

  // Odds at time of prediction (American format)
  home_ml_odds?: number;
  away_ml_odds?: number;
  spread_odds?: number;
  over_odds?: number;
  under_odds?: number;

  // NEW: Favorite/Underdog information (for bookmaker-style spread tracking)
  favorite_team?: string;      // e.g., "Kansas City Chiefs"
  underdog_team?: string;       // e.g., "Las Vegas Raiders"
  favorite_is_home?: boolean;   // true if home team is favored
}

// Strict Union Types
export type NFLWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
export type ConfidenceLevel = number; // Float between 0.00 and 100.00, rounded to nearest hundredth

// UI Component Props
export interface PickCardProps {
  pick: Pick;
  showComments?: boolean;
  onCommentClick?: () => void;
}

// Mock Data Types
export interface MockPick extends Pick {
  comments_count?: number;
  is_pinned?: boolean;
}