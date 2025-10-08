# Supabase VS Code Integration Setup

This guide will help you connect your Supabase database to VS Code for better IntelliSense, autocomplete, and type safety.

## ✅ What We've Done

1. **Installed Extensions** (via the extension panel above):
   - `supabase.vscode-supabase-extension` - Official Supabase extension
   - `supabase.postgrestools` - PostgreSQL language server for SQL IntelliSense

2. **Updated VS Code Settings** (`.vscode/settings.json`):
   - Enabled SQL file associations
   - Configured SQL formatting
   - Enabled PostgreSQL tools

3. **Added npm Scripts** (`package.json`):
   - `npm run types:generate` - Generate TypeScript types from remote database
   - `npm run types:local` - Generate types from local Supabase instance

## 🚀 Setup Steps

### Step 1: Install Supabase CLI (if not already installed)

**Windows (PowerShell):**
```powershell
# Using Scoop (recommended)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using NPM
npm install -g supabase
```

Verify installation:
```powershell
supabase --version
```

### Step 2: Link Your Supabase Project

```powershell
# Login to Supabase
supabase login

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_ID
```

**Where to find your Project ID:**
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID" (looks like: `abcdefghijklmnop`)

### Step 3: Generate TypeScript Types

Once linked, generate types from your database:

```powershell
# Generate types from remote database
npm run types:generate

# OR if running local Supabase
npm run types:local
```

This creates `src/types/database.types.ts` with full type definitions for all your tables!

### Step 4: Update Your Supabase Client

Update `src/lib/supabase.ts` to use the generated types:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

## 🎯 Benefits You'll Get

### 1. **Full Type Safety**
```typescript
// ❌ Before: No type checking
const { data } = await supabase.from('team_stats_cache').select('*')
// data is `any`

// ✅ After: Full type safety!
const { data } = await supabase.from('team_stats_cache').select('*')
// data is TeamStatsCache[] with all column types!
```

### 2. **IntelliSense for SQL Files**
- Autocomplete for table names
- Autocomplete for column names
- Syntax highlighting and validation
- Format on save

### 3. **Query Builder Autocomplete**
```typescript
// VS Code will now suggest:
// - Table names: 'picks', 'team_stats_cache', 'profiles', etc.
// - Column names for each table
// - Valid filter operators
// - RLS policy hints

await supabase
  .from('team_stats_cache')  // ← Autocomplete suggests all tables
  .select('team_name, week')  // ← Autocomplete suggests all columns
  .eq('season_year', 2025)    // ← Type-checked values!
```

### 4. **Supabase Extension Features**

The Supabase extension provides:
- **Database Explorer**: View all tables, columns, and relationships
- **SQL Editor**: Run queries directly from VS Code
- **Function Manager**: View and test Edge Functions
- **Type Generation**: Auto-generate types on schema changes
- **Migration Tracking**: See pending migrations

**Access the extension:**
- Click the Supabase icon in the Activity Bar (left sidebar)
- Or use Command Palette: `Ctrl+Shift+P` → "Supabase"

## 📝 Quick Reference Commands

```powershell
# Generate types (remote)
npm run types:generate

# Generate types (local)
npm run types:local

# View database schema
supabase db dump --schema

# Run migrations
supabase db push

# Pull remote schema
supabase db pull

# View logs
supabase logs

# Reset local database
supabase db reset
```

## 🔍 Testing Your Setup

1. **Open any `.sql` file** (e.g., `supabase/add-week-to-team-stats.sql`)
   - You should see syntax highlighting
   - Typing table names should show autocomplete

2. **Open `src/lib/api.ts`**
   - After updating the supabase client, you should see type hints
   - Hovering over `.from()` should show available tables

3. **Open Supabase Extension**
   - Click Supabase icon in sidebar
   - You should see your project connected
   - Explore your tables and run queries!

## 🐛 Troubleshooting

### Types not generating?
```powershell
# Make sure you're logged in
supabase login

# Check if project is linked
supabase projects list

# Try manual type generation
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### Extension not connecting?
1. Check your `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Restart VS Code
3. Open Command Palette → "Supabase: Refresh Connection"

### SQL autocomplete not working?
1. Make sure `postgrestools.enabled` is `true` in `.vscode/settings.json`
2. Restart VS Code
3. Check VS Code Output panel → "PostgreSQL Language Server"

## 📚 Next Steps

1. **Generate types** from your database
2. **Update `src/lib/supabase.ts`** to use typed client
3. **Refactor API calls** to use types (VS Code will auto-suggest!)
4. **Use Supabase extension** to explore your database

## 🎉 Pro Tips

- **Auto-regenerate types on schema changes**: Set up a git hook or CI/CD step
- **Share types**: Commit `database.types.ts` to Git for team consistency
- **Use Supabase Studio**: The extension has a built-in database viewer
- **Format SQL files**: Right-click in SQL file → "Format Document"

---

**Your database is now fully integrated with VS Code!** 🚀

Any queries you write will have full type safety and autocomplete.
