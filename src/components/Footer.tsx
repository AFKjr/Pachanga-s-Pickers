import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[rgba(255,255,255,0.05)] mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {}
        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.05)] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-lg flex-shrink-0">⚠️</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-300">Important Disclaimer:</strong> All predictions and betting analytics are for entertainment and educational purposes only.
              Past performance does not guarantee future results. When gaming, please play responsibly and within your means.
            </p>
          </div>
        </div>

        {}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <p>© 2025 Pachanga. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Odds via DraftKings</span>
            <span>•</span>
            <a href="#" className="hover:text-lime-400 transition-colors">Support on Ko-fi</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;