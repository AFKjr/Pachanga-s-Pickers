# Pachanga Picks - Sports Betting Analytics Platform

## High-Level Overview

**Pachanga Picks** is an advanced sports betting analytics platform that leverages **Monte Carlo simulations** to generate data-driven NFL predictions with true betting edge calculations. The platform combines statistical modeling, real-time odds tracking, and comprehensive performance analytics to provide users with actionable betting insights across Moneyline, Against The Spread (ATS), and Over/Under (O/U) markets.

---

## Core Value Proposition

### 🎯 **Edge-Focused Betting Intelligence**
Unlike traditional betting platforms that simply display odds, Pachanga Picks calculates **true betting edge** by comparing Monte Carlo-derived probabilities against implied probabilities from real-time DraftKings odds. Users can instantly see where the mathematical advantage lies.

### 📊 **Triple-Market Coverage**
Every NFL game receives comprehensive analysis across:
- **Moneyline**: Straight-up winner predictions with win probability
- **Against The Spread (ATS)**: Favorite/underdog cover analysis with spread probabilities
- **Over/Under (O/U)**: Total points predictions with over/under probabilities

### 📈 **Transparent Performance Tracking**
All predictions are tracked separately by bet type with historical records, win rates, ROI calculations (units won/lost), and weekly performance breakdowns. No hiding losses—complete transparency.

---

## How It Works

### **For End Users (Bettors)**

1. **Browse Weekly Picks**
   - View AI-generated predictions for all NFL games
   - See confidence scores (0-100%) for each pick
   - Access detailed reasoning and statistical analysis
   - Filter by week or view all-time picks

2. **Analyze Betting Edge**
   - Edge displayed as percentage (e.g., +5.2% = 5.2% advantage over sportsbook odds)
   - Color-coded confidence bars (green = strong edge, yellow = moderate, red = minimal)
   - Model probability vs. implied probability comparison
   - Separate edge calculations for each bet type (ML, ATS, O/U)

3. **Track Performance**
   - Real-time statistics dashboard with weekly and all-time metrics
   - Win/loss records for moneyline, ATS, and O/U bets
   - Units tracking (profit/loss assuming standard -110 odds)
   - Historical performance trends

4. **View Game Results**
   - Post-game results automatically calculated when scores are entered
   - Win/loss/push badges on pick cards
   - ATS calculations account for favorite vs. underdog selections
   - O/U results compare predicted vs. actual totals

---

### **For Administrators (Handicappers)**

#### **1. Generate Predictions (Two Modes)**

**Live Mode** (Upcoming Games):
- Fetches current odds from The Odds API (DraftKings lines)
- Uses latest team statistics from database
- Runs 10,000 Monte Carlo iterations per game
- Generates predictions with real-time edge calculations
- Optionally factors in weather conditions (temperature, wind, precipitation)

**Historical Mode** (Past Games):
- Uses odds stored at time of prediction
- Fetches week-specific team stats from database
- Enables backfill of past week predictions
- Maintains historical accuracy for performance tracking

#### **2. Team Statistics Management**
- Import offensive/defensive stats via CSV upload
- Track stats by week for historical accuracy
- Fields: yards per game, points per game, turnover differential, 3rd down %, red zone efficiency
- Manual entry ensures data quality (no unreliable web scraping)

#### **3. Pick Management**
- Edit predictions, reasoning, and game details
- Revise odds if sportsbook lines change
- Pin important picks for homepage visibility
- Delete duplicate or erroneous picks
- Search and filter by team, week, or prediction text

#### **4. Results Entry**
- Input final game scores
- System auto-calculates:
  - **Moneyline result**: Win if predicted team won, loss otherwise
  - **ATS result**: Win if favorite covered spread / underdog beat spread / push if exact
  - **O/U result**: Over if total > line / under if total < line / push if exact
- Batch updates with atomic commits (optimistic UI updates)
- Real-time sync across all connected users

---

## Technical Architecture

### **Frontend Stack**
- **React 18** with TypeScript for type-safe component development
- **Vite** for lightning-fast development and optimized production builds
- **Tailwind CSS** for modern, responsive UI design
- **React Router** with lazy loading for optimal bundle splitting

### **Backend Infrastructure**
- **Supabase PostgreSQL**: Primary database with JSONB for flexible data storage
- **Supabase Authentication**: Email/password with OWASP-compliant security
- **Row Level Security (RLS)**: Database-level access control
- **Real-time Subscriptions**: Live pick updates using Supabase channels

