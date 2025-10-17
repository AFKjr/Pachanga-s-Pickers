// test-simulation-node.js
// Node.js compatible version of the Monte Carlo simulation test

// Mock the required functions and types
const SIMULATION_ITERATIONS = 10000;

// Simple TeamStats interface
class TeamStats {
  constructor(data) {
    Object.assign(this, data);
  }
}

// Simple SimulationResult interface
class SimulationResult {
  constructor(data) {
    Object.assign(this, data);
  }
}

/**
 * Add variance to strength scores to simulate coaching, motivation, execution variance
 * NFL teams don't perform at exactly their average every game
 */
function applyGameDayVariance(baseStrength) {
  // Apply ±15% variance (roughly 7-15 points on 50 scale)
  // INCREASED from 10% to 15% to add more upset potential
  // This simulates: coaching decisions, motivation, execution, matchup factors
  const VARIANCE_PERCENT = 0.15;
  const variance = (Math.random() * 2 - 1) * baseStrength * VARIANCE_PERCENT;
  
  return Math.max(10, Math.min(90, baseStrength + variance));
}/**
 * Calculate offensive strength score (simplified version)
 */
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

  return Math.max(0, Math.min(100,
    passingEfficiency + rushingEfficiency + overallEfficiency + turnoverImpact + penaltyImpact
  ));
}

/**
 * Calculate defensive strength score (simplified version)
 */
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

  return Math.max(0, Math.min(100,
    50 + passDefense + rushDefense + overallDefense + pointsAllowed
  ));
}

/**
 * Calculate relative strength advantage with regression
 * Returns a value between 0.3 and 0.7 representing scoring probability
 */
function calculateRelativeAdvantage(offensiveStrength, defensiveStrength) {
  // Base calculation: offense vs total strength
  const raw = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  // Apply STRONGER regression to mean (80% weight)
  const REGRESSION_FACTOR = 0.80;
  const regressed = (raw * REGRESSION_FACTOR) + (0.5 * (1 - REGRESSION_FACTOR));
  
  // Clamp to reasonable range
  return Math.max(0.30, Math.min(0.70, regressed));
}

/**
 * Simulate a single possession with variance
 */
