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


export function convertSpreadToMoneyline(spread: number): MoneylineEstimate {
  const absoluteSpread = Math.abs(spread);
  
  
  if (absoluteSpread < 0.5) {
    return {
      favoriteMoneyline: -110,
      underdogMoneyline: -110
    };
  }
  
  
  
  let favoriteMoneyline: number;
  
  if (absoluteSpread <= 3) {
    
    favoriteMoneyline = -100 - (absoluteSpread * 40);
  } else if (absoluteSpread <= 7) {
    
    favoriteMoneyline = -150 - ((absoluteSpread - 3) * 37.5);
  } else if (absoluteSpread <= 10) {
    
    favoriteMoneyline = -300 - ((absoluteSpread - 7) * 50);
  } else {
    
    favoriteMoneyline = -450 - ((absoluteSpread - 10) * 55);
  }
  
  
  favoriteMoneyline = Math.max(
    MINIMUM_FAVORITE_ODDS,
    Math.min(MAXIMUM_FAVORITE_ODDS, favoriteMoneyline)
  );
  
  
  
  const underdogMoneyline = calculateUnderdogFromFavorite(favoriteMoneyline);
  
  return {
    favoriteMoneyline: Math.round(favoriteMoneyline),
    underdogMoneyline: Math.round(underdogMoneyline)
  };
}


function calculateUnderdogFromFavorite(favoriteMoneyline: number): number {
  const TYPICAL_VIG_PERCENTAGE = 4.5;
  
  
  const favoriteImpliedProbability = 
    Math.abs(favoriteMoneyline) / (Math.abs(favoriteMoneyline) + 100);
  
  
  const underdogImpliedProbability = 
    (1 - favoriteImpliedProbability) * (1 - TYPICAL_VIG_PERCENTAGE / 100);
  
  
  const underdogMoneyline = 
    (100 / underdogImpliedProbability) - 100;
  
  
  return Math.max(
    MINIMUM_UNDERDOG_ODDS,
    Math.min(MAXIMUM_UNDERDOG_ODDS, underdogMoneyline)
  );
}


export function estimateMoneylineFromSpread(
  homeSpread: number | undefined,
  awaySpread: number | undefined
): { homeMoneyline: number; awayMoneyline: number } {
  
  if (homeSpread === undefined && awaySpread === undefined) {
    return {
      homeMoneyline: -110,
      awayMoneyline: -110
    };
  }
  
  
  const effectiveSpread = homeSpread ?? (awaySpread ? -awaySpread : 0);
  const estimate = convertSpreadToMoneyline(effectiveSpread);
  
  
  if (effectiveSpread < 0) {
    return {
      homeMoneyline: estimate.favoriteMoneyline,
      awayMoneyline: estimate.underdogMoneyline
    };
  } else if (effectiveSpread > 0) {
    
    return {
      homeMoneyline: estimate.underdogMoneyline,
      awayMoneyline: estimate.favoriteMoneyline
    };
  } else {
    
    return {
      homeMoneyline: estimate.favoriteMoneyline,
      awayMoneyline: estimate.underdogMoneyline
    };
  }
}


export function validateMoneylineWithFallback(
  homeMoneyline: number | undefined,
  awayMoneyline: number | undefined,
  homeSpread: number | undefined,
  awaySpread: number | undefined
): { homeMoneyline: number; awayMoneyline: number; usedFallback: boolean } {
  
  if (homeMoneyline !== undefined && awayMoneyline !== undefined) {
    return {
      homeMoneyline,
      awayMoneyline,
      usedFallback: false
    };
  }
  
  
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
  
  
  const estimated = estimateMoneylineFromSpread(homeSpread, awaySpread);
  return {
    homeMoneyline: estimated.homeMoneyline,
    awayMoneyline: estimated.awayMoneyline,
    usedFallback: true
  };
}
