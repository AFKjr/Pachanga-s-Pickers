import React from 'react';
import { Pick } from '../types';
import { formatEdge } from '../utils/edgeCalculator';
import { safeDateFormat } from '../utils/dateValidation';

interface ConfidenceBadge {
  text: string;
  color: string;
  icon: string;
}

const getConfidenceBadge = (edge: number, confidence: number): ConfidenceBadge | null => {
  if (edge >= 7 && confidence >= 65) {
    return {
      text: 'HIGH CONFIDENCE',
      color: 'bg-lime-500 text-black',
      icon: '⚡'
    };
  }
  if (edge >= 5 && confidence >= 60) {
    return {
      text: 'STRONG EDGE',
      color: 'bg-lime-500 text-black',
      icon: '💎'
    };
  }
  if (edge >= 3 && confidence >= 55) {
    return {
      text: 'VALUE PLAY',
      color: 'bg-yellow-500 text-black',
      icon: '⭐'
    };
  }
  return null;
};

interface BestBet {
  type: 'moneyline' | 'spread' | 'total';
  edge: number;
  prediction: string;
  confidence: number;
}

const getBestBetType = (pick: Pick): BestBet | null => {
  const bets: BestBet[] = [];

  if (pick.prediction && pick.moneyline_edge) {
    bets.push({
      type: 'moneyline',
      edge: pick.moneyline_edge,
      prediction: pick.prediction,
      confidence: pick.monte_carlo_results?.moneyline_probability || pick.confidence
    });
  }

  if (pick.spread_prediction && pick.spread_edge) {
    bets.push({
      type: 'spread',
      edge: pick.spread_edge,
      prediction: pick.spread_prediction,
      confidence: pick.monte_carlo_results?.spread_probability || pick.confidence
    });
  }

  if (pick.ou_prediction && pick.ou_edge) {
    bets.push({
      type: 'total',
      edge: pick.ou_edge,
      prediction: pick.ou_prediction,
      confidence: pick.monte_carlo_results?.total_probability || pick.confidence
    });
  }

  // Only return bets with meaningful edge
  const validBets = bets.filter(bet => bet.edge >= 3);
  if (validBets.length === 0) return null;

  // Return the bet with highest edge
  return validBets.sort((a, b) => b.edge - a.edge)[0];
};

interface BestBetCardProps {
  pick: Pick;
}

const BestBetCard: React.FC<BestBetCardProps> = ({ pick }) => {
  const bestBet = getBestBetType(pick);
  if (!bestBet) return null;

  const badge = getConfidenceBadge(bestBet.edge, bestBet.confidence);

  const formatGameDate = (date: string): string => {
    try {
      const gameDate = new Date(date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const hour = gameDate.getHours();
      const minute = gameDate.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${days[gameDate.getDay()]} ${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return safeDateFormat(date);
    }
  };

  const getSimpleReasoning = (): string => {
    const firstSentence = pick.reasoning.split('.')[0];
    if (firstSentence.length > 80) {
      return firstSentence.substring(0, 80) + '...';
    }
    return firstSentence + '.';
  };

  return (
    <div className="bg-[#1a1a1a] border-2 border-lime-500 rounded-lg p-4 hover:shadow-2xl hover:shadow-lime-500/20 transition-all duration-200">
      {/* Badge and Edge */}
      {badge && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color} inline-flex items-center gap-1`}>
            <span>{badge.icon}</span>
            {badge.text}
          </span>
          <span className="text-lime-400 text-2xl font-bold">{formatEdge(bestBet.edge)}</span>
        </div>
      )}

      {/* Game Info */}
      <div className="mb-3">
        <h3 className="text-white font-bold text-lg mb-1">
          {pick.game_info.away_team} @ {pick.game_info.home_team}
        </h3>
        <div className="text-xs text-gray-400">
          {formatGameDate(pick.game_info.game_date)} • Week {pick.week}
        </div>
      </div>

      {/* Bet Details */}
      <div className="bg-[#0a0a0a] rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            {bestBet.type}
          </span>
          <span className="text-xs text-gray-400">
            {bestBet.confidence.toFixed(1)}% confidence
          </span>
        </div>
        <div className="text-lime-400 font-bold text-lg mb-2">
          {bestBet.prediction}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-lime-500 transition-all duration-500"
            style={{ width: `${Math.min(bestBet.confidence, 100)}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div className="text-sm text-gray-400 italic border-l-2 border-lime-500/30 pl-3">
        {getSimpleReasoning()}
      </div>
    </div>
  );
};

interface BestBetsSectionProps {
  picks: Pick[];
  minEdgeThreshold?: number;
  maxDisplayCount?: number;
}

const BestBetsSection: React.FC<BestBetsSectionProps> = ({
  picks,
  minEdgeThreshold = 7,
  maxDisplayCount = 3
}) => {
  const bestBets = picks
    .filter(pick => {
      const maxEdge = Math.max(
        pick.moneyline_edge || 0,
        pick.spread_edge || 0,
        pick.ou_edge || 0
      );
      return maxEdge >= minEdgeThreshold;
    })
    .sort((a, b) => {
      const maxEdgeA = Math.max(
        a.moneyline_edge || 0,
        a.spread_edge || 0,
        a.ou_edge || 0
      );
      const maxEdgeB = Math.max(
        b.moneyline_edge || 0,
        b.spread_edge || 0,
        b.ou_edge || 0
      );
      return maxEdgeB - maxEdgeA;
    })
    .slice(0, maxDisplayCount);

  if (bestBets.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-white">⚡ Best Bets</h2>
        <span className="px-3 py-1 bg-lime-500 text-black text-xs font-bold rounded-full">
          {bestBets.length} HIGH CONFIDENCE
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bestBets.map(pick => (
          <BestBetCard key={pick.id} pick={pick} />
        ))}
      </div>
    </div>
  );
};

export default BestBetsSection;