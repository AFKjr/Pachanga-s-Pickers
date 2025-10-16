/**
 * Fallback and edge case handling for AI agent output variations
 */


export const extractTeamsFlexible = (line: string): { awayTeam: string; homeTeam: string } | null => {
  
  let cleanLine = line
    .replace(/^(Game|Match|Matchup)\s*:?\s*/i, '')
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .trim();

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


export const isPotentialConfidenceLine = (line: string): boolean => {
  const confidenceKeywords = [
    'confidence', 'conviction', 'certainty', 'strength', 'strong', 
    'weak', 'high', 'medium', 'low', 'sure', 'likely', 'probable'
  ];
  
  const lowerLine = line.toLowerCase();
  return confidenceKeywords.some(keyword => lowerLine.includes(keyword));
};


export const isLikelySectionBreak = (line: string): boolean => {
  
  if (!line.trim()) return true;
  
  
  if (/^[=\-_*#]{3,}/.test(line)) return true;
  
  
  if (extractTeamsFlexible(line)) return true;
  
  
  const sectionHeaders = [
    /^(game|match|prediction|analysis|summary)/i,
    /\d+\./,  
    /^week\s+\d+/i
  ];
  
  return sectionHeaders.some(pattern => pattern.test(line));
};


export const extractNumericConfidence = (line: string): number | null => {
  
  const percentMatch = line.match(/(\d+)%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    if (percent >= 0 && percent <= 100) {
      return percent;
    }
  }
  
  
  const decimalMatch = line.match(/0\.(\d+)/);
  if (decimalMatch) {
    const decimal = parseFloat(`0.${decimalMatch[1]}`);
    if (decimal >= 0 && decimal <= 1) {
      return Math.round(decimal * 100);
    }
  }
  
  return null;
};


export const normalizeTeamName = (teamName: string): string => {
  
  return teamName
    .replace(/\b(NFL|Team|FC|Club)\b/gi, '')
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