function simulatePossession(offenseStats, defenseStats) {
  const offensiveStrength = calculateOffensiveStrength(offenseStats);
  const defensiveStrength = calculateDefensiveStrength(defenseStats);

  // Base scoring probability (already regressed in calculateRelativeAdvantage)
  const baseScoring = calculateRelativeAdvantage(offensiveStrength, defensiveStrength);
  
  // Turnover check with variance
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  // INCREASED: ±40% variance on turnover rate
  const turnoverVariance = 0.80 + (Math.random() * 0.40); // 0.80 to 1.20
  const adjustedTurnoverChance = baseTurnoverRate * turnoverVariance;
  
  if (Math.random() < adjustedTurnoverChance) {
    return 0; // Turnover ends possession
  }
  
  // Efficiency modifier with variance
  const baseEfficiency = offenseStats.yardsPerPlay / 
                        (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed);
  
  // Add execution variance (±15%)
  const efficiencyVariance = 0.90 + (Math.random() * 0.20); // 0.90 to 1.10
  const adjustedEfficiency = Math.min(0.85, baseEfficiency * efficiencyVariance);
  
  // Combine with MORE weight on variance
  const scoringProbability = (baseScoring * 0.65) + (adjustedEfficiency * 0.35);

  if (Math.random() > scoringProbability) {
    return 0; // Drive stalls
  }

  // TD vs FG with INCREASED variance
  const baseRedZone = offenseStats.redZoneEfficiency;
  const seasonalTDRate = (offenseStats.passingTds + offenseStats.rushingTds) * 1.2;
  
  // Base TD probability
  const baseTDProb = (baseRedZone * 0.8) + (seasonalTDRate * 0.2);
  
  // Add red zone variance (±20%)
  const redZoneVariance = 0.85 + (Math.random() * 0.30); // 0.85 to 1.15
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

/**
 * Simulate a single game with variance at multiple levels
 */
function simulateSingleGame(homeStats, awayStats) {
  let homeScore = 0;
  let awayScore = 0;

  // Possession calculation with variance
  const homePaceRaw = homeStats.drivesPerGame;
  const awayPaceRaw = awayStats.drivesPerGame;

  const averagePossessions = (homePaceRaw * 0.55 + awayPaceRaw * 0.45);

    const possessionVariance = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, +2
  const possessionsPerTeam = Math.round(averagePossessions) + possessionVariance;

  const finalPossessions = Math.max(8, Math.min(15, possessionsPerTeam));

  // Apply game-day variance to team strengths
  const baseHomeOffense = calculateOffensiveStrength(homeStats);
  const baseAwayOffense = calculateOffensiveStrength(awayStats);
  const baseHomeDefense = calculateDefensiveStrength(homeStats);
  const baseAwayDefense = calculateDefensiveStrength(awayStats);

  const gameHomeOffense = applyGameDayVariance(baseHomeOffense);
  const gameAwayOffense = applyGameDayVariance(baseAwayOffense);
  const gameHomeDefense = applyGameDayVariance(baseHomeDefense);
  const gameAwayDefense = applyGameDayVariance(baseAwayDefense);

  // Create adjusted stats for simulation
  const homeOffenseStats = { ...homeStats, offensiveStrength: gameHomeOffense };
  const awayOffenseStats = { ...awayStats, offensiveStrength: gameAwayOffense };
  const homeDefenseStats = { ...homeStats, defensiveStrength: gameHomeDefense };
  const awayDefenseStats = { ...awayStats, defensiveStrength: gameAwayDefense };

  // Home field advantage with variance
  const BASE_HOME_ADVANTAGE = 1.03;
  const homeFieldVariance = 0.97 + (Math.random() * 0.06); // 0.97 to 1.03 (±3%)
  const HOME_FIELD_BOOST = BASE_HOME_ADVANTAGE * homeFieldVariance;

  // Simulate possessions
  for (let possession = 0; possession < finalPossessions; possession++) {
    const homePoints = simulatePossession(homeOffenseStats, awayDefenseStats);
    homeScore += homePoints * HOME_FIELD_BOOST;
  }

  for (let possession = 0; possession < finalPossessions; possession++) {
    awayScore += simulatePossession(awayOffenseStats, homeDefenseStats);
  }

  // Chaos variance
  if (Math.random() < 0.15) {
    const chaosPoints = Math.random() < 0.5 ? 2 : 7;
    if (Math.random() < 0.5) {
      homeScore += chaosPoints;
    } else {
      awayScore += chaosPoints;
    }
  }

  return {
    homeScore: Math.round(homeScore),
    awayScore: Math.round(awayScore)
  };
}

/**
 * Run Monte Carlo simulation with increased variance
 */
function runMonteCarloSimulation(homeStats, awayStats, spread, total, favoriteIsHome) {
  const homeScores = [];
  const awayScores = [];
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;
  let favoriteCovers = 0;
  let overs = 0;

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(homeStats, awayStats);

    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    if (gameResult.homeScore > gameResult.awayScore) {
      homeWins++;
    } else if (gameResult.awayScore > gameResult.homeScore) {
      awayWins++;
    } else {
      ties++;
    }

    const favoriteScore = favoriteIsHome ? gameResult.homeScore : gameResult.awayScore;
    const underdogScore = favoriteIsHome ? gameResult.awayScore : gameResult.homeScore;

    const margin = favoriteScore - underdogScore;
    const spreadValue = Math.abs(spread);

    if (margin > spreadValue) {
      favoriteCovers++;
    }

    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) overs++;
  }

  const avgHomeScore = homeScores.reduce((acc, score) => acc + score, 0) / homeScores.length;
  const avgAwayScore = awayScores.reduce((acc, score) => acc + score, 0) / awayScores.length;

  const favoriteCoverProb = (favoriteCovers / SIMULATION_ITERATIONS) * 100;
  const underdogCoverProb = ((SIMULATION_ITERATIONS - favoriteCovers) / SIMULATION_ITERATIONS) * 100;

  return new SimulationResult({
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(avgHomeScore),
    predictedAwayScore: Math.round(avgAwayScore),
    spreadCoverProbability: favoriteCoverProb,
    favoriteCoverProbability: favoriteCoverProb,
    underdogCoverProbability: underdogCoverProb,
    overProbability: (overs / SIMULATION_ITERATIONS) * 100,
    underProbability: ((SIMULATION_ITERATIONS - overs) / SIMULATION_ITERATIONS) * 100,
    iterations: SIMULATION_ITERATIONS
  });
}

