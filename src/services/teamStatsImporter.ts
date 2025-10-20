import { supabase } from '../lib/supabase';
import { parseFusedTeamStats } from '../utils/csvParser';
import { FusionService } from './fusionService';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}

/**
 * Service for importing team statistics from CSV files into the database
 */
export class TeamStatsImporter {
  /**
   * Import weekly team stats from offense and defense CSV files using fusion
   */
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
      console.log(`📊 Importing team stats for Week ${week}, Season ${season} using fusion`);

      // First, fuse the CSV data using the fusion service
      const fusionResult = await FusionService.fuseStatsContent(offenseCSV, defenseCSV, week, season);

      if (!fusionResult.success || !fusionResult.fusedContent) {
        result.errors.push(`Fusion failed: ${fusionResult.error}`);
        return result;
      }

      // Parse the fused CSV data
      const parsedStats = parseFusedTeamStats(fusionResult.fusedContent, week, season);

      // Validate we have data
      if (parsedStats.length === 0) {
        result.errors.push('No team stats found in fused CSV');
        return result;
      }

      console.log(`📈 Processing ${parsedStats.length} teams from fused data`);

      // Process each team's stats
      for (const teamStats of parsedStats) {
        try {
          await this.importTeamStats(teamStats, week, season);
          result.imported++;
        } catch (error) {
          const errorMsg = `Failed to import ${teamStats.team_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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

  /**
   * Import stats for a single team
   */
  private static async importTeamStats(
    teamStats: any,
    week: number,
    season: number
  ): Promise<void> {
    // Normalize team name to match database format
    const normalizedTeamName = this.normalizeTeamName(teamStats.team_name);

    // Prepare the data for insertion
    const teamStatsData = {
      team_name: normalizedTeamName,
      week,
      season,
      games_played: teamStats.games_played || 1,

      // Offensive stats
      offensive_yards_per_game: teamStats.offensive_yards_per_game || 0,
      points_per_game: teamStats.points_per_game || 0,
      passing_yards: teamStats.passing_yards || 0,
      passing_tds: teamStats.passing_tds || 0,
      rushing_yards: teamStats.rushing_yards || 0,
      rushing_tds: teamStats.rushing_tds || 0,
      yards_per_play: teamStats.yards_per_play || 0,
      third_down_conversion_rate: teamStats.third_down_conversion_rate || 0,
      red_zone_efficiency: teamStats.red_zone_efficiency || 0,
      turnovers_lost: teamStats.turnovers_lost || 0,

      // NEW: Critical stats that were missing
      drives_per_game: teamStats.drives_per_game || 12, // NFL average fallback
      third_down_attempts: teamStats.third_down_attempts || 0,
      third_down_conversions: teamStats.third_down_conversions || 0,
      fourth_down_attempts: teamStats.fourth_down_attempts || 0,
      fourth_down_conversions: teamStats.fourth_down_conversions || 0,
      red_zone_attempts: teamStats.red_zone_attempts || 0,
      red_zone_touchdowns: teamStats.red_zone_touchdowns || 0,

      // Additional stats from fused data
      passing_yards_per_game: teamStats.passing_yards_per_game || 0,
      rushing_yards_per_game: teamStats.rushing_yards_per_game || 0,
      turnovers_per_game: teamStats.turnovers_per_game || 0,
      total_plays: teamStats.total_plays || 0,
      plays_per_game: teamStats.plays_per_game || 0,
      scoring_percentage: teamStats.scoring_percentage || 0,
      turnover_percentage: teamStats.turnover_percentage || 0,
      expected_points_offense: teamStats.expected_points_offense || 0,

      // First downs
      first_downs: teamStats.first_downs || 0,
      pass_first_downs: teamStats.pass_first_downs || 0,
      rush_first_downs: teamStats.rush_first_downs || 0,
      penalty_first_downs: teamStats.penalty_first_downs || 0,

      // Passing stats
      pass_completions: teamStats.pass_completions || 0,
      pass_attempts: teamStats.pass_attempts || 0,
      interceptions_thrown: teamStats.interceptions_thrown || 0,
      yards_per_pass_attempt: teamStats.yards_per_pass_attempt || 0,
      pass_completion_pct: teamStats.pass_completion_pct || 0,

      // Rushing stats
      rushing_attempts: teamStats.rushing_attempts || 0,
      yards_per_rush: teamStats.yards_per_rush || 0,

      // Penalties
      penalties: teamStats.penalties || 0,
      penalty_yards: teamStats.penalty_yards || 0,
      fumbles_lost: teamStats.fumbles_lost || 0,

      // Defensive stats
      defensive_yards_allowed: teamStats.defensive_yards_allowed || 0,
      points_allowed_per_game: teamStats.points_allowed_per_game || 0,
      def_passing_yards_allowed: teamStats.def_passing_yards_allowed || 0,
      def_passing_tds_allowed: teamStats.def_passing_tds_allowed || 0,
      def_rushing_yards_allowed: teamStats.def_rushing_yards_allowed || 0,
      def_rushing_tds_allowed: teamStats.def_rushing_tds_allowed || 0,
      def_yards_per_play_allowed: teamStats.def_yards_per_play_allowed || 0,
      turnovers_forced: teamStats.turnovers_forced || 0,
      def_interceptions: teamStats.def_interceptions || 0,
      fumbles_forced: teamStats.fumbles_forced || 0,

      // Additional defensive stats
      def_total_plays: teamStats.def_total_plays || 0,
      def_first_downs_allowed: teamStats.def_first_downs_allowed || 0,
      def_pass_completions_allowed: teamStats.def_pass_completions_allowed || 0,
      def_pass_attempts: teamStats.def_pass_attempts || 0,
      def_rushing_attempts_allowed: teamStats.def_rushing_attempts_allowed || 0,
      def_pass_first_downs: teamStats.def_pass_first_downs || 0,
      def_rush_first_downs: teamStats.def_rush_first_downs || 0,
      def_net_yards_per_pass: teamStats.def_net_yards_per_pass || 0,
      def_yards_per_rush_allowed: teamStats.def_yards_per_rush_allowed || 0,
      def_scoring_percentage: teamStats.def_scoring_percentage || 0,
      def_turnover_percentage: teamStats.def_turnover_percentage || 0,
      expected_points_defense: teamStats.expected_points_defense || 0,

      // Calculated fields
      turnover_differential: (teamStats.turnovers_forced || 0) - (teamStats.turnovers_lost || 0),

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert or update the team stats
    const { error } = await supabase
      .from('team_stats_cache')
      .upsert(teamStatsData, {
        onConflict: 'team_name,week,season'
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Normalize team name to match database format
   */
  private static normalizeTeamName(teamName: string): string {
    // Use the team_name_mapping table or fallback to title case
    const normalized = teamName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return normalized;
  }

  /**
   * Get existing team stats for validation
   */
  static async getExistingStats(teamName: string, week: number, season: number) {
    const { data, error } = await supabase
      .from('team_stats_cache')
      .select('*')
      .eq('team_name', teamName)
      .eq('week', week)
      .eq('season', season)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  }

  /**
   * Validate CSV content before import
   */
  static validateCSVContent(csvContent: string, type: 'offense' | 'defense'): string[] {
    const errors: string[] = [];
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      errors.push(`${type} CSV: File appears to be empty or malformed`);
      return errors;
    }

    // Check for expected headers
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

    // Check for data rows
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