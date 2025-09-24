import {
  isGameLine,
  parseTeams,
  extractPrediction,
  extractConfidence,
  isKeyFactorsHeader,
  isFactorLineAdaptive,
  extractFactorText,
  parseWeekFromHeader
} from './src/utils/textProcessor';
import { shouldStopFactorCollection } from './src/utils/adaptiveParser';

// Test with a sample of your Week 4 predictions to identify parsing issues
const sampleWeek4Text = `Game Predictions — Week 4 (summary per matchup)

Seattle Seahawks @ Arizona Cardinals (Thu 9/25)

Simulation Results (10,000 iters):
    Mean Predicted Score: Arizona 22.2 — Seattle 16.6 (Expected total 38.8)
    Win Probability: Arizona 80.3% / Seattle 19.7%
    95% CI (team scores): ARI [14–30], SEA [9–25]; Total [28–50]
Model Prediction:
    Predicted Score: Cardinals 22, Seahawks 17
    Recommended Side/Total: Cardinals -1.5 (moneyline/spread) — Under 43.5 (Medium/High)
    Confidence Level: High
Key Factors:
    Arizona advantage in offensive efficiency and home-field.
    Seattle defensive declines vs Arizona offensive matchup.

Minnesota Vikings @ Pittsburgh Steelers (Sunday, Croke Park)

Simulation Results:
    Mean Predicted Score: Minnesota 21.2 — Pittsburgh 16.6 (Total 37.8)
    Win Probability: Minnesota 81.4% / Pittsburgh 18.6%
    95% CI: MIN [13–29], PIT [9–24]; Total [26–49]
Model Prediction:
    Predicted Score: Vikings 21, Steelers 17
    Recommended Side/Total: Bet Vikings (ML / +2.5) — value on Vikings (High)
    Confidence Level: High
Key Factors:
    Vikings show better offensive profile and turnover edge.
    Neutral-site (Dublin) introduces travel complexity but model still favors Minnesota's roster strength.`;

console.log("=== ANALYZING PARSING OUTCOMES ===\n");

function parseAndAnalyze(text: string) {
  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
  const predictions = [];
  let currentGame = '';
  let currentPrediction = '';
  let currentConfidence = 50;
  let currentReasoning = '';
  let homeTeam = '';
  let awayTeam = '';
  let currentWeek = 4;
  let isCollectingFactors = false;

  console.log(`Processing ${lines.length} lines...\n`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    console.log(`Line ${i}: "${line}"`);
    
    // Parse week
    const parsedWeek = parseWeekFromHeader(line);
    if (parsedWeek && parsedWeek >= 1 && parsedWeek <= 18) {
      currentWeek = parsedWeek;
      console.log(`  ✅ Week detected: ${currentWeek}`);
    }

    // Parse game lines
    if (isGameLine(line)) {
      console.log(`  ✅ Game line detected`);
      
      // Save previous game
      if (currentGame && currentPrediction) {
        predictions.push({
          homeTeam,
          awayTeam,
          prediction: currentPrediction,
          confidence: currentConfidence,
          reasoning: currentReasoning.trim(),
          week: currentWeek
        });
        console.log(`  💾 Saved previous game: ${awayTeam} @ ${homeTeam}`);
        console.log(`     Prediction: "${currentPrediction}"`);
        console.log(`     Confidence: ${currentConfidence}%`);
      }

      // Parse new game
      currentGame = line;
      const teams = parseTeams(line);
      if (teams) {
        awayTeam = teams.awayTeam;
        homeTeam = teams.homeTeam;
        console.log(`  ✅ Teams: ${awayTeam} @ ${homeTeam}`);
      }
      currentPrediction = '';
      currentConfidence = 50;
      currentReasoning = '';
      isCollectingFactors = false;
    }

    // Parse predictions
    const prediction = extractPrediction(line);
    if (prediction) {
      console.log(`  🎯 Prediction extracted: "${prediction}"`);
      // Check if this is overriding a previous prediction
      if (currentPrediction && currentPrediction !== prediction) {
        console.log(`  ⚠️  OVERRIDING previous prediction: "${currentPrediction}"`);
      }
      currentPrediction = prediction;
    }

    // Parse confidence
    const confidence = extractConfidence(line);
    if (confidence !== null) {
      console.log(`  📊 Confidence extracted: ${confidence}%`);
      if (currentConfidence !== 50 && currentConfidence !== confidence) {
        console.log(`  ⚠️  OVERRIDING previous confidence: ${currentConfidence}%`);
      }
      currentConfidence = confidence;
    }

    // Parse key factors
    if (isKeyFactorsHeader(line)) {
      isCollectingFactors = true;
      currentReasoning = '';
      console.log(`  🔍 Starting factor collection`);
      continue;
    }

    if (isCollectingFactors && isFactorLineAdaptive(line, isCollectingFactors)) {
      const factorText = extractFactorText(line);
      if (factorText.length > 0) {
        currentReasoning += factorText + '. ';
        console.log(`  📝 Factor added: "${factorText}"`);
      }
    }

    if (isCollectingFactors && shouldStopFactorCollection(line)) {
      isCollectingFactors = false;
      console.log(`  🛑 Stopped factor collection`);
    }
    
    console.log(); // Empty line for readability
  }

  // Save last game
  if (currentGame && currentPrediction) {
    predictions.push({
      homeTeam,
      awayTeam,
      prediction: currentPrediction,
      confidence: currentConfidence,
      reasoning: currentReasoning.trim(),
      week: currentWeek
    });
    console.log(`💾 Saved final game: ${awayTeam} @ ${homeTeam}`);
    console.log(`   Prediction: "${currentPrediction}"`);
    console.log(`   Confidence: ${currentConfidence}%`);
  }

  return predictions;
}

const results = parseAndAnalyze(sampleWeek4Text);

console.log(`\n=== FINAL PARSING RESULTS ===`);
console.log(`Found ${results.length} predictions:\n`);

results.forEach((pred, index) => {
  console.log(`${index + 1}. ${pred.awayTeam} @ ${pred.homeTeam}`);
  console.log(`   Week: ${pred.week}`);
  console.log(`   Prediction: "${pred.prediction}"`);
  console.log(`   Confidence: ${pred.confidence}%`);
  console.log(`   Reasoning: "${pred.reasoning}"`);
  
  // Analyze potential issues
  console.log(`   Analysis:`);
  if (pred.prediction.includes('Cardinals -1') || pred.prediction.includes('Under 43')) {
    console.log(`     ⚠️  Prediction seems truncated (${pred.prediction})`);
  }
  if (pred.prediction.includes('Mean') || pred.prediction.includes('Total')) {
    console.log(`     ⚠️  Prediction contains simulation data instead of final recommendation`);
  }
  if (pred.confidence === 70) {
    console.log(`     ⚠️  Using default confidence instead of parsed confidence`);
  }
  console.log();
});

export {};