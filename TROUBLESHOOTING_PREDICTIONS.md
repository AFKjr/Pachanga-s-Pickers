# Troubleshooting: Generate Predictions Error

## Error: `FUNCTION_INVOCATION_FAILED`

This error means the Vercel serverless function (`/api/generate-predictions`) is failing to execute.

---

## 🔍 Common Causes & Solutions

### 1. **Missing Environment Variables**

The API requires these environment variables to be set in Vercel:

#### Required:
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `ODDS_API_KEY` - Get from [The Odds API](https://the-odds-api.com/)

#### Optional (but recommended):
- `OPENWEATHER_API_KEY` - For weather adjustments

#### How to Fix:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   ```
   VITE_SUPABASE_URL=https://wbfvfzrxdqwrnqmpnfel.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ODDS_API_KEY=your-odds-api-key
   OPENWEATHER_API_KEY=your-weather-key (optional)
   ```
5. Click **Save**
6. **Redeploy** your application

---

### 2. **No Team Stats Imported**

The API needs team stats from the database to run simulations.

#### How to Fix:
1. Go to `/admin` → **Team Stats** tab
2. Click **CSV Import**
3. Import both files:
   - `2025/Weekly Stats Offense/week 6 offense.csv`
   - `2025/Weekly Stats Defense/week 6 defense.csv`
4. Verify import: Run this query in Supabase SQL Editor:
   ```sql
   SELECT COUNT(*) FROM team_stats_cache 
   WHERE week = 6 AND season_year = 2025;
   ```
   Should return: 32

---

### 3. **The Odds API Key Invalid or Rate Limit**

The Odds API has usage limits and requires a valid key.

#### Check Your API Key:
1. Go to [The Odds API Dashboard](https://the-odds-api.com/account/)
2. Check your key is active
3. Check remaining quota

#### Common Issues:
- **Rate limit exceeded**: 500 requests/month on free tier
- **Invalid key**: Key might be expired or incorrect
- **No games available**: API only shows games 3-7 days in advance

#### How to Test:
```powershell
# Test the Odds API directly
curl "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=YOUR_KEY&regions=us&markets=h2h,spreads,totals"
```

---

### 4. **Vercel Function Timeout**

Vercel free tier has a 10-second timeout. Monte Carlo simulations might exceed this.

#### How to Fix:
- Upgrade to Vercel Pro (60s timeout)
- Or reduce `SIMULATION_ITERATIONS` in `src/utils/constants.ts` from 10,000 to 5,000

---

### 5. **CORS or Network Issues**

The API might be blocked by CORS or network issues.

#### Check Browser Console:
1. Open browser Dev Tools (F12)
2. Go to **Console** tab
3. Look for errors when clicking "Generate Predictions"
4. Look for network errors in **Network** tab

---

## 🧪 Testing Locally

Test the API locally before deploying to Vercel:

```powershell
# Install Vercel CLI
npm install -g vercel

# Run locally
vercel dev

# Access at: http://localhost:3000
# API endpoint: http://localhost:3000/api/generate-predictions
```

---

## 📋 Checklist Before Generating Predictions

Run through this checklist:

- [ ] ✅ Environment variables set in Vercel
- [ ] ✅ Week 6 stats imported (32 teams)
- [ ] ✅ Odds API key is valid and has quota
- [ ] ✅ Supabase database is accessible
- [ ] ✅ Application redeployed after env var changes
- [ ] ✅ Browser console shows no CORS errors
- [ ] ✅ Network tab shows API call is being made

---

## 🔧 Quick Fixes

### Fix 1: Redeploy After Env Vars
```powershell
# In your project directory
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Fix 2: Check Vercel Logs
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Deployments**
4. Click latest deployment
5. Go to **Functions** tab
6. Check logs for `generate-predictions`

### Fix 3: Validate Environment Variables
Create a test endpoint to check env vars are loaded:

```typescript
// api/test-env.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasOddsKey: !!process.env.ODDS_API_KEY,
    hasWeatherKey: !!process.env.OPENWEATHER_API_KEY
  });
}
```

Access: `https://your-app.vercel.app/api/test-env`

---

## 🆘 Still Not Working?

### Check Vercel Function Logs:

1. **Go to Vercel Dashboard** → Your Project → Deployments
2. **Click latest deployment**
3. **Go to Functions tab**
4. **Look for `generate-predictions` errors**

### Common Error Messages:

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing Supabase configuration" | Env vars not set | Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY |
| "Failed to fetch odds" | Invalid ODDS_API_KEY | Check key at the-odds-api.com |
| "No games available" | No upcoming NFL games | Try closer to game day (Thu-Mon) |
| "No stats found for team" | Stats not imported | Import Week 6 CSVs |
| Function timeout | Too slow | Reduce simulation iterations or upgrade Vercel plan |

---

## 📞 Need Help?

1. **Check browser console** for client-side errors
2. **Check Vercel logs** for server-side errors
3. **Verify all environment variables** are set correctly
4. **Test Odds API key** separately
5. **Confirm Week 6 data** is in database

---

## ✅ Success Indicators

When working correctly, you should see:

1. **Browser Console:**
   ```
   Calling /api/generate-predictions...
   API Response status: 200
   Successfully saved 14 predictions!
   ```

2. **Predictions appear** in the UI with:
   - Team names
   - Win probabilities
   - Score predictions
   - Confidence scores

3. **Database has new picks:**
   ```sql
   SELECT COUNT(*) FROM picks WHERE week = 6;
   -- Should show number of games generated
   ```

---

## 🚀 After Fixing

Once the issue is resolved:

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Try generating predictions again
4. Check Manage Picks tab for results

Your Monte Carlo prediction system should now be working! 🎉
