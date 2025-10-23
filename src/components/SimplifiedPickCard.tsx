import React, { useState } from 'react';
import type { BettingPick } from '../types/picks.types';
import {
  getBestBet,
  getAllBetTypes,
  getConfidenceBadge,
  getConfidenceBadgeClasses,
  formatEdgeDisplay,
  getBetTypeDisplayName,
  formatGameDate,
  getReasoningPreview,
  formatOdds
} from '../utils/pickDisplayHelpers';

interface SimplifiedPickCardProps {
  pick: BettingPick;
}

const SimplifiedPickCard: React.FC<SimplifiedPickCardProps> = ({ pick }) => {
  const [showAllBets, setShowAllBets] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const bestBet = getBestBet(pick);
  const allBets = getAllBetTypes(pick);

  if (!bestBet) {
    return null; // No bets available for this pick
  }

  const badge = getConfidenceBadge(bestBet.edge);
  const badgeClasses = getConfidenceBadgeClasses(badge);

  return (
    <div
      className={`bg-[#1a1a1a] rounded-lg transition-all duration-200 ${
        isHovered
          ? 'transform -translate-y-1 shadow-2xl border-2 border-lime-500/50'
          : 'border border-[rgba(255,255,255,0.05)]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Confidence Badge */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">
              {pick.game_info.away_team} @ {pick.game_info.home_team}
            </h3>
            <div className="text-xs text-gray-500">
              {formatGameDate(pick.game_info.game_date)}
            </div>
          </div>

          {/* Confidence Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${badgeClasses.background} ${badgeClasses.border}`}
          >
            <span className="text-lg">{badge.icon}</span>
            <span className={`text-xs font-bold ${badgeClasses.text}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Best Bet Section */}
      <div className="px-6 py-5">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
            💰 BEST BET
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-white font-bold text-xl">
              {bestBet.prediction}
            </span>
            <span className="text-xs text-gray-400">
              {getBetTypeDisplayName(bestBet.type)}
            </span>
          </div>

          {/* Edge and Probability */}
          <div className="flex items-center gap-6 mb-3">
            <div>
              <span className="text-xs text-gray-500">Edge: </span>
              <span className={`text-sm font-bold ${
                bestBet.edge >= 5 ? 'text-lime-400' :
                bestBet.edge >= 2 ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {formatEdgeDisplay(bestBet.edge)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Win Probability: </span>
              <span className="text-sm font-medium text-white">
                {bestBet.probability.toFixed(1)}%
              </span>
            </div>
            {bestBet.odds && (
              <div>
                <span className="text-xs text-gray-500">Odds: </span>
                <span className="text-sm font-medium text-white">
                  {formatOdds(bestBet.odds)}
                </span>
              </div>
            )}
          </div>

          {/* Reasoning Preview */}
          {pick.reasoning && (
            <div className="bg-gray-900/50 rounded-md p-3 mb-3">
              <div className="text-xs text-gray-500 mb-1">💡 Analysis</div>
              <div className="text-sm text-gray-300 italic">
                "{getReasoningPreview(pick.reasoning, 120)}"
              </div>
            </div>
          )}
        </div>

        {/* Show All Picks Toggle */}
        {allBets.length > 1 && (
          <button
            onClick={() => setShowAllBets(!showAllBets)}
            className="w-full text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 py-2"
          >
            <span>{showAllBets ? 'Hide' : 'Show'} all {allBets.length} picks</span>
            <span className="text-lg">{showAllBets ? '▲' : '▼'}</span>
          </button>
        )}

        {/* Expanded All Bets View */}
        {showAllBets && (
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
              📊 ALL PICKS FOR THIS GAME
            </div>

            {allBets.map((bet) => {
              const isBest = bet.type === bestBet.type;
              const betBadge = getConfidenceBadge(bet.edge);

              return (
                <div
                  key={bet.type}
                  className={`p-3 rounded-md ${
                    isBest
                      ? 'bg-lime-900/20 border border-lime-500/30'
                      : 'bg-gray-900/50 border border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        {getBetTypeDisplayName(bet.type)}
                      </div>
                      <div className="text-sm font-medium text-white mb-1">
                        {bet.prediction}
                      </div>
                      {bet.line && (
                        <div className="text-xs text-gray-400">{bet.line}</div>
                      )}
                    </div>

                    {isBest && (
                      <span className="text-xs font-bold text-lime-400 bg-lime-900/30 px-2 py-1 rounded">
                        BEST ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Edge: </span>
                      <span className={`font-medium ${
                        bet.edge >= 5 ? 'text-lime-400' :
                        bet.edge >= 2 ? 'text-yellow-400' :
                        bet.edge >= 0 ? 'text-gray-400' :
                        'text-red-400'
                      }`}>
                        {formatEdgeDisplay(bet.edge)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Probability: </span>
                      <span className="text-white">{bet.probability.toFixed(1)}%</span>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs">
                        {betBadge.icon} {betBadge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedPickCard;