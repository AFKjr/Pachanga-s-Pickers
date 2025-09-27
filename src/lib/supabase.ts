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
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          pick_id?: string;
          user_name: string;
          created_at: string;
          updated_at?: string;
          upvotes?: number;
          downvotes?: number;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          pick_id?: string;
          user_name: string;
          created_at?: string;
          updated_at?: string;
          upvotes?: number;
          downvotes?: number;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          pick_id?: string;
          user_name?: string;
          created_at?: string;
          updated_at?: string;
          upvotes?: number;
          downvotes?: number;
        };
      };
      comments: {
        Row: {
          id: string;
          content: string;
          post_id: string;
          user_name: string;
          created_at: string;
          parent_comment_id?: string;
          upvotes?: number;
          downvotes?: number;
        };
        Insert: {
          id?: string;
          content: string;
          post_id: string;
          user_name: string;
          created_at?: string;
          parent_comment_id?: string;
          upvotes?: number;
          downvotes?: number;
        };
        Update: {
          id?: string;
          content?: string;
          post_id?: string;
          user_name?: string;
          created_at?: string;
          parent_comment_id?: string;
          upvotes?: number;
          downvotes?: number;
        };
      };
      game_schedules: {
        Row: {
          id: string;
          week: NFLWeek;
          season: number;
          games: any[]; // Array of game objects
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          week: NFLWeek;
          season: number;
          games: any[];
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          week?: NFLWeek;
          season?: number;
          games?: any[];
          last_updated?: string;
          created_at?: string;
        };
      };
    };
  };
};