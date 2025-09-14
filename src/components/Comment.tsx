import { useState } from 'react';
import { CommentProps } from '../types';

const Comment = ({ comment, replies = [], depth = 0, onReply }: CommentProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim() && onReply) {
      onReply(replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const maxDepth = 3; // Prevent infinite nesting
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';

  return (
    <div className={`${indentClass} mb-4`}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-medium text-primary-400">{comment.user_name}</span>
          <span className="text-sm text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <p className="text-gray-300 mb-3">{comment.content}</p>
        
        <div className="flex items-center space-x-4 text-sm">
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Reply
          </button>
          
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-green-400">👍</button>
            <span className="text-gray-500">{comment.upvotes || 0}</span>
            <button className="text-gray-400 hover:text-red-400">👎</button>
            <span className="text-gray-500">{comment.downvotes || 0}</span>
          </div>
        </div>
        
        {showReplyForm && (
          <div className="mt-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
              rows={3}
            />
            <div className="flex space-x-2 mt-2">
              <button 
                onClick={handleReply}
                className="btn-primary text-sm"
              >
                Reply
              </button>
              <button 
                onClick={() => setShowReplyForm(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      {replies.length > 0 && depth < maxDepth && (
        <div className="mt-4">
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={[]} // In a real app, you'd fetch nested replies
              depth={depth + 1}
              onReply={(content) => onReply && onReply(content)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment;