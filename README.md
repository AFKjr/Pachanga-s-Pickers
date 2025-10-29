# Pachanga Picks

A modern sports betting analytics platform featuring Monte Carlo simulation-based NFL predictions, comprehensive performance tracking, and real-time betting analytics.

## Core Features

### Prediction Generation
- **Monte Carlo Simulations**: 10,000 iterations per game for statistical predictions
- **Edge Calculations**: Betting edge for moneyline, spread, and O/U bets
- **Multiple Bet Types**: Moneyline, Against The Spread (ATS), and Over/Under (O/U)
- **Real-Time Odds**: Integration with The Odds API (DraftKings lines)
- **Automated & Manual Entry**: Generate predictions via API or paste AI agent output

### Performance Analytics
- **Comprehensive Tracking**: Moneyline, ATS, and O/U results tracked separately
- **Weekly Breakdowns**: Performance metrics by week and team
- **ROI Calculations**: Unit tracking with standard -110 odds
- **Confidence Analysis**: Performance by confidence level (High/Medium/Low)

### Admin Dashboard
- **Pick Management**: Create, edit, and revise predictions
- **Results Entry**: Score input with automatic calculation of all bet types
- **Duplicate Detection**: Clean up redundant picks
- **Optimistic Updates**: Queue changes and commit atomically

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions) + Supabase Edge Functions (Deno)
- **Simulations**: Monte Carlo for NFL predictions
- **APIs**: The Odds API for real-time betting odds

##  Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

##  Project Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   ├── HomePage.tsx    # Main user-facing page
│   ├── PicksDisplay.tsx # Picks grid display
│   └── ...
├── contexts/           # React context providers
│   └── AuthContext.tsx # Authentication state
├── hooks/              # Custom React hooks
│   ├── useAgentTextParser.ts    # Parse AI output
│   ├── useOptimisticUpdates.ts  # State management
│   └── ...
├── lib/                # Core utilities
│   ├── api.ts          # Supabase API wrapper
│   ├── supabase.ts     # Supabase client
│   ├── events.ts       # Global event bus
│   └── atomicOperations.ts # Transaction-like updates
├── pages/              # Admin page components
│   └── admin/
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
│   ├── calculations/   # Betting calculations
│   ├── nflWeeks.ts     # NFL season week mapping
│   └── inputValidation.ts # XSS protection
└── App.tsx             # Root component

supabase/
└── functions/
    └── generate-predictions/
        ├── index.ts   # Supabase Edge Function (Deno runtime)
        └── lib/       # Prediction generation logic
```

##  How Monte Carlo Predictions Work

1. **Fetch Live Odds**: Get current NFL game odds from The Odds API
2. **Team Stats**: Use ESPN stats or fallback to league averages
3. **Run Simulation**: 500 iterations per game simulating:
   - Quarter-by-quarter scoring
   - Possession outcomes (TD, FG, or no score)
   - Offensive vs defensive matchups
4. **Generate Predictions**: Analyze simulation results for:
   - Moneyline winner (win probability)
   - ATS coverage (spread probability)
   - Over/Under outcome (total points probability)
5. **Confidence Levels**: 
   - High: ≥65% probability
   - Medium: 55-64% probability
   - Low: <55% probability

##  Authentication & Security

- **Supabase Auth**: Email/password authentication with email verification
- **OWASP-Compliant**: Password validation with entropy calculation
- **Rate Limiting**: Client-side rate limiting (5 attempts per minute)
- **Admin-Only Actions**: Pick creation/editing restricted to admin users
- **Input Validation**: XSS protection and sanitization on all inputs
- **Secure Sessions**: HTTPOnly cookies with automatic refresh

## Performance Tracking

### Metrics Calculated
- **Moneyline Record**: Win/loss record for straight-up picks
- **ATS Record**: Against The Spread performance with push tracking
- **O/U Record**: Over/Under totals accuracy
- **Units Won/Lost**: Profit/loss assuming standard -110 odds
- **Win Rate by Confidence**: Performance stratified by prediction confidence
- **Cover Margin**: Average points by which ATS picks cover
- **Weekly Breakdown**: Performance metrics by NFL week
- **Team Analysis**: Performance when picking specific teams

##  Admin Features

### Generate Picks
- **Automated**: Click "Generate Predictions" to run Monte Carlo simulations
- **Manual Entry**: Paste AI agent output for parsing and import

### Manage Picks
- **Revise**: Edit predictions, reasoning, and game details
- **Search & Filter**: Find picks by team, week, or prediction text
- **Pin Important Picks**: Highlight key predictions
- **Clean Duplicates**: Remove duplicate picks for same game/week

### Update Results
- **Score Entry**: Input final scores with automatic result calculation
- **Batch Updates**: Queue multiple changes and commit atomically
- **Real-Time Sync**: Changes immediately reflected across the app

## Important Notes

### API Usage Limits
- **The Odds API Free Tier**: 500 requests/month
- Each prediction generation uses 1 request
- Monitor usage to avoid quota exhaustion

### Data Disclaimer
All predictions and betting analytics are for **entertainment and educational purposes only**. Past performance does not guarantee future results. When gaming, please play responsibly and within your means.

### Odds Accuracy
Betting efficiency metrics assume standard -110 odds. Actual sportsbook odds may vary. Always verify current lines before placing any wagers.

## License

This project is private and proprietary.

---

Built by AFKj Studio_AFK