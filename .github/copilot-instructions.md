# Pachanga Picks - AI Coding Agent Instructions

## Architecture Overview

**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase + Monte Carlo Simulations

**Core Components**:
- **Frontend**: Single-page React app with React Router (routes: `/`, `/admin/*`)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions) + Supabase Edge Functions (Deno)
- **External APIs**: The Odds API (DraftKings lines) for real-time betting odds
- **Data Flow**: Admin triggers Monte Carlo sim → Edge Function generates predictions → Supabase storage → React components with real-time updates

**Key Data Models** (`src/types/index.ts`):
- `Pick`: Monte Carlo-generated predictions with confidence scores (0-100), edge calculations for all three bet types
- `GameInfo`: JSONB structure for flexible game metadata (teams, scores, odds, favorite/underdog info)
- `MonteCarloResults`: Detailed simulation results (win probabilities, predicted scores, cover probabilities)

**Database Tables**:
- `picks`: Core predictions table with results tracking for ML/ATS/O/U
- `profiles`: User profiles with `is_admin` boolean flag
- `team_stats_cache`: Team statistics (offensive/defensive) imported via CSV
- `team_name_mapping`: Team name normalization for API consistency

## Critical Patterns & Conventions

### Authentication & Authorization
- **Context**: Use `AuthContext` for all auth operations (`src/contexts/AuthContext.tsx`)
- **Admin Check**: Query `profiles.is_admin` field, never assume admin status
- **User Profiles**: Store in `profiles` table with `username` as unique identifier
- **RLS Policies**: All database access controlled by Supabase Row Level Security
- **Protected Routes**: Admin routes require authentication + admin privileges
- **OWASP Compliance**: Password validation with entropy calculation, rate limiting (5 attempts/min)
- **Secure Sessions**: HTTPOnly cookies with automatic refresh

### API Layer (`src/lib/api.ts`)
- **Consistent Structure**: All API functions return `{ data, error }` objects
- **Error Handling**: Use `handleSupabaseError()` and `createAppError()` utilities
- **Profile Enrichment**: Always join user profiles for display names (`author_username`)
- **Real-time**: Use `supabase.channel()` for live updates on picks
- **Admin Verification**: Helper function `verifyAdminUser()` for admin-only operations
- **Input Validation**: Use `validatePickData()` before database operations

### Edge Calculation System
- **Core Logic**: `src/utils/edgeCalculator.ts` - calculates betting edge for all bet types
- **Formula**: Edge = Model Probability - Implied Probability from Odds
- **Display**: `HorizontalPickCard.tsx` shows edge with color-coded confidence bars
- **Storage**: Edge values stored in `picks` table (moneyline_edge, spread_edge, ou_edge)
- **Odds Source**: The Odds API (DraftKings lines) - real-time odds for predictions
- **No Fallbacks**: Returns 0 if odds missing (no hardcoded values)

### Monte Carlo Prediction Workflow
- **Edge Function**: `supabase/functions/generate-predictions/index.ts` (Deno runtime)
- **Two Modes**:
  - **Live Mode**: Fetches current odds from The Odds API, uses latest team stats
  - **Historical Mode**: Uses stored odds + week-specific stats for past games
- **Iterations**: 10,000 per game for statistical accuracy
- **Output**: Win probabilities, predicted scores, cover probabilities, edge calculations
- **Storage**: Saves to `picks` table with `monte_carlo_results` JSONB and edge values

### Database Schema Patterns
- **UUID Primary Keys**: All tables use `gen_random_uuid()`
- **Timestamps**: `created_at`/`updated_at` with timezone
- **Result Enums**: `result`, `ats_result`, `ou_result` ('win', 'loss', 'push', 'pending')
- **Relationships**: Foreign keys with CASCADE deletes
- **JSONB Flexibility**: `game_info`, `monte_carlo_results`, `weather` store complex data
- **Edge Storage**: DECIMAL fields for `moneyline_edge`, `spread_edge`, `ou_edge`
- **Favorite Tracking**: `favorite_team`, `underdog_team`, `favorite_is_home` in `game_info`

## Essential Developer Workflows

### Environment Setup
```bash
# Required env vars (prefix with VITE_ for client access)
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
OPENWEATHER_API_KEY=your-weather-key  # Optional: Weather impact analysis
ODDS_API_KEY=your-odds-key            # Required: The Odds API access
```

### Build & Development
```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # TypeScript compilation + Vite build
npm run lint     # ESLint with strict rules
npm run preview  # Preview production build
```

### Admin Routes
- `/admin` - Dashboard with weekly/all-time statistics
- `/admin/generate` - Generate Monte Carlo predictions (live or historical mode)
- `/admin/manage` - Edit, revise, and organize published picks
- `/admin/results` - Enter game scores and calculate results
- `/admin/team-stats` - Import/manage team statistics via CSV


### Monte Carlo Prediction Generation
1. Access `/admin/generate` route (requires `is_admin: true`)
2. Only **Live Mode** is supported (fetches current odds + latest stats for upcoming games)
3. Click "Generate Monte Carlo Predictions" button
4. Edge Function runs 10,000 iterations per game
5. Saves to `picks` table with:
   - Game analysis (moneyline, spread, O/U predictions)
   - Confidence scores (0-100%)
   - Edge calculations for each bet type
   - Monte Carlo results (probabilities, predicted scores)
   - Weather impact (if available)

