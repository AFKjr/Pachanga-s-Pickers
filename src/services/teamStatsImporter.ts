import { supabase } from '../lib/supabase';
import { parseWeeklyTeamStats } from '../utils/csvParser';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}


export class TeamStatsImporter {
  
  static async importWeeklyStats(
    offenseCSV: string,
    defenseCSV: string,
    week: number,
    season: number
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      errors: [],
      skipped: 0
    };

    try {
      console.log(`📊 Importing team stats for Week ${week}, Season ${season}`);

      
      const parsedStats = parseWeeklyTeamStats(offenseCSV, defenseCSV);

      
      if (Object.keys(parsedStats).length === 0) {
        result.errors.push('No team stats found in CSV files');
        return result;
      }

      console.log(`📈 Processing ${Object.keys(parsedStats).length} teams`);

      
      for (const [teamName, stats] of Object.entries(parsedStats)) {
        try {
          await this.importTeamStats(teamName, stats, week, season);
          result.imported++;
        } catch (error) {
          const errorMsg = `Failed to import ${teamName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      console.log(`✅ Import complete: ${result.imported} teams imported, ${result.errors.length} errors`);

    } catch (error) {
      const errorMsg = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  
  private static async importTeamStats(
    teamName: string,
    stats: any,
    week: number,
    season: number
  ): Promise<void> {
    
    const normalizedTeamName = this.normalizeTeamName(teamName);

    
    const teamStatsData = {
      team_name: normalizedTeamName,
      week,
      season,
      games_played: stats.games_played || 1,

      
      offensive_yards_per_game: stats.offensive_yards_per_game || 0,
      points_per_game: stats.points_per_game || 0,
      passing_yards: stats.passing_yards || 0,
      passing_tds: stats.passing_tds || 0,
      rushing_yards: stats.rushing_yards || 0,
      rushing_tds: stats.rushing_tds || 0,
      yards_per_play: stats.yards_per_play || 0,
      third_down_conversion_rate: stats.third_down_conversion_rate || 0,
      red_zone_efficiency: stats.red_zone_efficiency || 0,
      turnovers_lost: stats.turnovers_lost || 0,

      
      drives_per_game: stats.drives_per_game || 12, 
      third_down_attempts: stats.third_down_attempts || 0,
      third_down_conversions: stats.third_down_conversions || 0,
      fourth_down_attempts: stats.fourth_down_attempts || 0,
      fourth_down_conversions: stats.fourth_down_conversions || 0,
      red_zone_attempts: stats.red_zone_attempts || 0,
      red_zone_touchdowns: stats.red_zone_touchdowns || 0,

      
      defensive_yards_allowed: stats.defensive_yards_allowed || 0,
      points_allowed_per_game: stats.points_allowed_per_game || 0,
      def_passing_yards_allowed: stats.def_passing_yards_allowed || 0,
      def_passing_tds_allowed: stats.def_passing_tds_allowed || 0,
      def_rushing_yards_allowed: stats.def_rushing_yards_allowed || 0,
      def_rushing_tds_allowed: stats.def_rushing_tds_allowed || 0,
      def_yards_per_play_allowed: stats.def_yards_per_play_allowed || 0,
      turnovers_forced: stats.turnovers_forced || 0,
      def_interceptions: stats.def_interceptions || 0,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    
    const { error } = await supabase
      .from('team_stats_cache')
      .upsert(teamStatsData, {
        onConflict: 'team_name,week,season'
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  
  private static normalizeTeamName(teamName: string): string {
    
    const normalized = teamName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return normalized;
  }

  
  static async getExistingStats(teamName: string, week: number, season: number) {
    const { data, error } = await supabase
      .from('team_stats_cache')
      .select('*')
      .eq('team_name', teamName)
      .eq('week', week)
      .eq('season', season)
      .single();

    if (error && error.code !== 'PGRST116') { 
      throw error;
    }

    return data;
  }

  
  static validateCSVContent(csvContent: string, type: 'offense' | 'defense'): string[] {
    const errors: string[] = [];
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      errors.push(`${type} CSV: File appears to be empty or malformed`);
      return errors;
    }

    
    const firstLine = lines[0].toLowerCase();
    const expectedHeaders = type === 'offense'
      ? ['tm', 'g', 'pf', 'yds']
      : ['tm', 'g', 'pa', 'yds'];

    const hasExpectedHeaders = expectedHeaders.some(header =>
      firstLine.includes(header)
    );

    if (!hasExpectedHeaders) {
      errors.push(`${type} CSV: Missing expected headers (${expectedHeaders.join(', ')})`);
    }

    
    let dataRowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      if (cells.length >= 4 && cells[1] && !isNaN(Number(cells[1]))) {
        dataRowCount++;
      }
    }

    if (dataRowCount === 0) {
      errors.push(`${type} CSV: No valid data rows found`);
    } else {
      console.log(`${type} CSV: Found ${dataRowCount} data rows`);
    }

    return errors;
  }
}