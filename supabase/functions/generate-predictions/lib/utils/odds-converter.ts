/**
 * Utility functions for converting between different odds formats
 * Used as fallback when certain odds types are missing from API responses
 */

interface MoneylineEstimate {
  favoriteMoneyline: number;
  underdogMoneyline: number;
}

const MINIMUM_FAVORITE_ODDS = -1000;
const MAXIMUM_FAVORITE_ODDS = -105;
const MINIMUM_UNDERDOG_ODDS = 105;
const MAXIMUM_UNDERDOG_ODDS = 1000;

/**
 * Converts a point spread to estimated moneyline odds
 * Uses industry-standard conversion formulas
 * 
 * @param spread - The point spread (positive means underdog, negative means favorite)
 * @returns Estimated moneyline odds for both favorite and underdog
 */
export function convertSpreadToMoneyline(spread: number): MoneylineEstimate {
  const absoluteSpread = Math.abs(spread);
  
  // Handle pick'em scenarios (no spread or very small spread)
  if (absoluteSpread < 0.5) {
    return {
      favoriteMoneyline: -110,
      underdogMoneyline: -110
    };
  }
  
  // Standard conversion formula based on historical spread-to-ML relationships
  // These formulas are derived from historical betting market data
  let favoriteMoneyline: number;
  
  if (absoluteSpread <= 3) {
    // Small spreads: roughly -110 to -150 range per point
    favoriteMoneyline = -100 - (absoluteSpread * 40);
  } else if (absoluteSpread <= 7) {
    // Medium spreads: -150 to -300 range
    favoriteMoneyline = -150 - ((absoluteSpread - 3) * 37.5);
  } else if (absoluteSpread <= 10) {
    // Large spreads: -300 to -450 range
    favoriteMoneyline = -300 - ((absoluteSpread - 7) * 50);
  } else {
    // Very large spreads: exponential growth
    favoriteMoneyline = -450 - ((absoluteSpread - 10) * 55);
  }
  
  // Apply bounds to keep odds realistic
  favoriteMoneyline = Math.max(
    MINIMUM_FAVORITE_ODDS,
    Math.min(MAXIMUM_FAVORITE_ODDS, favoriteMoneyline)
  );
  
  // Calculate underdog moneyline from favorite odds
  // Uses the relationship: favorite probability + underdog probability ≈ 100% (minus vig)
  const underdogMoneyline = calculateUnderdogFromFavorite(favoriteMoneyline);
  
  return {
    favoriteMoneyline: Math.round(favoriteMoneyline),
    underdogMoneyline: Math.round(underdogMoneyline)
  };
}

/**
 * Calculates underdog moneyline odds from favorite moneyline odds
 * Maintains proper probability relationship accounting for sportsbook vig
 * 
 * @param favoriteMoneyline - The favorite's moneyline odds (negative number)
 * @returns Corresponding underdog moneyline odds (positive number)
 */
function calculateUnderdogFromFavorite(favoriteMoneyline: number): number {
  const TYPICAL_VIG_PERCENTAGE = 4.5;
  
  // Convert favorite odds to implied probability
  const favoriteImpliedProbability = 
    Math.abs(favoriteMoneyline) / (Math.abs(favoriteMoneyline) + 100);
  
  // Calculate underdog probability (accounting for vig)
  const underdogImpliedProbability = 
    (1 - favoriteImpliedProbability) * (1 - TYPICAL_VIG_PERCENTAGE / 100);
  
  // Convert probability back to American odds
  const underdogMoneyline = 
    (100 / underdogImpliedProbability) - 100;
  
  // Apply bounds
  return Math.max(
    MINIMUM_UNDERDOG_ODDS,
    Math.min(MAXIMUM_UNDERDOG_ODDS, underdogMoneyline)
  );
}

/**
 * Estimates missing moneyline odds from available spread data
 * 
 * @param homeSpread - Home team's point spread (negative if favorite)
 * @param awaySpread - Away team's point spread (should be opposite of homeSpread)
 * @returns Object containing estimated home and away moneyline odds
 */
export function estimateMoneylineFromSpread(
  homeSpread: number | undefined,
  awaySpread: number | undefined
): { homeMoneyline: number; awayMoneyline: number } {
  // If no spread data available, return neutral pick'em odds
  if (homeSpread === undefined && awaySpread === undefined) {
    return {
      homeMoneyline: -110,
      awayMoneyline: -110
    };
  }
  
  // Use whichever spread is available
  const effectiveSpread = homeSpread ?? (awaySpread ? -awaySpread : 0);
  const estimate = convertSpreadToMoneyline(effectiveSpread);
  
  // If home team is favorite (negative spread), home gets favorite odds
  if (effectiveSpread < 0) {
    return {
      homeMoneyline: estimate.favoriteMoneyline,
      awayMoneyline: estimate.underdogMoneyline
    };
  } else if (effectiveSpread > 0) {
    // Home team is underdog (positive spread)
    return {
      homeMoneyline: estimate.underdogMoneyline,
      awayMoneyline: estimate.favoriteMoneyline
    };
  } else {
    // Pick'em scenario
    return {
      homeMoneyline: estimate.favoriteMoneyline,
      awayMoneyline: estimate.underdogMoneyline
    };
  }
}

/**
 * Validates and provides fallback for moneyline odds
 * Uses spread-based estimation when moneyline is missing
 * 
 * @param homeMoneyline - Home team moneyline odds (if available)
 * @param awayMoneyline - Away team moneyline odds (if available)
 * @param homeSpread - Home team spread (for fallback calculation)
 * @param awaySpread - Away team spread (for fallback calculation)
 * @returns Validated moneyline odds with fallback values if needed
 */
export function validateMoneylineWithFallback(
  homeMoneyline: number | undefined,
  awayMoneyline: number | undefined,
  homeSpread: number | undefined,
  awaySpread: number | undefined
): { homeMoneyline: number; awayMoneyline: number; usedFallback: boolean } {
  // If both moneylines are present, use them
  if (homeMoneyline !== undefined && awayMoneyline !== undefined) {
    return {
      homeMoneyline,
      awayMoneyline,
      usedFallback: false
    };
  }
  
  // If only one moneyline is missing, calculate it from the other
  if (homeMoneyline !== undefined && awayMoneyline === undefined) {
    const calculatedAwayMoneyline = calculateUnderdogFromFavorite(homeMoneyline);
    return {
      homeMoneyline,
      awayMoneyline: calculatedAwayMoneyline,
      usedFallback: true
    };
  }
  
  if (awayMoneyline !== undefined && homeMoneyline === undefined) {
    const calculatedHomeMoneyline = calculateUnderdogFromFavorite(awayMoneyline);
    return {
      homeMoneyline: calculatedHomeMoneyline,
      awayMoneyline,
      usedFallback: true
    };
  }
  
  // Both moneylines missing - estimate from spread
  const estimated = estimateMoneylineFromSpread(homeSpread, awaySpread);
  return {
    homeMoneyline: estimated.homeMoneyline,
    awayMoneyline: estimated.awayMoneyline,
    usedFallback: true
  };
}
