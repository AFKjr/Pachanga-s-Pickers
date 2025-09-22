# Relevance AI Agent Prompts for FTN Webhook Integration

## Agent Configuration Overview

To invoke the FTN webhook from your Relevance AI agent, you'll need to configure webhook calls within your agent's workflow and use specific prompts that trigger data retrieval.

## Webhook Configuration in Relevance AI

### 1. Webhook Setup in Agent

In your Relevance AI agent configuration:

**Webhook URL**: `http://localhost:3001/api/ftn-webhook`
**Method**: POST
**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "{{your_relevance_api_key}}"
}
```

### 2. Webhook Body Templates

For different data types, use these request bodies:

**Injury Reports**:
```json
{
  "dataType": "injuries",
  "week": "{{week_number}}"
}
```

**Weather Data** (when implemented):
```json
{
  "dataType": "weather"
}
```

**Depth Charts** (when implemented):
```json
{
  "dataType": "depth-charts",
  "team": "{{team_code}}"
}
```

## Sample Agent Prompts

### 1. Game Analysis with Injury Data

**User Prompt**: 
```
"Analyze the Week 3 matchup between Kansas City Chiefs and Denver Broncos, including current injury reports"
```

**Agent Workflow**:
```javascript
// Step 1: Extract week number from user input
const weekNumber = extractWeek(userInput) || getCurrentWeek();

// Step 2: Call FTN webhook for injury data
const injuryData = await webhook({
  url: "http://localhost:3001/api/ftn-webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.RELEVANCE_API_KEY
  },
  body: {
    dataType: "injuries",
    week: weekNumber.toString()
  }
});

// Step 3: Use injury data in analysis
if (injuryData.success) {
  const injuries = injuryData.data;
  const analysis = await analyzeGameWithInjuries(gameInfo, injuries);
  return analysis;
} else {
  return analyzeGameWithoutInjuries(gameInfo);
}
```

### 2. Team-Specific Injury Analysis

**User Prompt**:
```
"What are the current injury concerns for the Kansas City Chiefs this week?"
```

**Agent Response Logic**:
```javascript
const currentWeek = getCurrentNFLWeek();
const injuryData = await webhook({
  url: "http://localhost:3001/api/ftn-webhook",
  method: "POST", 
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.RELEVANCE_API_KEY
  },
  body: {
    dataType: "injuries",
    week: currentWeek
  }
});