### **AI/ML Layer**
- **Monte Carlo Simulations**: 10,000 iterations per game for statistical predictions
- **Supabase Edge Functions (Deno)**: Server-side execution of compute-intensive simulations
- **Statistical Modeling**: Factors in team stats, home/away advantage, weather conditions
- **Probability Distributions**: Win probabilities, predicted scores, cover probabilities

### **External APIs**
- **The Odds API**: Real-time NFL odds from DraftKings (moneyline, spread, totals)
- **OpenWeather API** (Optional): Weather impact analysis for outdoor games

---

## Key Features Deep Dive

### **1. Edge Calculation System**
The heart of the platform's value proposition:

**Formula:**
```
Edge = Model Probability - Implied Probability from Odds

Example:
- Monte Carlo says Chiefs have 65% win probability
- -150 moneyline odds imply 60% probability
- Edge = 65% - 60% = +5% betting edge
```

**Implementation:**
- Core logic in `src/utils/edgeCalculator.ts`
- Converts American odds to decimal, then to implied probability
- Calculates edge separately for moneyline, spread, and O/U
- Stores edge values in database (moneyline_edge, spread_edge, ou_edge)
- Returns 0 if odds unavailable (no hardcoded fallback values)

**Visual Display:**
- `HorizontalPickCard.tsx` shows edge with confidence bars
- Green bar = strong edge (high confidence)
- Yellow bar = moderate edge (medium confidence)
- Red bar = minimal edge (low confidence)
- Displays "Your Edge" vs. "Opponent Edge" for context

### **2. Monte Carlo Simulation Engine**

**What It Does:**
- Simulates each game 10,000 times using team statistics
- Generates probability distributions for all outcomes
- Predicts final scores with confidence intervals
- Calculates cover probabilities for spread bets

**Team Statistics Used:**
- Offensive yards per game
- Defensive yards allowed per game
- Points per game (offensive)
- Points allowed per game (defensive)
- Turnover differential
- 3rd down conversion rate
- Red zone efficiency

**Output:**
```typescript
MonteCarloResults {
  home_win_probability: 65.2,           // % chance home team wins
  away_win_probability: 34.8,           // % chance away team wins
  favorite_cover_probability: 58.3,     // % chance favorite covers spread
  underdog_cover_probability: 41.7,     // % chance underdog covers spread
  over_probability: 52.1,               // % chance total goes over
  under_probability: 47.9,              // % chance total goes under
  predicted_home_score: 27.4,           // Average score from simulations
  predicted_away_score: 21.2,           // Average score from simulations
  moneyline_probability: 65.2,          // For edge calculation
  spread_probability: 58.3,             // For edge calculation
  total_probability: 52.1               // For edge calculation
}
```

### **3. Performance Analytics Dashboard**

**Weekly Stats:**
- Total picks for the week
- Moneyline record (W-L)
- ATS record (W-L-P) - pushes tracked separately
- O/U record (W-L-P)
- Units won/lost (assuming -110 odds)
- Overall win rate across all bet types
- Week selector to view historical performance

**All-Time Stats:**
- Cumulative records for all three bet types
- Total units won/lost since inception
- Win rate percentages with color coding (green ≥60%, yellow ≥52.4%, red <52.4%)
- Progress bars showing performance relative to benchmarks

**Why 52.4%?**
- Standard sports betting juice is -110 (bet $110 to win $100)
- Breakeven win rate = 52.4% to overcome the vig
- Any win rate above 52.4% is profitable long-term

### **4. Pick Card Design**

`HorizontalPickCard.tsx` displays:

**Header Section:**
- Home team vs. Away team with game date/time
- NFL week number
- League badge

**Three Bet Sections (Side-by-Side):**

**Moneyline Section:**
- Predicted winner with checkmark
- Odds (e.g., "-150")
- Model probability (e.g., "65.2% | 34.8%")
- Edge calculation (e.g., "+5.2% | -7.8%")
- Confidence bar (0-100%)
- Result badge (W/L/P) after game concludes

**Spread Section:**
- Predicted team with spread (e.g., "Chiefs -7.5")
- Odds (typically "-110")
- Favorite cover probability vs. underdog cover probability
- Edge calculation
- Confidence bar
- ATS result badge

**Over/Under Section:**
- Predicted direction (e.g., "OVER 47.5")
- Odds (typically "-110")
- Over probability vs. under probability
- Edge calculation
- Confidence bar
- O/U result badge

**Footer Section:**
- Detailed reasoning text explaining the pick
- Weather impact (if applicable)
- Key stats that influenced the prediction

