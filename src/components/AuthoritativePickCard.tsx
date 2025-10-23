import React, { useState } from 'react';
import { Pick } from '../types';
import { formatEdge } from '../utils/edgeCalculator';
import { getConfidenceBadge, getEdgeTextColorClass, getEdgeBarColorClass } from '../utils/confidenceHelpers';
import { safeDateFormat } from '../utils/dateValidation';

interface BetType {
  type: 'moneyline' | 'spread' | 'total';
  prediction: string;
  edge: number | null;
  confidence: number;
  result?: 'win' | 'loss' | 'push' | 'pending' | null;
}

const getAllBets = (pick: Pick): BetType[] => {
  const bets: BetType[] = [];

  if (pick.prediction && pick.moneyline_edge !== undefined) {
    bets.push({
      type: 'moneyline',
      prediction: pick.prediction,
      edge: pick.moneyline_edge,
      confidence: pick.monte_carlo_results?.moneyline_probability || pick.confidence,
      result: pick.result
    });
  }

  if (pick.spread_prediction && pick.spread_edge !== undefined) {
    bets.push({
      type: 'spread',
      prediction: pick.spread_prediction,
      edge: pick.spread_edge,
      confidence: pick.monte_carlo_results?.spread_probability || pick.confidence,
      result: pick.ats_result
    });
  }

  if (pick.ou_prediction && pick.ou_edge !== undefined) {
    bets.push({
      type: 'total',
      prediction: pick.ou_prediction,
      edge: pick.ou_edge,
      confidence: pick.monte_carlo_results?.total_probability || pick.confidence,
      result: pick.ou_result
    });
  }

  return bets.sort((a, b) => (b.edge || 0) - (a.edge || 0));
};

const getBestBet = (pick: Pick): BetType | null => {
  const bets = getAllBets(pick);
  return bets.length > 0 ? bets[0] : null;
};

interface BetRowProps {
  bet: BetType;
  isBest: boolean;
}

const BetRow: React.FC<BetRowProps> = ({ bet, isBest }) => {
  const badge = getConfidenceBadge(bet.edge || 0, bet.confidence);

  const getResultBadge = () => {
    if (!bet.result || bet.result === 'pending') return null;

    const colorMap = {
      win: 'bg-green-900/30 text-green-400 border-green-500',
      loss: 'bg-red-900/30 text-red-400 border-red-500',
      push: 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorMap[bet.result]}`}>
        {bet.result === 'win' ? 'W' : bet.result === 'loss' ? 'L' : 'P'}
      </span>
    );
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
      isBest
        ? 'bg-lime-500/5 border-lime-500/30'
        : 'bg-gray-800/50 border-gray-700/50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            {bet.type}
          </span>
          {isBest && badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.color} inline-flex items-center gap-1`}>
              <span>{badge.icon}</span>
              {badge.text}
            </span>
          )}
          {getResultBadge()}
        </div>

        <div className="flex items-center gap-3">
          <span className={`font-medium text-sm truncate ${isBest ? 'text-lime-400' : 'text-white'}`}>
            {bet.prediction}
          </span>
          <span className={`text-sm font-bold ${getEdgeTextColorClass(bet.edge || 0)}`}>
            {formatEdge(bet.edge)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getEdgeBarColorClass(bet.edge || 0)}`}
              style={{ width: `${Math.min(bet.confidence, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium min-w-[40px] text-right">
            {bet.confidence.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface AuthoritativePickCardProps {
  pick: Pick;
  showAllBets?: boolean;
}

const AuthoritativePickCard: React.FC<AuthoritativePickCardProps> = ({
  pick,
  showAllBets = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const allBets = getAllBets(pick);
  const bestBet = getBestBet(pick);
  const hasMultipleBets = allBets.length > 1;
  const displayBets = showAllBets ? allBets : (bestBet ? [bestBet] : []);

  const formatGameDate = (date: string): string => {
    try {
      const d = new Date(date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hour = d.getHours();
      const minute = d.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} • ${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (e) {
      return safeDateFormat(date);
    }
  };

  if (!bestBet) return null;

  return (
    <div
      className={`bg-[#1a1a1a] rounded-lg transition-all duration-200 min-h-[200px] max-w-none ${
        isHovered
          ? 'transform -translate-y-1 shadow-2xl border border-lime-500/50'
          : 'border border-[rgba(255,255,255,0.05)]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">
            {pick.game_info.away_team} @ {pick.game_info.home_team}
          </h3>
          {hasMultipleBets && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatGameDate(pick.game_info.game_date)}
        </div>
      </div>

      {/* Bet Sections */}
      <div className="px-6 py-4 space-y-3">
        {displayBets.map((bet, index) => (
          <BetRow
            key={`${bet.type}-${index}`}
            bet={bet}
            isBest={index === 0}
          />
        ))}

        {/* Show more/less toggle */}
        {hasMultipleBets && !showAllBets && (
          <div className="text-center pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-400 hover:text-white transition-colors duration-200 underline"
            >
              {isExpanded ? 'Show less' : `Show ${allBets.length - 1} more bet${allBets.length - 1 === 1 ? '' : 's'}`}
            </button>
          </div>
        )}

        {/* Expanded additional bets */}
        {isExpanded && hasMultipleBets && !showAllBets && (
          <div className="space-y-2 pt-2 border-t border-gray-700/50">
            {allBets.slice(1).map((bet, index) => (
              <BetRow
                key={`additional-${bet.type}-${index}`}
                bet={bet}
                isBest={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthoritativePickCard;