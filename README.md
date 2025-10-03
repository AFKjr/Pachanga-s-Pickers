# Pachanga's NFL Picks

A modern React-based sports betting forum featuring AI-powered NFL predictions, real-time analytics, and comprehensive performance tracking.

## 🚀 Features

- **AI-Powered Predictions**: Leverage Relevance AI for data-driven NFL picks
- **Real-Time Analytics**: Live ATS, Over/Under, and Moneyline tracking
- **Admin Dashboard**: Secure admin interface for pick management and result updates
- **Performance Tracking**: Detailed statistics and historical performance analysis
- **Responsive Design**: Modern UI built with Tailwind CSS and React
- **Secure Authentication**: OWASP-compliant authentication with Supabase

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: Relevance AI for sports predictions
- **Styling**: Tailwind CSS
- **Routing**: React Router with lazy loading
- **State Management**: React Context + Supabase real-time subscriptions

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SportsBettingForum
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_RELEVANCE_AGENT_ID=your-relevance-agent-id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   └── ...
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # API clients and utilities
├── pages/              # Page components (admin routes)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🔐 Authentication

The app uses Supabase authentication with the following features:
- Email/password authentication
- Password strength validation
- Rate limiting
- Secure session management
- Admin role-based access control

## 🤖 AI Integration

Predictions are generated using Relevance AI agents that analyze:
- Team statistics and performance
- Player injuries and availability
- Historical matchup data
- Weather conditions
- Betting market trends

## 📊 Admin Features

Admin users can:
- Generate new AI-powered picks
- Manage existing predictions
- Update game results
- View comprehensive analytics
- Access admin dashboard with performance metrics

## 🚀 Deployment

The app is configured for deployment on Vercel with:
- Automatic builds on push
- Environment variable management
- Optimized production builds
- CDN distribution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.