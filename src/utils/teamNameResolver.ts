/**
 * Team Name Resolution Utility
 * Maps various team name formats to canonical database names
 */

// Canonical team names (matches what's in database and used throughout app)
export const CANONICAL_TEAM_NAMES = [
  'Arizona Cardinals',
  'Atlanta Falcons',
  'Baltimore Ravens',
  'Buffalo Bills',
  'Carolina Panthers',
  'Chicago Bears',
  'Cincinnati Bengals',
  'Cleveland Browns',
  'Dallas Cowboys',
  'Denver Broncos',
  'Detroit Lions',
  'Green Bay Packers',
  'Houston Texans',
  'Indianapolis Colts',
  'Jacksonville Jaguars',
  'Kansas City Chiefs',
  'Las Vegas Raiders',
  'Los Angeles Chargers',
  'Los Angeles Rams',
  'Miami Dolphins',
  'Minnesota Vikings',
  'New England Patriots',
  'New Orleans Saints',
  'New York Giants',
  'New York Jets',
  'Philadelphia Eagles',
  'Pittsburgh Steelers',
  'San Francisco 49ers',
  'Seattle Seahawks',
  'Tampa Bay Buccaneers',
  'Tennessee Titans',
  'Washington Commanders'
] as const;

export type CanonicalTeamName = typeof CANONICAL_TEAM_NAMES[number];

/**
 * Comprehensive team name mapping
 * Maps all known variations to canonical names
 */
const TEAM_NAME_MAPPINGS: Record<string, CanonicalTeamName> = {
  // Full names (canonical)
  'arizona cardinals': 'Arizona Cardinals',
  'atlanta falcons': 'Atlanta Falcons',
  'baltimore ravens': 'Baltimore Ravens',
  'buffalo bills': 'Buffalo Bills',
  'carolina panthers': 'Carolina Panthers',
  'chicago bears': 'Chicago Bears',
  'cincinnati bengals': 'Cincinnati Bengals',
  'cleveland browns': 'Cleveland Browns',
  'dallas cowboys': 'Dallas Cowboys',
  'denver broncos': 'Denver Broncos',
  'detroit lions': 'Detroit Lions',
  'green bay packers': 'Green Bay Packers',
  'houston texans': 'Houston Texans',
  'indianapolis colts': 'Indianapolis Colts',
  'jacksonville jaguars': 'Jacksonville Jaguars',
  'kansas city chiefs': 'Kansas City Chiefs',
  'las vegas raiders': 'Las Vegas Raiders',
  'los angeles chargers': 'Los Angeles Chargers',
  'los angeles rams': 'Los Angeles Rams',
  'miami dolphins': 'Miami Dolphins',
  'minnesota vikings': 'Minnesota Vikings',
  'new england patriots': 'New England Patriots',
  'new orleans saints': 'New Orleans Saints',
  'new york giants': 'New York Giants',
  'new york jets': 'New York Jets',
  'philadelphia eagles': 'Philadelphia Eagles',
  'pittsburgh steelers': 'Pittsburgh Steelers',
  'san francisco 49ers': 'San Francisco 49ers',
  'seattle seahawks': 'Seattle Seahawks',
  'tampa bay buccaneers': 'Tampa Bay Buccaneers',
  'tennessee titans': 'Tennessee Titans',
  'washington commanders': 'Washington Commanders',
  
  // Short names (city only)
  'arizona': 'Arizona Cardinals',
  'atlanta': 'Atlanta Falcons',
  'baltimore': 'Baltimore Ravens',
  'buffalo': 'Buffalo Bills',
  'carolina': 'Carolina Panthers',
  'chicago': 'Chicago Bears',
  'cincinnati': 'Cincinnati Bengals',
  'cleveland': 'Cleveland Browns',
  'dallas': 'Dallas Cowboys',
  'denver': 'Denver Broncos',
  'detroit': 'Detroit Lions',
  'green bay': 'Green Bay Packers',
  'houston': 'Houston Texans',
  'indianapolis': 'Indianapolis Colts',
  'jacksonville': 'Jacksonville Jaguars',
  'kansas city': 'Kansas City Chiefs',
  'las vegas': 'Las Vegas Raiders',
  'los angeles': 'Los Angeles Rams', // Default to Rams for ambiguous LA
  'miami': 'Miami Dolphins',
  'minnesota': 'Minnesota Vikings',
  'new england': 'New England Patriots',
  'new orleans': 'New Orleans Saints',
  'new york': 'New York Giants', // Default to Giants for ambiguous NY
  'philadelphia': 'Philadelphia Eagles',
  'pittsburgh': 'Pittsburgh Steelers',
  'san francisco': 'San Francisco 49ers',
  'seattle': 'Seattle Seahawks',
  'tampa bay': 'Tampa Bay Buccaneers',
  'tampa': 'Tampa Bay Buccaneers',
  'tennessee': 'Tennessee Titans',
  'washington': 'Washington Commanders',
  
  // Nicknames only
  'cardinals': 'Arizona Cardinals',
  'falcons': 'Atlanta Falcons',
  'ravens': 'Baltimore Ravens',
  'bills': 'Buffalo Bills',
  'panthers': 'Carolina Panthers',
  'bears': 'Chicago Bears',
  'bengals': 'Cincinnati Bengals',
  'browns': 'Cleveland Browns',
  'cowboys': 'Dallas Cowboys',
  'broncos': 'Denver Broncos',
  'lions': 'Detroit Lions',
  'packers': 'Green Bay Packers',
  'texans': 'Houston Texans',
  'colts': 'Indianapolis Colts',
  'jaguars': 'Jacksonville Jaguars',
  'chiefs': 'Kansas City Chiefs',
  'raiders': 'Las Vegas Raiders',
  'chargers': 'Los Angeles Chargers',
  'rams': 'Los Angeles Rams',
  'dolphins': 'Miami Dolphins',
  'vikings': 'Minnesota Vikings',
  'patriots': 'New England Patriots',
  'saints': 'New Orleans Saints',
  'giants': 'New York Giants',
  'jets': 'New York Jets',
  'eagles': 'Philadelphia Eagles',
  'steelers': 'Pittsburgh Steelers',
  '49ers': 'San Francisco 49ers',
  'niners': 'San Francisco 49ers',
  'seahawks': 'Seattle Seahawks',
  'buccaneers': 'Tampa Bay Buccaneers',
  'bucs': 'Tampa Bay Buccaneers',
  'titans': 'Tennessee Titans',
  'commanders': 'Washington Commanders',
  
  // Common abbreviations
  'ari': 'Arizona Cardinals',
  'atl': 'Atlanta Falcons',
  'bal': 'Baltimore Ravens',
  'buf': 'Buffalo Bills',
  'car': 'Carolina Panthers',
  'chi': 'Chicago Bears',
  'cin': 'Cincinnati Bengals',
  'cle': 'Cleveland Browns',
  'dal': 'Dallas Cowboys',
  'den': 'Denver Broncos',
  'det': 'Detroit Lions',
  'gb': 'Green Bay Packers',
  'hou': 'Houston Texans',
  'ind': 'Indianapolis Colts',
  'jax': 'Jacksonville Jaguars',
  'kc': 'Kansas City Chiefs',
  'lv': 'Las Vegas Raiders',
  'lac': 'Los Angeles Chargers',
  'lar': 'Los Angeles Rams',
  'mia': 'Miami Dolphins',
  'min': 'Minnesota Vikings',
  'ne': 'New England Patriots',
  'no': 'New Orleans Saints',
  'nyg': 'New York Giants',
  'nyj': 'New York Jets',
  'phi': 'Philadelphia Eagles',
  'pit': 'Pittsburgh Steelers',
  'sf': 'San Francisco 49ers',
  'sea': 'Seattle Seahawks',
  'tb': 'Tampa Bay Buccaneers',
  'ten': 'Tennessee Titans',
  'was': 'Washington Commanders',
  
  // Legacy names
  'washington redskins': 'Washington Commanders',
  'washington football team': 'Washington Commanders',
  'oakland raiders': 'Las Vegas Raiders',
  'san diego chargers': 'Los Angeles Chargers',
  'st. louis rams': 'Los Angeles Rams',
  'st louis rams': 'Los Angeles Rams',
  
  // Common variations
  'sf 49ers': 'San Francisco 49ers',
  'san fran 49ers': 'San Francisco 49ers',
  'tb buccaneers': 'Tampa Bay Buccaneers',
  'tb bucs': 'Tampa Bay Buccaneers',
  'ne patriots': 'New England Patriots',
  'ne pats': 'New England Patriots',
  'la rams': 'Los Angeles Rams',
  'la chargers': 'Los Angeles Chargers',
  'ny giants': 'New York Giants',
  'ny jets': 'New York Jets',
  'no saints': 'New Orleans Saints',
  'kc chiefs': 'Kansas City Chiefs'
};