### **5. Admin Dashboard**

**Navigation Sidebar:**
- 📊 Dashboard - Weekly/all-time performance overview
- 🎲 Generate - Monte Carlo prediction generation
- 📝 Manage - Edit and organize picks
- ✅ Results - Enter game scores
- 📈 Team Stats - Import/manage statistics

**Dashboard Page:**
- Week-by-week performance charts
- Trends analysis (improving/declining)
- Best/worst performances by team
- Confidence-stratified results (high/medium/low)

**Generate Page:**
- Mode selector (Live vs. Historical)
- Week selector for historical mode
- "Generate Monte Carlo Predictions" button
- Real-time generation progress
- Preview of generated picks before saving

**Manage Page:**
- Searchable/filterable pick list
- Quick edit modal for each pick
- Bulk delete for duplicates
- Pin/unpin functionality
- Revision history tracking

**Results Page:**
- List of picks awaiting score entry
- Input fields for home/away scores
- Auto-calculation of all bet types
- Optimistic UI updates with batch commit
- Undo capability before final save

**Team Stats Page:**
- CSV upload interface
- Data validation and preview
- Week assignment for imported stats
- Edit existing stats inline
- View historical stats by week

---

## User Experience Flow

### **New User Journey:**

1. **Landing Page**
   - Marketing copy emphasizing edge-focused analytics
   - Feature highlights (Monte Carlo simulations, triple-market coverage, transparent tracking)
   - "Get Free Access" CTA button
   - Example pick cards showing edge calculations

2. **Sign Up**
   - Email + password authentication
   - Username creation (3-30 characters, alphanumeric + hyphens/underscores)
   - OWASP-compliant password requirements:
     - Minimum 10 characters (15+ recommended)
     - Entropy calculation for strength assessment
     - Blocked common passwords (password123, qwerty, etc.)
     - No sequential characters (aaa, 111)
   - Client-side rate limiting (5 attempts per minute)

3. **Homepage Access**
   - Automatic redirect after successful authentication
   - Stats dashboard at top (weekly and all-time performance)
   - Pick cards displayed in horizontal format
   - Week selector to view past/future weeks
   - Real-time updates as new picks are published

4. **Browsing Picks**
   - Hover effects on pick cards (border glow, slight lift)
   - Click to expand reasoning section
   - Filter by week using segmented control
   - Scroll through all published picks
   - Watch results populate after games conclude

### **Admin User Journey:**

1. **Import Team Stats**
   - Navigate to `/admin/team-stats`
   - Download CSV template (if needed)
   - Upload CSV with offensive/defensive stats
   - Assign week number for historical tracking
   - Review and confirm import

2. **Generate Predictions**
   - Navigate to `/admin/generate`
   - Select mode:
     - **Live**: For upcoming games (fetches current odds)
     - **Historical**: For past games (uses stored odds)
   - Click "Generate Monte Carlo Predictions"
   - Edge Function executes:
     - Fetches team stats from database
     - Retrieves odds from The Odds API (live) or database (historical)
     - Runs 10,000 Monte Carlo simulations per game
     - Calculates win probabilities, predicted scores, cover probabilities
     - Computes edge values for all three bet types
     - Optionally fetches weather data
   - Preview generated picks
   - Save to database (creates `Pick` records)

3. **Manage Picks**
   - Navigate to `/admin/manage`
   - View all published picks
   - Search by team name or week
   - Click "Edit" to revise prediction/reasoning/odds
   - Click "Delete" to remove duplicates
   - Pin important picks for homepage prominence

4. **Enter Results**
   - Navigate to `/admin/results`
   - View list of completed games (picks with game_date in past)
   - Input home and away final scores
   - System auto-calculates:
     - **Moneyline**: Compare predicted winner to actual winner
     - **ATS**: Compare predicted spread result to actual spread result (accounting for favorite/underdog)
     - **O/U**: Compare predicted over/under to actual total
   - Click "Save Results"
   - Results immediately visible on homepage pick cards
   - Stats dashboard updates in real-time

---

## Security & Compliance

### **OWASP Best Practices:**
- **Password Security**: Entropy calculation, common password blocking, sequential character detection
- **Input Validation**: XSS protection via sanitization, SQL injection prevention via parameterized queries
- **Rate Limiting**: Client-side rate limiting (5 login attempts per minute)
- **Session Management**: HTTPOnly cookies, automatic token refresh, secure session storage
- **Error Handling**: User-friendly error messages without exposing sensitive details

