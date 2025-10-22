// debug-possession.js
// Debug script to check possession simulation

function calculateOffensiveStrength(stats) {
  const passingEfficiency = (
    stats.passingYards / 100 * 0.8 +
    stats.yardsPerPassAttempt * 2 +
    stats.passCompletionPct / 10 +
    stats.passingTds * 2 -
    stats.interceptionsThrown * 3
  ) * 0.4;

  const rushingEfficiency = (
    stats.rushingYards / 50 * 0.5 +
    stats.yardsPerRush * 3 +
    stats.rushingTds * 2
  ) * 0.3;

  const overallEfficiency = (
    stats.yardsPerPlay * 4 +
    stats.firstDowns / 5 +
    stats.thirdDownConversionRate * 0.4 +
    stats.redZoneEfficiency * 0.5
  ) * 0.2;

  const turnoverImpact = (
    -stats.turnoversLost * 4 -
    stats.fumblesLost * 3 +
    stats.turnoverDifferential * 2
  ) * 0.1;

  const penaltyImpact = -(stats.penaltyYards / 30);

  const rawStrength = passingEfficiency + rushingEfficiency + overallEfficiency + turnoverImpact + penaltyImpact;
  return Math.max(0, Math.min(100, rawStrength));
}

function calculateDefensiveStrength(stats) {
  const passDefense = (
    -stats.defPassingYardsAllowed / 50 * 0.4 +
    -stats.defPassingTdsAllowed * 3 +
    stats.defInterceptions * 2
  ) * 0.4;

  const rushDefense = (
    -stats.defRushingYardsAllowed / 30 * 0.5 +
    -stats.defRushingTdsAllowed * 3 +
    stats.fumblesForced * 2
  ) * 0.3;

  const overallDefense = (
    -stats.defYardsPerPlayAllowed * 4 +
    -stats.defFirstDownsAllowed / 5 +
    stats.turnoversForced * 2
  ) * 0.2;

  const pointsAllowed = -stats.pointsAllowedPerGame * 0.8;

  const rawStrength = 50 + passDefense + rushDefense + overallDefense + pointsAllowed;
  return Math.max(0, Math.min(100, rawStrength));
}

function calculateRelativeAdvantage(offensiveStrength, defensiveStrength) {
  const raw = offensiveStrength / (offensiveStrength + defensiveStrength);
  const REGRESSION_FACTOR = 0.85;
  const regressed = (raw * REGRESSION_FACTOR) + (0.5 * (1 - REGRESSION_FACTOR));
  return Math.max(0.30, Math.min(0.70, regressed));
}

function simulatePossession(offenseStats, defenseStats) {
  const offensiveStrength = calculateOffensiveStrength(offenseStats);
  const defensiveStrength = calculateDefensiveStrength(defenseStats);

  const baseScoring = calculateRelativeAdvantage(offensiveStrength, defensiveStrength);

  // Turnover check with variance
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;

  const turnoverVariance = 0.90 + (Math.random() * 0.20);
  const adjustedTurnoverChance = baseTurnoverRate * turnoverVariance;

  if (Math.random() < adjustedTurnoverChance) {
    return 0; // Turnover ends possession
  }

  // Efficiency modifier with variance
  const baseEfficiency = offenseStats.yardsPerPlay /
                        (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed);

  const efficiencyVariance = 0.90 + (Math.random() * 0.20);
  const adjustedEfficiency = Math.min(0.85, baseEfficiency * efficiencyVariance);

  const scoringProbability = (baseScoring * 0.50) + (adjustedEfficiency * 0.30);

  if (Math.random() > scoringProbability) {
    return 0; // Drive stalls
  }

  // TD vs FG with variance
  const baseRedZone = offenseStats.redZoneEfficiency;
  const seasonalTDRate = (offenseStats.passingTds + offenseStats.rushingTds) * 1.2;

  const baseTDProb = (baseRedZone * 0.7) + (seasonalTDRate * 0.3);

  const redZoneVariance = 0.925 + (Math.random() * 0.15);
  const adjustedTDProb = baseTDProb * redZoneVariance;

  const redZoneRoll = Math.random() * 100;

  if (redZoneRoll < adjustedTDProb) {
    const specialEvents = Math.random();
    if (specialEvents < 0.02) return 8;  // 2-pt conversion
    if (specialEvents < 0.04) return 6;  // Missed XP
    return 7;  // Normal TD
  }

  const fieldGoalRange = adjustedTDProb + 35;

  if (redZoneRoll < fieldGoalRange) {
    const fgRoll = Math.random();
    if (fgRoll < 0.08) return 0;  // Missed FG
    if (fgRoll < 0.10) return 0;  // Blocked FG
    return 3;  // Made FG
  }

  return 0;
}

