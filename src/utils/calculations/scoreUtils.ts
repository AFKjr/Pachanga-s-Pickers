/**
 * Utility functions for extracting and generating game scores
 */
import { Pick } from '../../types/index';
import { GameScore } from './types';

/**
 * Determines which team was predicted to win based on prediction text
 */
export const extractPredictedTeam = (pick: Pick): 'home' | 'away' | 'unknown' => {
  const predictionLower = pick.prediction.toLowerCase();
  const homeTeamLower = pick.game_info.home_team.toLowerCase();
  const awayTeamLower = pick.game_info.away_team.toLowerCase();
  
  // First check for FULL team name match (most reliable)
  const mentionsHomeFullName = predictionLower.includes(homeTeamLower);
  const mentionsAwayFullName = predictionLower.includes(awayTeamLower);
  
  if (mentionsHomeFullName && !mentionsAwayFullName) return 'home';
  if (mentionsAwayFullName && !mentionsHomeFullName) return 'away';
  
  // If full name doesn't work, try city + nickname combinations
  const homeParts = homeTeamLower.split(' ');
  const awayParts = awayTeamLower.split(' ');
  
  // For multi-word cities like "New Orleans" or "New York", check full city name
  let homeCity = homeParts[0];
  let awayCity = awayParts[0];
  
  // Handle two-word cities
  if (homeParts.length >= 3 && (homeParts[0] === 'new' || homeParts[0] === 'los')) {
    homeCity = `${homeParts[0]} ${homeParts[1]}`;
  }
  if (awayParts.length >= 3 && (awayParts[0] === 'new' || awayParts[0] === 'los')) {
    awayCity = `${awayParts[0]} ${awayParts[1]}`;
  }
  
  const homeNickname = homeParts[homeParts.length - 1];
  const awayNickname = awayParts[awayParts.length - 1];
  
  // Check city mentions (must be more specific than just "new" or "los")
  const mentionsHomeCity = homeCity.length > 3 && predictionLower.includes(homeCity);
  const mentionsAwayCity = awayCity.length > 3 && predictionLower.includes(awayCity);
  
  // Check nickname mentions
  const mentionsHomeNickname = homeNickname.length > 3 && predictionLower.includes(homeNickname);
  const mentionsAwayNickname = awayNickname.length > 3 && predictionLower.includes(awayNickname);
  
  // If only one team is mentioned by city or nickname
  const mentionsHome = mentionsHomeCity || mentionsHomeNickname;
  const mentionsAway = mentionsAwayCity || mentionsAwayNickname;
  
  if (mentionsHome && !mentionsAway) return 'home';
  if (mentionsAway && !mentionsHome) return 'away';
  
  return 'unknown';
};

/**
 * Extract actual scores from the database
 * Returns null if scores haven't been entered yet
 */
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

/**
 * @deprecated Use getActualScores instead - this generates fake scores for testing only
 * Generate realistic scores for demonstration purposes
 * In production, this would be replaced with actual API data
 */
export const generateRealisticScore = (pick: Pick): GameScore | null => {
  if (!pick.result || pick.result === 'pending') return null;
  
  // Generate realistic NFL scores (14-35 range typically)
  const baseHome = 17 + Math.floor(Math.random() * 14);
  const baseAway = 14 + Math.floor(Math.random() * 17);
  
  // Adjust based on actual moneyline result
  if (pick.result === 'win') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome + 7, away: baseAway };
    } else if (predictedTeam === 'away') {
      return { home: baseHome, away: baseAway + 7 };
    }
  } else if (pick.result === 'loss') {
    const predictedTeam = extractPredictedTeam(pick);
    if (predictedTeam === 'home') {
      return { home: baseHome, away: baseAway + 7 };
    } else if (predictedTeam === 'away') {
      return { home: baseHome + 7, away: baseAway };
    }
  } else if (pick.result === 'push') {
    return { home: baseHome, away: baseHome }; // Tie game
  }
  
  return { home: baseHome, away: baseAway };
};
