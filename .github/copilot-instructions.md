# Pachanga's Picks - AI Coding Agent Instructions

## Architecture Overview

**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase + Langchain + OpenAI GPT-4

**Core Components**:
- **Frontend**: Single-page React app with React Router (routes: `/`, `/game/:gameId`, `/admin`)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **AI Layer**: Multi-tier sports data system (ESPN API → LLM generation → mock fallback)
- **Data Flow**: External APIs → Langchain agents → Supabase storage → React components

**Key Data Models** (`src/types/index.ts`):
- `Pick`: AI-generated predictions with confidence scores (0-100)
- `Post`: Forum threads linked to picks
- `Comment`: Nested comment system with parent relationships
- `GameInfo`: JSONB structure for flexible game metadata

## Critical Patterns & Conventions

### Authentication & Authorization
- **Context**: Use `AuthContext` for all auth operations (`src/contexts/AuthContext.tsx`)
- **Admin Check**: Query `profiles.is_admin` field, never assume admin status
- **User Profiles**: Store in `profiles` table with `username` as unique identifier
- **RLS Policies**: All database access controlled by Supabase Row Level Security

### API Layer (`src/lib/api.ts`)
- **Consistent Structure**: All API functions return `{ data, error }` objects
- **Error Handling**: Check `error` field before using `data`
- **Profile Enrichment**: Always join user profiles for display names (`author_username`)
- **Real-time**: Use `supabase.channel()` for live updates on picks/posts

### AI Analysis Workflow
- **Multi-Source Data**: Google CSE + OpenWeather API + ESPN data
- **Agent Integration**: Relevance AI agents for complex reasoning (`RelevanceAIAgentEmbed`)
- **Prediction Storage**: Save to `picks` table with structured `game_info` JSONB
- **Confidence Scoring**: 0-100 scale with reasoning text

### Database Schema Patterns
- **UUID Primary Keys**: All tables use `gen_random_uuid()`
- **Timestamps**: `created_at`/`updated_at` with timezone
- **Enums**: `game_result` ('win', 'loss', 'push', 'pending')
- **Relationships**: Foreign keys with CASCADE deletes
- **JSONB Flexibility**: `game_info` stores complex game metadata

## Essential Developer Workflows

### Environment Setup
```bash
# Required env vars (prefix with VITE_ for client access)
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key
VITE_GOOGLE_CSE_ID=your-search-engine-id
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_OPENWEATHER_API_KEY=your-weather-key
VITE_RELEVANCE_API_KEY=your-relevance-key  # Optional
VITE_RELEVANCE_AGENT_ID=your-agent-id      # Optional
```

### Build & Development
```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # TypeScript compilation + Vite build
npm run lint     # ESLint with strict rules
npm run preview  # Preview production build
```

### AI Prediction Generation
1. Access `/admin` route (requires `is_admin: true`)
2. Use `RelevanceAIAgentEmbed` component for AI queries
3. Agent automatically saves predictions to `picks` table
4. Predictions include: game analysis, confidence %, reasoning

### Testing AI Integration
```bash
# Test LLM sports API
node test-llm-api.js

# Test LLM sports service
node test-llm-simple.js
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
- `enhancedLLMSportsAPI.ts`: AI agent integration
- `llmSportsAPI.ts`: LLM-based data generation

### `src/components/`
- `AdminPanel.tsx`: AI prediction interface (admin-only)
- `HomePage.tsx`: Main picks feed with `PickCard` components
- `GameThread.tsx`: Individual game discussions
- `AuthModal.tsx`: Sign-in/sign-up forms

### Database Files
- `supabase-schema.sql`: Complete database structure
- `supabase_migrations/`: Incremental schema changes
- `fix_picks_profiles_relationship.sql`: Relationship fixes

## Common Pitfalls to Avoid

### Authentication
- Never assume user is authenticated - always check `user` from `useAuth()`
- Admin routes require both authentication AND `is_admin` check
- Profile data loads asynchronously - handle loading states

### Database Operations
- Always include error handling for Supabase calls
- Use proper TypeScript types from `src/types/index.ts`
- Respect RLS policies - don't bypass with service keys

### AI Integration
- LLM calls are expensive - implement caching where possible
- Always provide fallback data for development/testing
- Validate AI-generated data before storing in production

### Real-time Features
- Clean up subscriptions in `useEffect` cleanup functions
- Handle connection drops gracefully
- Test real-time updates across multiple browser tabs

## Performance Considerations

- **Database Queries**: Use appropriate indexes (defined in schema)
- **API Calls**: Cache LLM responses in Supabase tables
- **Bundle Size**: Lazy load admin components
- **Real-time**: Limit subscription scope to necessary data only

## Deployment Notes

- **Environment Variables**: All `VITE_` prefixed vars exposed to client
- **Supabase Config**: Run schema SQL in Supabase dashboard
- **Build Process**: `npm run build` generates optimized bundle
- **CORS**: Supabase handles CORS for API routes automatically</content>
<parameter name="filePath">.github/copilot-instructions.md