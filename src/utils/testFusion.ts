// src/utils/testFusion.ts
// Test utility to verify fusion is working correctly

import { NFLStatsFusion } from '../services/nflStatsFusion';
import { parseFusedTeamStats } from './csvParser';

export interface FusionTestResult {
  success: boolean;
  teamsFound: number;
  sampleTeam: any;
  fieldsMapped: string[];
  errors: string[];
  warnings: string[];
}

export class FusionTester {
  /**
   * Test the complete fusion pipeline
   */
  static testFusionPipeline(
    offensiveContent: string,
    defensiveContent: string,
    week: number = 7,
    season: number = 2025
  ): FusionTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🧪 Testing fusion pipeline...');

      // Step 1: Fusion
      console.log('Step 1: Running fusion...');
      const fusedCSV = NFLStatsFusion.fuseCombinedStats(
        offensiveContent,
        defensiveContent
      );

      if (!fusedCSV || fusedCSV.length === 0) {
        errors.push('Fusion produced empty CSV');
        return {
          success: false,
          teamsFound: 0,
          sampleTeam: null,
          fieldsMapped: [],
          errors,
          warnings
        };
      }

      console.log('✅ Fusion complete');
      console.log('CSV preview:', fusedCSV.substring(0, 300));

      // Step 2: Parse
      console.log('Step 2: Parsing fused CSV...');
      const teamStats = parseFusedTeamStats(fusedCSV, week, season);

      if (teamStats.length === 0) {
        errors.push('Parser produced no teams');
        return {
          success: false,
          teamsFound: 0,
          sampleTeam: null,
          fieldsMapped: [],
          errors,
          warnings
        };
      }

      console.log(`✅ Parsed ${teamStats.length} teams`);

      // Step 3: Validate
      console.log('Step 3: Validating data quality...');
      const sampleTeam = teamStats[0];

      // Check critical fields
      const criticalFields = [
        'team_name',
        'points_per_game',
        'offensive_yards_per_game',
        'third_down_conversion_rate',
        'red_zone_efficiency',
        'yards_per_play',
        'drives_per_game'
      ];

      for (const field of criticalFields) {
        const value = (sampleTeam as any)[field];
        if (value === null || value === undefined || isNaN(value as number)) {
          if (field === 'team_name') {
            if (!value) errors.push(`Missing ${field}`);
          } else {
            errors.push(`Invalid ${field}: ${value}`);
          }
        }
      }

      // Check for reasonable ranges
      if (sampleTeam.points_per_game < 0 || sampleTeam.points_per_game > 60) {
        warnings.push(`Unusual points_per_game: ${sampleTeam.points_per_game}`);
      }

      if ((sampleTeam.third_down_conversion_rate || 0) < 0 || (sampleTeam.third_down_conversion_rate || 0) > 100) {
        warnings.push(`Invalid third_down_conversion_rate: ${sampleTeam.third_down_conversion_rate}%`);
      }

      if ((sampleTeam.red_zone_efficiency || 0) < 0 || (sampleTeam.red_zone_efficiency || 0) > 100) {
        warnings.push(`Invalid red_zone_efficiency: ${sampleTeam.red_zone_efficiency}%`);
      }

      // Get all mapped fields
      const fieldsMapped = Object.keys(sampleTeam);

      console.log('✅ Validation complete');
      console.log(`Found ${fieldsMapped.length} fields`);

      return {
        success: errors.length === 0,
        teamsFound: teamStats.length,
        sampleTeam: {
          team_name: sampleTeam.team_name,
          week: sampleTeam.week,
          season_year: sampleTeam.season_year,
          games_played: sampleTeam.games_played,
          points_per_game: sampleTeam.points_per_game,
          offensive_yards_per_game: sampleTeam.offensive_yards_per_game,
          third_down_conversion_rate: sampleTeam.third_down_conversion_rate,
          red_zone_efficiency: sampleTeam.red_zone_efficiency,
          yards_per_play: sampleTeam.yards_per_play,
          drives_per_game: sampleTeam.drives_per_game,
          points_allowed_per_game: sampleTeam.points_allowed_per_game
        },
        fieldsMapped,
        errors,
        warnings
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Test failed:', error);
      return {
        success: false,
        teamsFound: 0,
        sampleTeam: null,
        fieldsMapped: [],
        errors: [errorMsg],
        warnings
      };
    }
  }

  /**
   * Display test results in console
   */
  static displayTestResults(result: FusionTestResult): void {
    console.log('\n📊 FUSION TEST RESULTS\n');
    console.log('═══════════════════════════════════════════\n');

    if (result.success) {
      console.log('✅ Status: SUCCESS\n');
    } else {
      console.log('❌ Status: FAILED\n');
    }

    console.log(`📈 Teams Found: ${result.teamsFound}`);
    console.log(`🗂️  Fields Mapped: ${result.fieldsMapped.length}\n`);

    if (result.sampleTeam) {
      console.log('📋 Sample Team Data:');
      console.log('───────────────────────────────────────────');
      console.log(`Team: ${result.sampleTeam.team_name}`);
      console.log(`Week: ${result.sampleTeam.week}, Season: ${result.sampleTeam.season_year}`);
      console.log(`Games Played: ${result.sampleTeam.games_played}`);
      console.log('\nKey Stats:');
      console.log(`  • Points/Game: ${result.sampleTeam.points_per_game?.toFixed(1)}`);
      console.log(`  • Yards/Game: ${result.sampleTeam.offensive_yards_per_game?.toFixed(1)}`);
      console.log(`  • 3rd Down %: ${result.sampleTeam.third_down_conversion_rate?.toFixed(1)}%`);
      console.log(`  • Red Zone %: ${result.sampleTeam.red_zone_efficiency?.toFixed(1)}%`);
      console.log(`  • Yards/Play: ${result.sampleTeam.yards_per_play?.toFixed(1)}`);
      console.log(`  • Drives/Game: ${result.sampleTeam.drives_per_game?.toFixed(1)}`);
      console.log(`  • Points Allowed/Game: ${result.sampleTeam.points_allowed_per_game?.toFixed(1)}\n`);
    }

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  • ${warning}`));
      console.log('');
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => console.log(`  • ${error}`));
      console.log('');
    }

    console.log('═══════════════════════════════════════════\n');
  }
}

// Usage example:
/*
const testResult = FusionTester.testFusionPipeline(
  offensiveFileContent,
  defensiveFileContent,
  7,
  2025
);

FusionTester.displayTestResults(testResult);

if (testResult.success) {
  console.log('✅ Ready to import to database!');
} else {
  console.error('❌ Fix errors before importing');
}
*/