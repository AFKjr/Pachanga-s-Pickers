/**
 * Smart Human-Friendly Reasoning Generator
 *
 * Uses ACTUAL pick data to generate reasoning, not random factors.
 * Intelligently selects the most relevant factors based on what data is available.
 * Now includes team statistics from the team_stats_cache table.
 */

import type { BettingPick, MonteCarloResults, GameInfo } from '../types/picks.types';
import { fetchMatchupStats } from '../../../../../../src/utils/teamStatsHelpers';
import type { TeamStats } from '../../../../../../src/types/teamStats.types';
import {
  getOffensiveStats,
  getDefensiveStats,
  parseStatNumber
} from '../../../../../../src/types/teamStats.types';
import { fetchTeamTrends, getBestTrend, type TeamTrends } from '../../../../../../src/utils/trendDataFetcher';

/**
 * Context about the pick that can be used in reasoning
 */
interface PickContext {
  pick: BettingPick;
  gameInfo: GameInfo;
  results: MonteCarloResults;
  betType: 'moneyline' | 'spread' | 'total';
  teamStats?: TeamStats | null;
  opponentStats?: TeamStats | null;
  trends?: TeamTrends | null;
}

/**
 * A factor with its relevance score and generated text
 */
interface ReasoningFactor {
  text: string;
  relevance: number; // 0-100, how relevant this factor is
  category: string;
}

/**
 * Generate smart, data-driven reasoning
 */
export async function generateSmartReasoning(context: PickContext): Promise<string> {
  const { betType } = context;

  // Get all available factors based on actual data
  const availableFactors = await getAllAvailableFactors(context);

  // Sort by relevance and take top 1-2
  const topFactors = availableFactors
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 2);

  // Build reasoning sentence
  const mainPrediction = buildMainPrediction(context);
  const factorText = topFactors.map(f => f.text).join('. ');

  return `${mainPrediction} ${factorText}`;
}

/**
 * Build the main prediction statement
 */
