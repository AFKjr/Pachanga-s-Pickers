/**
 * Example usage of the new JSON-based prediction parser
 * 
 * This demonstrates how to structure AI responses for optimal parsing
 */

// Example AI response with JSON structure
const exampleAiResponse = `
Here's my analysis of this week's NFL games:

Looking at the matchups, I see some great value opportunities this week. The Chiefs vs Bills game stands out as a potential high-scoring affair, while the defensive battle between the Ravens and Browns should stay under the total.

My detailed Monte Carlo simulations have run 10,000 iterations for each game to provide the most accurate predictions possible.

---PARSEABLE_DATA---
{
  "prediction_timestamp": "2025-09-30T14:30:00-04:00",
  "games": [
    {
      "away_team": "Kansas City Chiefs",
      "home_team": "Buffalo Bills", 
      "away_record": {
        "wins": 8,
        "losses": 2,
        "ties": 0,
        "ats_wins": 6,
        "ats_losses": 4
      },
      "home_record": {
        "wins": 7,
        "losses": 3,
        "ties": 0,
        "ats_wins": 5,
        "ats_losses": 5
      },
      "monte_carlo_results": {
        "iterations": 10000,
        "home_win_probability": 0.58,
        "away_win_probability": 0.42,
        "predicted_home_score": 27.3,
        "predicted_away_score": 24.1,
        "confidence_interval_low": 20.5,
        "confidence_interval_high": 34.2
      },
      "predictions": {
        "moneyline": {
          "pick": "Buffalo Bills",
          "vegas_odds": -150,
          "confidence": "Medium"
        },
        "spread": {
          "line": -3.5,
          "pick": "Buffalo Bills",
          "confidence": "High"
        },
        "total": {
          "line": 52.5,
          "pick": "Under",
          "predicted_total": 51.4,
          "confidence": "Medium"
        }
      },
      "key_factors": [
        "Home field advantage in cold weather",
        "Bills defense has improved significantly", 
        "Chiefs offensive line injuries",
        "Under 52.5 provides value based on weather conditions"
      ]
    },
    {
      "away_team": "Baltimore Ravens",
      "home_team": "Cleveland Browns",
      "away_record": {
        "wins": 6,
        "losses": 4,
        "ties": 0,
        "ats_wins": 7,
        "ats_losses": 3
      },
      "home_record": {
        "wins": 4,
        "losses": 6,
        "ties": 0,
        "ats_wins": 4,
        "ats_losses": 6
      },
      "monte_carlo_results": {
        "iterations": 10000,
        "home_win_probability": 0.35,
        "away_win_probability": 0.65,
        "predicted_home_score": 17.8,
        "predicted_away_score": 21.2,
        "confidence_interval_low": 28.5,
        "confidence_interval_high": 48.7
      },
      "predictions": {
        "moneyline": {
          "pick": "Baltimore Ravens",
          "vegas_odds": -180,
          "confidence": "High"
        },
        "spread": {
          "line": -4.5,
          "pick": "Baltimore Ravens",
          "confidence": "High"
        },
        "total": {
          "line": 41.5,
          "pick": "Under",
          "predicted_total": 39.0,
          "confidence": "High"
        }
      },
      "key_factors": [
        "Ravens rushing attack vs Browns weak run defense",
        "Lamar Jackson's mobility advantage",
        "Browns offensive struggles this season",
        "Divisional game trends favor the under"
      ]
    }
  ]
}
`;

// Usage in your AI agent:
console.log("=== JSON PARSER EXAMPLE ===");
console.log("AI Response structure:");
console.log("1. Natural language analysis");
console.log("2. ---PARSEABLE_DATA--- separator");
console.log("3. Structured JSON with all game data");
console.log("");
console.log("Benefits:");
console.log("✅ Reliable parsing - no text pattern matching");
console.log("✅ Rich data structure with Monte Carlo results");
console.log("✅ Multiple bet types (spread, total, moneyline)");
console.log("✅ Confidence levels and detailed records");
console.log("✅ Automatic fallback to legacy text parsing");

export { exampleAiResponse };