if (injuryData.success) {
  const teamInjuries = injuryData.data.filter(injury => 
    injury.team === "KC" || injury.team === "Kansas City"
  );
  
  return formatInjuryReport(teamInjuries);
}
```

### 3. Comprehensive Game Prediction

**User Prompt**:
```
"Generate a detailed prediction for Chiefs vs Broncos including all available data"
```

**Agent Workflow**:
```javascript
async function generateComprehensivePrediction(gameInfo) {
  const week = extractWeekFromGame(gameInfo);
  
  // Get injury data
  const injuryData = await webhook({
    url: "http://localhost:3001/api/ftn-webhook",
    method: "POST",
    headers: {
      "Content-Type": "application/json", 
      "x-api-key": process.env.RELEVANCE_API_KEY
    },
    body: {
      dataType: "injuries",
      week: week
    }
  });
  
  // Get weather data (when available)
  const weatherData = await webhook({
    url: "http://localhost:3001/api/ftn-webhook",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.RELEVANCE_API_KEY  
    },
    body: {
      dataType: "weather"
    }
  });
  
  // Combine all data for prediction
  const prediction = await generatePrediction({
    game: gameInfo,
    injuries: injuryData.success ? injuryData.data : [],
    weather: weatherData.success ? weatherData.data : null
  });
  
  return prediction;
}
```

## Prompt Triggers for FTN Data

### Keywords that should trigger FTN webhook calls:

**Injury-related prompts**:
- "injury report"
- "injury concerns" 
- "injured players"
- "player health"
- "questionable players"
- "out/doubtful players"

**Weather-related prompts**:
- "weather conditions"
- "game weather"
- "outdoor game"
- "weather impact"

**Team analysis prompts**:
- "depth chart"
- "team depth"
- "roster analysis" 
- "backup players"

## Agent Prompt Templates

### 1. Automatic FTN Data Integration

```javascript
// Agent system prompt addition
const systemPrompt = `
You are an NFL prediction expert. When analyzing games, always:

1. Check for current injury reports using the FTN webhook
2. Consider weather conditions for outdoor games  
3. Factor in team depth and key player availability
4. Provide confidence levels based on data availability

When you need injury data, call the FTN webhook with:
- dataType: "injuries" 
- week: [current NFL week]

Format injury data in your analysis as:
- Key injuries affecting the matchup
- Impact on team performance
- Confidence adjustment based on injury concerns
`;
```

### 2. Conditional Webhook Logic

```javascript
async function shouldCallFTNWebhook(userPrompt, gameInfo) {
  const injuryKeywords = ["injury", "injured", "health", "questionable", "doubtful"];
  const weatherKeywords = ["weather", "conditions", "outdoor", "climate"];
  
  const needsInjuryData = injuryKeywords.some(keyword => 
    userPrompt.toLowerCase().includes(keyword)
  );
  
  const needsWeatherData = weatherKeywords.some(keyword =>
    userPrompt.toLowerCase().includes(keyword)  
  );
  
  // Always get injury data for game predictions
  if (gameInfo && gameInfo.teams) {
    return { injuries: true, weather: needsWeatherData };
  }
  
  return { injuries: needsInjuryData, weather: needsWeatherData };
}
```

### 3. Error Handling for FTN Data

```javascript
async function getFTNDataSafely(dataType, options = {}) {
  try {
    const response = await webhook({
      url: "http://localhost:3001/api/ftn-webhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.RELEVANCE_API_KEY
      },
      body: {
        dataType: dataType,
        ...options
      }
    });
    
    if (response.success) {
      return {
        available: true,
        data: response.data,
        message: response.message
      };
    } else {
      console.log(`FTN ${dataType} data unavailable: ${response.error}`);
      return {
        available: false,
        error: response.error,
        fallback: true
      };
    }
  } catch (error) {
    console.log(`FTN webhook error: ${error.message}`);
    return {
      available: false,
      error: error.message,
      fallback: true
    };
  }
}
```

## Sample Agent Responses

### With FTN Data Available:
```
Based on the latest FTN injury reports for Week 3:

**Kansas City Chiefs Injury Concerns:**
- Patrick Mahomes: Ankle (Questionable) - 75% likely to play
- Travis Kelce: Knee (Probable) - Expected to play limited snaps

**Denver Broncos Injury Concerns:** 
- Russell Wilson: Shoulder (Doubtful) - Backup likely to start

**Prediction Impact:**
Chiefs favored by 7.5 points (was 3.5) due to Wilson's likely absence.
Confidence: 85% (High due to comprehensive injury data)

*Data source: Fantasy The Nerds injury reports*
```

### Without FTN Data (Fallback):
```
**Prediction based on available data:**
Chiefs vs Broncos analysis using ESPN and public sources.

Note: Enhanced injury data temporarily unavailable. 
Prediction confidence reduced to 70%.

*Recommendation: Monitor injury reports closer to game time*
```

## Implementation Steps

1. **Add webhook configuration** to your Relevance AI agent
2. **Update system prompts** to include FTN data usage
3. **Implement conditional logic** for when to call webhooks
4. **Add error handling** for webhook failures
5. **Test with sample prompts** to verify integration

## Testing Prompts

Use these prompts to test your agent's FTN integration:

1. "Analyze this week's Chiefs game including injury reports"
2. "What players are questionable for Week 3?"
3. "Generate a prediction for Ravens vs Patriots with all available data"
4. "How do current injuries affect the betting odds?"

The agent should automatically call the FTN webhook when these types of analysis are requested.