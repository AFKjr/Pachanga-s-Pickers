import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TeamStatsData {
  team_name: string;
  
  // CRITICAL stats for simulation (highlighted in UI)
  yards_per_play: number;
  yards_per_play_allowed: number;
  drives_per_game: number;
  points_allowed_per_game: number;
  
  // Supporting stats
  offensive_yards_per_game: number;
  defensive_yards_allowed: number;
  points_per_game: number;
  passing_yards: number;
  passing_yards_per_game: number;
  rushing_yards: number;
  rushing_yards_per_game: number;
  turnovers_lost: number;
  turnovers_per_game: number;
  turnover_differential: number;
  def_interceptions: number;
  takeaways: number;
  total_plays: number;
  plays_per_game: number;
  scoring_percentage: number;
  defensive_yards_per_game: number;
  defensive_scoring_pct_allowed: number;
  
  // Metadata
  week: number;
  season_year: number;
  games_played: number;
  source: 'espn' | 'manual' | 'default' | 'historical' | 'csv';
  last_updated: string;
}

const AdminTeamStats: React.FC = () => {
  const [stats, setStats] = useState<TeamStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TeamStatsData>>({});

  useEffect(() => {
    loadTeamStats();
  }, []);

  const loadTeamStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_stats_cache')
        .select('*')
        .order('team_name');

      if (error) throw error;
      setStats(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading team stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (team: TeamStatsData) => {
    setEditingTeam(team.team_name);
    setEditForm(team);
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingTeam || !editForm) return;

    try {
      const { error } = await supabase
        .from('team_stats_cache')
        .update({
          ...editForm,
          source: 'manual',
          last_updated: new Date().toISOString()
        })
        .eq('team_name', editingTeam);

      if (error) throw error;

      await loadTeamStats();
      setEditingTeam(null);
      setEditForm({});
    } catch (err: any) {
      setError(err.message);
      console.error('Error saving team stats:', err);
    }
  };

  const getSourceBadge = (source: string) => {
    const styles: Record<string, string> = {
      csv: 'bg-purple-600 text-white',
      espn: 'bg-gray-600 text-gray-300',
      manual: 'bg-blue-600 text-white',
      historical: 'bg-yellow-600 text-white',
      default: 'bg-red-600 text-white'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[source] || 'bg-gray-600'}`}>
        {source.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading team stats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-max">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-700 z-20">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-lime-400 uppercase tracking-wider" title="CRITICAL - Used in simulation">
                  YPP ⚡
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-lime-400 uppercase tracking-wider" title="CRITICAL - Used in simulation">
                  YPPA ⚡
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-lime-400 uppercase tracking-wider" title="CRITICAL - Used in simulation">
                  Dr/G ⚡
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  PPG
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-lime-400 uppercase tracking-wider" title="CRITICAL - Used in simulation">
                  PA/G ⚡
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  TO Diff
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Sc %
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.map((team) => (
                <tr key={team.team_name} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm font-medium text-white sticky left-0 bg-gray-800 z-10">
                    {team.team_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getSourceBadge(team.source)}
                  </td>
                  
                  {editingTeam === team.team_name ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.yards_per_play || ''}
                          onChange={(e) => setEditForm({ ...editForm, yards_per_play: parseFloat(e.target.value) })}
                          className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                          title="Yards Per Play - CRITICAL"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.yards_per_play_allowed || ''}
                          onChange={(e) => setEditForm({ ...editForm, yards_per_play_allowed: parseFloat(e.target.value) })}
                          className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                          title="Yards Per Play Allowed - CRITICAL"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.drives_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, drives_per_game: parseFloat(e.target.value) })}
                          className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                          title="Drives Per Game - CRITICAL"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.points_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, points_per_game: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.points_allowed_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, points_allowed_per_game: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                          title="Points Allowed Per Game - CRITICAL"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.turnover_differential || ''}
                          onChange={(e) => setEditForm({ ...editForm, turnover_differential: parseFloat(e.target.value) })}
                          className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.scoring_percentage || ''}
                          onChange={(e) => setEditForm({ ...editForm, scoring_percentage: parseFloat(e.target.value) })}
                          className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-bold text-lime-400 text-right" title="Yards Per Play - CRITICAL">
                        {team.yards_per_play?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-lime-400 text-right" title="Yards Per Play Allowed - CRITICAL">
                        {team.yards_per_play_allowed?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-lime-400 text-right" title="Drives Per Game - CRITICAL">
                        {team.drives_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.points_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-lime-400 text-right" title="Points Allowed Per Game - CRITICAL">
                        {team.points_allowed_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.turnover_differential !== undefined ? (team.turnover_differential > 0 ? '+' : '') + team.turnover_differential : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.scoring_percentage?.toFixed(1) || 'N/A'}%
                      </td>
                    </>
                  )}
                  
                  <td className="px-4 py-3 text-sm text-right">
                    {editingTeam === team.team_name ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(team)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTeamStats;
