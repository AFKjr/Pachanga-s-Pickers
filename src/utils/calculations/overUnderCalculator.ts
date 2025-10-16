/**
 * Over/Under (O/U) totals calculations
 */
import { Pick } from '../../types/index';
import { GameScore, ATSResult } from './types';
import { BETTING_CONSTANTS } from '../constants';


export const calculateOverUnderResult = (
  pick: Pick, 
  actualScore: GameScore
): ATSResult => {
  if (!pick.game_info.over_under) {
    return {
      type: 'over_under',
      result: 'pending'
    };
  }

  let ouType: 'over' | 'under' | 'unknown' = 'unknown';
  
  
  if (pick.ou_prediction) {
    const ouPredictionLower = pick.ou_prediction.toLowerCase();
    if (ouPredictionLower.includes('over')) {
      ouType = 'over';
    } else if (ouPredictionLower.includes('under')) {
      ouType = 'under';
    }
  }
  
  
  if (ouType === 'unknown') {
    const predictionLower = pick.prediction.toLowerCase();
    if (predictionLower.includes('over') || 
        predictionLower.includes('high scoring') ||
        predictionLower.includes('shootout') ||
        predictionLower.includes('points')) {
      ouType = 'over';
    } else if (predictionLower.includes('under') || 
               predictionLower.includes('low scoring') ||
               predictionLower.includes('defensive') ||
               predictionLower.includes('ugly')) {
      ouType = 'under';
    }
  }

  if (ouType === 'unknown') {
    return {
      type: 'over_under',
      result: 'pending'
    };
  }

  const totalPoints = actualScore.home + actualScore.away;
  const line = pick.game_info.over_under;
  
  let result: 'win' | 'loss' | 'push';
  
  
  if (Math.abs(totalPoints - line) < BETTING_CONSTANTS.PUSH_THRESHOLD) {
    result = 'push';
  } else if ((totalPoints > line && ouType === 'over') || 
             (totalPoints < line && ouType === 'under')) {
    result = 'win';
  } else {
    result = 'loss';
  }

  return {
    type: 'over_under',
    result,
    details: {
      totalPoints,
      ou_line: line,
      ou_type: ouType
    }
  };
};