### **Database Security:**
- **Row Level Security (RLS)**: Postgres policies enforce access control
  - Picks: Public read, admin-only write/update/delete
  - Profiles: Public read, users can update own profile
- **Admin Authorization**: Every admin operation checks `profiles.is_admin` flag
- **API Keys**: Environment variables for sensitive credentials (never committed to Git)

### **Data Privacy:**
- **Minimal Collection**: Only email, username, and password collected
- **No PII**: No phone numbers, addresses, or payment info stored
- **Anonymous Picks**: `user_id` can be null for system-generated picks
- **Profile Display**: Only username shown publicly, never email

---

## Performance Optimizations

### **Frontend:**
- **Lazy Loading**: Admin routes loaded on-demand (React.lazy)
- **Code Splitting**: Separate chunks for home vs. admin routes
- **Memoization**: React.memo for pick cards to prevent unnecessary re-renders
- **Optimistic Updates**: UI updates immediately, database commits in background
- **Debouncing**: Search/filter inputs debounced to reduce API calls

### **Backend:**
- **Database Indexes**: Primary keys (UUID), foreign keys, week column, created_at
- **JSONB Queries**: Efficient queries on game_info, monte_carlo_results using GIN indexes
- **Real-time Scoping**: Subscriptions limited to necessary tables/columns
- **Edge Function Caching**: Monte Carlo results cached in database (not re-run on every view)

### **Edge Functions (Deno):**
- **Parallel Processing**: Generate predictions for multiple games concurrently
- **Memory Management**: Stream results instead of holding all in memory
- **Timeout Handling**: Graceful degradation if Monte Carlo takes too long
- **Error Recovery**: Continue processing remaining games if one fails

---

## Data Flow Diagram

```
┌─────────────────┐
│  Admin User     │
└────────┬────────┘
         │ 1. Upload CSV
         ▼
┌─────────────────────────┐
│ AdminTeamStats.tsx      │
│ (CSV Parsing)           │
└────────┬────────────────┘
         │ 2. Save to DB
         ▼
┌─────────────────────────┐
│ Supabase PostgreSQL     │
│ table: team_stats_cache │
└────────┬────────────────┘
         │
         │ 3. Trigger Prediction Generation
         ▼
┌─────────────────────────────────────┐
│ Admin clicks "Generate Predictions" │
│ (APIPredictionsGenerator.tsx)       │
└────────┬────────────────────────────┘
         │ 4. HTTP POST to Edge Function
         ▼
┌───────────────────────────────────────────┐
│ Supabase Edge Function (Deno)             │
│ supabase/functions/generate-predictions   │
│                                            │
│ ┌─────────────────────────────────────┐   │
│ │ 1. Fetch team stats from DB         │   │
│ │ 2. Fetch odds from The Odds API     │   │
│ │ 3. Run 10,000 Monte Carlo sims      │   │
│ │ 4. Calculate probabilities          │   │
│ │ 5. Calculate edge values            │   │
│ │ 6. Generate reasoning text          │   │
│ └─────────────────────────────────────┘   │
└────────┬──────────────────────────────────┘
         │ 5. Save predictions
         ▼
┌─────────────────────────┐
│ Supabase PostgreSQL     │
│ table: picks            │
│ - prediction            │
│ - spread_prediction     │
│ - ou_prediction         │
│ - confidence            │
│ - reasoning             │
│ - monte_carlo_results   │
│ - moneyline_edge        │
│ - spread_edge           │
│ - ou_edge               │
│ - game_info (JSONB)     │
└────────┬────────────────┘
         │ 6. Real-time subscription
         ▼
┌─────────────────────────┐
│ HomePage.tsx            │
│ (React Component)       │
│                         │
│ ┌─────────────────────┐ │
│ │ StatsDashboard.tsx  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ PicksDisplay.tsx    │ │
│ │   ├─ HorizontalPick │ │
│ │   │   Card.tsx      │ │
│ │   ├─ Edge Display   │ │
│ │   └─ Confidence Bar │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │ 7. User views picks
         ▼
┌─────────────────────────┐
│  End User               │
│  (Bettor)               │
└─────────────────────────┘
```

---

## Technology Rationale

### **Why React 18?**
- Concurrent rendering for smoother UI updates
- Automatic batching of state updates
- Suspense for data fetching (lazy loading)
- Strong ecosystem and community support

### **Why TypeScript?**
- Type safety prevents runtime errors
- Better IDE autocomplete and IntelliSense
- Self-documenting code (interfaces define data structures)
- Easier refactoring with compile-time checks

