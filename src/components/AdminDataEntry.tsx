import React, { useState } from 'react';
import { picksApi } from '../lib/api';

interface ParsedPrediction {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  confidence: number;
  reasoning: string;
  gameDate: string;
  week: number;
}

const AdminDataEntry: React.FC = () => {
  const [agentText, setAgentText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const parseAgentText = (text: string): ParsedPrediction[] => {
    const predictions: ParsedPrediction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let currentGame = '';
    let currentPrediction = '';
    let currentConfidence = 0;
    let currentReasoning = '';
    let homeTeam = '';
    let awayTeam = '';
    let currentGameDate = new Date().toISOString().split('T')[0]; // fallback to today
    let currentWeek = selectedWeek || 1; // Use selected week or default to 1
    let isCollectingFactors = false;

    console.log('Starting to parse agent text with', lines.length, 'lines');

    // Helper function to parse dates from various formats
    const parseGameDate = (dateText: string): string => {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Handle "Monday Night Football", "Sunday Night", etc.
      if (dateText.toLowerCase().includes('monday night')) {
        // Find next Monday
        const monday = new Date(today);
        monday.setDate(today.getDate() + (1 - today.getDay() + 7) % 7);
        if (monday <= today) monday.setDate(monday.getDate() + 7);
        return monday.toISOString().split('T')[0];
      }

      if (dateText.toLowerCase().includes('sunday night')) {
        // Find next Sunday
        const sunday = new Date(today);
        sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
        if (sunday <= today) sunday.setDate(sunday.getDate() + 7);
        return sunday.toISOString().split('T')[0];
      }

      if (dateText.toLowerCase().includes('thursday night')) {
        // Find next Thursday
        const thursday = new Date(today);
        thursday.setDate(today.getDate() + (4 - today.getDay() + 7) % 7);
        if (thursday <= today) thursday.setDate(thursday.getDate() + 7);
        return thursday.toISOString().split('T')[0];
      }

      // Handle specific dates like "December 15", "12/15", "Dec 15"
      const datePatterns = [
        /(\w+ \d{1,2}),?\s*(\d{4})?/, // "December 15, 2024" or "December 15"
        /(\d{1,2})\/(\d{1,2})\/?(\d{4})?/, // "12/15/2024" or "12/15"
        /(\d{1,2})-(\d{1,2})-?(\d{4})?/, // "12-15-2024" or "12-15"
      ];

      for (const pattern of datePatterns) {
        const match = dateText.match(pattern);
        if (match) {
          try {
            let dateStr = dateText;
            // If no year specified, assume current year
            if (!match[2] && !match[3]) {
              dateStr += `, ${currentYear}`;
            }
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate.toISOString().split('T')[0];
            }
          } catch (e) {
            // Continue to next pattern
          }
        }
      }

      // If no date found, return today's date as fallback
      return new Date().toISOString().split('T')[0];
    };

    // Helper function to parse confidence from recommended play
    const parseConfidence = (playText: string): number => {
      const lowerText = playText.toLowerCase();
      if (lowerText.includes('high confidence') || lowerText.includes('high)')) {
        return 80;
      } else if (lowerText.includes('medium confidence') || lowerText.includes('medium)')) {
        return 60;
      } else if (lowerText.includes('low confidence') || lowerText.includes('low)')) {
        return 40;
      }
      return 70; // default
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse week from header like "Week 3 Game Predictions"
      if (line.toLowerCase().includes('week') && line.toLowerCase().includes('game predictions')) {
        const weekMatch = line.match(/week\s+(\d+)/i);
        if (weekMatch) {
          currentWeek = parseInt(weekMatch[1]);
          console.log('Parsed week from AI output:', currentWeek);
        }
      }

      // Look for date indicators (should be processed before game lines)
      if (line.toLowerCase().includes('monday night') ||
          line.toLowerCase().includes('sunday night') ||
          line.toLowerCase().includes('thursday night') ||
          /\b\w+ \d{1,2}\b/.test(line) || // "December 15"
          /\b\d{1,2}\/\d{1,2}\b/.test(line) || // "12/15"
          /\b\d{1,2}-\d{1,2}\b/.test(line)) { // "12-15"
        currentGameDate = parseGameDate(line);
        console.log('Parsed date from line:', line, '->', currentGameDate);
      }

      // Look for game lines that contain "@" (like "Miami Dolphins @ Buffalo Bills")
      if (line.includes(' @ ') && !line.includes('•') && !line.includes('Model Prediction') && !line.includes('Recommended Play') && !line.includes('Key Factors')) {
        console.log('Found game line:', line);

        // Save previous game if we have one
        if (currentGame && currentPrediction) {
          console.log('Saving previous game:', currentGame, 'with prediction:', currentPrediction);
          predictions.push({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            prediction: currentPrediction,
            confidence: currentConfidence,
            reasoning: currentReasoning.trim(),
            gameDate: currentGameDate,
            week: currentWeek
          });
        }

        // Parse new game
        currentGame = line;
        const teams = line.split(' @ ');
        if (teams.length === 2) {
          awayTeam = teams[0].trim();
          homeTeam = teams[1].trim();
          console.log('Parsed teams - Away:', awayTeam, 'Home:', homeTeam);
        }
        currentPrediction = '';
        currentConfidence = 0;
        currentReasoning = '';
        isCollectingFactors = false;
      }

      // Look for model prediction
      if (line.includes('• Model Prediction:')) {
        const predictionText = line.replace('• Model Prediction:', '').trim();
        currentPrediction = predictionText;
        console.log('Found prediction:', predictionText);
      }

      // Look for recommended play (contains confidence)
      if (line.includes('• Recommended Play:')) {
        const playText = line.replace('• Recommended Play:', '').trim();
        currentConfidence = parseConfidence(playText);
        console.log('Found confidence:', currentConfidence, 'from:', playText);
      }

      // Look for key factors header
      if (line.includes('• Key Factors:')) {
        isCollectingFactors = true;
        currentReasoning = '';
        console.log('Starting to collect key factors');
        continue;
      }

      // Collect key factors (lines that start with – or •)
      if (isCollectingFactors && (line.startsWith('–') || line.startsWith('•'))) {
        const factorText = line.replace(/^[–•]\s*/, '').trim();
        if (factorText.length > 0) {
          currentReasoning += factorText + '. ';
        }
      }

      // Stop collecting factors when we hit the next game or empty line
      if (isCollectingFactors && (line.includes(' @ ') || line === '')) {
        isCollectingFactors = false;
        console.log('Finished collecting factors for game');
      }
    }

    // Save the last game
    if (currentGame && currentPrediction) {
      console.log('Saving last game:', currentGame, 'with prediction:', currentPrediction);
      predictions.push({
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        prediction: currentPrediction,
        confidence: currentConfidence,
        reasoning: currentReasoning.trim(),
        gameDate: currentGameDate,
        week: currentWeek
      });
    }

    console.log('Parsed', predictions.length, 'predictions total');
    return predictions;
  };

  const savePredictions = async (predictions: ParsedPrediction[]) => {
    // Check for existing picks to avoid duplicates
    const { data: existingPicks } = await picksApi.getAll();

    let savedCount = 0;
    let duplicateCount = 0;

    for (const pred of predictions) {
      // Check if a pick already exists for this matchup in the same week
      const duplicateExists = existingPicks?.some(pick => {
        const gameInfo = pick.game_info as any;
        return gameInfo?.home_team === pred.homeTeam &&
               gameInfo?.away_team === pred.awayTeam &&
               pick.week === pred.week;
      });

      if (duplicateExists) {
        console.log(`Skipping duplicate prediction for ${pred.awayTeam} vs ${pred.homeTeam} (Week ${pred.week})`);
        duplicateCount++;
        continue;
      }

      // Determine which team is predicted to win based on the prediction text
      let winner = '';
      const predictionLower = pred.prediction.toLowerCase();

      // Check if prediction mentions home team winning
      if (predictionLower.includes(pred.homeTeam.toLowerCase().split(' ')[0]) ||
          predictionLower.includes(pred.homeTeam.toLowerCase()) ||
          predictionLower.includes('home') ||
          predictionLower.includes(pred.homeTeam.split(' ')[0].toLowerCase())) {
        winner = pred.homeTeam;
      }
      // Check if prediction mentions away team winning
      else if (predictionLower.includes(pred.awayTeam.toLowerCase().split(' ')[0]) ||
               predictionLower.includes(pred.awayTeam.toLowerCase()) ||
               predictionLower.includes('away') ||
               predictionLower.includes(pred.awayTeam.split(' ')[0].toLowerCase())) {
        winner = pred.awayTeam;
      }
      // Default to home team if unclear
      else {
        winner = pred.homeTeam;
      }

      console.log(`Saving prediction: ${pred.awayTeam} vs ${pred.homeTeam} - ${winner} to win (Week ${pred.week})`);

      const pickData = {
        game_info: {
          home_team: pred.homeTeam,
          away_team: pred.awayTeam,
          league: 'NFL' as const,
          game_date: pred.gameDate,
          spread: 0, // Default values
          over_under: 40
        },
        prediction: `${winner} to win`,
        confidence: pred.confidence,
        reasoning: pred.reasoning || 'AI-generated prediction',
        result: 'pending' as const,
        week: pred.week
      };

      const { error } = await picksApi.create(pickData);
      if (error) {
        console.error(`Failed to save prediction for ${pred.homeTeam}:`, error);
        throw new Error(`Failed to save prediction for ${pred.homeTeam}: ${error.message}`);
      } else {
        savedCount++;
      }
    }

    console.log(`Saved ${savedCount} predictions, skipped ${duplicateCount} duplicates`);
    return { savedCount, duplicateCount };
  };

  const cleanDuplicates = async () => {
    setIsProcessing(true);
    setMessage('Cleaning duplicates...');
    
    try {
      const { data: allPicks } = await picksApi.getAll();
      if (!allPicks) return;

      const seen = new Set<string>();
      const duplicates: string[] = [];

      // Find duplicates based on team matchup and date
      for (const pick of allPicks) {
        const gameInfo = pick.game_info as any;
        const key = `${gameInfo?.home_team}-${gameInfo?.away_team}-${pick.created_at?.split('T')[0]}`;
        
        if (seen.has(key)) {
          duplicates.push(pick.id);
        } else {
          seen.add(key);
        }
      }

      // Delete duplicates (keeping the first occurrence)
      for (const duplicateId of duplicates) {
        await picksApi.delete(duplicateId);
      }

      setMessage(`✅ Removed ${duplicates.length} duplicate predictions!`);
    } catch (error: any) {
      setMessage('❌ Error cleaning duplicates: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseAndSave = async () => {
    setIsProcessing(true);
    setMessage('');

    try {
      // This is where you'll parse the agent's text
      const predictions = parseAgentText(agentText);

      if (predictions.length === 0) {
        throw new Error('No predictions found in the agent output. Please check the format.');
      }

      console.log(`Parsed ${predictions.length} predictions from agent output`);

      // Save to database
      const { savedCount, duplicateCount } = await savePredictions(predictions);

      if (savedCount > 0) {
        setMessage(`✅ Successfully saved ${savedCount} predictions!${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`);
        setAgentText(''); // Clear the form

        // Trigger global event to refresh other components
        window.dispatchEvent(new CustomEvent('predictionsUpdated'));
      } else if (duplicateCount > 0) {
        setMessage(`⚠️ All ${duplicateCount} predictions were duplicates and were skipped.`);
      } else {
        setMessage('❌ No predictions were saved. Check the console for details.');
      }

    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">📝 Process Agent Output</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Agent Output
        </label>
        <textarea
          value={agentText}
          onChange={(e) => setAgentText(e.target.value)}
          placeholder="Paste agent output here..."
          className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white font-mono text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Target Week (Optional - overrides AI-detected week)
        </label>
        <select
          value={selectedWeek || ''}
          onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
          className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Use AI-detected week (or Week 1 if none found)</option>
          {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
            <option key={week} value={week}>
              Week {week}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          If the AI output doesn't specify a week, predictions will be assigned to the selected week above.
        </p>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={parseAndSave}
          disabled={!agentText.trim() || isProcessing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium"
        >
          {isProcessing ? 'Processing...' : 'Process & Publish'}
        </button>

        <button
          onClick={cleanDuplicates}
          disabled={isProcessing}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium"
        >
          🧹 Clean Duplicates
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${message.includes('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminDataEntry;