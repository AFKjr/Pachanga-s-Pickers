// Database Types
export interface Pick {
  id: string;
  game_info: GameInfo;
  prediction: string;
  confidence: number;
  reasoning: string;
  result?: 'win' | 'loss' | 'push' | 'pending';
  created_at: string;
  updated_at?: string;
  is_pinned?: boolean;
  user_id?: string;
  author_username?: string;
  upvotes?: number;
  downvotes?: number;
  comments_count?: number;
}

export interface GameInfo {
  home_team: string;
  away_team: string;
  league: 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAA';
  game_date: string;
  spread?: number;
  over_under?: number;
}

export interface ESPNGame {
  id: string;
  name: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  location: string;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
  };
}

export interface GameSchedule {
  week: number;
  season: number;
  games: ESPNGame[];
  lastUpdated: string;
}

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