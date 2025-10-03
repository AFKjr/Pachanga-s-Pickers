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
  
  // Extract team city/name for matching
  const homeCity = homeTeamLower.split(' ')[0];
  const awayCity = awayTeamLower.split(' ')[0];
  const homeLastWord = homeTeamLower.split(' ').pop() || '';
  const awayLastWord = awayTeamLower.split(' ').pop() || '';
  
  // Check for specific team mentions
  const mentionsHome = 
    predictionLower.includes(homeTeamLower) ||
    predictionLower.includes(homeCity) ||
    predictionLower.includes(homeLastWord);
    
  const mentionsAway = 
    predictionLower.includes(awayTeamLower) ||
    predictionLower.includes(awayCity) ||
    predictionLower.includes(awayLastWord);
  
  // If prediction clearly mentions one team and not the other
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
