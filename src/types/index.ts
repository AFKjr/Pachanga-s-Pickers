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

export interface Post {
  id: string;
  title: string;
  content: string;
  pick_id?: string;
  user_name: string;
  created_at: string;
  updated_at?: string;
  upvotes?: number;
  downvotes?: number;
}

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  user_name: string;
  created_at: string;
  parent_comment_id?: string;
  upvotes?: number;
  downvotes?: number;
}

// UI Component Props
export interface PickCardProps {
  pick: Pick;
  showComments?: boolean;
  onCommentClick?: () => void;
}

export interface ForumThreadProps {
  post: Post;
  comments: Comment[];
  onReply?: (commentId: string, content: string) => void;
}

export interface CommentProps {
  comment: Comment;
  replies?: Comment[];
  depth?: number;
  onReply?: (content: string) => void;
}

// Mock Data Types
export interface MockPick extends Pick {
  comments_count?: number;
  is_pinned?: boolean;
}