// Mock realistic NFL team stats for 2025 season
function createTeamStats(teamName, overrides = {}) {
  const baseStats = {
    team: teamName,
    gamesPlayed: 6,
    offensiveYardsPerGame: 350,
    defensiveYardsAllowed: 320,
    pointsPerGame: 24,
    pointsAllowedPerGame: 22,
    turnoverDifferential: 0.5,
    thirdDownConversionRate: 0.42,
    redZoneEfficiency: 0.58,
    passCompletions: 180,
    passAttempts: 280,
    passCompletionPct: 64.3,
    passingYards: 2100,
    passingTds: 14,
    interceptionsThrown: 8,
    yardsPerPassAttempt: 7.5,
    rushingAttempts: 150,
    rushingYards: 680,
    rushingTds: 6,
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
    defPassingYardsAllowed: 1950,
    defPassingTdsAllowed: 12,
    defInterceptions: 6,
    defRushingAttemptsAllowed: 140,
    defRushingYardsAllowed: 650,
    defRushingTdsAllowed: 5,
    defTotalPlays: 410,
    defYardsPerPlayAllowed: 5.4,
    defFirstDownsAllowed: 115,
    turnoversForced: 10,
    fumblesForced: 3,
    drivesPerGame: 12.5,
    playsPerDrive: 6.8,
    pointsPerDrive: 1.9,
    scoringPercentage: 0.33,
    yardsPerDrive: 28,
    timePerDriveSeconds: 165,
    ...overrides
  };
  return new TeamStats(baseStats);
}

// Test matchups with realistic 2025 stats
const testMatchups = [
  {
    name: "Chiefs vs Panthers (Heavy Favorite -10.5)",
    homeTeam: "Chiefs",
    awayTeam: "Panthers",
    spread: -10.5,
    total: 45.5,
    homeStats: createTeamStats("Chiefs", {
      pointsPerGame: 26,
      pointsAllowedPerGame: 20,
      passingYards: 2300,
      passingTds: 16,
      rushingYards: 700,
      rushingTds: 7,
      redZoneEfficiency: 0.62,
      thirdDownConversionRate: 0.46,
      defPassingYardsAllowed: 1900,
      defRushingYardsAllowed: 580,
      defPassingTdsAllowed: 10,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.9
    }),
    awayStats: createTeamStats("Panthers", {
      pointsPerGame: 23,
      pointsAllowedPerGame: 23,
      passingYards: 2050,
      passingTds: 13,
      rushingYards: 670,
      rushingTds: 5,
      redZoneEfficiency: 0.52,
      thirdDownConversionRate: 0.40,
      defPassingYardsAllowed: 2050,
      defRushingYardsAllowed: 680,
      defPassingTdsAllowed: 12,
      defRushingTdsAllowed: 5,
      drivesPerGame: 12.3
    }),
    expectedWin: "70-75%",
    expectedCover: "52-56%"
  },
  {
    name: "Bills vs Dolphins (Moderate Favorite -3.5)",
    homeTeam: "Bills",
    awayTeam: "Dolphins",
    spread: -3.5,
    total: 48.5,
    homeStats: createTeamStats("Bills", {
      pointsPerGame: 25,
      pointsAllowedPerGame: 21,
      passingYards: 2150,
      passingTds: 14,
      rushingYards: 710,
      rushingTds: 6,
      redZoneEfficiency: 0.58,
      thirdDownConversionRate: 0.43,
      defPassingYardsAllowed: 1920,
      defRushingYardsAllowed: 620,
      defPassingTdsAllowed: 11,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.6
    }),
    awayStats: createTeamStats("Dolphins", {
      pointsPerGame: 24,
      pointsAllowedPerGame: 22,
      passingYards: 2180,
      passingTds: 13,
      rushingYards: 680,
      rushingTds: 6,
      redZoneEfficiency: 0.52,
      thirdDownConversionRate: 0.41,
      defPassingYardsAllowed: 1950,
      defRushingYardsAllowed: 640,
      defPassingTdsAllowed: 10,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.5
    }),
    expectedWin: "58-62%",
    expectedCover: "50-54%"
  },
  {
    name: "Cowboys vs 49ers (Toss-up)",
    homeTeam: "Cowboys",
    awayTeam: "49ers",
    spread: -1.5,
    total: 46.5,
    homeStats: createTeamStats("Cowboys", {
      pointsPerGame: 24,
      pointsAllowedPerGame: 22,
      passingYards: 2200,
      passingTds: 15,
      rushingYards: 690,
      rushingTds: 6,
      redZoneEfficiency: 0.56,
      thirdDownConversionRate: 0.42,
      defPassingYardsAllowed: 1970,
      defRushingYardsAllowed: 630,
      defPassingTdsAllowed: 11,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.6
    }),
    awayStats: createTeamStats("49ers", {
      pointsPerGame: 24,
      pointsAllowedPerGame: 22,
      passingYards: 2200,
      passingTds: 15,
      rushingYards: 690,
      rushingTds: 6,
      redZoneEfficiency: 0.56,
      thirdDownConversionRate: 0.42,
      defPassingYardsAllowed: 1970,
      defRushingYardsAllowed: 630,
      defPassingTdsAllowed: 11,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.6
    }),
    expectedWin: "48-52%",
    expectedCover: "48-52%"
  }
];

