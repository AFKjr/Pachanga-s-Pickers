/**
 * Duplicate Detection Service
 * Handles duplicate pick detection and cleanup logic
 */

import { Pick } from '../types';
import { getPickWeek } from '../utils/nflWeeks';
import { deletePick } from './pickManagement';
import { AppError } from '../utils/errorHandling';

export interface DuplicateInfo {
  original: Pick;
  duplicates: Pick[];
  key: string;
}


const TEAM_MAPPINGS: Record<string, string> = {
  '49ers': 'sf49ers',
  'san francisco 49ers': 'sf49ers',
  'rams': 'larams',
  'los angeles rams': 'larams',
  'chargers': 'lachargers',
  'los angeles chargers': 'lachargers',
  'vikings': 'minvikings',
  'minnesota vikings': 'minvikings',
  'browns': 'clebrowns',
  'cleveland browns': 'clebrowns',
  'raiders': 'lvraiders',
  'las vegas raiders': 'lvraiders',
  'colts': 'indcolts',
  'indianapolis colts': 'indcolts',
  'giants': 'nygiants',
  'new york giants': 'nygiants',
  'saints': 'nosants',
  'new orleans saints': 'nosants',
  'cowboys': 'dalcowboys',
  'dallas cowboys': 'dalcowboys',
  'jets': 'nyjets',
  'new york jets': 'nyjets',
  'broncos': 'denbroncos',
  'denver broncos': 'denbroncos',
  'eagles': 'phieagles',
  'philadelphia eagles': 'phieagles',
  'dolphins': 'miadolphins',
  'miami dolphins': 'miadolphins',
  'panthers': 'carpanthers',
  'carolina panthers': 'carpanthers',
  'texans': 'houtexans',
  'houston texans': 'houtexans',
  'ravens': 'balravens',
  'baltimore ravens': 'balravens',
  'titans': 'tentitans',
  'tennessee titans': 'tentitans',
  'cardinals': 'azcardinals',
  'arizona cardinals': 'azcardinals',
  'buccaneers': 'tbbucs',
  'tampa bay buccaneers': 'tbbucs',
  'seahawks': 'seaseahawks',
  'seattle seahawks': 'seaseahawks',
  'lions': 'detlions',
  'detroit lions': 'detlions',
  'bengals': 'cinbengals',
  'cincinnati bengals': 'cinbengals',
  'commanders': 'wascommanders',
  'washington commanders': 'wascommanders',
  'patriots': 'nepats',
  'new england patriots': 'nepats',
  'bills': 'bufbills',
  'buffalo bills': 'bufbills',
  'chiefs': 'kcchiefs',
  'kansas city chiefs': 'kcchiefs',
  'jaguars': 'jaxjags',
  'jacksonville jaguars': 'jaxjags',
};


export function normalizeTeamName(teamName: string): string {
  const normalized = teamName.trim().toLowerCase();
  return TEAM_MAPPINGS[normalized] || normalized;
}


export function createGameKey(pick: Pick): string {
  const homeTeam = pick.game_info?.home_team?.trim() || '';
  const awayTeam = pick.game_info?.away_team?.trim() || '';
  const normalizedHome = normalizeTeamName(homeTeam);
  const normalizedAway = normalizeTeamName(awayTeam);
  const week = getPickWeek(pick);
  
  return `${normalizedHome}-${normalizedAway}-${week}`;
}

 * Find duplicate picks in a list
 * Returns groups of duplicates, with the oldest pick as the "original"
 */
export function findDuplicates(picks: Pick[]): DuplicateInfo[] {
  const sortedPicks = [...picks].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const gameMap = new Map<string, Pick[]>();

  for (const pick of sortedPicks) {
    const key = createGameKey(pick);
    const existing = gameMap.get(key) || [];
    existing.push(pick);
    gameMap.set(key, existing);
  }

  const duplicateGroups: DuplicateInfo[] = [];

  gameMap.forEach((pickGroup, key) => {
    if (pickGroup.length > 1) {
      const [original, ...duplicates] = pickGroup;
      duplicateGroups.push({
        original,
        duplicates,
        key
      });
    }
  });

  return duplicateGroups;
}

 * Count total number of duplicate picks
 */
export function countDuplicates(picks: Pick[]): number {
  const duplicateGroups = findDuplicates(picks);
  return duplicateGroups.reduce((count, group) => count + group.duplicates.length, 0);
}

 * Clean duplicates by deleting all but the oldest pick for each game
 * Returns the number of picks successfully deleted
 */
export async function cleanDuplicates(picks: Pick[]): Promise<{
  deletedCount: number;
  failedCount: number;
  errors: Array<{ pickId: string; error: AppError }>;
}> {
  const duplicateGroups = findDuplicates(picks);
  
  let deletedCount = 0;
  let failedCount = 0;
  const errors: Array<{ pickId: string; error: AppError }> = [];

  for (const group of duplicateGroups) {
    for (const duplicate of group.duplicates) {
      const { success, error } = await deletePick(duplicate.id);
      
      if (success) {
        deletedCount++;
      } else {
        failedCount++;
        if (error) {
          errors.push({ pickId: duplicate.id, error });
        }
      }
    }
  }

  return { deletedCount, failedCount, errors };
}

 * Check if a pick is a duplicate of any existing picks
 */
export function isDuplicate(pick: Pick, existingPicks: Pick[]): boolean {
  const pickKey = createGameKey(pick);
  
  return existingPicks.some(existing => {
    if (existing.id === pick.id) {
      return false;
    }
    
    return createGameKey(existing) === pickKey;
  });
}


export function findOriginalPick(pick: Pick, allPicks: Pick[]): Pick | null {
  const pickKey = createGameKey(pick);
  
  const matchingPicks = allPicks
    .filter(p => createGameKey(p) === pickKey)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (matchingPicks.length === 0 || matchingPicks[0].id === pick.id) {
    return null; 
  }

  return matchingPicks[0]; 
}
