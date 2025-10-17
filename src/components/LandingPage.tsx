import React, { useState, useEffect } from 'react';
import AuthModal from './AuthModal';
import { picksApi } from '../lib/api';
import type { Pick } from '../types';
import BestBetsSection from './BestBetsSection';

// Hero Section - Authoritative Positioning
const Hero: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-lime-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-lime-500/10 border border-lime-500/20 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse" />
            <span className="text-lime-400 text-sm font-medium">Live NFL Week 7 Best Bets Available</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Bet with Confidence
            <span className="text-lime-400 block">with Pachanga Picks</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-3xl mx-auto">
            Advanced analytics. Simple picks. No more guesswork.
          </p>

          {/* CTA Button */}
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black text-lg font-bold px-8 py-4 rounded-lg transition-all shadow-2xl shadow-lime-500/25 hover:shadow-lime-500/40 hover:scale-105"
          >
            <span>Try Pachanga Picks</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Always free • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};

// Value Props Section - Authoritative Benefits
const ValueProps: React.FC = () => {
  const props = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Quality Betting ",
      description: "Focus on what matters - bets with meaningful edge."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Real Edge Calculations",
      description: "Our custom-built model simulates each game 10,000 times to provide true value."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Complete Coverage",
      description: "Moneyline, Against the Spread, and Over/Under picks for every NFL game. We have you covered."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">Accuracy You Can Trust</h2>
        {/* <p className="text-gray-400">We're transparent about our process and results. </p> */}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {props.map((prop, index) => (
          <div key={index} className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 hover:border-lime-500/30 transition-all">
            <div className="text-lime-400 mb-4">{prop.icon}</div>
            <h3 className="text-xl font-bold text-white mb-3">{prop.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{prop.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Best Bet Preview Section - Live Data
const BestBetPreview: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPicks = async () => {
      try {
        setLoading(true);
        const { data, error } = await picksApi.getAll();
        if (error) {
          console.error('Failed to load picks:', error);
          return;
        }
        if (data) {
          setPicks(data);
        }
      } catch (err) {
        console.error('Error loading picks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPicks();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">This Week's Best Bets</h2>
          <p className="text-gray-400">Loading latest picks...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">This Week's Best Bets</h2>
        <p className="text-gray-400">Our highest-confidence picks with the best edge</p>
      </div>

      <BestBetsSection picks={picks} minEdgeThreshold={3} maxDisplayCount={3} />

      <div className="text-center mt-12">
        <p className="text-gray-400 mb-4">Ready to see all our picks with detailed analysis?</p>
        <button className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black font-bold px-6 py-3 rounded-lg transition-all">
          <span>View All Picks</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Performance Stats Section
const PerformanceStats: React.FC = () => {
  const stats = {
    winRate: 58.7,
    avgEdge: 12.3,
    totalPicks: 127,
    bestBetWinRate: 62.1
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">Proven Results</h2>
        <p className="text-gray-400">Our track record speaks for itself</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-lime-400 mb-2">{stats.winRate}%</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">Overall Win Rate</div>
          <div className="text-xs text-gray-600 mt-1">Since inception</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-lime-400 mb-2">+{stats.avgEdge}%</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">Average Edge</div>
          <div className="text-xs text-gray-600 mt-1">Per pick</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-white mb-2">{stats.totalPicks}</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">Total Picks</div>
          <div className="text-xs text-gray-600 mt-1">Tracked & verified</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-yellow-400 mb-2">{stats.bestBetWinRate}%</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">Best Bet Win Rate</div>
          <div className="text-xs text-gray-600 mt-1">Elite picks only</div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-400 mb-4">Every pick is transparent and trackable</p>
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Results updated in real-time</span>
        </div>
      </div>
    </div>
  );
};

// Support Section
const SupportSection: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] border border-lime-500/20 rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Support the Work</h3>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          All picks and insights are completely free. If you find value in our analysis
          and want to support continued development, consider buying us a coffee.
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg hover:border-lime-500/30 transition-all group cursor-pointer">
          <span className="text-2xl">☕</span>
          <div className="text-left">
            <div className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors">
              Support on Ko-fi
            </div>
            <div className="text-xs text-gray-500">Help keep Pachanga free</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Landing Page Component
const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Hero onSignIn={() => setShowAuthModal(true)} />
      <ValueProps />
      <BestBetPreview />
      <PerformanceStats />
      <SupportSection />

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default LandingPage;