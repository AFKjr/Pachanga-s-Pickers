// src/utils/nflWeeks.ts

import { NFLWeek } from '../types/index';
import { validateGameDate, safeDate, isValidNFLGameDate } from './dateValidation';



export const NFL_2025_SCHEDULE: Record<NFLWeek, { start: string; end: string; description: string }> = {
  1: { 
    start: '2025-09-04', 
    end: '2025-09-08', 
    description: 'Thu 9/4 - Mon 9/8 (Cowboys@Eagles Thu, Chiefs vs Chargers Fri in Brazil)' 
  },
  2: { 
    start: '2025-09-11', 
    end: '2025-09-15', 
    description: 'Thu 9/11 - Mon 9/15 (Commanders@Packers Thu, doubleheader Mon)' 
  },
  3: { 
    start: '2025-09-18', 
    end: '2025-09-22', 
    description: 'Thu 9/18 - Mon 9/22 (Dolphins@Bills Thu)' 
  },
  4: { 
    start: '2025-09-25', 
    end: '2025-09-29', 
    description: 'Thu 9/25 - Mon 9/29 (Seahawks@Cardinals Thu, Vikings vs Steelers in Dublin Sun)' 
  },
  5: { 
    start: '2025-10-02', 
    end: '2025-10-06', 
    description: 'Thu 10/2 - Mon 10/6 (49ers@Rams Thu, Vikings vs Browns in London Sun)' 
  },
  6: { 
    start: '2025-10-09', 
    end: '2025-10-13', 
    description: 'Thu 10/9 - Mon 10/13 (Eagles@Giants Thu, Broncos vs Jets in London Sun)' 
  },
  7: { 
    start: '2025-10-16', 
    end: '2025-10-20', 
    description: 'Thu 10/16 - Mon 10/20 (Steelers@Bengals Thu, Rams@Jaguars in London Sun)' 
  },
  8: { 
    start: '2025-10-23', 
    end: '2025-10-27', 
    description: 'Thu 10/23 - Mon 10/27 (Vikings@Chargers Thu)' 
  },
  9: { 
    start: '2025-10-30', 
    end: '2025-11-03', 
    description: 'Thu 10/30 - Mon 11/3 (Ravens@Dolphins Thu)' 
  },
  10: { 
    start: '2025-11-06', 
    end: '2025-11-10', 
    description: 'Thu 11/6 - Mon 11/10 (Raiders@Broncos Thu, Falcons vs Colts in Berlin Sun)' 
  },
  11: { 
    start: '2025-11-13', 
    end: '2025-11-17', 
    description: 'Thu 11/13 - Mon 11/17 (Jets@Patriots Thu, Commanders vs Dolphins in Madrid Sun)' 
  },
  12: { 
    start: '2025-11-20', 
    end: '2025-11-24', 
    description: 'Thu 11/20 - Mon 11/24 (Bills@Texans Thu)' 
  },
  13: { 
    start: '2025-11-27', 
    end: '2025-12-01', 
    description: 'Thu 11/27 - Mon 12/1 (Thanksgiving triple-header Thu, Bears@Eagles Fri)' 
  },
  14: { 
    start: '2025-12-04', 
    end: '2025-12-08', 
    description: 'Thu 12/4 - Mon 12/8 (Cowboys@Lions Thu)' 
  },
  15: { 
    start: '2025-12-11', 
    end: '2025-12-15', 
    description: 'Thu 12/11 - Mon 12/15 (Falcons@Buccaneers Thu)' 
  },
  16: { 
    start: '2025-12-18', 
    end: '2025-12-22', 
    description: 'Thu 12/18 - Mon 12/22 (Rams@Seahawks Thu, Saturday games 12/20)' 
  },
  17: { 
    start: '2025-12-25', 
    end: '2025-12-29', 
    description: 'Thu 12/25 - Mon 12/29 (Christmas triple-header Thu, Saturday games 12/27)' 
  },
  18: { 
    start: '2026-01-03', 
    end: '2026-01-05', 
    description: 'Sat 1/3 - Sun 1/5 (Final week, flexible scheduling)' 
  }
};


export const getNFLWeekFromDate = (gameDate: string | Date): NFLWeek | null => {
  
  const validation = validateGameDate(gameDate, { away_team: 'Unknown', home_team: 'Unknown' });
  
  if (!validation.isValid) {
    console.warn(`Invalid game date for week calculation: ${validation.error}`);
    return null;
  }
  
  const date = validation.date!;

  
  for (const [weekStr, range] of Object.entries(NFL_2025_SCHEDULE)) {
    const week = parseInt(weekStr) as NFLWeek;
    
    const startValidation = validateGameDate(range.start, { away_team: 'Season', home_team: 'Start' });
    const endValidation = validateGameDate(range.end, { away_team: 'Season', home_team: 'End' });
    
    if (!startValidation.isValid || !endValidation.isValid) {
      console.warn(`Invalid date range for Week ${week}: ${range.start} to ${range.end}`);
      continue;
    }
    
    const startDate = startValidation.date!;
    const endDate = endValidation.date!;
    
    
    if (date >= startDate && date <= endDate) {
      return week;
    }
  }
  
  console.warn(`Date ${gameDate} doesn't fall in any 2025 NFL week`);
  return null;
};


