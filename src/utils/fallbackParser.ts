/**
 * Fallback and edge case handling for AI agent output variations
 */

/**
 * Fallback team name extraction for non-standard formats
 */
export const extractTeamsFlexible = (line: string): { awayTeam: string; homeTeam: string } | null => {
  // Remove common prefixes and emojis
  let cleanLine = line
    .replace(/^(Game|Match|Matchup|🏈)\s*:?\s*/i, '')
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .trim();

  // Try various separators
  const separators = [' @ ', ' vs ', ' at ', ' v ', ' VS ', ' AT '];
  
  for (const separator of separators) {
    if (cleanLine.includes(separator)) {
      const parts = cleanLine.split(separator);
      if (parts.length === 2) {
        return {
          awayTeam: parts[0].trim(),
          homeTeam: parts[1].trim()
        };
      }
    }
  }
  
  return null;
};

/**
 * Detect prediction lines that might not match standard patterns
 */
export const isPotentialPredictionLine = (line: string): boolean => {
  const predictionKeywords = [
    'score', 'prediction', 'pick', 'bet', 'play', 'recommendation', 
    'forecast', 'outcome', 'result', 'winner', 'spread', 'total',
    'moneyline', 'ml', 'over', 'under', 'points'
  ];
  
  const lowerLine = line.toLowerCase();
  return predictionKeywords.some(keyword => lowerLine.includes(keyword));
};

/**
 * Detect confidence indicators that might not match standard patterns
 */
export const isPotentialConfidenceLine = (line: string): boolean => {
  const confidenceKeywords = [
    'confidence', 'conviction', 'certainty', 'strength', 'strong', 
    'weak', 'high', 'medium', 'low', 'sure', 'likely', 'probable'
  ];
  
  const lowerLine = line.toLowerCase();
  return confidenceKeywords.some(keyword => lowerLine.includes(keyword));
};

/**
 * Smart section break detection - determines when to stop collecting factors
 */
export const isLikelySectionBreak = (line: string): boolean => {
  // Empty lines
  if (!line.trim()) return true;
  
  // Lines with lots of special characters (dividers)
  if (/^[=\-_*#]{3,}/.test(line)) return true;
  
  // New games
  if (extractTeamsFlexible(line)) return true;
  
  // New sections
  const sectionHeaders = [
    /^(game|match|prediction|analysis|summary)/i,
    /\d+\./,  // Numbered items
    /^week\s+\d+/i
  ];
  
  return sectionHeaders.some(pattern => pattern.test(line));
};

/**
 * Extract numeric confidence if no keyword confidence found
 */
export const extractNumericConfidence = (line: string): number | null => {
  // Look for percentages
  const percentMatch = line.match(/(\d+)%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    if (percent >= 0 && percent <= 100) {
      return percent;
    }
  }
  
  // Look for decimal confidence (0.0 - 1.0)
  const decimalMatch = line.match(/0\.(\d+)/);
  if (decimalMatch) {
    const decimal = parseFloat(`0.${decimalMatch[1]}`);
    if (decimal >= 0 && decimal <= 1) {
      return Math.round(decimal * 100);
    }
  }
  
  return null;
};

/**
 * Comprehensive team name normalization
 */
export const normalizeTeamName = (teamName: string): string => {
  // Remove common abbreviations and clean up
  return teamName
    .replace(/\b(NFL|Team|FC|Club)\b/gi, '')
    .replace(/[🏈⚡🔥💪]/g, '') // Remove sports emojis
    .replace(/\s+/g, ' ')
    .trim();
};

export default {
  extractTeamsFlexible,
  isPotentialPredictionLine,
  isPotentialConfidenceLine,
  isLikelySectionBreak,
  extractNumericConfidence,
  normalizeTeamName
};