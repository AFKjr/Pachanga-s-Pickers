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
      <header className="bg-[#0a0a0a] border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <span className="text-black font-bold text-xl">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white group-hover:text-lime-400 transition-colors">
                  Pachanga Picks
                </h1>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                Home
              </Link>
              <Link
                to="/records"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                Team Records
              </Link>
              {user && (
                <Link
                  to="/admin"
                  className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* User Section */}
            <div className="flex items-center gap-4">
              {loading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : user ? (
                <>
                  <span className="text-sm text-gray-300 hidden md:inline">
                    Welcome, {user.user_metadata?.username || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border border-[rgba(255,255,255,0.1)] hover:border-gray-600 rounded-lg transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-400 hidden md:inline">Welcome, Guest</span>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 text-sm font-bold text-black bg-lime-500 hover:bg-lime-400 rounded-lg transition-colors shadow-lg shadow-lime-500/20"
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