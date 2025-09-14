import { useState, useEffect } from 'react';
import PickCard from './PickCard';
import Comment from './Comment';
import { Pick, Comment as CommentType } from '../types';
import { picksApi, commentsApi } from '../lib/api';

const HomePage = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pinnedPicks, setPinnedPicks] = useState<Pick[]>([]);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [picksResult, pinnedResult] = await Promise.all([
          picksApi.getAll(),
          picksApi.getPinned()
        ]);

        if (picksResult.error) throw picksResult.error;
        if (pinnedResult.error) throw pinnedResult.error;

        setPicks(picksResult.data || []);
        setPinnedPicks(pinnedResult.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePickClick = async (pick: Pick) => {
    setSelectedPick(pick);
    setShowComments(true);

    // Fetch comments for this pick
    try {
      const { data, error } = await commentsApi.getByPostId(pick.id);
      if (error) throw error;
      setComments(data || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setSelectedPick(null);
    setComments([]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Official Picks</h1>
        <p className="text-gray-400">Expert analysis and betting recommendations for this week's games</p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-400">Loading picks...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          Error loading picks: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Pinned Picks Section */}
          {pinnedPicks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-primary-400">📌 Pinned Picks</h2>
              {pinnedPicks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  onCommentClick={() => handlePickClick(pick)}
                />
              ))}
            </div>
          )}

          {/* All Picks Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">All Picks</h2>
            {picks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No picks available yet. Check back soon!
              </div>
            ) : (
              picks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  onCommentClick={() => handlePickClick(pick)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Comments Modal/Overlay */}
      {showComments && selectedPick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Discussion</h3>
                <button
                  onClick={handleCloseComments}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <PickCard pick={selectedPick} showComments={false} />

              <div className="mt-6">
                <h4 className="text-lg font-medium mb-4">Comments ({comments.length})</h4>
                {comments.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">
                    No comments yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      onReply={(content) => console.log('Reply:', content)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;