import React, { useState } from 'react';

interface SegmentedWeekSelectorProps {
  selectedWeek: number | null;
  availableWeeks: number[];
  onChange: (week: number | null) => void;
  showAllOption?: boolean;
  maxVisibleWeeks?: number;
  className?: string;
}

const SegmentedWeekSelector: React.FC<SegmentedWeekSelectorProps> = ({
  selectedWeek,
  availableWeeks,
  onChange,
  showAllOption = true,
  maxVisibleWeeks = 6,
  className = ''
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Show most recent weeks first
  const sortedWeeks = [...availableWeeks].sort((a, b) => b - a);
  const visibleWeeks = sortedWeeks.slice(0, maxVisibleWeeks);
  const hiddenWeeks = sortedWeeks.slice(maxVisibleWeeks);
  const hasHiddenWeeks = hiddenWeeks.length > 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Segmented Control */}
      <div className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-1">
        {showAllOption && (
          <button
            onClick={() => onChange(null)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              selectedWeek === null
                ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20'
                : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            All
          </button>
        )}

        {visibleWeeks.map(week => (
          <button
            key={week}
            onClick={() => onChange(week)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              selectedWeek === week
                ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20'
                : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            Week {week}
          </button>
        ))}

        {/* More Dropdown for Hidden Weeks */}
        {hasHiddenWeeks && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                selectedWeek !== null && hiddenWeeks.includes(selectedWeek)
                  ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <span>More</span>
              <svg
                className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-32 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]
                                rounded-lg shadow-2xl z-20 py-2 max-h-60 overflow-y-auto">
                  {hiddenWeeks.map(week => (
                    <button
                      key={week}
                      onClick={() => {
                        onChange(week);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                        selectedWeek === week
                          ? 'bg-lime-500/10 text-lime-400'
                          : 'text-gray-300 hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                      }`}
                    >
                      Week {week}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected Week Context Label */}
      {availableWeeks.length > 0 && (
        <span className="text-xs text-gray-500 hidden md:inline">
          {availableWeeks.length} weeks total
        </span>
      )}
    </div>
  );
};

export default SegmentedWeekSelector;