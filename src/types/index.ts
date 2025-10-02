// Database Types
export interface Pick {
  id: string;
  prediction: string;
  spread_prediction?: string;
  ou_prediction?: string;
  confidence: number;
  reasoning: string;
  result: 'win' | 'loss' | 'push' | 'pending';
  created_at: string;
  updated_at: string;
  week: number;
  schedule_id: string | null;
  game_info: GameInfo;
  // UI/Display fields (optional)
  is_pinned?: boolean;
  user_id?: string;
  author_username?: string;
  upvotes?: number;
  downvotes?: number;
  comments_count?: number;
}

export interface GameInfo {
  league: string;
  home_team: string;
  away_team: string;
  game_date: string;
  spread?: number;
  over_under?: number;
  home_score?: number | null;
  away_score?: number | null;
}

// Strict Union Types
export type NFLWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
export type ConfidenceLevel = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

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