export const getPickWeek = (pick: { week?: number; game_info: { game_date: string; away_team: string; home_team: string } }): number => {
  const gameTeams = `${pick.game_info.away_team} @ ${pick.game_info.home_team}`;
  
  
  if (pick.week) {
    return pick.week;
  }

  
  const weekFromDate = getNFLWeekFromDate(pick.game_info.game_date);
  if (weekFromDate) {
    return weekFromDate;
  }

  
  const dateValidation = validateGameDate(pick.game_info.game_date, pick.game_info);
  
  if (!dateValidation.isValid) {
    console.warn(`Invalid game date for ${gameTeams}: ${dateValidation.error}, defaulting to Week 1`);
    return 1 as NFLWeek;
  }

  
  const gameDateObj = dateValidation.date!;
  if (!isValidNFLGameDate(gameDateObj)) {
    console.warn(`Game date ${pick.game_info.game_date} for ${gameTeams} is outside 2025 NFL season, defaulting to Week 1`);
    return 1 as NFLWeek;
  }

  
  const seasonStart = safeDate('2025-09-04', { throwOnInvalid: true }); 
  
  try {
    const daysDiff = Math.floor((gameDateObj.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const calculatedWeek = Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1)) as NFLWeek;
    
    console.log(`Calculated week ${calculatedWeek} for ${gameTeams} on ${pick.game_info.game_date}`);
    return calculatedWeek;
  } catch (error) {
    console.error(`Error calculating week for ${gameTeams}:`, error);
    return 1 as NFLWeek;
  }
};


export const isValidNFLDate = (gameDate: string | Date): boolean => {
  const seasonStart = new Date('2025-09-04');
  const seasonEnd = new Date('2026-01-05');
  const date = typeof gameDate === 'string' ? new Date(gameDate) : gameDate;
  
  return date >= seasonStart && date <= seasonEnd;
};


export const getWeekInfo = (week: NFLWeek) => {
  return NFL_2025_SCHEDULE[week] || null;
};


export const getAllNFLWeeks = (): NFLWeek[] => {
  return Object.keys(NFL_2025_SCHEDULE).map(w => parseInt(w)).sort((a, b) => a - b) as NFLWeek[];
};


export const getCurrentNFLWeek = (): NFLWeek | null => {
  const today = new Date();
  return getNFLWeekFromDate(today);
};


export const SPECIAL_SCHEDULING_NOTES = {
  internationalGames: [
    { week: 1, teams: 'Chiefs vs Chargers', location: 'São Paulo, Brazil', date: '2025-09-05' },
    { week: 4, teams: 'Vikings vs Steelers', location: 'Dublin, Ireland', date: '2025-09-28' },
    { week: 5, teams: 'Vikings vs Browns', location: 'London, England', date: '2025-10-05' },
    { week: 6, teams: 'Broncos vs Jets', location: 'London, England', date: '2025-10-12' },
    { week: 7, teams: 'Rams@Jaguars', location: 'London, England', date: '2025-10-19' },
    { week: 10, teams: 'Falcons vs Colts', location: 'Berlin, Germany', date: '2025-11-09' },
    { week: 11, teams: 'Commanders vs Dolphins', location: 'Madrid, Spain', date: '2025-11-16' }
  ],
  holidays: {
    thanksgiving: {
      week: 13,
      date: '2025-11-27',
      games: ['Packers@Lions 1:00p', 'Chiefs@Cowboys 4:30p', 'Bengals@Ravens 8:20p'],
      note: 'Triple-header on Thanksgiving Thursday'
    },
    blackFriday: {
      week: 13,
      date: '2025-11-28',
      games: ['Bears@Eagles 3:00p'],
      note: 'Single game on Black Friday'
    },
    christmas: {
      week: 17,
      date: '2025-12-25',
      games: ['Cowboys@Commanders 1:00p', 'Lions@Vikings 4:30p', 'Broncos@Chiefs 8:15p'],
      note: 'Triple-header on Christmas Day (Netflix/Prime)'
    }
  },
  saturdayGames: {
    week16: '2025-12-20',
    week17: '2025-12-27',
    note: 'Saturday games in final weeks due to college football ending'
  }
};