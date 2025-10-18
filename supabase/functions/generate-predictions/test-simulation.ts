// supabase/functions/generate-predictions/test-simulation.ts
import { runMonteCarloSimulation, determineFavorite } from './lib/simulation/monte-carlo.ts';
import type { TeamStats, SimulationResult } from './lib/simulation/monte-carlo.ts';

// Mock realistic NFL team stats for 2025 season
const createTeamStats = (teamName: string, overrides: Partial<TeamStats>): TeamStats => {
  const baseStats: TeamStats = {
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
  return baseStats;
};

// Test matchups with realistic 2025 stats
const testMatchups = [
  {
    name: "Chiefs vs Panthers (Heavy Favorite -10.5)",
    homeTeam: "Chiefs",
    awayTeam: "Panthers",
    spread: -10.5,
    total: 45.5,
    homeStats: createTeamStats("Chiefs", {
      pointsPerGame: 28,
      pointsAllowedPerGame: 18,
      passingYards: 2400,
      passingTds: 18,
      rushingYards: 750,
      rushingTds: 8,
      redZoneEfficiency: 0.65,
      thirdDownConversionRate: 0.48,
      defPassingYardsAllowed: 1800,
      defRushingYardsAllowed: 550,
      defPassingTdsAllowed: 9,
      defRushingTdsAllowed: 3,
      drivesPerGame: 13.2
    }),
    awayStats: createTeamStats("Panthers", {
      pointsPerGame: 20,
      pointsAllowedPerGame: 26,
      passingYards: 1800,
      passingTds: 10,
      rushingYards: 600,
      rushingTds: 4,
      redZoneEfficiency: 0.45,
      thirdDownConversionRate: 0.35,
      defPassingYardsAllowed: 2200,
      defRushingYardsAllowed: 750,
      defPassingTdsAllowed: 15,
      defRushingTdsAllowed: 7,
      drivesPerGame: 11.8
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
      pointsPerGame: 26,
      pointsAllowedPerGame: 20,
      passingYards: 2200,
      passingTds: 15,
      rushingYards: 720,
      rushingTds: 7,
      redZoneEfficiency: 0.60,
      thirdDownConversionRate: 0.45,
      defPassingYardsAllowed: 1900,
      defRushingYardsAllowed: 600,
      defPassingTdsAllowed: 10,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.8
    }),
    awayStats: createTeamStats("Dolphins", {
      pointsPerGame: 24,
      pointsAllowedPerGame: 22,
      passingYards: 2150,
      passingTds: 14,
      rushingYards: 690,
      rushingTds: 6,
      redZoneEfficiency: 0.55,
      thirdDownConversionRate: 0.42,
      defPassingYardsAllowed: 2000,
      defRushingYardsAllowed: 650,
      defPassingTdsAllowed: 11,
      defRushingTdsAllowed: 5,
      drivesPerGame: 12.6
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
      pointsPerGame: 25,
      pointsAllowedPerGame: 21,
      passingYards: 2250,
      passingTds: 16,
      rushingYards: 700,
      rushingTds: 7,
      redZoneEfficiency: 0.58,
      thirdDownConversionRate: 0.44,
      defPassingYardsAllowed: 1950,
      defRushingYardsAllowed: 620,
      defPassingTdsAllowed: 11,
      defRushingTdsAllowed: 4,
      drivesPerGame: 12.7
    }),
    awayStats: createTeamStats("49ers", {
      pointsPerGame: 24,
      pointsAllowedPerGame: 21,
      passingYards: 2200,
      passingTds: 15,
      rushingYards: 710,
      rushingTds: 6,
      redZoneEfficiency: 0.57,
      thirdDownConversionRate: 0.43,
      defPassingYardsAllowed: 1980,
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
  console.log("=" .repeat(60));

  testMatchups.forEach((matchup, index) => {
    console.log(`\n${index + 1}. ${matchup.name}`);
    console.log("-".repeat(50));

    // Determine favorite
    const favoriteInfo = determineFavorite(0, 0); // We'll override favoriteIsHome
    const favoriteIsHome = matchup.spread < 0;

    // Run simulation
    const result: SimulationResult = runMonteCarloSimulation(
      matchup.homeStats,
      matchup.awayStats,
      Math.abs(matchup.spread),
      matchup.total,
      null, // No weather
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