// api/lib/utils/nfl-utils.ts

export function calculateNFLWeek(gameDate: Date): number {
  const seasonStart = new Date('2025-09-04');
  const daysDiff = Math.floor(
    (gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1));
}

export function getConfidenceLevel(probability: number): 'High' | 'Medium' | 'Low' {
  if (probability >= 65) return 'High';
  if (probability >= 55) return 'Medium';
  return 'Low';
}

export function mapConfidenceToNumber(confidence: 'High' | 'Medium' | 'Low'): number {
  switch (confidence) {
    case 'High': return 80;
    case 'Medium': return 60;
    case 'Low': return 40;
    default: return 50;
  }
}
