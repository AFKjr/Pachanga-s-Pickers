// debug-strength.js
// Debug script to check team strength calculations

function calculateOffensiveStrength(stats) {
  // Passing component (weighted 40%)
  const passingEfficiency = (
    stats.passingYards / 100 * 0.8 +           // 250 yards = 2.0
    stats.yardsPerPassAttempt * 2 +            // 7.5 YPA = 15.0
    stats.passCompletionPct / 10 +             // 65% = 6.5
    stats.passingTds * 2 -                     // 2 TDs = 4.0
    stats.interceptionsThrown * 3              // 1 INT = -3.0
  ) * 0.4;

  // Rushing component (weighted 30%)
  const rushingEfficiency = (
    stats.rushingYards / 50 * 0.5 +            // 120 yards = 1.2
    stats.yardsPerRush * 3 +                   // 4.5 YPR = 13.5
    stats.rushingTds * 2                       // 1 TD = 2.0
  ) * 0.3;

  // Overall efficiency (weighted 20%)
  const overallEfficiency = (
    stats.yardsPerPlay * 4 +                   // 5.5 YPP = 22.0
    stats.firstDowns / 5 +                     // 20 FD = 4.0
    stats.thirdDownConversionRate * 0.4 +      // 40% = 16.0
    stats.redZoneEfficiency * 0.5              // 60% = 30.0
  ) * 0.2;

  // Turnover impact (weighted 10%)
  const turnoverImpact = (
    -stats.turnoversLost * 4 -                 // 1 TO = -4.0
    stats.fumblesLost * 3 +                    // 1 fumble = -3.0
    stats.turnoverDifferential * 2             // +1 diff = +2.0
  ) * 0.1;

  // Penalty impact (small negative factor)
  const penaltyImpact = -(stats.penaltyYards / 30);  // 60 yards = -2.0

  const rawStrength = passingEfficiency + rushingEfficiency + overallEfficiency + turnoverImpact + penaltyImpact;
  return Math.max(0, Math.min(100, rawStrength));
}

function calculateDefensiveStrength(stats) {
  // Passing defense (weighted 40%)
  const passDefense = (
    -stats.defPassingYardsAllowed / 50 * 0.4 +  // -200 yards = -1.6
    -stats.defPassingTdsAllowed * 3 +           // -2 TDs = -6.0
    stats.defInterceptions * 2                  // 2 INTs = 4.0
  ) * 0.4;

  // Rushing defense (weighted 30%)
  const rushDefense = (
    -stats.defRushingYardsAllowed / 30 * 0.5 +  // -120 yards = -2.0
    -stats.defRushingTdsAllowed * 3 +           // -1 TD = -3.0
    stats.fumblesForced * 2                     // 1 FF = 2.0
  ) * 0.3;

  // Overall defense (weighted 20%)
  const overallDefense = (
    -stats.defYardsPerPlayAllowed * 4 +         // -5.5 YPP = -22.0
    -stats.defFirstDownsAllowed / 5 +           // -20 FD = -4.0
    stats.turnoversForced * 2                   // 2 TO = 4.0
  ) * 0.2;

  // Points allowed impact (weighted 10%)
  const pointsAllowed = -stats.pointsAllowedPerGame * 0.8;  // -22 PPG = -17.6

  const rawStrength = 50 + passDefense + rushDefense + overallDefense + pointsAllowed;
  return Math.max(0, Math.min(100, rawStrength));
}

// Test team stats
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

console.log("=== TEAM STRENGTH DEBUG ===");
console.log(`Chiefs Offensive Strength: ${calculateOffensiveStrength(chiefsStats).toFixed(1)}`);
console.log(`Chiefs Defensive Strength: ${calculateDefensiveStrength(chiefsStats).toFixed(1)}`);
console.log(`Panthers Offensive Strength: ${calculateOffensiveStrength(panthersStats).toFixed(1)}`);
console.log(`Panthers Defensive Strength: ${calculateDefensiveStrength(panthersStats).toFixed(1)}`);

const chiefsAdvantage = calculateOffensiveStrength(chiefsStats) - calculateDefensiveStrength(panthersStats);
const panthersAdvantage = calculateOffensiveStrength(panthersStats) - calculateDefensiveStrength(chiefsStats);

console.log(`\nChiefs Matchup Advantage: ${chiefsAdvantage.toFixed(1)}`);
console.log(`Panthers Matchup Advantage: ${panthersAdvantage.toFixed(1)}`);

// Expected win probability calculation
const totalAdvantage = chiefsAdvantage - panthersAdvantage;
const expectedWinProb = 50 + (totalAdvantage * 0.5); // Rough approximation
console.log(`\nExpected Chiefs Win Probability: ${Math.max(0, Math.min(100, expectedWinProb)).toFixed(1)}%`);