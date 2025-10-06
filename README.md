# Pachanga Picks

A modern sports betting analytics platform featuring Monte Carlo simulation-based NFL predictions, comprehensive performance tracking, and real-time betting analytics.

## 🎯 Core Features

### Prediction Generation
- **Monte Carlo Simulations**: 10,000 iterations per game for statistical predictions
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

## 🏗️ Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **Tailwind CSS** for styling
- **React Router** with lazy loading
- **Real-time updates** via Supabase subscriptions

### Backend
- **Supabase**: PostgreSQL database + Authentication + Real-time
- **Vercel Serverless Functions**: Monte Carlo prediction generation
- **The Odds API**: Real-time betting lines and odds

### External APIs
- **The Odds API**: NFL odds and lines (500 req/month free tier)
- **ESPN API**: Team statistics (fallback to defaults when unavailable)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- The Odds API key (free tier available)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Pachanga-s-Pickers
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**

Create a `.env.local` file:
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For Vercel deployment, also set:
```env
ODDS_API_KEY=your-odds-api-key
```

4. **Database Setup**

Run these SQL migrations in your Supabase SQL Editor:

```sql
-- Create picks table
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  game_info JSONB NOT NULL,
  prediction TEXT NOT NULL,
  spread_prediction TEXT,
  ou_prediction TEXT,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss', 'push', 'pending')),
  ats_result TEXT CHECK (ats_result IN ('win', 'loss', 'push', 'pending')),
  ou_result TEXT CHECK (ou_result IN ('win', 'loss', 'push', 'pending')),
  week INTEGER CHECK (week >= 1 AND week <= 18),
  is_pinned BOOLEAN DEFAULT FALSE,
  schedule_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for picks (public read, admin write)
CREATE POLICY "Picks are viewable by everyone" ON picks
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert picks" ON picks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update picks" ON picks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete picks" ON picks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

5. **Start development server**
```bash
npm run dev
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏛️ Project Structure

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

api/
└── generate-predictions.ts # Vercel serverless function
```

## 🎲 How Monte Carlo Predictions Work

1. **Fetch Live Odds**: Get current NFL game odds from The Odds API
2. **Team Stats**: Use ESPN stats or fallback to league averages
3. **Run Simulation**: 10,000 iterations per game simulating:
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

## 🔐 Authentication & Security

- **Supabase Auth**: Email/password authentication with email verification
- **OWASP-Compliant**: Password validation with entropy calculation
- **Rate Limiting**: Client-side rate limiting (5 attempts per minute)
- **Admin-Only Actions**: Pick creation/editing restricted to admin users
- **Input Validation**: XSS protection and sanitization on all inputs
- **Secure Sessions**: HTTPOnly cookies with automatic refresh

## 📊 Performance Tracking

### Metrics Calculated
- **Moneyline Record**: Win/loss record for straight-up picks
- **ATS Record**: Against The Spread performance with push tracking
- **O/U Record**: Over/Under totals accuracy
- **Units Won/Lost**: Profit/loss assuming standard -110 odds
- **Win Rate by Confidence**: Performance stratified by prediction confidence
- **Cover Margin**: Average points by which ATS picks cover
- **Weekly Breakdown**: Performance metrics by NFL week
- **Team Analysis**: Performance when picking specific teams

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `ODDS_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deploy**: Automatic on push to main branch

### Build Configuration
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node Version: 18.x

## 🔧 Admin Features

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

## ⚠️ Important Notes

### API Usage Limits
- **The Odds API Free Tier**: 500 requests/month
- Each prediction generation uses 1 request
- Monitor usage to avoid quota exhaustion

### Data Disclaimer
All predictions and betting analytics are for **entertainment and educational purposes only**. Past performance does not guarantee future results. When gaming, please play responsibly and within your means.

### Odds Accuracy
Betting efficiency metrics assume standard -110 odds. Actual sportsbook odds may vary. Always verify current lines before placing any wagers.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🔗 Links

- [Supabase Documentation](https://supabase.com/docs)
- [The Odds API Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- [Vercel Documentation](https://vercel.com/docs)

---

Built by AFKj Studio_AFK