import React from 'react';
import { NFLWeek } from '../../types/index';

interface WeekSelectorProps {
  selectedWeek: NFLWeek | null;
  onChange: (week: NFLWeek | null) => void;
  disabled?: boolean;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeek,
  onChange,
  disabled
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Target Week (Optional)
      </label>
      <select
        value={selectedWeek || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) as NFLWeek : null)}
        disabled={disabled}
        className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-describedby="week-help"
      >
        <option value="">Use current week (or Week 1 if none found)</option>
        {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
          <option key={week} value={week}>
            Week {week}
          </option>
        ))}
      </select>
      <p id="week-help" className="text-xs text-gray-500 mt-1">
        Override the current week if needed.
      </p>
    </div>
  );
};