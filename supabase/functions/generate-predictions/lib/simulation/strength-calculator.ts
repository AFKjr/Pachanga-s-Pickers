// api/lib/simulation/strength-calculator.ts
import type { TeamStats } from '../types.ts';

export function calculateOffensiveStrength(stats: TeamStats): number {
  const passingEfficiency = (
    stats.passingYards / 100 * 3 +
    stats.yardsPerPassAttempt * 5 +
    stats.passCompletionPct / 10 +
    stats.passingTds * 8 -
    stats.interceptionsThrown * 10
  ) * 0.4;
  
  const rushingEfficiency = (
    stats.rushingYards / 50 * 2 +
    stats.yardsPerRush * 8 +
    stats.rushingTds * 10
  ) * 0.3;
  
  const overallEfficiency = (
    stats.yardsPerPlay * 15 +
    stats.firstDowns * 3 +
    stats.thirdDownConversionRate * 1.5 +
    stats.redZoneEfficiency * 2
  ) * 0.2;
  
  const turnoverImpact = (
    -stats.turnoversLost * 15 -
    stats.fumblesLost * 12 +
    stats.turnoverDifferential * 8
  ) * 0.1;
  
  const penaltyImpact = -(stats.penaltyYards / 10);
  
  return Math.max(0, 
    passingEfficiency + 
    rushingEfficiency + 
    overallEfficiency + 
    turnoverImpact + 
    penaltyImpact +
    stats.pointsPerGame * 2
  );
}

export function calculateDefensiveStrength(stats: TeamStats): number {
  const passDefense = (
    (280 - stats.defPassingYardsAllowed) / 20 +
    -stats.defPassingTdsAllowed * 8 +
    stats.defInterceptions * 12 +
    (stats.defPassAttempts > 0 ?
      (100 - (stats.defPassCompletionsAllowed / stats.defPassAttempts * 100)) / 5 
      : 0)
  ) * 0.4;
  
  const rushDefense = (
    (150 - stats.defRushingYardsAllowed) / 15 +
    -stats.defRushingTdsAllowed * 10 +
    (stats.defRushingAttemptsAllowed > 0 ?
      (5.0 - (stats.defRushingYardsAllowed / stats.defRushingAttemptsAllowed)) * 10
      : 0)
  ) * 0.3;
  
  const overallDefense = (
    (7.0 - stats.defYardsPerPlayAllowed) * 15 +
    -stats.defFirstDownsAllowed * 2 +
    (50 - stats.thirdDownConversionRate) * 1.5
  ) * 0.2;
  
  const turnoverCreation = (
    stats.turnoversForced * 15 +
    stats.fumblesForced * 12 +
    stats.defInterceptions * 12
  ) * 0.1;
  
  return Math.max(0,
    passDefense +
    rushDefense +
    overallDefense +
    turnoverCreation +
    (45 - stats.pointsAllowedPerGame) * 2
  );
}
