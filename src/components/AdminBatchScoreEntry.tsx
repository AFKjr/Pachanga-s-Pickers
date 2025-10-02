import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { Pick } from '../types';
import { calculateAllResultsFromScores } from '../utils/atsCalculator';
import { globalEvents } from '../lib/events';

interface ParsedScore {
  pickId: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  matched: boolean;
}

const AdminBatchScoreEntry: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<number>(5);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedScores, setParsedScores] = useState<ParsedScore[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Helper function to validate scores
  const validateScore = (scoreStr: string): number => {
    const score = parseInt(scoreStr, 10);
    
    if (isNaN(score)) {
      throw new Error(`Invalid score: ${scoreStr}`);
    }
    
    if (score < 0) {
      throw new Error(`Score cannot be negative: ${score}`);
    }
    
    if (score > 100) {
      throw new Error(`Unrealistic score: ${score}. NFL games rarely exceed 100 points.`);
    }
    
    return score;
  };

  // Load picks for selected week
  useEffect(() => {
    loadPicks();
  }, [selectedWeek]);

  const loadPicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await picksApi.getAll();
      if (error) {
        console.error('Error loading picks:', error);
        return;
      }

      // Filter picks by week (week is a top-level field, not in game_info)
      const weekPicks = (data || []).filter(pick => pick.week === selectedWeek);

      setPicks(weekPicks);
    } catch (err) {
      console.error('Error loading picks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Normalize team names for matching
  const normalizeTeamName = (team: string): string => {
    const normalized = team.toLowerCase().trim();
    
    const teamMap: { [key: string]: string } = {
      // Cardinals
      'cardinals': 'cardinals', 'arizona': 'cardinals', 'ari': 'cardinals',
      // Falcons
      'falcons': 'falcons', 'atlanta': 'falcons', 'atl': 'falcons',
      // Ravens
      'ravens': 'ravens', 'baltimore': 'ravens', 'bal': 'ravens',
      // Bills
      'bills': 'bills', 'buffalo': 'bills', 'buf': 'bills',
      // Panthers
      'panthers': 'panthers', 'carolina': 'panthers', 'car': 'panthers',
      // Bears
      'bears': 'bears', 'chicago': 'bears', 'chi': 'bears',
      // Bengals
      'bengals': 'bengals', 'cincinnati': 'bengals', 'cin': 'bengals',
      // Browns
      'browns': 'browns', 'cleveland': 'browns', 'cle': 'browns',
      // Cowboys
      'cowboys': 'cowboys', 'dallas': 'cowboys', 'dal': 'cowboys',
      // Broncos
      'broncos': 'broncos', 'denver': 'broncos', 'den': 'broncos',
      // Lions
      'lions': 'lions', 'detroit': 'lions', 'det': 'lions',
      // Packers
      'packers': 'packers', 'green bay': 'packers', 'gb': 'packers',
      // Texans
      'texans': 'texans', 'houston': 'texans', 'hou': 'texans',
      // Colts
      'colts': 'colts', 'indianapolis': 'colts', 'ind': 'colts',
      // Jaguars
      'jaguars': 'jaguars', 'jacksonville': 'jaguars', 'jax': 'jaguars',
      // Chiefs
      'chiefs': 'chiefs', 'kansas city': 'chiefs', 'kc': 'chiefs',
      // Raiders
      'raiders': 'raiders', 'las vegas': 'raiders', 'lv': 'raiders',
      // Chargers
      'chargers': 'chargers', 'los angeles chargers': 'chargers', 'lac': 'chargers', 'la chargers': 'chargers',
      // Rams
      'rams': 'rams', 'los angeles rams': 'rams', 'lar': 'rams', 'la rams': 'rams',
      // Dolphins
      'dolphins': 'dolphins', 'miami': 'dolphins', 'mia': 'dolphins',
      // Vikings
      'vikings': 'vikings', 'minnesota': 'vikings', 'min': 'vikings',
      // Patriots
      'patriots': 'patriots', 'new england': 'patriots', 'ne': 'patriots',
      // Saints
      'saints': 'saints', 'new orleans': 'saints', 'no': 'saints',
      // Giants
      'giants': 'giants', 'new york giants': 'giants', 'nyg': 'giants',
      // Jets
      'jets': 'jets', 'new york jets': 'jets', 'nyj': 'jets',
      // Eagles
      'eagles': 'eagles', 'philadelphia': 'eagles', 'phi': 'eagles',
      // Steelers
      'steelers': 'steelers', 'pittsburgh': 'steelers', 'pit': 'steelers',
      // 49ers
      '49ers': '49ers', 'san francisco': '49ers', 'sf': '49ers',
      // Seahawks
      'seahawks': 'seahawks', 'seattle': 'seahawks', 'sea': 'seahawks',
      // Buccaneers
      'buccaneers': 'buccaneers', 'bucs': 'buccaneers', 'tampa bay': 'buccaneers', 'tb': 'buccaneers',
      // Titans
      'titans': 'titans', 'tennessee': 'titans', 'ten': 'titans',
      // Commanders
      'commanders': 'commanders', 'washington': 'commanders', 'wsh': 'commanders',
    };

    return teamMap[normalized] || normalized;
  };

  // Parse pasted text to extract scores
  const parseScores = () => {
    const lines = pastedText.split('\n').filter(line => line.trim());
    const parsed: ParsedScore[] = [];
    
    // Pattern 1: "Team1 Score1, Team2 Score2"
    // Pattern 2: "Team1 Score1" on one line, "Team2 Score2" on next line
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Try pattern 1: "Team1 23, Team2 20"
      const commaMatch = line.match(/^(.+?)\s+(\d+)\s*,\s*(.+?)\s+(\d+)$/);
      if (commaMatch) {
        const [, team1, score1, team2, score2] = commaMatch;
        const normalizedTeam1 = normalizeTeamName(team1);
        const normalizedTeam2 = normalizeTeamName(team2);
        
        // Find matching pick
        const matchingPick = picks.find(pick => {
          const awayNorm = normalizeTeamName(pick.game_info?.away_team || '');
          const homeNorm = normalizeTeamName(pick.game_info?.home_team || '');
          return (awayNorm === normalizedTeam1 && homeNorm === normalizedTeam2) ||
                 (awayNorm === normalizedTeam2 && homeNorm === normalizedTeam1);
        });

        if (matchingPick) {
          const awayNorm = normalizeTeamName(matchingPick.game_info?.away_team || '');
          const isTeam1Away = normalizedTeam1 === awayNorm;
          
          parsed.push({
            pickId: matchingPick.id,
            awayTeam: matchingPick.game_info?.away_team || '',
            homeTeam: matchingPick.game_info?.home_team || '',
            awayScore: isTeam1Away ? validateScore(score1) : validateScore(score2),
            homeScore: isTeam1Away ? validateScore(score2) : validateScore(score1),
            matched: true
          });
        }
        continue;
      }
      
      // Try pattern 2: Two consecutive lines
      if (i + 1 < lines.length) {
        const line1Match = line.match(/^(.+?)\s+(\d+)$/);
        const line2Match = lines[i + 1].match(/^(.+?)\s+(\d+)$/);
        
        if (line1Match && line2Match) {
          const [, team1, score1] = line1Match;
          const [, team2, score2] = line2Match;
          const normalizedTeam1 = normalizeTeamName(team1);
          const normalizedTeam2 = normalizeTeamName(team2);
          
          // Find matching pick
          const matchingPick = picks.find(pick => {
            const awayNorm = normalizeTeamName(pick.game_info?.away_team || '');
            const homeNorm = normalizeTeamName(pick.game_info?.home_team || '');
            return (awayNorm === normalizedTeam1 && homeNorm === normalizedTeam2) ||
                   (awayNorm === normalizedTeam2 && homeNorm === normalizedTeam1);
          });

          if (matchingPick) {
            const awayNorm = normalizeTeamName(matchingPick.game_info?.away_team || '');
            const isTeam1Away = normalizedTeam1 === awayNorm;
            
            parsed.push({
              pickId: matchingPick.id,
              awayTeam: matchingPick.game_info?.away_team || '',
              homeTeam: matchingPick.game_info?.home_team || '',
              awayScore: isTeam1Away ? validateScore(score1) : validateScore(score2),
              homeScore: isTeam1Away ? validateScore(score2) : validateScore(score1),
              matched: true
            });
            i++; // Skip next line since we processed it
          }
        }
      }
    }

    setParsedScores(parsed);
  };

  // Save all scores to database
  const saveAllScores = async () => {
    setSaveStatus('saving');
    
    try {
      const results: Array<{pick: ParsedScore, success: boolean, error?: string}> = [];

      for (const score of parsedScores) {
        const pick = picks.find(p => p.id === score.pickId);
        if (!pick) {
          results.push({
            pick: score,
            success: false,
            error: 'Pick not found'
          });
          continue;
        }

        // Validate scores before sending to database
        try {
          validateScore(score.awayScore.toString());
          validateScore(score.homeScore.toString());
        } catch (validationError: any) {
          results.push({
            pick: score,
            success: false,
            error: validationError.message
          });
          continue;
        }

        // Calculate results
        const results_calc = calculateAllResultsFromScores({
          ...pick,
          game_info: {
            ...pick.game_info,
            away_score: score.awayScore,
            home_score: score.homeScore
          }
        });

        // Update pick with scores and results
        const { error } = await picksApi.update(pick.id, {
          game_info: {
            ...pick.game_info,
            away_score: score.awayScore,
            home_score: score.homeScore
          },
          result: results_calc.moneyline
        });

        results.push({
          pick: score,
          success: !error,
          error: error?.message
        });
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      if (errorCount === 0) {
        setSaveStatus('success');
        globalEvents.emit('picksUpdated');
        
        setTimeout(() => {
          setPastedText('');
          setParsedScores([]);
          setSaveStatus('idle');
          loadPicks();
        }, 2000);
      } else {
        setSaveStatus('error');
        
        // Log failed games for debugging
        console.error('Failed to save scores for:', 
          results.filter(r => !r.success).map(r => ({
            game: `${r.pick.awayTeam} vs ${r.pick.homeTeam}`,
            error: r.error
          }))
        );
      }

      console.log(`✅ Successfully updated ${successCount} picks, ${errorCount} errors`);
    } catch (err) {
      console.error('Error saving scores:', err);
      setSaveStatus('error');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-white mb-4">📊 Batch Score Entry</h2>
      
      {/* Week Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Week
        </label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
          className="w-48 p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
        <span className="ml-4 text-gray-400">
          {loading ? 'Loading...' : `${picks.length} picks found`}
        </span>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-4">
        <h4 className="font-semibold mb-2">How to use:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to <a href={`https://www.espn.com/nfl/scoreboard/_/week/${selectedWeek}/year/2025/seasontype/2`} target="_blank" rel="noopener noreferrer" className="underline">ESPN Scoreboard</a></li>
          <li>Copy game scores in format: "Team1 Score1, Team2 Score2" (one per line)</li>
          <li>Paste below and click "Parse Scores"</li>
          <li>Review parsed results and click "Save All Scores"</li>
        </ol>
      </div>

      {/* Text Input Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paste Scores from ESPN
        </label>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Example:&#10;Seahawks 23, Cardinals 20&#10;Vikings 21, Steelers 24&#10;&#10;Or:&#10;Seahawks 23&#10;Cardinals 20&#10;Vikings 21&#10;Steelers 24"
          className="w-full h-40 p-3 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"
        />
      </div>

      <button
        onClick={parseScores}
        disabled={!pastedText.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors mb-6"
      >
        🔍 Parse Scores
      </button>

      {/* Parsed Results Table */}
      {parsedScores.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Parsed Results ({parsedScores.length} games)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-gray-900 rounded-lg overflow-hidden">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Away Team</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Away Score</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Home Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Home Team</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {parsedScores.map((score, idx) => (
                  <tr key={idx} className="hover:bg-gray-800">
                    <td className="px-4 py-3 text-white">{score.awayTeam}</td>
                    <td className="px-4 py-3 text-center text-white font-bold">{score.awayScore}</td>
                    <td className="px-4 py-3 text-center text-white font-bold">{score.homeScore}</td>
                    <td className="px-4 py-3 text-white">{score.homeTeam}</td>
                    <td className="px-4 py-3 text-center">
                      {score.matched ? (
                        <span className="text-green-400">✓ Matched</span>
                      ) : (
                        <span className="text-red-400">✗ Not Found</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={saveAllScores}
              disabled={saveStatus === 'saving'}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md font-bold text-lg transition-colors"
            >
              {saveStatus === 'saving' ? '⏳ Saving...' : '💾 Save All Scores'}
            </button>

            {saveStatus === 'success' && (
              <span className="text-green-400 font-semibold">
                ✅ All scores saved successfully!
              </span>
            )}

            {saveStatus === 'error' && (
              <span className="text-red-400 font-semibold">
                ❌ Error saving some scores. Check console.
              </span>
            )}
          </div>
        </div>
      )}

      {parsedScores.length === 0 && pastedText && (
        <div className="mt-4 bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded">
          No scores could be parsed. Please check the format and try again.
        </div>
      )}
    </div>
  );
};

export default AdminBatchScoreEntry;
