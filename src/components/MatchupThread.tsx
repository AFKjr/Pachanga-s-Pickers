import { useState } from 'react';
import { matchupThreadsApi } from '../lib/api';
import type { Comment as CommentType } from '../types';

interface MatchupThreadProps {
  thread: {
    id: string;
    title: string;
    content: string;
    game_info?: {
      home_team: string;
      away_team: string;
      league: string;
      game_date: string;
      venue?: string;
      location?: string;
    };
    author_username: string;
    created_at: string;
    upvotes?: number;
    downvotes?: number;
  };
  onCommentClick?: () => void;
}

const MatchupThread = ({ thread, onCommentClick }: MatchupThreadProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const handleCommentClick = async () => {
    if (onCommentClick) {
      onCommentClick();
      return;
    }

    if (!showComments) {
      setLoadingComments(true);
      try {
        const { data, error } = await matchupThreadsApi.getThreadComments(thread.id);
        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const score = (thread.upvotes || 0) - (thread.downvotes || 0);
  const commentsCount = comments.length;

  // Parse game info from content if not provided separately
  const gameInfo = thread.game_info || {
    home_team: 'Home Team',
    away_team: 'Away Team',
    league: 'NFL',
    game_date: new Date().toISOString(),
    venue: 'TBD',
    location: 'TBD'
  };

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
          {/* Header with teams and metadata */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-1">
                🏈 {gameInfo.away_team} @ {gameInfo.home_team}
              </h3>

              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <span>Posted by u/{thread.author_username}</span>
                <span>•</span>
                <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-sm text-gray-400">{gameInfo.league}</span>
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  📅 Game Thread
                </span>
              </div>
            </div>
          </div>

          {/* Game details */}
          <div className="mb-3">
            <div className="bg-gray-700 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white ml-2">
                    {new Date(gameInfo.game_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white ml-2">
                    {new Date(gameInfo.game_date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </span>
                </div>
                {gameInfo.venue && (
                  <div>
                    <span className="text-gray-400">Venue:</span>
                    <span className="text-white ml-2">{gameInfo.venue}</span>
                  </div>
                )}
                {gameInfo.location && (
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white ml-2">{gameInfo.location}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-300 text-sm">
              Join the discussion for this matchup! Share your predictions, analysis, and thoughts.
            </p>
          </div>

          {/* Footer with comment button */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <button
              onClick={handleCommentClick}
              className="flex items-center space-x-1 text-gray-400 hover:text-primary-400 transition-colors"
            >
              <span>💬</span>
              <span>{commentsCount} comments</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-gray-700 p-4">
          {loadingComments ? (
            <div className="text-center py-4 text-gray-400">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {comment.user_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchupThread;