// src/utils/edgeCalculator.ts
import { Pick, MonteCarloResults, GameInfo } from '../types';


export function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    return (100 / Math.abs(americanOdds)) + 1;
  }
  return (americanOdds / 100) + 1;
}


export function oddsToImpliedProbability(americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return (1 / decimal) * 100;
}


export function calculateEdge(
  modelProbability: number,  
  americanOdds: number        
): number {
  
  if (modelProbability === 0 || modelProbability === 100) {
    console.log('Edge case probability detected:', {
      probability: modelProbability,
      odds: americanOdds,
      stackTrace: new Error().stack
    });
  }

  
  if (modelProbability < 0 || modelProbability > 100) {
    console.warn(`Invalid model probability: ${modelProbability}. Must be between 0-100.`);
    return 0;
  }
  
  if (!americanOdds || americanOdds === 0) {
    console.warn('Missing or invalid odds. Cannot calculate edge.');
    return 0;
  }
  
  
  const probabilityDecimal = modelProbability / 100;
  
  
  const decimalOdds = americanToDecimal(americanOdds);
  
  
  
  
  
  
  
  const expectedValuePerDollar = (probabilityDecimal * decimalOdds) - 1;
  
  
  return expectedValuePerDollar * 100;
}


export function extractSpreadValue(spreadPrediction: string): number {
  
  const match = spreadPrediction.match(/([+-]?\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}


export function isPickingFavorite(spreadPrediction: string, favoriteTeam: string): boolean {
  if (!favoriteTeam) {
    
    const spreadValue = extractSpreadValue(spreadPrediction);
    return spreadValue < 0;
  }
  
  
  const predictionLower = spreadPrediction.toLowerCase();
  const favoriteWords = favoriteTeam.toLowerCase().split(' ');
  
  
  return favoriteWords.some(word => {
    
    if (word.length <= 2) return false;
    return predictionLower.includes(word);
  });
}

export function calculatePickEdges(
  pick: Pick,
  monteCarloResults: MonteCarloResults,
  gameInfo: GameInfo
): {
  moneyline_edge: number;
  spread_edge: number;
  ou_edge: number;
} {
  
  let moneylineEdge = 0;
  if (monteCarloResults.moneyline_probability) {
    const predictedHome = pick.prediction.toLowerCase().includes(gameInfo.home_team.toLowerCase());
    const predictedAway = pick.prediction.toLowerCase().includes(gameInfo.away_team.toLowerCase());

    
    if (predictedHome && (gameInfo.home_ml_odds || gameInfo.home_ml_odds === 0)) {
      moneylineEdge = calculateEdge(monteCarloResults.home_win_probability, gameInfo.home_ml_odds);
    } else if (predictedAway && (gameInfo.away_ml_odds || gameInfo.away_ml_odds === 0)) {
      moneylineEdge = calculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds);
    } else if (monteCarloResults.moneyline_probability) {
      
      moneylineEdge = 0;
    }
  }

  
  let spreadEdge = 0;
  if (pick.spread_prediction && (gameInfo.spread_odds || gameInfo.spread_odds === 0)) {
    
    const pickedFavorite = isPickingFavorite(
      pick.spread_prediction,
      gameInfo.favorite_team || ''
    );
    
    let probability: number;
    if (pickedFavorite) {
      probability = monteCarloResults.favorite_cover_probability || 
                    monteCarloResults.spread_cover_probability ||
                    monteCarloResults.spread_probability;
    } else {
      probability = monteCarloResults.underdog_cover_probability ||
                    (100 - (monteCarloResults.favorite_cover_probability || 
                            monteCarloResults.spread_cover_probability ||
                            monteCarloResults.spread_probability));
    }
    
    spreadEdge = calculateEdge(probability, gameInfo.spread_odds);
  }

  let ouEdge = 0;
  if (monteCarloResults.total_probability && pick.ou_prediction) {
    const pickedOver = pick.ou_prediction.toLowerCase().includes('over');

    
    let ouOdds: number | null = null;
    if (pickedOver && (gameInfo.over_odds || gameInfo.over_odds === 0)) {
      ouOdds = gameInfo.over_odds;
    } else if (!pickedOver && (gameInfo.under_odds || gameInfo.under_odds === 0)) {
      ouOdds = gameInfo.under_odds;
    }

    if (ouOdds !== null) {
      const prob = pickedOver ? monteCarloResults.over_probability : monteCarloResults.under_probability;
      ouEdge = calculateEdge(prob, ouOdds);
    }
    
  }
  
  return {
    moneyline_edge: Number(moneylineEdge.toFixed(2)),
    spread_edge: Number(spreadEdge.toFixed(2)),
    ou_edge: Number(ouEdge.toFixed(2))
  };
}


export function calculateBothSidesEdge(
  monteCarloResults: MonteCarloResults,
  gameInfo: GameInfo
): {
  moneyline: { home: number; away: number };
  spread: { favorite: number; underdog: number };
  total: { over: number; under: number };
} {
  
  const safeCalculateEdge = (probability: number, odds: number | null | undefined): number => {
    if (!odds && odds !== 0) return 0;
    if (probability <= 0.1 || probability >= 99.9) {
      
      return probability > 50 ? 100 : -100;  
    }
    return calculateEdge(probability, odds);
  };

  return {
    moneyline: {
      home: safeCalculateEdge(monteCarloResults.home_win_probability, gameInfo.home_ml_odds),
      away: safeCalculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds)
    },
    spread: {
      favorite: safeCalculateEdge(monteCarloResults.spread_cover_probability, gameInfo.spread_odds),
      underdog: safeCalculateEdge(100 - monteCarloResults.spread_cover_probability, gameInfo.spread_odds)
    },
    total: {
      over: safeCalculateEdge(monteCarloResults.over_probability, gameInfo.over_odds),
      under: safeCalculateEdge(monteCarloResults.under_probability, gameInfo.under_odds)
    }
  };
}


export function getConfidenceBarColor(
  confidence: number,
  edge: number
): 'lime' | 'yellow' | 'red' {
  
  
  if (edge < 0) return 'red';
  
  
  if (edge >= 5 && confidence >= 65) return 'lime';
  
  
  if (edge >= 3 && confidence >= 60) return 'lime';
  
  
  if (edge >= 1 || confidence >= 70) return 'yellow';
  
  
  return 'yellow';
}


export function getEdgeColorClass(edge: number): string {
  const color = getConfidenceBarColor(70, edge); 
  
  switch (color) {
    case 'lime':
      return 'bg-lime-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}


export function getEdgeTextColor(edge: number): string {
  if (edge >= 5) return 'text-lime-400';
  if (edge >= 3) return 'text-yellow-400';
  if (edge >= 0) return 'text-gray-400';
  return 'text-red-400';
}


export function formatEdge(edge?: number): string {
  if (edge === undefined || edge === null) return '+0.0%';
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${edge.toFixed(1)}%`;
}
