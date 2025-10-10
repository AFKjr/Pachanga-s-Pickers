import { PickCardProps } from '../types';
import { safeDateFormat } from '../utils/dateValidation';

const PickCard = ({ pick, showComments = true, onCommentClick }: PickCardProps) => {
  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'push': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg mb-4 hover:border-gray-600 transition-colors">
      <div className="p-4">
          {/* Header with title and metadata */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-1">
                {pick.game_info.away_team} @ {pick.game_info.home_team}
              </h3>
              
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <span>Posted by u/{pick.author_username || 'Anonymous'}</span>
                <span>•</span>
                <span>{safeDateFormat(pick.created_at)}</span>
                <span>•</span>
                <span className="text-sm text-gray-400">{pick.game_info.league}</span>
                {pick.is_pinned && pick.reasoning?.includes('AI-generated') && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    AI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prediction */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-gray-300">{pick.prediction}</p>
              {pick.monte_carlo_results?.moneyline_probability && (
                <span className="text-sm text-green-400 font-medium">
                  ({pick.monte_carlo_results.moneyline_probability.toFixed(1)}%)
                </span>
              )}
            </div>
            
            {/* ATS and O/U Predictions */}
            {(pick.spread_prediction || pick.ou_prediction) && (
              <div className="flex flex-wrap gap-3 mb-2">
                {pick.spread_prediction && (
                  <div className="bg-gray-700 px-3 py-1.5 rounded-md">
                    <span className="text-xs text-gray-400 mr-1.5">ATS:</span>
                    <span className="text-sm text-white font-medium">{pick.spread_prediction}</span>
                    {pick.monte_carlo_results?.spread_probability && (
                      <span className="text-xs text-green-400 ml-1.5 font-medium">
                        ({pick.monte_carlo_results.spread_probability.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
                {pick.ou_prediction && (
                  <div className="bg-gray-700 px-3 py-1.5 rounded-md">
                    <span className="text-xs text-gray-400 mr-1.5">O/U:</span>
                    <span className="text-sm text-white font-medium">{pick.ou_prediction}</span>
                    {pick.monte_carlo_results?.total_probability && (
                      <span className="text-xs text-green-400 ml-1.5 font-medium">
                        ({pick.monte_carlo_results.total_probability.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-4">
              {pick.result && (
                <span className={`text-sm ${getResultColor(pick.result)}`}>
                  {pick.result.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Analysis section */}
          <div className="bg-gray-700 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Analysis:</h4>
            <p className="text-sm text-gray-300">{pick.reasoning}</p>
          </div>

          {/* Footer with comment button */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            {showComments && onCommentClick && (
              <button 
                onClick={onCommentClick}
                className="flex items-center space-x-1 text-gray-400 hover:text-primary-400 transition-colors"
              >
                <span></span>
                <span>Join Discussion</span>
              </button>
            )}
          </div>
        </div>
    </div>
  );
};

export default PickCard;