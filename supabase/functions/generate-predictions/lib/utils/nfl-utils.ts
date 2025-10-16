// supabase/functions/generate-predictions/lib/utils/nfl-utils.ts


const NFL_2025_SCHEDULE: Record<number, { start: string; end: string }> = {
  1: { start: '2025-09-02', end: '2025-09-08' },
  2: { start: '2025-09-09', end: '2025-09-15' },
  3: { start: '2025-09-16', end: '2025-09-22' },
  4: { start: '2025-09-23', end: '2025-09-29' },
  5: { start: '2025-09-30', end: '2025-10-06' },
  6: { start: '2025-10-07', end: '2025-10-13' },
  7: { start: '2025-10-14', end: '2025-10-20' },
  8: { start: '2025-10-21', end: '2025-10-27' },
  9: { start: '2025-10-28', end: '2025-11-03' },
  10: { start: '2025-11-04', end: '2025-11-10' },
  11: { start: '2025-11-11', end: '2025-11-17' },
  12: { start: '2025-11-18', end: '2025-11-24' },
  13: { start: '2025-11-25', end: '2025-12-01' },
  14: { start: '2025-12-02', end: '2025-12-08' },
  15: { start: '2025-12-09', end: '2025-12-15' },
  16: { start: '2025-12-16', end: '2025-12-22' },
  17: { start: '2025-12-23', end: '2025-12-29' },
  18: { start: '2025-12-30', end: '2026-01-05' }
};


export function getNFLWeekFromDate(gameDate: Date | string): number | null {
  const date = typeof gameDate === 'string' ? new Date(gameDate) : gameDate;

  for (const [weekStr, range] of Object.entries(NFL_2025_SCHEDULE)) {
    const week = parseInt(weekStr);
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);

    
    endDate.setHours(23, 59, 59, 999);

    if (date >= startDate && date <= endDate) {
      return week;
    }
  }

  console.warn(`Date ${gameDate} doesn't fall in any 2025 NFL week`);
  return null;
}


export function getCurrentNFLWeek(): number {
  const today = new Date();
  const week = getNFLWeekFromDate(today);

  if (week) {
    return week;
  }

  
  console.warn('Current date is outside NFL season, defaulting to Week 1');
  return 1;
}


export function mapConfidenceToNumber(level: string): number {
  const levelLower = level.toLowerCase();
  if (levelLower.includes('high')) return 80;
  if (levelLower.includes('medium')) return 60;
  if (levelLower.includes('low')) return 40;
  return 70; 
}


export function getConfidenceLevel(probability: number): string {
  if (probability >= 70) return 'High';
  if (probability >= 55) return 'Medium';
  return 'Low';
}






export function getNFLWeek(gameDate: Date | string): number | null {
  return getNFLWeekFromDate(gameDate);
}


export function getWeekLabel(week: number): string {
  if (week >= 1 && week <= 18) {
    return `Week ${week}`;
  }
  
  
  switch (week) {
    case 19:
      return 'Wild Card';
    case 20:
      return 'Divisional Round';
    case 21:
      return 'Conference Championships';
    case 22:
      return 'Super Bowl';
    default:
      return `Week ${week}`;
  }
}


export function getWeekDateRange(week: number): { start: string; end: string } | null {
  const weekData = NFL_2025_SCHEDULE[week];
  return weekData || null;
}


export function isValidWeek(week: number): boolean {
  return week >= 1 && week <= 18;
}


export function isRegularSeasonWeek(week: number): boolean {
  return week >= 1 && week <= 18;
}