// Test with Chiefs vs Panthers
const chiefsStats = {
  team: "Chiefs",
  gamesPlayed: 6,
  offensiveYardsPerGame: 350,
  defensiveYardsAllowed: 320,
  pointsPerGame: 28,
  pointsAllowedPerGame: 18,
  turnoverDifferential: 0.5,
  thirdDownConversionRate: 0.48,
  redZoneEfficiency: 0.65,
  passCompletions: 180,
  passAttempts: 280,
  passCompletionPct: 64.3,
  passingYards: 2400,
  passingTds: 18,
  interceptionsThrown: 8,
  yardsPerPassAttempt: 7.5,
  rushingAttempts: 150,
  rushingYards: 750,
  rushingTds: 8,
  yardsPerRush: 4.5,
  totalPlays: 430,
  yardsPerPlay: 5.6,
  firstDowns: 120,
  penalties: 35,
  penaltyYards: 280,
  turnoversLost: 12,
  fumblesLost: 4,
  defPassCompletionsAllowed: 170,
  defPassAttempts: 270,
  defPassingYardsAllowed: 1800,
  defPassingTdsAllowed: 9,
  defInterceptions: 6,
  defRushingAttemptsAllowed: 140,
  defRushingYardsAllowed: 550,
  defRushingTdsAllowed: 3,
  defTotalPlays: 410,
  defYardsPerPlayAllowed: 5.4,
  defFirstDownsAllowed: 115,
  turnoversForced: 10,
  fumblesForced: 3,
  drivesPerGame: 13.2,
  playsPerDrive: 6.8,
  pointsPerDrive: 1.9,
  scoringPercentage: 0.33,
  yardsPerDrive: 28,
  timePerDriveSeconds: 165
};

const panthersStats = {
  team: "Panthers",
  gamesPlayed: 6,
  offensiveYardsPerGame: 350,
  defensiveYardsAllowed: 320,
  pointsPerGame: 20,
  pointsAllowedPerGame: 26,
  turnoverDifferential: 0.5,
  thirdDownConversionRate: 0.35,
  redZoneEfficiency: 0.45,
  passCompletions: 180,
  passAttempts: 280,
  passCompletionPct: 64.3,
  passingYards: 1800,
  passingTds: 10,
  interceptionsThrown: 8,
  yardsPerPassAttempt: 7.5,
  rushingAttempts: 150,
  rushingYards: 600,
  rushingTds: 4,
  yardsPerRush: 4.5,
  totalPlays: 430,
  yardsPerPlay: 5.6,
  firstDowns: 120,
  penalties: 35,
  penaltyYards: 280,
  turnoversLost: 12,
  fumblesLost: 4,
  defPassCompletionsAllowed: 170,
  defPassAttempts: 270,
  defPassingYardsAllowed: 2200,
  defPassingTdsAllowed: 15,
  defInterceptions: 6,
  defRushingAttemptsAllowed: 140,
  defRushingYardsAllowed: 750,
  defRushingTdsAllowed: 7,
  defTotalPlays: 410,
  defYardsPerPlayAllowed: 5.4,
  defFirstDownsAllowed: 115,
  turnoversForced: 10,
  fumblesForced: 3,
  drivesPerGame: 11.8,
  playsPerDrive: 6.8,
  pointsPerDrive: 1.9,
  scoringPercentage: 0.33,
  yardsPerDrive: 28,
  timePerDriveSeconds: 165
};

console.log("=== POSSESSION SIMULATION DEBUG ===");
console.log(`Chiefs Offensive Strength: ${calculateOffensiveStrength(chiefsStats).toFixed(1)}`);
console.log(`Panthers Defensive Strength: ${calculateDefensiveStrength(panthersStats).toFixed(1)}`);
console.log(`Relative Advantage: ${(calculateRelativeAdvantage(calculateOffensiveStrength(chiefsStats), calculateDefensiveStrength(panthersStats)) * 100).toFixed(1)}%`);

// Test 100 possessions
let totalPoints = 0;
let scores = 0;
let turnovers = 0;

for (let i = 0; i < 100; i++) {
  const points = simulatePossession(chiefsStats, panthersStats);
  totalPoints += points;
  if (points > 0) scores++;
  if (points === 0 && Math.random() < 0.1) turnovers++; // Rough estimate
}

console.log(`\n100 Possessions Test:`);
console.log(`Total Points: ${totalPoints}`);
console.log(`Scoring Drives: ${scores}`);
console.log(`Points Per Possession: ${(totalPoints / 100).toFixed(2)}`);
console.log(`Scoring Rate: ${(scores / 100 * 100).toFixed(1)}%`);