/**
 * Resolve a team name to its canonical form
 * @param teamName - Any variation of a team name
 * @returns Canonical team name or null if not found
 */
export function resolveTeamName(teamName: string): CanonicalTeamName | null {
  if (!teamName || typeof teamName !== 'string') {
    return null;
  }

  // Clean the input
  const cleaned = teamName
    .trim()
    .toLowerCase()
    .replace(/\./g, '') // Remove periods (e.g., "St. Louis" -> "St Louis")
    .replace(/\s+/g, ' '); // Normalize whitespace

  // Direct lookup
  const canonical = TEAM_NAME_MAPPINGS[cleaned];
  if (canonical) {
    return canonical;
  }

  // Fuzzy match: try to find a canonical name that contains the input
  // (useful for cases like "Lions" -> "Detroit Lions")
  const fuzzyMatch = CANONICAL_TEAM_NAMES.find(name => {
    const nameLower = name.toLowerCase();
    return nameLower === cleaned || 
           nameLower.endsWith(` ${cleaned}`) || // Nickname match
           nameLower.startsWith(`${cleaned} `); // City match
  });

  return fuzzyMatch || null;
}

/**
 * Check if a team name is valid (can be resolved)
 * @param teamName - Team name to validate
 * @returns True if the team name can be resolved
 */
export function isValidTeamName(teamName: string): boolean {
  return resolveTeamName(teamName) !== null;
}

/**
 * Get all accepted variations for a canonical team name
 * @param canonicalName - The canonical team name
 * @returns Array of all accepted variations
 */
export function getTeamVariations(canonicalName: CanonicalTeamName): string[] {
  return Object.entries(TEAM_NAME_MAPPINGS)
    .filter(([_, canonical]) => canonical === canonicalName)
    .map(([variation]) => variation);
}

/**
 * Normalize a team name for display (adds proper casing)
 * @param teamName - Team name in any format
 * @returns Properly formatted canonical name or original if not found
 */
export function normalizeTeamNameForDisplay(teamName: string): string {
  const canonical = resolveTeamName(teamName);
  return canonical || teamName;
}
