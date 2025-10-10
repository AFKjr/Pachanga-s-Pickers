/**
 * Against The Spread (ATS) calculations
 */
import { Pick } from '../../types/index';
import { GameScore, ATSResult } from './types';
import { extractPredictedTeamFromText } from './scoreUtils';
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

  // Use spread_prediction instead of prediction for ATS
  if (!pick.spread_prediction) {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }

  // Extract predicted team from spread_prediction, not prediction
  const predictedTeam = extractPredictedTeamFromText(
    pick.spread_prediction,
    pick.game_info.home_team,
    pick.game_info.away_team
  );
  
  if (predictedTeam === 'unknown') {
    return {
      type: 'ats',
      result: 'pending',
      details: { predictedTeam: 'unknown' }
    };
  }
  
  const spread = pick.game_info.spread;
  const homeScore = actualScore.home;
  const awayScore = actualScore.away;
 
  const adjustedHomeScore = homeScore + spread;
  const scoreDifference = adjustedHomeScore - awayScore;
  
  let result: 'win' | 'loss' | 'push';
  let coverMargin: number;
 
  if (Math.abs(scoreDifference) < BETTING_CONSTANTS.PUSH_THRESHOLD) {
    result = 'push';
    coverMargin = 0;
  } else {
    const homeCovered = scoreDifference > 0;
    const awayCovered = scoreDifference < 0;
   
    if ((predictedTeam === 'home' && homeCovered) ||
        (predictedTeam === 'away' && awayCovered)) {
      result = 'win';
    } else {
      result = 'loss';
    }
   
    coverMargin = Math.abs(scoreDifference);
  }
  
  return {
    type: 'ats',
    result,
    details: {
      predictedTeam: predictedTeam === 'home' ? pick.game_info.home_team : pick.game_info.away_team,
      actualSpread: spread,
      coverMargin: coverMargin
    }
  };
};


