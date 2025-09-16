# LLM-Based Sports Data Service

This project now includes an alternative to traditional sports APIs using Large Language Models (LLMs) to generate and manage NFL schedule data.

## How It Works

The `LLMSportsAPI` service uses a multi-tier fallback approach:

1. **Primary**: Attempts to fetch real data from ESPN API (if available)
2. **Secondary**: Uses OpenAI GPT-4 to generate realistic NFL schedules
3. **Fallback**: Provides mock data for development/testing

## Benefits

✅ **No API Costs**: Avoids expensive sports data subscriptions
✅ **No Rate Limits**: Generate unlimited schedules
✅ **Always Available**: Works even if external APIs are down
✅ **Realistic Data**: LLM generates plausible NFL matchups
✅ **Flexible**: Easy to customize for different sports/leagues

## Limitations

⚠️ **Not Production Ready**: LLM-generated data may be inaccurate
⚠️ **Requires API Key**: Needs OpenAI API key (costs apply)
⚠️ **Data Freshness**: May not reflect real-time schedule changes
⚠️ **Legal Concerns**: Ensure compliance with betting regulations

## Setup

1. **Environment Variables**: Ensure your `.env` file has:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Import the Service**:
   ```typescript
   import { llmSportsAPI } from '../lib/llmSportsAPI';
   ```

3. **Use in Components**:
   ```typescript
   // Instead of espnAPI, use:
   const games = await llmSportsAPI.getCurrentWeekGames();
   ```

## Testing

Run the test script to verify everything works:

```typescript
import './lib/testLLMSportsAPI';
```

## API Methods

- `fetchCurrentWeekSchedule()`: Get current week NFL schedule
- `getCurrentWeekGames()`: Get games with caching
- `saveScheduleToDatabase()`: Save schedule to Supabase
- `loadScheduleFromDatabase()`: Load cached schedule

## Cost Analysis

- **OpenAI API**: ~$0.002 per schedule generation
- **No sports API fees**: Saves $50-200/month
- **Database**: Standard Supabase costs

## When to Use This

✅ **Development/Prototyping**: Perfect for building UI/features
✅ **Low-traffic applications**: Personal projects or small forums
✅ **API fallback**: As backup when primary APIs fail
✅ **Learning purposes**: Understanding sports data structures

## When NOT to Use This

❌ **Production betting sites**: Requires verified, real-time data
❌ **High-traffic applications**: LLM calls can be slow
❌ **Legal betting platforms**: May violate gambling regulations
❌ **Real money applications**: Data accuracy is critical

## Alternatives Considered

- **Free APIs**: Limited requests, poor reliability
- **Paid APIs**: $50-200/month, more reliable but expensive
- **Web Scraping**: Unreliable, against terms of service
- **Manual Entry**: Time-consuming, error-prone

## Future Improvements

- Add web search capabilities for real-time data
- Implement data validation against known schedules
- Add support for multiple sports leagues
- Create hybrid approach (LLM + limited API calls)