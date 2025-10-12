import React, { useState } from 'react';

interface BetTypeStats {
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
}

interface WeekStats {
  week: number | null;
  moneyline: BetTypeStats;
  ats: BetTypeStats;
  overUnder: BetTypeStats;
}

// Hero Section
const Hero: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-lime-500/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-lime-500/10 border border-lime-500/20 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse" />
            <span className="text-lime-400 text-sm font-medium">Live NFL Week 7 Picks Available</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find Your Edge in
            <span className="text-lime-400"> NFL Betting</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            Data-driven predictions across Moneyline, ATS, and Over/Under markets. 
            Track real edge.
          </p>
          
          {/* CTA Button */}
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black text-lg font-bold px-8 py-4 rounded-lg transition-all shadow-2xl shadow-lime-500/25 hover:shadow-lime-500/40 hover:scale-105"
          >
            <span>Get Free Access</span>
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

// Value Props Section
const ValueProps: React.FC = () => {
  const props = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Edge-Focused Analytics",
      description: "See exactly where the value is. We calculate true edge on every pick using Monte Carlo simulations and real-time odds."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Transparent Track Record",
      description: "Every pick is tracked and displayed with complete transparency. See our historical win rates across all bet types."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "All Three Markets",
      description: "Complete coverage of Moneyline, Against the Spread, and Over/Under picks for every NFL game, every week."
    }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
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

// Current Week Stats Showcase
const CurrentWeekShowcase: React.FC<{ weekStats: WeekStats | null; loading: boolean }> = ({ weekStats, loading }) => {
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-12 text-center">
          <div className="text-gray-500">Loading stats...</div>
        </div>
      </div>
    );
  }
  
  if (!weekStats || (weekStats.moneyline.wins + weekStats.moneyline.losses === 0)) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">This Week's Performance</h2>
          <p className="text-gray-400">Picks will be available once games are played</p>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-12 text-center">
          <div className="text-gray-500">No completed picks yet for this week</div>
        </div>
      </div>
    );
  }
  
  const totalWins = weekStats.moneyline.wins + weekStats.ats.wins + weekStats.overUnder.wins;
  const totalLosses = weekStats.moneyline.losses + weekStats.ats.losses + weekStats.overUnder.losses;
  const totalPushes = weekStats.ats.pushes + weekStats.overUnder.pushes;
  const totalResolved = totalWins + totalLosses;
  const overallWinRate = totalResolved > 0 ? (totalWins / totalResolved) * 100 : 0;
  
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">
          Week {weekStats.week} Performance
        </h2>
        <p className="text-gray-400">See how our picks performed this week</p>
      </div>
      
      {/* Overall Stats Card */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-4xl font-bold text-white mb-2">
              {totalWins}-{totalLosses}{totalPushes > 0 ? `-${totalPushes}` : ''}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Overall Record</div>
          </div>
          
          <div>
            <div className={`text-4xl font-bold mb-2 ${
              overallWinRate >= 60 ? 'text-lime-400' : 
              overallWinRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {overallWinRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Win Rate</div>
          </div>
          
          <div>
            <div className="text-4xl font-bold text-lime-400 mb-2">
              {totalResolved}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Bets Resolved</div>
          </div>
          
          <div>
            <div className="text-4xl font-bold text-gray-500 mb-2">
              52.4%
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Break Even</div>
          </div>
        </div>
      </div>
      
      {/* Bet Type Breakdown */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Moneyline */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            Moneyline
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            weekStats.moneyline.winRate >= 60 ? 'text-lime-400' : 
            weekStats.moneyline.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {weekStats.moneyline.winRate.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm mb-4">
            {weekStats.moneyline.wins}-{weekStats.moneyline.losses}
          </div>
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                weekStats.moneyline.winRate >= 60 ? 'bg-lime-500' : 
                weekStats.moneyline.winRate >= 52.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(weekStats.moneyline.winRate, 100)}%` }}
            />
          </div>
        </div>
        
        {/* ATS */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            Against The Spread
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            weekStats.ats.winRate >= 55 ? 'text-lime-400' : 
            weekStats.ats.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {weekStats.ats.winRate.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm mb-4">
            {weekStats.ats.wins}-{weekStats.ats.losses}
            {weekStats.ats.pushes > 0 && `-${weekStats.ats.pushes}`}
          </div>
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                weekStats.ats.winRate >= 55 ? 'bg-lime-500' : 
                weekStats.ats.winRate >= 52.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(weekStats.ats.winRate, 100)}%` }}
            />
          </div>
        </div>
        
        {/* O/U */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] p-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            Over/Under
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            weekStats.overUnder.winRate >= 55 ? 'text-lime-400' : 
            weekStats.overUnder.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {weekStats.overUnder.winRate.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm mb-4">
            {weekStats.overUnder.wins}-{weekStats.overUnder.losses}
            {weekStats.overUnder.pushes > 0 && `-${weekStats.overUnder.pushes}`}
          </div>
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                weekStats.overUnder.winRate >= 55 ? 'bg-lime-500' : 
                weekStats.overUnder.winRate >= 52.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(weekStats.overUnder.winRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Sign Up CTA */}
      <div className="mt-12 text-center">
        <p className="text-gray-400 mb-4">Want to see the actual picks and detailed analysis?</p>
        <button className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black font-bold px-6 py-3 rounded-lg transition-all">
          <span>Sign Up Free</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Social Proof / Support Section
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

// Demo Component
const Demo = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const sampleWeekStats: WeekStats = {
    week: 7,
    moneyline: {
      wins: 8,
      losses: 4,
      pushes: 0,
      winRate: 66.7
    },
    ats: {
      wins: 7,
      losses: 5,
      pushes: 1,
      winRate: 58.3
    },
    overUnder: {
      wins: 6,
      losses: 6,
      pushes: 0,
      winRate: 50.0
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Hero onSignIn={() => setShowAuthModal(true)} />
      <ValueProps />
      <CurrentWeekShowcase weekStats={sampleWeekStats} loading={false} />
      <SupportSection />
      
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Sign In</h3>
            <p className="text-gray-400 mb-6">Auth modal would appear here</p>
            <button 
              onClick={() => setShowAuthModal(false)}
              className="w-full bg-lime-500 hover:bg-lime-400 text-black font-bold py-3 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Demo;