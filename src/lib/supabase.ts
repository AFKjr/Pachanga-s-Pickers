import { createClient } from '@supabase/supabase-js';
import { NFLWeek, ConfidenceLevel } from '../types/index';

// These would normally come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

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