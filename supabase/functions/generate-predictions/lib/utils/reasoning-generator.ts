// supabase/functions/generate-predictions/lib/utils/reasoning-generator.ts
import type { SimulationResult } from '../types.ts';

export function generateReasoning(
  homeTeam: string,
  awayTeam: string,
  simResult: SimulationResult,
  _moneylinePick: string,
  spreadPick: string,
  totalPick: string,
  weatherExplanation?: string
): string {
  const factors: string[] = [];

  factors.push(
    `Monte Carlo simulation projects ` +
    `${homeTeam} ${simResult.predictedHomeScore} - ${awayTeam} ${simResult.predictedAwayScore}`
  );
  
  const winningTeam = simResult.homeWinProbability > simResult.awayWinProbability ? homeTeam : awayTeam;
  const winProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
  factors.push(`${winningTeam} wins ${winProb.toFixed(1)}% of simulations`);

  const spreadCoverProb = simResult.spreadCoverProbability > 50 
    ? simResult.spreadCoverProbability 
    : 100 - simResult.spreadCoverProbability;
  factors.push(`${spreadPick} covers ${spreadCoverProb.toFixed(1)}% of simulations`);
  
  const totalPoints = simResult.predictedHomeScore + simResult.predictedAwayScore;
  const totalProb = simResult.overProbability > 50 ? simResult.overProbability : simResult.underProbability;
  factors.push(`Projected total of ${totalPoints} points, ${totalPick} hits ${totalProb.toFixed(1)}% of simulations`);

  if (weatherExplanation && !weatherExplanation.includes('No weather') && !weatherExplanation.includes('Dome')) {
    factors.push(`Weather impact: ${weatherExplanation}`);
  }

  return factors.join('; ');
}
