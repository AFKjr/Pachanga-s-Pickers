/**
 * Utility functions for extracting and generating game scores
 */
import { Pick } from '../../types/index';
import { GameScore } from './types';
import { SCORE_CONSTANTS } from '../constants';


export const extractPredictedTeamFromText = (
  predictionText: string,
  homeTeam: string,
  awayTeam: string
): 'home' | 'away' | 'unknown' => {
  const predictionLower = predictionText.toLowerCase();
  const homeTeamLower = homeTeam.toLowerCase();
  const awayTeamLower = awayTeam.toLowerCase();
  
  
  const mentionsHomeFullName = predictionLower.includes(homeTeamLower);
  const mentionsAwayFullName = predictionLower.includes(awayTeamLower);
  
  if (mentionsHomeFullName && !mentionsAwayFullName) return 'home';
  if (mentionsAwayFullName && !mentionsHomeFullName) return 'away';
  
  
  const homeParts = homeTeamLower.split(' ');
  const awayParts = awayTeamLower.split(' ');
  
  
  let homeCity = homeParts[0];
  let awayCity = awayParts[0];
  
  
  if (homeParts.length >= 3 && (homeParts[0] === 'new' || homeParts[0] === 'los')) {
    homeCity = `${homeParts[0]} ${homeParts[1]}`;
  }
  if (awayParts.length >= 3 && (awayParts[0] === 'new' || awayParts[0] === 'los')) {
    awayCity = `${awayParts[0]} ${awayParts[1]}`;
  }
  
  const homeNickname = homeParts[homeParts.length - 1];
  const awayNickname = awayParts[awayParts.length - 1];
  
  
  const mentionsHomeCity = homeCity.length > 3 && predictionLower.includes(homeCity);
  const mentionsAwayCity = awayCity.length > 3 && predictionLower.includes(awayCity);
  
  
  const mentionsHomeNickname = homeNickname.length > 3 && predictionLower.includes(homeNickname);
  const mentionsAwayNickname = awayNickname.length > 3 && predictionLower.includes(awayNickname);
  
  
  const mentionsHome = mentionsHomeCity || mentionsHomeNickname;
  const mentionsAway = mentionsAwayCity || mentionsAwayNickname;
  
  if (mentionsHome && !mentionsAway) return 'home';
  if (mentionsAway && !mentionsHome) return 'away';
  
  return 'unknown';
};


export const extractPredictedTeam = (pick: Pick): 'home' | 'away' | 'unknown' => {
  return extractPredictedTeamFromText(
    pick.prediction,
    pick.game_info.home_team,
    pick.game_info.away_team
  );
};


export const getActualScores = (pick: Pick): GameScore | null => {
  if (pick.game_info.home_score !== undefined && pick.game_info.home_score !== null &&
      pick.game_info.away_score !== undefined && pick.game_info.away_score !== null) {
    return {
      home: pick.game_info.home_score,
      away: pick.game_info.away_score
    };
  }
  return null;
};


export const generateRealisticScore = (pick: Pick): GameScore | null => {
  if (!pick.result || pick.result === 'pending') return null;
  
  
  const baseHome = SCORE_CONSTANTS.BASE_SCORES.HOME_MIN + Math.floor(Math.random() * SCORE_CONSTANTS.BASE_SCORES.HOME_RANGE);
  const baseAway = SCORE_CONSTANTS.BASE_SCORES.AWAY_MIN + Math.floor(Math.random() * SCORE_CONSTANTS.BASE_SCORES.AWAY_RANGE);
  
  
  if (pick.result === 'win') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome + SCORE_CONSTANTS.RESULT_ADJUSTMENT, away: baseAway };
    } else if (predictedTeam === 'away') {
      return { home: baseHome, away: baseAway + SCORE_CONSTANTS.RESULT_ADJUSTMENT };
    }
  } else if (pick.result === 'loss') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome, away: baseAway + SCORE_CONSTANTS.RESULT_ADJUSTMENT };
    } else if (predictedTeam === 'away') {
      return { home: baseHome + SCORE_CONSTANTS.RESULT_ADJUSTMENT, away: baseAway };
    }
  } else if (pick.result === 'push') {
    return { home: baseHome, away: baseHome }; 
  }
  
  return { home: baseHome, away: baseAway };
};
