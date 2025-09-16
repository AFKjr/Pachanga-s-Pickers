import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signUp, signIn, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset email sent! Check your inbox.');
      } else if (isSignUp) {
        const { error } = await signUp(email, password, username);
        if (error) throw error;
        alert('Check your email for the confirmation link!');
        onClose();
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setIsSignUp(false);
    setError('');
    setSuccess('');
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setIsSignUp(false);
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgotPassword && (
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-400 text-sm">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-4 py-2 rounded-md font-medium transition-colors"
          >
            {loading ? 'Loading...' : (isForgotPassword ? 'Send Reset Email' : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {isForgotPassword ? (
            <button
              onClick={handleBackToSignIn}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Back to Sign In
            </button>
          ) : !isSignUp ? (
            <>
              <button
                onClick={handleForgotPassword}
                className="text-primary-400 hover:text-primary-300 text-sm block"
              >
                Forgot Password?
              </button>
              <button
                onClick={() => setIsSignUp(true)}
                className="text-primary-400 hover:text-primary-300 text-sm"
              >
                Don't have an account? Sign Up
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSignUp(false)}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Already have an account? Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;