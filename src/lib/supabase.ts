import { createClient } from '@supabase/supabase-js';
import { NFLWeek, ConfidenceLevel } from '../types/index';
// TODO: After running `npm run types:generate`, uncomment this line:
// import type { Database } from '../types/database.types';

// Validate required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// TODO: After generating types, add <Database> generic:
// export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      picks: {
        Row: {
          id: string;
          game_info: {
            home_team: string;
            away_team: string;
            league: string;
            game_date: string;
            spread?: number;
            over_under?: number;
          };
          prediction: string;
          spread_prediction?: string;
          ou_prediction?: string;
          confidence: ConfidenceLevel;
          reasoning: string;
          result?: 'win' | 'loss' | 'push' | 'pending';
          created_at: string;
          updated_at?: string;
          week?: NFLWeek;
        };
        Insert: {
          id?: string;
          game_info: {
            home_team: string;
            away_team: string;
            league: string;
            game_date: string;
            spread?: number;
            over_under?: number;
          };
          prediction: string;
          spread_prediction?: string;
          ou_prediction?: string;
          confidence: ConfidenceLevel;
          reasoning: string;
          result?: 'win' | 'loss' | 'push' | 'pending';
          created_at?: string;
          updated_at?: string;
          week?: NFLWeek;
        };
        Update: {
          id?: string;
          game_info?: {
            home_team: string;
            away_team: string;
            league: string;
            game_date: string;
            spread?: number;
            over_under?: number;
          };
          prediction?: string;
          spread_prediction?: string;
          ou_prediction?: string;
          confidence?: ConfidenceLevel;
          reasoning?: string;
          result?: 'win' | 'loss' | 'push' | 'pending';
          created_at?: string;
          updated_at?: string;
          week?: NFLWeek;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_admin: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
};