### Results Entry & Tracking
1. Navigate to `/admin/results`
2. Input final scores for completed games
3. System automatically calculates:
   - Moneyline result (win/loss)
   - ATS result (win/loss/push based on spread)
   - O/U result (over/under/push based on total)
4. Statistics dashboard updates in real-time

### Spread & Push Handling (Current Spec)
- Spread coverage logic now tracks three outcomes per simulation:
  - Favorite covers: margin > spread
  - Underdog covers: margin < spread
  - Push: margin == spread (split 50/50 in probability calculations)
- Display logic always matches the pick (favorite or underdog) to the correct probability
- No historical predictions are generated; all code for historical mode is commented out and deprecated

```

## Component Architecture Patterns

### Data Fetching
```typescript
// Always destructure { data, error } from API calls
const { data: picks, error } = await picksApi.getAll();
if (error) console.error('Failed to fetch picks:', error);
```

### State Management
- **Local State**: `useState` for component-specific state
- **Auth State**: `useAuth()` context hook
- **Real-time Updates**: Supabase subscriptions for live data

### Error Boundaries
- **API Errors**: Display user-friendly messages for failed requests
- **Auth Errors**: Redirect to sign-in for unauthorized access
- **Network Errors**: Graceful fallbacks for offline scenarios

## File Organization Guidelines

### `src/lib/`
- `api.ts`: All Supabase CRUD operations
- `supabase.ts`: Client configuration and initialization
- `atomicOperations.ts`: Database atomic operations
- `events.ts`: Event handling utilities
- `api/`: API-related utilities (currently empty)

### `src/components/`
- `HomePage.tsx`: Main user-facing homepage with stats dashboard and picks display
- `HorizontalPickCard.tsx`: Pick card component showing edge, predictions, and results
- `StatsDashboard.tsx`: Weekly and all-time performance metrics
- `PicksDisplay.tsx`: Filterable list of picks with week selector
- `AuthModal.tsx`: Sign-in/sign-up forms with OWASP-compliant validation
- `APIPredictionsGenerator.tsx`: Monte Carlo prediction generation interface
- `AdminPickManager.tsx`: Pick editing and management interface
- `AdminPickResults.tsx`: Results entry for completed games
- `AdminTeamStats.tsx`: CSV import and team stats management
- `LandingPage.tsx`: Marketing page for unauthenticated users
- `ProtectedContent.tsx`: Route guard requiring authentication

### `src/pages/admin/`
- `DashboardPage.tsx`: Admin dashboard with statistics overview
- `GeneratePicksPage.tsx`: Monte Carlo prediction generation page
- `ManagePicksPage.tsx`: Pick management and editing page
- `UpdateResultsPage.tsx`: Game results entry page
- `TeamStatsPage.tsx`: Team statistics import/management page

### Database & Edge Functions
- `supabase/config.toml`: Supabase project configuration
- `supabase/functions/generate-predictions/`: Deno edge function for Monte Carlo simulations
  - `index.ts`: Main handler with live/historical mode routing
  - `lib/generators/`: Live and historical prediction generators
  - `lib/odds/`: The Odds API integration
  - `lib/database/`: Team stats fetching and validation

## Common Pitfalls to Avoid

### Authentication
- Never assume user is authenticated - always check `user` from `useAuth()`
- Admin routes require both authentication AND `is_admin` check
- Profile data loads asynchronously - handle loading states

### Database Operations
- Always include error handling for Supabase calls
- Use proper TypeScript types from `src/types/index.ts`
- Respect RLS policies - don't bypass with service keys

### Edge Calculation
- Never hardcode odds values - always use stored odds from database
- Edge calculation requires both Monte Carlo probabilities AND odds data
- Return 0 for edge when odds are missing (graceful degradation)
- Use `calculatePickEdges()` utility for consistent edge calculations

### Monte Carlo Simulations
- Edge Function runs on Deno runtime (not Node.js) - syntax differences matter
- Live mode requires The Odds API key - handle API failures gracefully
- Historical mode uses stored odds from previous weeks
- Validate team stats exist before running simulations
- Weather API is optional - simulations work without it

### Real-time Features
- Clean up subscriptions in `useEffect` cleanup functions
- Handle connection drops gracefully
- Test real-time updates across multiple browser tabs
- Use `globalEvents` for cross-component communication

## Performance Considerations

- **Database Queries**: Use appropriate indexes (defined in schema)
- **API Calls**: Cache Monte Carlo results in Supabase tables
- **Bundle Size**: Lazy load admin components
- **Real-time**: Limit subscription scope to necessary data only
- **Edge Functions**: 10,000 Monte Carlo iterations per game - monitor execution time

## Deployment Notes

- **Environment Variables**: All `VITE_` prefixed vars exposed to client
- **Supabase Config**: Run schema SQL in Supabase dashboard
- **Build Process**: `npm run build` generates optimized bundle
- **CORS**: Supabase handles CORS for API routes automatically
- **Edge Functions**: Deploy via `supabase functions deploy generate-predictions`
- **Data Collection**: Manual data entry only (no automated scraping)</content>
<parameter name="filePath">.github/copilot-instructions.md