function buildMainPrediction(context: PickContext): string {
  const { pick, results, betType } = context;
  const confidence = getConfidenceLevel(getProbability(context));

  const team = getTeamName(context);
  const probability = getProbability(context);

  const templates = {
    highConfidence: [
      `${team} has a strong ${probability.toFixed(0)}% chance to ${getOutcome(context)}.`,
      `The numbers are solid on ${team} to ${getOutcome(context)} (${probability.toFixed(0)}% confidence).`,
      `${team} should ${getOutcome(context)} based on the matchup.`
    ],
    mediumConfidence: [
      `${team} has a ${probability.toFixed(0)}% edge to ${getOutcome(context)}.`,
      `Leaning ${team} here with ${probability.toFixed(0)}% probability.`,
      `${team} looks like the right side at ${probability.toFixed(0)}%.`
    ],
    lowConfidence: [
      `This is close, but ${team} has a slight ${probability.toFixed(0)}% advantage.`,
      `Barely favoring ${team} at ${probability.toFixed(0)}%.`,
      `${team} by a hair (${probability.toFixed(0)}%).`
    ]
  };

  const options = templates[confidence];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get all factors that are actually relevant based on available data
 */
async function getAllAvailableFactors(context: PickContext): Promise<ReasoningFactor[]> {
  const factors: ReasoningFactor[] = [];

  // Add factors based on what data we actually have
  factors.push(...getScorePredictionFactors(context));
  factors.push(...getEdgeFactors(context));
  factors.push(...getWeatherFactors(context));
  factors.push(...getSpreadFactors(context));
  factors.push(...getTotalFactors(context));
  factors.push(...getConfidenceFactors(context));

  // Add team stats factors (async)
  factors.push(...await getTeamStatsFactors(context));
  factors.push(...await getMatchupFactors(context));

  // Filter out factors with zero relevance
  return factors.filter(f => f.relevance > 0);
}

/**
 * Score prediction factors (uses actual predicted scores)
 */
function getScorePredictionFactors(context: PickContext): ReasoningFactor[] {
  const { results, gameInfo } = context;
  const factors: ReasoningFactor[] = [];

  if (!results.predicted_home_score || !results.predicted_away_score) {
    return factors;
  }

  const homeScore = Math.round(results.predicted_home_score);
  const awayScore = Math.round(results.predicted_away_score);
  const totalPoints = homeScore + awayScore;
  const margin = Math.abs(homeScore - awayScore);

  // High-scoring game factor
  if (totalPoints > 50) {
    factors.push({
      text: `Both offenses should be productive with a projected total of ${totalPoints} points`,
      relevance: 80,
      category: 'offense'
    });
  }

  // Low-scoring game factor
  if (totalPoints < 40) {
    factors.push({
      text: `Expect a defensive battle with only ${totalPoints} combined points projected`,
      relevance: 80,
      category: 'defense'
    });
  }

  // Blowout factor
  if (margin > 10) {
    factors.push({
      text: `Models project a ${margin}-point margin of victory`,
      relevance: 90,
      category: 'matchup'
    });
  }

  // Close game factor
  if (margin <= 3) {
    factors.push({
      text: `This should be a tight game, projected to be decided by ${margin} point${margin !== 1 ? 's' : ''}`,
      relevance: 85,
      category: 'matchup'
    });
  }

  return factors;
}

/**
 * Edge-based factors (uses actual calculated edge)
 */
function getEdgeFactors(context: PickContext): ReasoningFactor[] {
  const { pick, betType } = context;
  const factors: ReasoningFactor[] = [];

  const edge = getEdgeForBetType(pick, betType);

  if (edge === null || edge === undefined) {
    return factors;
  }

  // Strong edge
  if (edge > 5) {
    factors.push({
      text: `There's excellent value here with a ${edge.toFixed(1)}% edge over the market`,
      relevance: 95,
      category: 'value'
    });
  }

  // Good edge
  if (edge > 2 && edge <= 5) {
    factors.push({
      text: `Our models find ${edge.toFixed(1)}% of value on this line`,
      relevance: 85,
      category: 'value'
    });
  }

  // Minimal edge
  if (edge > 0 && edge <= 2) {
    factors.push({
      text: `Slight ${edge.toFixed(1)}% edge, but every bit helps`,
      relevance: 60,
      category: 'value'
    });
  }

  return factors;
}

/**
 * Weather factors (uses actual weather data if available)
 */
function getWeatherFactors(context: PickContext): ReasoningFactor[] {
  const { pick } = context;
  const factors: ReasoningFactor[] = [];

  if (!pick.weather) {
    return factors;
  }

  const { wind_speed, temperature, impact_rating } = pick.weather;

  // High wind
  if (wind_speed > 15) {
    factors.push({
      text: `${wind_speed} MPH winds will limit the passing game`,
      relevance: 90,
      category: 'weather'
    });
  }

  // Cold weather
  if (temperature < 35) {
    factors.push({
      text: `Cold ${temperature}°F conditions favor the ground game`,
      relevance: 85,
      category: 'weather'
    });
  }

  // Extreme weather impact
  if (impact_rating === 'high' || impact_rating === 'extreme') {
    factors.push({
      text: `Weather will be a significant factor in this game`,
      relevance: 95,
      category: 'weather'
    });
  }

  return factors;
}

/**
 * Spread-specific factors (uses actual spread and cover probability)
 */
function getSpreadFactors(context: PickContext): ReasoningFactor[] {
  const { gameInfo, results, betType } = context;
  const factors: ReasoningFactor[] = [];

  if (betType !== 'spread' || !gameInfo.spread) {
    return factors;
  }

  const spread = Math.abs(gameInfo.spread);
  const coverProb = results.spread_probability;

  // Large spread
  if (spread >= 10) {
    factors.push({
      text: `Despite the large ${spread}-point spread, the favorite should cover`,
      relevance: 85,
      category: 'spread'
    });
  }

  // Small spread
  if (spread <= 3) {
    factors.push({
      text: `The tight ${spread}-point spread reflects how close this matchup is`,
      relevance: 80,
      category: 'spread'
    });
  }

  // High cover probability
  if (coverProb > 60) {
    factors.push({
      text: `Cover probability is strong at ${coverProb.toFixed(0)}%`,
      relevance: 90,
      category: 'spread'
    });
  }

  return factors;
}

/**
 * Total-specific factors (uses actual O/U line and probabilities)
 */
function getTotalFactors(context: PickContext): ReasoningFactor[] {
  const { gameInfo, results, betType } = context;
  const factors: ReasoningFactor[] = [];

  if (betType !== 'total' || !gameInfo.over_under) {
    return factors;
  }

  const total = gameInfo.over_under;
  const overProb = results.over_probability;
  const underProb = results.under_probability;

  // High total
  if (total > 50) {
    factors.push({
      text: `The ${total}-point total suggests a shootout`,
      relevance: 85,
      category: 'total'
    });
  }

  // Low total
  if (total < 40) {
    factors.push({
      text: `The low ${total}-point total indicates a defensive struggle`,
      relevance: 85,
      category: 'total'
    });
  }

  // Strong over lean
  if (overProb > 60) {
    factors.push({
      text: `Over hits in ${overProb.toFixed(0)}% of simulations`,
      relevance: 90,
      category: 'total'
    });
  }

  // Strong under lean
  if (underProb > 60) {
    factors.push({
      text: `Under cashes in ${underProb.toFixed(0)}% of scenarios`,
      relevance: 90,
      category: 'total'
    });
  }

  return factors;
}

/**
 * Confidence-based factors (uses actual simulation confidence)
 */
function getConfidenceFactors(context: PickContext): ReasoningFactor[] {
  const { pick, results } = context;
  const factors: ReasoningFactor[] = [];

  const probability = getProbability(context);

  // Very high confidence
  if (probability > 65) {
    factors.push({
      text: `The model is highly confident in this outcome`,
      relevance: 75,
      category: 'confidence'
    });
  }

  // Moderate confidence
  if (probability >= 55 && probability <= 65) {
    factors.push({
      text: `Solid confidence level backing this pick`,
      relevance: 70,
      category: 'confidence'
    });
  }

  // Low confidence (coin flip)
  if (probability >= 50 && probability < 55) {
    factors.push({
      text: `This is essentially a toss-up`,
      relevance: 65,
      category: 'confidence'
    });
  }

  return factors;
}

/**
 * Team stats factors (uses actual team statistics from database)
 */
async function getTeamStatsFactors(context: PickContext): Promise<ReasoningFactor[]> {
  const { teamStats, betType } = context;
  const factors: ReasoningFactor[] = [];

  if (!teamStats) return factors;

  // Get parsed stats
  const offense = getOffensiveStats(teamStats);
  const defense = getDefensiveStats(teamStats);

  // Offensive prowess (relevant for totals and moneyline)
  if (offense.ppg && offense.ppg >= 27) {
    factors.push({
      text: `Their offense is averaging ${offense.ppg.toFixed(1)} PPG`,
      relevance: betType === 'total' ? 90 : 80,
      category: 'offense'
    });
  }

  // Defensive strength (relevant for totals and spread)
  if (defense.papg && defense.papg <= 19) {
    factors.push({
      text: `Their defense allows just ${defense.papg.toFixed(1)} PPG`,
      relevance: betType === 'total' ? 90 : 85,
      category: 'defense'
    });
  }

  // Turnover differential (relevant for all bet types)
  if (offense.turnoverDiff && Math.abs(offense.turnoverDiff) >= 5) {
    const sign = offense.turnoverDiff > 0 ? '+' : '';
    factors.push({
      text: `${sign}${offense.turnoverDiff} turnover differential shows they protect the ball`,
      relevance: 80,
      category: 'turnovers'
    });
  }

  // Red zone efficiency (relevant for totals)
  if (offense.redZonePct && offense.redZonePct >= 60 && betType === 'total') {
    factors.push({
      text: `${offense.redZonePct.toFixed(0)}% red zone efficiency means they finish drives`,
      relevance: 85,
      category: 'efficiency'
    });
  }

  // Third down conversion (relevant for all)
  if (offense.thirdDownPct && offense.thirdDownPct >= 45) {
    factors.push({
      text: `Converting ${offense.thirdDownPct.toFixed(0)}% of third downs keeps drives alive`,
      relevance: 75,
      category: 'efficiency'
    });
  }

  // Defensive third down stops (relevant for spreads)
  if (defense.thirdDownPctAllowed && defense.thirdDownPctAllowed <= 35 && betType === 'spread') {
    factors.push({
      text: `Defense limits opponents to ${defense.thirdDownPctAllowed.toFixed(0)}% on third down`,
      relevance: 80,
      category: 'defense'
    });
  }

  // Strong offensive yards per play
  if (offense.yardsPerPlay && offense.yardsPerPlay >= 5.8) {
    factors.push({
      text: `Averaging ${offense.yardsPerPlay.toFixed(1)} yards per play shows efficiency`,
      relevance: 75,
      category: 'efficiency'
    });
  }

  return factors;
}

/**
 * Matchup factors by comparing team vs opponent stats
 */
async function getMatchupFactors(context: PickContext): Promise<ReasoningFactor[]> {
  const { teamStats, opponentStats, betType } = context;
  const factors: ReasoningFactor[] = [];

  if (!teamStats || !opponentStats) return factors;

  // Get parsed stats for both teams
  const teamOffense = getOffensiveStats(teamStats);
  const teamDefense = getDefensiveStats(teamStats);
  const oppOffense = getOffensiveStats(opponentStats);
  const oppDefense = getDefensiveStats(opponentStats);

  // Offense vs Defense matchup
  if (teamOffense.ppg && oppDefense.papg) {
    const offenseAdvantage = teamOffense.ppg - oppDefense.papg;

    if (offenseAdvantage >= 7) {
      factors.push({
        text: `Their offense averages ${offenseAdvantage.toFixed(0)} more PPG than opponent allows`,
        relevance: betType === 'moneyline' ? 88 : 82,
        category: 'matchup'
      });
    }
  }

  // Defensive advantage
  if (teamDefense.papg && oppOffense.ppg) {
    const defenseAdvantage = oppOffense.ppg - teamDefense.papg;

    if (defenseAdvantage >= 7) {
      factors.push({
        text: `Defense is significantly better, holding teams to ${defenseAdvantage.toFixed(0)} fewer PPG`,
        relevance: betType === 'spread' ? 88 : 82,
        category: 'matchup'
      });
    }
  }

  // Turnover battle
  if (teamOffense.turnoverDiff !== null && oppOffense.turnoverDiff !== null) {
    const turnoverAdvantage = teamOffense.turnoverDiff - oppOffense.turnoverDiff;

    if (Math.abs(turnoverAdvantage) >= 8) {
      factors.push({
        text: `Massive turnover advantage in this matchup (${turnoverAdvantage > 0 ? '+' : ''}${turnoverAdvantage})`,
        relevance: 85,
        category: 'turnovers'
      });
    }
  }

  // Yards per play advantage
  if (teamOffense.yardsPerPlay && oppDefense.yardsPerPlayAllowed) {
    const yppAdvantage = teamOffense.yardsPerPlay - oppDefense.yardsPerPlayAllowed;

    if (yppAdvantage >= 1.0) {
      factors.push({
        text: `Significant efficiency advantage with ${yppAdvantage.toFixed(1)} more yards per play`,
        relevance: 80,
        category: 'efficiency'
      });
    }
  }

  // Red zone efficiency matchup (for totals)
  if (betType === 'total' && teamOffense.redZonePct && oppDefense.redZonePctAllowed) {
    if (teamOffense.redZonePct >= 60 && oppDefense.redZonePctAllowed >= 60) {
      factors.push({
        text: `Both teams excel in the red zone, expect touchdowns not field goals`,
        relevance: 85,
        category: 'efficiency'
      });
    }
  }

  return factors;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getBettingTeam(pick: BettingPick, betType: 'moneyline' | 'spread' | 'total'): string {
  if (betType === 'moneyline') {
    return pick.prediction.split(' ')[0]; // First word is usually team name
  }

  if (betType === 'spread' && pick.spread_prediction) {
    return pick.spread_prediction.split(' ')[0];
  }

  // Default to home team
  return pick.game_info.home_team;
}

function getTeamName(context: PickContext): string {
  const { pick, gameInfo, betType } = context;

  if (betType === 'moneyline') {
    return pick.prediction.split(' ')[0]; // First word is usually team name
  }

  if (betType === 'spread' && pick.spread_prediction) {
    return pick.spread_prediction.split(' ')[0];
  }

  // Default to home team
  return gameInfo.home_team;
}

function getOutcome(context: PickContext): string {
  const { betType } = context;

  switch (betType) {
    case 'moneyline':
      return 'win';
    case 'spread':
      return 'cover';
    case 'total':
      return context.results.over_probability > 50 ? 'go over' : 'stay under';
  }
}

function getProbability(context: PickContext): number {
  const { results, betType } = context;

  switch (betType) {
    case 'moneyline':
      return Math.max(results.home_win_probability, results.away_win_probability);
    case 'spread':
      return results.spread_probability;
    case 'total':
      return Math.max(results.over_probability, results.under_probability);
  }
}

function getEdgeForBetType(
  pick: BettingPick,
  betType: 'moneyline' | 'spread' | 'total'
): number | null {
  switch (betType) {
    case 'moneyline':
      return pick.moneyline_edge ?? null;
    case 'spread':
      return pick.spread_edge ?? null;
    case 'total':
      return pick.ou_edge ?? null;
  }
}

function getConfidenceLevel(probability: number): 'highConfidence' | 'mediumConfidence' | 'lowConfidence' {
  if (probability >= 60) return 'highConfidence';
  if (probability >= 52) return 'mediumConfidence';
  return 'lowConfidence';
}

/**
 * Example usage
 */
export async function generateReasoningForPick(pick: BettingPick, betType: 'moneyline' | 'spread' | 'total'): Promise<string> {
  if (!pick.monte_carlo_results || !pick.game_info) {
    return 'Model analysis supports this pick based on matchup factors.';
  }

  // Fetch team stats for both teams
  const { homeStats, awayStats } = await fetchMatchupStats(
    pick.game_info.home_team,
    pick.game_info.away_team
  );

  // Determine which team we're betting on
  const bettingTeam = getBettingTeam(pick, betType);
  const isHomeTeam = bettingTeam === pick.game_info.home_team;

  // Fetch trends for the betting team
  const trends = await fetchTeamTrends(bettingTeam).catch(() => null);

  const context: PickContext = {
    pick,
    gameInfo: pick.game_info,
    results: pick.monte_carlo_results,
    betType,
    teamStats: isHomeTeam ? homeStats : awayStats,
    opponentStats: isHomeTeam ? awayStats : homeStats,
    trends
  };

  return generateSmartReasoning(context);
}