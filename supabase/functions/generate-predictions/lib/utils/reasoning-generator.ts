// supabase/functions/generate-predictions/lib/utils/reasoning-generator.ts

// Simplified reasoning generator for edge functions
// Does not depend on external React app files

interface SimplifiedPick {
  prediction: string;
  spread_prediction?: string;
  ou_prediction?: string;
  confidence: number;
  monte_carlo_results?: {
    moneyline_probability?: number;
    spread_probability?: number;
    total_probability?: number;
    predicted_home_score?: number;
    predicted_away_score?: number;
    over_probability?: number;
    under_probability?: number;
  };
  game_info: {
    home_team: string;
    away_team: string;
    spread?: number;
    over_under?: number;
  };
  weather?: {
    temperature?: number;
    wind_speed?: number;
    impact_rating?: string;
  };
  moneyline_edge?: number;
  spread_edge?: number;
  ou_edge?: number;
}

export function generateReasoningForPick(
  pick: SimplifiedPick,
  betType: 'moneyline' | 'spread' | 'total'
): string {
  const reasons: string[] = [];

  // Get probability based on bet type
  let probability = 50;
  if (pick.monte_carlo_results) {
    switch (betType) {
      case 'moneyline':
        probability = pick.monte_carlo_results.moneyline_probability || 50;
        break;
      case 'spread':
        probability = pick.monte_carlo_results.spread_probability || 50;
        break;
      case 'total':
        probability = Math.max(
          pick.monte_carlo_results.over_probability || 0,
          pick.monte_carlo_results.under_probability || 0
        );
        break;
    }
  }

  // Main prediction with confidence
  const confidence = getConfidenceLabel(probability);
  reasons.push(`${confidence} confidence pick at ${probability.toFixed(1)}% probability.`);

  // Edge value (if significant)
  const edge = getEdgeForBetType(pick, betType);
  if (edge && edge > 2) {
    reasons.push(`Found ${edge.toFixed(1)}% value over market odds.`);
  }

  // Score prediction
  if (pick.monte_carlo_results?.predicted_home_score && pick.monte_carlo_results?.predicted_away_score) {
    const homeScore = Math.round(pick.monte_carlo_results.predicted_home_score);
    const awayScore = Math.round(pick.monte_carlo_results.predicted_away_score);
    const total = homeScore + awayScore;
    const margin = Math.abs(homeScore - awayScore);

    if (margin > 10) {
      reasons.push(`Projected ${margin}-point margin of victory.`);
    } else if (margin <= 3) {
      reasons.push(`Expect a close game decided by ${margin} point${margin !== 1 ? 's' : ''}.`);
    }

    if (total > 50) {
      reasons.push(`High-scoring affair with ${total} combined points projected.`);
    } else if (total < 40) {
      reasons.push(`Defensive battle with only ${total} points expected.`);
    }
  }

  // Weather impact
  if (pick.weather) {
    if (pick.weather.wind_speed && pick.weather.wind_speed > 15) {
      reasons.push(`${pick.weather.wind_speed} MPH winds will affect passing game.`);
    }
    if (pick.weather.temperature && pick.weather.temperature < 35) {
      reasons.push(`Cold ${pick.weather.temperature}°F conditions favor running game.`);
    }
    if (pick.weather.impact_rating === 'high' || pick.weather.impact_rating === 'extreme') {
      reasons.push(`Weather will be a significant factor.`);
    }
  }

  // Spread analysis
  if (betType === 'spread' && pick.game_info.spread) {
    const spread = Math.abs(pick.game_info.spread);
    if (spread >= 10) {
      reasons.push(`Large ${spread}-point spread but favorite should cover.`);
    } else if (spread <= 3) {
      reasons.push(`Tight ${spread}-point line reflects evenly matched teams.`);
    }
  }

  // Total analysis
  if (betType === 'total' && pick.game_info.over_under) {
    const total = pick.game_info.over_under;
    if (total > 50) {
      reasons.push(`High ${total}-point total suggests offensive showcase.`);
    } else if (total < 40) {
      reasons.push(`Low ${total}-point total indicates defensive struggle.`);
    }
  }

  // Combine reasons (max 2-3 for readability)
  return reasons.slice(0, 3).join(' ');
}

function getConfidenceLabel(probability: number): string {
  if (probability >= 60) return 'High';
  if (probability >= 52) return 'Medium';
  return 'Low';
}

function getEdgeForBetType(
  pick: SimplifiedPick,
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