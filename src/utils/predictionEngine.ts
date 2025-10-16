// src/utils/predictionEngine.ts
// NFL Prediction Engine with Edge Calculation

interface OffensiveStats {
  pointsPerGame: number;
  offensiveYardsPerGame: number;
  turnoversLost: number;
  gamesPlayed: number;
}

interface DefensiveStats {
  pointsAllowedPerGame: number;
  turnoversForced: number;
}

interface TeamStatsForPrediction {
  offensiveStats: OffensiveStats;
  defensiveStats: DefensiveStats;
  gamesPlayed: number;
}

interface GamePrediction {
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  predictedSpread: number;
  predictedTotal: number;
  winner: string;
  winningMargin: number;
  confidence: 'High' | 'Medium' | 'Low';
  timestamp: string;
}

interface EdgeAnalysis {
  spread: {
    bookmakerLine: number;
    modelProjection: number;
    difference: string;
    edge: 'Strong' | 'Moderate' | 'Minimal';
    recommendation: string;
  };
  total: {
    bookmakerLine: number;
    modelProjection: number;
    difference: string;
    edge: 'Strong' | 'Moderate' | 'Minimal';
    recommendation: string;
  };
}

interface BookmakerOdds {
  spread: number;
  total: number;
}


export class NFLPredictionEngine {
  private homeFieldAdvantagePoints: number = 2.5;

  
  calculateScore(
    offenseStats: OffensiveStats,
    opponentDefenseStats: DefensiveStats,
    isHomeTeam: boolean
  ): number {
    const offensivePPG = offenseStats.pointsPerGame;
    const offensiveYPG = offenseStats.offensiveYardsPerGame;
    const opponentDefensivePPG = opponentDefenseStats.pointsAllowedPerGame;
    
    
    let predictedScore = 
      (offensivePPG * 0.6) +                                    
      ((40 - opponentDefensivePPG) * 0.3) +                     
      ((offensiveYPG / 350) * 3);                               
    
    
    if (isHomeTeam) {
      predictedScore += this.homeFieldAdvantagePoints;
    }
    
    
    const turnoverDiff = 
      (opponentDefenseStats.turnoversForced - offenseStats.turnoversLost) / 
      (offenseStats.gamesPlayed || 1);
    predictedScore += turnoverDiff * 2; 
    
    return Math.round(predictedScore);
  }

  
  predictGame(
    awayTeam: string,
    homeTeam: string,
    awayStats: TeamStatsForPrediction,
    homeStats: TeamStatsForPrediction
  ): GamePrediction {
    
    const awayScore = this.calculateScore(
      awayStats.offensiveStats,
      homeStats.defensiveStats,
      false
    );
    
    const homeScore = this.calculateScore(
      homeStats.offensiveStats,
      awayStats.defensiveStats,
      true
    );
    
    
    const predictedSpread = homeScore - awayScore;
    const predictedTotal = homeScore + awayScore;
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const winningMargin = Math.abs(homeScore - awayScore);
    
    
    const confidence = this.calculateConfidence(awayStats, homeStats);
    
    return {
      awayTeam,
      homeTeam,
      awayScore,
      homeScore,
      predictedSpread,
      predictedTotal,
      winner,
      winningMargin,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  
  calculateConfidence(
    awayStats: TeamStatsForPrediction,
    homeStats: TeamStatsForPrediction
  ): 'High' | 'Medium' | 'Low' {
    const offensiveDiff = Math.abs(
      awayStats.offensiveStats.pointsPerGame - 
      homeStats.offensiveStats.pointsPerGame
    );
    
    const defensiveDiff = Math.abs(
      awayStats.defensiveStats.pointsAllowedPerGame - 
      homeStats.defensiveStats.pointsAllowedPerGame
    );
    
    const totalDiff = offensiveDiff + defensiveDiff;
    
    if (totalDiff > 15) return 'High';
    if (totalDiff > 8) return 'Medium';
    return 'Low';
  }

  
  calculateEdge(prediction: GamePrediction, odds: BookmakerOdds): EdgeAnalysis {
    const spreadDifference = Math.abs(prediction.predictedSpread - odds.spread);
    const totalDifference = Math.abs(prediction.predictedTotal - odds.total);
    
    
    const spreadEdge: 'Strong' | 'Moderate' | 'Minimal' = 
      spreadDifference >= 3 ? 'Strong' : 
      spreadDifference >= 1.5 ? 'Moderate' : 'Minimal';
    
    const totalEdge: 'Strong' | 'Moderate' | 'Minimal' = 
      totalDifference >= 5 ? 'Strong' : 
      totalDifference >= 3 ? 'Moderate' : 'Minimal';
    
    
    let spreadRecommendation = 'No strong edge';
    if (prediction.predictedSpread > odds.spread + 2) {
      spreadRecommendation = `Bet ${prediction.homeTeam} to cover`;
    } else if (prediction.predictedSpread < odds.spread - 2) {
      spreadRecommendation = `Bet ${prediction.awayTeam} to cover`;
    }
    
    let totalRecommendation = 'No strong edge';
    if (prediction.predictedTotal > odds.total + 4) {
      totalRecommendation = 'Bet OVER';
    } else if (prediction.predictedTotal < odds.total - 4) {
      totalRecommendation = 'Bet UNDER';
    }
    
    return {
      spread: {
        bookmakerLine: odds.spread,
        modelProjection: prediction.predictedSpread,
        difference: spreadDifference.toFixed(1),
        edge: spreadEdge,
        recommendation: spreadRecommendation
      },
      total: {
        bookmakerLine: odds.total,
        modelProjection: prediction.predictedTotal,
        difference: totalDifference.toFixed(1),
        edge: totalEdge,
        recommendation: totalRecommendation
      }
    };
  }

  
  calculateEdgePercentage(
    modelProbability: number,
    impliedProbability: number
  ): number {
    return ((modelProbability - impliedProbability) / impliedProbability) * 100;
  }

  
  oddsToImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  
  calculateKellyCriterion(
    probability: number,
    odds: number,
    fractionOfKelly: number = 0.25
  ): number {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const kelly = ((probability * decimalOdds) - 1) / (decimalOdds - 1);
    return Math.max(0, kelly * fractionOfKelly);
  }
}


export class EdgeCalculator {
  
  static analyzeEdge(
    modelProbability: number,
    bookmakerOdds: number
  ): {
    impliedProbability: number;
    edge: number;
    edgePercentage: number;
    recommendation: 'Strong Bet' | 'Moderate Bet' | 'Avoid';
    kellyStake: number;
  } {
    const impliedProbability = this.oddsToImpliedProbability(bookmakerOdds);
    const edge = modelProbability - impliedProbability;
    const edgePercentage = (edge / impliedProbability) * 100;
    
    let recommendation: 'Strong Bet' | 'Moderate Bet' | 'Avoid' = 'Avoid';
    if (edgePercentage > 10) recommendation = 'Strong Bet';
    else if (edgePercentage > 5) recommendation = 'Moderate Bet';
    
    const kellyStake = this.calculateKelly(modelProbability, bookmakerOdds);
    
    return {
      impliedProbability,
      edge,
      edgePercentage,
      recommendation,
      kellyStake
    };
  }

  
  static oddsToImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  
  static calculateKelly(probability: number, odds: number, fraction: number = 0.25): number {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const kelly = ((probability * decimalOdds) - 1) / (decimalOdds - 1);
    return Math.max(0, kelly * fraction);
  }

  
  static calculateEV(
    probability: number,
    payout: number,
    stake: number = 1
  ): number {
    return (probability * payout) - ((1 - probability) * stake);
  }

  
  static calculateROI(
    probability: number,
    odds: number
  ): number {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const expectedReturn = probability * decimalOdds;
    return ((expectedReturn - 1) / 1) * 100;
  }
}


export class PerformanceTracker {
  
  static calculateWinRate(wins: number, total: number): number {
    return total > 0 ? (wins / total) * 100 : 0;
  }

  
  static calculateROI(profit: number, totalStaked: number): number {
    return totalStaked > 0 ? (profit / totalStaked) * 100 : 0;
  }

  
  static calculateUnits(wins: number, losses: number, pushes: number = 0): number {
    
    const wonUnits = wins; 
    const lostUnits = losses * 1.1; 
    return wonUnits - lostUnits + (pushes * 0); 
  }

  
  static breakEvenPercentage(): number {
    return 52.38; 
  }

  
  static calculateSharpeRatio(
    returns: number[],
    riskFreeRate: number = 0
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }
}
