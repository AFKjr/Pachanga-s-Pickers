import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors">
              Pachanga Picks
            </Link>

            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              {user && (
                <Link to="/admin" className="text-gray-300 hover:text-white transition-colors">
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {loading ? (
                <span className="text-gray-400">Loading...</span>
              ) : user ? (
                <>
                  <span className="text-gray-300">
                    Welcome, {user.user_metadata?.username || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="btn-secondary text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-400">Welcome, Guest</span>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-secondary text-sm"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default Header;