### **Why Vite?**
- Lightning-fast HMR (Hot Module Replacement)
- Optimized production builds with tree-shaking
- Native ES module support (no bundling in dev)
- Plugin ecosystem (React, TypeScript, PostCSS)

### **Why Tailwind CSS?**
- Utility-first approach for rapid UI development
- Consistent design system without writing custom CSS
- Responsive design with built-in breakpoints
- Small production bundle (only used classes included)

### **Why Supabase?**
- PostgreSQL with real-time subscriptions
- Built-in authentication and authorization
- Row Level Security (RLS) for database-level access control
- Edge Functions for serverless compute (Deno runtime)
- Self-hostable (not locked into proprietary platform)

### **Why Monte Carlo Simulations?**
- Probabilistic modeling accounts for uncertainty
- 10,000 iterations provide statistical confidence
- Generates probability distributions (not just point predictions)
- Can simulate rare events (upsets, extreme weather games)
- Allows for sensitivity analysis (how stats changes affect outcome)

### **Why The Odds API?**
- Real-time odds from major sportsbooks (DraftKings)
- Reliable uptime and data accuracy
- Reasonable free tier (500 requests/month)
- Standardized data format (American odds)

---

## Future Roadmap

### **Phase 1: Enhanced Analytics** (Q1 2026)
- **Confidence-Stratified Performance**: Track win rates by confidence level (high/medium/low)
- **Team-Specific Records**: Performance when picking/against specific teams
- **Home/Away Splits**: Win rates for home favorites vs. road underdogs
- **Weather Impact Analysis**: Correlation between weather and over/under results

### **Phase 2: User Personalization** (Q2 2026)
- **Favorite Teams**: Highlight picks for user's favorite teams
- **Custom Filters**: Save filter presets (e.g., "High Confidence Underdogs")
- **Pick Bookmarking**: Save picks to personal watchlist
- **Result Notifications**: Email alerts when tracked picks conclude

### **Phase 3: Advanced Modeling** (Q3 2026)
- **Machine Learning Integration**: Train models on historical pick performance
- **Injury Impact Modeling**: Factor in key player absences
- **Line Movement Tracking**: Monitor odds shifts over time
- **Closing Line Value (CLV)**: Compare pick odds to closing line for sharp money indication

### **Phase 4: Community Features** (Q4 2026)
- **User Comments**: Discuss picks with other bettors
- **Social Sharing**: Share picks on Twitter/Facebook
- **Leaderboards**: Top-performing users (if allowing user-submitted picks)
- **Expert Tiers**: Badge system for high-performing users

### **Phase 5: Multi-Sport Expansion** (2027)
- **NBA**: Basketball predictions with pace-adjusted stats
- **MLB**: Baseball predictions with pitcher matchups
- **NHL**: Hockey predictions with goalie analysis
- **College Football**: CFB predictions with recruiting rankings

---

## Competitive Advantages

### **1. Transparency**
- All picks tracked forever (no hiding losses)
- Results calculated automatically (no subjective grading)
- Public performance metrics (no inflated win rates)

### **2. Mathematical Rigor**
- Monte Carlo simulations (10,000 iterations per game)
- True edge calculations (vs. just "confidence scores")
- Statistical validation (probability distributions, not gut feelings)

### **3. Triple-Market Coverage**
- Moneyline, ATS, and O/U for every game
- Separate tracking for each bet type (no conflating records)
- Edge calculated independently for each market

### **4. Data Quality**
- Manual CSV imports (no unreliable web scraping)
- Week-specific stats (historical accuracy)
- Real-time odds from The Odds API (no stale data)

### **5. User Experience**
- Clean, modern UI (Tailwind CSS)
- Real-time updates (Supabase subscriptions)
- Responsive design (mobile-first)
- Fast performance (Vite, lazy loading, code splitting)

---

## Conclusion

**Pachanga Picks** is a next-generation sports betting analytics platform that combines advanced statistical modeling (Monte Carlo simulations) with modern web technologies (React, Supabase, Deno) to deliver actionable betting insights. By calculating true mathematical edge and tracking performance transparently across all three major bet types, the platform empowers users to make informed betting decisions backed by data, not hype.

Whether you're a casual bettor looking for weekly NFL picks or a serious handicapper seeking performance analytics, Pachanga Picks provides the tools, transparency, and statistical rigor to find and exploit betting edges in the marketplace.

**Core Philosophy:** *If you can't measure it, you can't manage it. Every pick is tracked. Every result is recorded. Every edge is calculated. No hiding. No excuses. Just math.*
