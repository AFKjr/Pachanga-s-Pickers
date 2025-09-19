# Automatic Results Update System

This system provides automatic updating of pick results from 'pending' to 'win', 'loss', or 'push' based on actual game outcomes.

## Features

- **Manual Updates**: Admin interface for manually updating individual pick results
- **Automatic Updates**: Scheduled system that fetches game results and updates picks automatically
- **Multiple Data Sources**: Supports SportsData.io API with fallback options
- **Real-time Statistics**: Updates immediately reflect in the "Pachanga's All Time Record" display

## Components

### 1. AdminPickResults Component
- **Location**: `src/components/AdminPickResults.tsx`
- **Purpose**: Manual admin interface for updating pick results
- **Features**:
  - Displays all pending picks in a scrollable list
  - Shows game details (teams, date, prediction)
  - Win/Loss/Push buttons for each pick
  - Immediate database updates

### 2. AutoUpdateResults Component
- **Location**: `src/components/AutoUpdateResults.tsx`
- **Purpose**: Trigger automatic updates from the admin panel
- **Features**:
  - "Update All Pending Results" button
  - "Schedule Automatic Update" button
  - Real-time progress and error reporting
  - Setup instructions for API keys

### 3. AutomaticResultsUpdater Service
- **Location**: `src/lib/automaticResultsUpdater.ts`
- **Purpose**: Core logic for fetching and processing game results
- **Features**:
  - Multi-source data fetching (SportsData.io, ESPN, web scraping)
  - Intelligent pick result determination
  - Team name to abbreviation mapping
  - Error handling and rate limiting

### 4. Supabase Edge Function
- **Location**: `supabase/functions/update-pick-results/index.ts`
- **Purpose**: Server-side automatic updates that can be scheduled
- **Features**:
  - Cron job compatible
  - Service role authentication
  - Comprehensive error logging
  - Batch processing of multiple games

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# SportsData.io API (Primary data source)
VITE_SPORTS_DATA_API_KEY=your_api_key_here

# Supabase (for Edge Function)
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SPORTS_DATA_API_KEY=your_api_key_here
```

### 2. Get API Keys

1. **SportsData.io**: Sign up at [sportsdata.io](https://sportsdata.io/) for NFL data
2. **Supabase**: Get service role key from your Supabase project settings

### 3. Deploy Edge Function

```bash
# Deploy the edge function
supabase functions deploy update-pick-results

# Set up cron job (optional)
# This would be configured in your Supabase dashboard or CI/CD
```

## Usage

### Manual Updates (Immediate)

1. Navigate to `/admin` in your application
2. Scroll to the "Admin Pick Results" section
3. Click the appropriate button (Win/Loss/Push) for each pending pick
4. Results update immediately in the database and statistics

### Automatic Updates (Batch)

1. Navigate to `/admin` in your application
2. Scroll to the "Automatic Results Update" section
3. Click "Update All Pending Results"
4. Monitor the progress and any errors in the results display

### Scheduled Updates (Cron)

Set up a cron job to call the Edge Function periodically:

```bash
# Example: Run every 6 hours
0 */6 * * * curl -X POST https://your-project.supabase.co/functions/v1/update-pick-results
```

## API Integration Details

### SportsData.io Integration

- **Endpoint**: `https://api.sportsdata.io/v2/json/GamesBySeason/{season}`
- **Data**: NFL games with scores and status
- **Rate Limits**: 1000 requests/day (free tier)
- **Authentication**: API key in query parameter

### Team Name Mapping

The system includes a comprehensive mapping of full team names to NFL abbreviations:

```javascript
const teamMap = {
  'Kansas City Chiefs': 'KC',
  'Buffalo Bills': 'BUF',
  // ... 30+ teams
}
```

### Pick Result Logic

The system determines pick results by:

1. **Parse Prediction**: Extract predicted winner from pick text
2. **Get Actual Result**: Compare final scores from API
3. **Determine Outcome**:
   - **Win**: Predicted winner matches actual winner
   - **Loss**: Predicted winner lost the game
   - **Push**: Game ended in a tie

## Testing

Run the test script to verify the system:

```bash
node test-automatic-updater.js
```

This tests:
- Database connectivity
- Team name mapping
- Pick result determination logic
- API key validation
- SportsData.io API integration

## Error Handling

The system includes comprehensive error handling:

- **API Failures**: Graceful fallback to alternative data sources
- **Network Issues**: Retry logic with exponential backoff
- **Data Parsing**: Validation of API responses
- **Database Errors**: Transaction rollback and error logging
- **Rate Limiting**: Built-in delays between API calls

## Monitoring

Monitor the system through:

1. **Admin Panel**: Real-time update status and error reporting
2. **Console Logs**: Detailed logging in browser dev tools
3. **Supabase Logs**: Edge function execution logs
4. **Database**: Direct query of `picks` table for result status

## Troubleshooting

### Common Issues

1. **No API Key**: Add `VITE_SPORTS_DATA_API_KEY` to environment
2. **Rate Limited**: Wait for API quota reset or upgrade plan
3. **Team Name Mismatch**: Check team name mapping in the code
4. **Game Not Found**: Verify game date and team names in database

### Debug Mode

Enable debug logging by setting:

```bash
VITE_DEBUG=true
```

This provides additional console output for troubleshooting.

## Future Enhancements

- **Additional APIs**: Integration with ESPN, NFL.com, and other sports data providers
- **Web Scraping**: Fallback scraping for games not available via API
- **Real-time Updates**: WebSocket integration for live game updates
- **Machine Learning**: AI-powered result prediction confidence scoring
- **Multi-Sport Support**: Extension to NBA, MLB, and other sports

## Security Considerations

- **API Keys**: Never commit API keys to version control
- **Service Role**: Edge function uses service role for database access
- **Rate Limiting**: Built-in delays prevent API abuse
- **Input Validation**: All external data is validated before processing
- **Error Logging**: Sensitive information is not logged

## Performance

- **Batch Processing**: Updates multiple picks efficiently
- **Caching**: API responses cached to reduce redundant calls
- **Async Operations**: Non-blocking updates with progress tracking
- **Database Indexing**: Optimized queries for pending picks