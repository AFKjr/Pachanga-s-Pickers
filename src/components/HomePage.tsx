import { useState, useEffect } from 'react';
import PickCard from './PickCard';
import Comment from './Comment';
import MatchupThread from './MatchupThread';
import { Pick, Comment as CommentType } from '../types';
import { picksApi, commentsApi, matchupThreadsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pinnedPicks, setPinnedPicks] = useState<Pick[]>([]);
  const [matchupThreads, setMatchupThreads] = useState<any[]>([]);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    console.log('Auth loaded, fetching data...');

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Making API calls...');

        // Add a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const apiPromise = Promise.all([
          picksApi.getAll(),
          picksApi.getPinned(),
          matchupThreadsApi.getAllMatchupThreads()
        ]);

        const [picksResult, pinnedResult, threadsResult] = await Promise.race([apiPromise, timeoutPromise]) as any;

        console.log('Picks result:', picksResult);
        console.log('Pinned result:', pinnedResult);
        console.log('Threads result:', threadsResult);

        if (picksResult.error) throw picksResult.error;
        if (pinnedResult.error) throw pinnedResult.error;
        if (threadsResult.error) throw threadsResult.error;

        setPicks(picksResult.data || []);
        setPinnedPicks(pinnedResult.data || []);
        setMatchupThreads(threadsResult.data || []);
        console.log('Data loaded successfully');
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Official Picks</h1>
            <p className="text-gray-400">Expert analysis and betting recommendations for this week's games</p>
          </div>
        </div>
      </div>

      {(loading || authLoading) && (
        <div className="text-center py-8">
          <div className="text-gray-400">Loading picks...</div>
          <div className="text-sm text-gray-500 mt-2">
            Auth loading: {authLoading ? 'true' : 'false'} | Data loading: {loading ? 'true' : 'false'}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          Error loading picks: {error}
        </div>
      )}

      {!loading && !authLoading && !error && (
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
                <p>No picks available yet.</p>
                <p className="text-sm mt-2">Try adding some sample data to your Supabase database!</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-white text-sm"
                >
                  Refresh Page
                </button>
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

          {/* Matchup Threads Section */}
          {matchupThreads.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-green-400">🏈 Game Threads</h2>
              {matchupThreads.map((thread) => (
                <MatchupThread
                  key={thread.id}
                  thread={thread}
                />
              ))}
            </div>
          )}

          {/* Generate Matchup Threads Button */}
          <div className="mb-8 text-center">
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const { data, error } = await matchupThreadsApi.generateMatchupThreads();
                  if (error) throw error;
                  setMatchupThreads(data || []);
                  console.log('Matchup threads generated successfully');
                } catch (err: any) {
                  console.error('Error generating matchup threads:', err);
                  setError('Failed to generate matchup threads: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium"
              disabled={loading}
            >
              {loading ? 'Generating...' : '🔄 Generate Game Threads'}
            </button>
            <p className="text-sm text-gray-400 mt-2">
              Create discussion threads for this week's matchups using real schedule data
            </p>
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