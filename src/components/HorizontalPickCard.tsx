import React, { useState } from 'react';
import { Pick } from '../types';
import { formatEdge, getConfidenceBarColor } from '../utils/edgeCalculator';
import { safeDateFormat } from '../utils/dateValidation';

interface ConfidenceBarProps {
  confidence: number;
  edge: number;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence, edge }) => {
  const barColor = getConfidenceBarColor(confidence, edge);
  
  const colorMap = {
    lime: 'bg-lime-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`${colorMap[barColor]} h-full transition-all duration-300`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium min-w-[40px] text-right">
        {confidence.toFixed(1)}%
      </span>
    </div>
  );
};

interface BetSectionProps {
  title: string;
  prediction: string;
  line: string;
  yourEdge: string;
  oppEdge: string;
  yourProb: number;
  oppProb: number;
  confidence: number;
  edgeValue: number;
  result?: 'win' | 'loss' | 'push' | 'pending';
}

const BetSection: React.FC<BetSectionProps> = ({ 
  title, 
  prediction, 
  line, 
  yourEdge, 
  oppEdge, 
  yourProb, 
  oppProb, 
  confidence, 
  edgeValue, 
  result 
}) => {
  
  const getResultBadge = () => {
    if (!result || result === 'pending') return null;
    
    const colorMap = {
      win: 'bg-green-900/30 text-green-400 border-green-500',
      loss: 'bg-red-900/30 text-red-400 border-red-500',
      push: 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
    };
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorMap[result]}`}>
        {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'P'}
      </span>
    );
  };
  
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {title}
        </h4>
        {getResultBadge()}
      </div>
      
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lime-400 text-xs">✓</span>
          <span className="text-white font-medium text-sm truncate">{prediction}</span>
        </div>
        <div className="text-xs text-gray-400">{line}</div>
      </div>
      
      <div className="space-y-0.5 text-xs mb-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Model:</span>
          <span className="text-gray-300">{yourProb.toFixed(1)}% | {oppProb.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Edge:</span>
          <span className={`font-medium ${
            parseFloat(yourEdge) >= 0 ? 'text-lime-400' : 'text-red-400'
          }`}>
            {yourEdge}% | <span className="text-gray-500">{oppEdge}%</span>
          </span>
        </div>
      </div>
      
      <ConfidenceBar confidence={confidence} edge={edgeValue} />
    </div>
  );
};

interface HorizontalPickCardProps {
  pick: Pick;
}

const HorizontalPickCard: React.FC<HorizontalPickCardProps> = ({ pick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const formatGameDate = (date: string): string => {
    try {
      const d = new Date(date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hour = d.getHours();
      const minute = d.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} • ${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (e) {
      return safeDateFormat(date);
    }
  };

  
  const calcOppEdge = (edge?: number): string => {
    if (!edge) return '-0.0';
    return formatEdge(-edge - 1.5); 
  };
  
  return (
    <div 
      className={`bg-[#1a1a1a] rounded-lg transition-all duration-200 min-h-[280px] max-w-none ${
        isHovered 
          ? 'transform -translate-y-1 shadow-2xl border border-lime-500' 
          : 'border border-[rgba(255,255,255,0.05)]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">
            {pick.game_info.away_team} @ {pick.game_info.home_team}
          </h3>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatGameDate(pick.game_info.game_date)}
        </div>
      </div>
      
      {}
      <div className="px-6 py-4 flex flex-wrap gap-6 justify-start">
        {}
        <BetSection
          title="MONEYLINE"
          prediction={pick.prediction}
          line={`Line: ${pick.game_info.home_ml_odds || '-110'}/${pick.game_info.away_ml_odds || '+110'}`}
          yourEdge={formatEdge(pick.moneyline_edge)}
          oppEdge={calcOppEdge(pick.moneyline_edge)}
          yourProb={pick.monte_carlo_results?.moneyline_probability || pick.confidence}
          oppProb={100 - (pick.monte_carlo_results?.moneyline_probability || pick.confidence)}
          confidence={pick.monte_carlo_results?.moneyline_probability || pick.confidence}
          edgeValue={pick.moneyline_edge || 0}
          result={pick.result}
        />
        
        {}
        {pick.spread_prediction && (
          <BetSection
            title="SPREAD"
            prediction={pick.spread_prediction}
            line={`Line: ${pick.game_info.spread_odds || -110}/${pick.game_info.spread_odds || -110}`}
            yourEdge={formatEdge(pick.spread_edge)}
            oppEdge={calcOppEdge(pick.spread_edge)}
            yourProb={pick.monte_carlo_results?.spread_probability || pick.confidence}
            oppProb={100 - (pick.monte_carlo_results?.spread_probability || pick.confidence)}
            confidence={pick.monte_carlo_results?.spread_probability || pick.confidence}
            edgeValue={pick.spread_edge || 0}
            result={pick.ats_result}
          />
        )}
        
        {}
        {pick.ou_prediction && (
          <BetSection
            title="TOTAL"
            prediction={pick.ou_prediction}
            line={`Line: ${pick.game_info.over_odds || -110}`}
            yourEdge={formatEdge(pick.ou_edge)}
            oppEdge={calcOppEdge(pick.ou_edge)}
            yourProb={pick.monte_carlo_results?.total_probability || pick.confidence}
            oppProb={100 - (pick.monte_carlo_results?.total_probability || pick.confidence)}
            confidence={pick.monte_carlo_results?.total_probability || pick.confidence}
            edgeValue={pick.ou_edge || 0}
            result={pick.ou_result}
          />
        )}
      </div>
    </div>
  );
};

export default HorizontalPickCard;
