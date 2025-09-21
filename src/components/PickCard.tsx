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

  const score = (pick.upvotes || 0) - (pick.downvotes || 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg mb-4 hover:border-gray-600 transition-colors">
      {/* Reddit-style layout */}
      <div className="flex">
        {/* Upvote/Downvote section */}
        <div className="flex flex-col items-center p-2 bg-gray-900 rounded-l-lg min-w-[40px]">
          <button className="text-gray-400 hover:text-orange-400 text-lg">▲</button>
          <span className="text-sm font-medium text-gray-300 my-1">{score}</span>
          <button className="text-gray-400 hover:text-blue-400 text-lg">▼</button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4">
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
                    🤖 AI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prediction */}
          <div className="mb-3">
            <p className="text-gray-300 mb-2">{pick.prediction}</p>
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
                <span>💬</span>
                <span>Join Discussion</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickCard;