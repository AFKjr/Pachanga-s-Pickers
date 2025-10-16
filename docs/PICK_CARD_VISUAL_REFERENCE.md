# Quick Visual Reference: Pick Card Elements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pittsburgh Steelers @ Cincinnati Bengals              ← Line 156-158       │
│  Mon, Oct 21 • 8:15 PM                                 ← Line 161-162       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │ MONEYLINE      [W]   │  │ SPREAD        [W]    │  │ TOTAL      [W]   │ │
│  │ ← Line 70 (title)    │  │ ← Line 70            │  │ ← Line 70        │ │
│  │ ← Line 62 (badge)    │  │ ← Line 62            │  │ ← Line 62        │ │
│  │                      │  │                      │  │                  │ │
│  │ ✓ Pittsburgh Steel  │  │ ✓ Pittsburgh Steel  │  │ ✓ Over 42.5      │ │
│  │   ers to win         │  │   ers +5.5           │  │                  │ │
│  │ ← Line 75-77         │  │ ← Line 75-77         │  │ ← Line 75-77     │ │
│  │                      │  │                      │  │                  │ │
│  │ Line: -265/+215      │  │ Line: -110/-110      │  │ Line: -110       │ │
│  │ ← Line 172 (odds)    │  │ ← Line 185 (odds)    │  │ ← Line 198       │ │
│  │                      │  │                      │  │                  │ │
│  │ Model: 77.6% | 22.4% │  │ Model: 70.5% | 29.5% │  │ Model: 70.3%     │ │
│  │ ← Line 84 (probs)    │  │ ← Line 84            │  │ ← Line 84        │ │
│  │                      │  │                      │  │                  │ │
│  │ Edge: +5.55% | -7.0% │  │ Edge: +20.45%        │  │ Edge: +20.25%    │ │
│  │ ← Line 90 (edges)    │  │ ← Line 90            │  │ ← Line 90        │ │
│  │                      │  │                      │  │                  │ │
│  │ ████████▓▓░░ 77.6%   │  │ ████████▓▓░░ 70.5%   │  │ ████████▓▓░ 70.3%│ │
│  │ ← Line 96 (bar)      │  │ ← Line 96            │  │ ← Line 96        │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│  ← Line 169-179 (ML)       ← Line 182-192 (Spread)    ← Line 195-205 (OU) │
└─────────────────────────────────────────────────────────────────────────────┘
← Line 144-151 (Card container)
```

---

## 🎯 Element Breakdown

### Card Header (Lines 154-163)
```
Pittsburgh Steelers @ Cincinnati Bengals  ← Team names (Line 156-158)
Mon, Oct 21 • 8:15 PM                     ← Game date/time (Line 161-162)
```

### Bet Section Title (Line 70)
```
MONEYLINE  ← Uppercase, gray text
SPREAD     ← Can change to "ATS" or "Against Spread"
TOTAL      ← Can change to "O/U" or "Over/Under"
```

### Win/Loss Badge (Lines 54-69)
```
[W]  ← Green badge (win)
[L]  ← Red badge (loss)
[P]  ← Yellow badge (push)
```
Only shows if game has been graded

### Prediction Text (Lines 75-77)
```
✓ Pittsburgh Steelers to win  ← Checkmark + prediction
✓ Pittsburgh Steelers +5.5    ← Spread prediction
✓ Over 42.5                   ← O/U prediction
```

### Odds Line (Lines 172, 185, 198)
```
Line: -265/+215      ← Moneyline odds (home/away)
Line: -110/-110      ← Spread juice (both sides)
Line: -110           ← Total juice (shows over odds)
```

### Model Probabilities (Line 84)
```
Model: 77.6% | 22.4%  ← Your pick % | Opponent %
```

### Edge Display (Line 90)
```
Edge: +5.55% | -7.0%  ← Your edge | Opponent edge
```
- Green text = positive edge (good!)
- Red text = negative edge (avoid)

### Confidence Bar (Line 96)
```
████████▓▓░░░░░░░░ 77.6%  ← Visual confidence indicator
```
- Green bar (lime) = Strong bet (edge ≥3%)
- Yellow bar = Decent bet (edge 1-3%)
- Red bar = Avoid (edge <0%)

---

## 📏 Spacing & Layout

### Card Container (Line 144-151)
```tsx
bg-[#1a1a1a]           ← Dark background
rounded-lg             ← Rounded corners
min-h-[280px]          ← Minimum height
border border-lime-500 ← Hover border (green)
```

### Header Section (Line 154)
```tsx
px-6 py-4              ← Padding (1.5rem horizontal, 1rem vertical)
border-b               ← Bottom border separator
```

### Bet Sections Container (Line 166-167)
```tsx
px-6 py-4              ← Padding
flex flex-wrap         ← Flexible layout (wraps on small screens)
gap-6                  ← Space between sections (1.5rem)
justify-start          ← Left-align sections
```

### Individual Bet Section (Line 51)
```tsx
flex-1                 ← Takes equal space
min-w-0                ← Allows text truncation
```

---

## 🎨 Color Reference

### Text Colors
```
text-white       ← Team names (bright white)
text-gray-500    ← Section titles, labels (muted)
text-gray-400    ← Odds line (secondary)
text-gray-300    ← Model probabilities (tertiary)
text-lime-400    ← Checkmark, positive edges (green accent)
text-red-400     ← Negative edges (red warning)
```

### Background Colors
```
bg-[#1a1a1a]     ← Card background (very dark gray)
bg-gray-700      ← Confidence bar background
bg-lime-500      ← Strong bet bar (green)
bg-yellow-500    ← Decent bet bar (yellow)
bg-red-500       ← Avoid bet bar (red)
```

### Border Colors
```
border-[rgba(255,255,255,0.05)]  ← Card border (subtle)
border-lime-500                   ← Hover border (bright green)
```

---

## 🔢 Font Sizes

```
text-lg          ← Team names (1.125rem / 18px)
text-sm          ← Prediction text (0.875rem / 14px)
text-xs          ← Everything else (0.75rem / 12px)
```

---

## 🛠️ Quick Edits Cheat Sheet

### Make text bigger
```tsx
text-xs  →  text-sm   (increase by 1 step)
text-sm  →  text-base (increase by 1 step)
text-lg  →  text-xl   (increase by 1 step)
```

### Add more space
```tsx
gap-6   →  gap-8      (more space between sections)
px-6    →  px-8       (more horizontal padding)
py-4    →  py-6       (more vertical padding)
```

### Change colors
```tsx
text-lime-400  →  text-green-400  (different green)
text-lime-400  →  text-blue-400   (different color)
bg-lime-500    →  bg-emerald-500  (different bar color)
```

### Hide elements
```tsx
{/* Comment out to hide */}
{/* <div>...</div> */}
```

---

## 📍 File Locations Quick Reference

| Element | File | Lines |
|---------|------|-------|
| **Card Layout** | `HorizontalPickCard.tsx` | 144-151 |
| **Game Header** | `HorizontalPickCard.tsx` | 154-163 |
| **Moneyline Section** | `HorizontalPickCard.tsx` | 169-179 |
| **Spread Section** | `HorizontalPickCard.tsx` | 182-192 |
| **Total Section** | `HorizontalPickCard.tsx` | 195-205 |
| **Confidence Bar** | `HorizontalPickCard.tsx` | 11-31 |
| **Badge Logic** | `HorizontalPickCard.tsx` | 54-69 |
| **Edge Colors** | `edgeCalculator.ts` | 195-215 |
| **Data Fetching** | `PicksDisplay.tsx` | 40-65 |

---

## 💡 Most Common Changes

### 1. Change "MONEYLINE" to "ML"
**Line 170**: Change `title="MONEYLINE"` to `title="ML"`

### 2. Show only 2 bet types (hide Total)
**Lines 195-205**: Comment out or delete the Total section

### 3. Make cards taller
**Line 145**: Change `min-h-[280px]` to `min-h-[320px]`

### 4. Change confidence bar color
**Lines 14-17**: Edit the `colorMap` object colors

### 5. Round percentages to whole numbers
**Lines 27, 84, 86**: Change `.toFixed(1)` to `.toFixed(0)`

---

**Full documentation**: `docs/PICK_CARD_CUSTOMIZATION_GUIDE.md`
