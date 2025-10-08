/**
 * Against The Spread (ATS) calculations
 */
import { Pick } from '../../types/index';
import { GameScore, ATSResult } from './types';
import { extractPredictedTeam } from './scoreUtils';
import { BETTING_CONSTANTS } from '../constants';

/**
 * Calculate Against The Spread result
 * Determines if the predicted team covered the spread
 */
export const calculateATSResult = (
  pick: Pick, 
  actualScore: GameScore
): ATSResult => {
  if (!pick.game_info.spread) {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }

  const predictedTeam = extractPredictedTeam(pick);
  if (predictedTeam === 'unknown') {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }

  const spread = pick.game_info.spread;
  const scoreDiff = actualScore.home - actualScore.away;
  
  // Apply spread (positive spread favors away team)
  const adjustedHomeDiff = scoreDiff + spread;
  
  let result: 'win' | 'loss' | 'push';
  
  // Check for push first (within 0.5 points)
  if (Math.abs(adjustedHomeDiff) < BETTING_CONSTANTS.PUSH_THRESHOLD) {
    result = 'push';
  } else {
    // Determine if pick covered the spread
    const homeCovered = adjustedHomeDiff > 0;
    const awayCovered = adjustedHomeDiff < 0;
    
    if ((predictedTeam === 'home' && homeCovered) || 
        (predictedTeam === 'away' && awayCovered)) {
      result = 'win';
    } else {
      result = 'loss';
    }
  }

  return {
    type: 'ats',
    result,
    details: {
      predictedTeam: predictedTeam === 'home' ? pick.game_info.home_team : pick.game_info.away_team,
      actualSpread: spread,
      coverMargin: Math.abs(adjustedHomeDiff)
    }
  };
};