function runSimulationTest() {
  console.log("🧪 Testing Monte Carlo Simulation with Enhanced Variance\n");
  console.log("=".repeat(60));

  testMatchups.forEach((matchup, index) => {
    console.log(`\n${index + 1}. ${matchup.name}`);
    console.log("-".repeat(50));

    const favoriteIsHome = matchup.spread < 0;

    // Run simulation
    const result = runMonteCarloSimulation(
      matchup.homeStats,
      matchup.awayStats,
      Math.abs(matchup.spread),
      matchup.total,
      favoriteIsHome
    );

    // Display results
    console.log(`Home Team (${matchup.homeTeam}): ${result.predictedHomeScore.toFixed(1)} pts`);
    console.log(`Away Team (${matchup.awayTeam}): ${result.predictedAwayScore.toFixed(1)} pts`);
    console.log(`Total: ${(result.predictedHomeScore + result.predictedAwayScore).toFixed(1)} pts`);

    const homeWinProb = result.homeWinProbability.toFixed(1);
    const favoriteCoverProb = result.favoriteCoverProbability.toFixed(1);

    console.log(`\nHome Win Probability: ${homeWinProb}%`);
    console.log(`Favorite Cover Probability: ${favoriteCoverProb}%`);

    // Check against benchmarks
    const homeWinNum = parseFloat(homeWinProb);
    const coverNum = parseFloat(favoriteCoverProb);

    let winStatus = "❌ FAIL";
    let coverStatus = "❌ FAIL";

    if (matchup.name.includes("Chiefs")) {
      if (homeWinNum >= 70 && homeWinNum <= 75) winStatus = "✅ PASS";
      if (coverNum >= 52 && coverNum <= 56) coverStatus = "✅ PASS";
    } else if (matchup.name.includes("Bills")) {
      if (homeWinNum >= 58 && homeWinNum <= 62) winStatus = "✅ PASS";
      if (coverNum >= 50 && coverNum <= 54) coverStatus = "✅ PASS";
    } else if (matchup.name.includes("Cowboys")) {
      if (homeWinNum >= 48 && homeWinNum <= 52) winStatus = "✅ PASS";
      if (coverNum >= 48 && coverNum <= 52) coverStatus = "✅ PASS";
    }

    console.log(`\nExpected Win: ${matchup.expectedWin} | Actual: ${homeWinProb}% | ${winStatus}`);
    console.log(`Expected Cover: ${matchup.expectedCover} | Actual: ${favoriteCoverProb}% | ${coverStatus}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("🎯 Simulation Test Complete");
}

// Run the test
runSimulationTest();