# Pachanga's Picks - AI-Powered Sports Analysis

An AI-powered sports betting forum that uses Langchain agents to analyze NFL games and generate predictions that aim to beat Vegas odds (targeting 54-55% accuracy).

## Features

- 🤖 **AI-Powered Analysis**: Uses Langchain agents to research and analyze sports data
- 🏈 **Multi-Source Data Integration**: Combines injury reports, DVOA, FPI, and weather data
- 💬 **Community Forum**: User discussions and betting insights
- 📊 **Real-time Predictions**: Generate predictions using advanced AI analysis
- 🔐 **User Authentication**: Secure user management with Supabase Auth
- 📱 **Mobile-First**: Responsive design optimized for all devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Database + Auth + Real-time)
- **AI**: Langchain + OpenAI GPT-4
- **APIs**: Google Custom Search Engine, OpenWeather API
- **Routing**: React Router v6

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd pachanga-picks
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI and API Configuration
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_GOOGLE_CSE_ID=your-google-cse-id
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_OPENWEATHER_API_KEY=your-openweather-api-key
```

### 3. API Setup

#### OpenAI API
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and generate an API key
3. Add the key to `VITE_OPENAI_API_KEY`

#### Google Custom Search Engine
1. Go to [Google Custom Search](https://cse.google.com/)
2. Create a new search engine
3. Get your Search Engine ID and API Key
4. Add them to `VITE_GOOGLE_CSE_ID` and `VITE_GOOGLE_API_KEY`

#### OpenWeather API
1. Go to [OpenWeather](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key
4. Add it to `VITE_OPENWEATHER_API_KEY`

#### Supabase Setup
1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Run the SQL schema from `supabase-schema.sql` in your SQL Editor
4. Copy your project URL and anon key to the `.env` file

### 4. Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
npm run preview
```

## Usage

### For Users
- Browse AI-generated predictions on the homepage
- Sign up/in to participate in discussions
- View detailed analysis for each game

### For Admins
- Navigate to `/admin` to access the AI analysis panel
- Input game details (teams, date, location, current odds)
- Click "Generate AI Prediction" to get analysis
- The AI will research:
  - Injury reports for both teams
  - DVOA (Defense-adjusted Value Over Average)
  - FPI (Football Power Index)
  - Weather conditions
  - Recent team performance

## AI Analysis Process

The AI agent follows this workflow:

1. **Data Collection**: Searches for relevant sports data using Google CSE
2. **Weather Analysis**: Gets game-day weather conditions via OpenWeather API
3. **Data Aggregation**: Combines multiple data sources for comprehensive analysis
4. **Prediction Generation**: Uses GPT-4 to analyze all data and generate predictions
5. **Confidence Scoring**: Provides confidence percentages for each prediction

## Database Schema

### Picks Table
```sql
CREATE TABLE picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_info JSONB NOT NULL,
  prediction TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss', 'push', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE
);
```

### Posts Table
```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pick_id UUID REFERENCES picks(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0
);
```

### Comments Table
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0
);
```

## Architecture

```
Frontend (React) → API Layer → Langchain Agents → External APIs
                                      ↓
                                 Supabase Database
```

- **Frontend**: React components for UI and user interaction
- **API Layer**: Custom tools for Google CSE, OpenWeather, and data aggregation
- **Langchain Agents**: Orchestrates the analysis workflow using GPT-4
- **External APIs**: Sources for sports data (Google CSE) and weather (OpenWeather)
- **Database**: Stores AI predictions, user data, and forum discussions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
```

### Comments Table
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_comment_id UUID REFERENCES comments(id),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0
);
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sports-betting-forum.git
   cd sports-betting-forum
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from above in the Supabase SQL editor
   - Copy your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Navigation header
│   ├── PickCard.tsx    # Individual pick display
│   ├── Comment.tsx     # Comment component with replies
│   ├── HomePage.tsx    # Main homepage
│   └── GameThread.tsx  # Individual game discussion
├── lib/                # Utilities and configurations
│   └── supabase.ts     # Supabase client and types
├── types/              # TypeScript type definitions
│   └── index.ts        # Main type definitions
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles and Tailwind imports
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.