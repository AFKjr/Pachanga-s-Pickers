import { PickCardProps } from '../types';

const PickCard = ({ pick, showComments = true, onCommentClick }: PickCardProps) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'push': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="card mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm text-gray-400">{pick.game_info.league}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-400">
              {new Date(pick.game_info.game_date).toLocaleDateString()}
            </span>
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            {pick.game_info.away_team} @ {pick.game_info.home_team}
          </h3>
          
          <div className="flex items-center space-x-4 mb-3">
            <span className={`font-medium ${getConfidenceColor(pick.confidence)}`}>
              {pick.confidence}% Confidence
            </span>
            {pick.result && (
              <span className={`text-sm ${getResultColor(pick.result)}`}>
                {pick.result.toUpperCase()}
              </span>
            )}
          </div>
          
          <p className="text-gray-300 mb-4">{pick.prediction}</p>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Analysis:</h4>
            <p className="text-sm text-gray-300">{pick.reasoning}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Posted {new Date(pick.created_at).toLocaleDateString()}</span>
        
        {showComments && onCommentClick && (
          <button 
            onClick={onCommentClick}
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            💬 View Discussion
          </button>
        )}
      </div>
    </div>
  );
};

export default PickCard;