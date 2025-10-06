import React, { useState, useEffect } from 'react';
// import { useAuth } from '../contexts/AuthContext'; // Not needed - ESPN API disabled
import { supabase } from '../lib/supabase';

interface TeamStatsData {
  team_name: string;
  offensive_yards_per_game: number;
  defensive_yards_allowed: number;
  points_per_game: number;
  points_allowed_per_game: number;
  turnover_differential: number;
  third_down_conversion_rate: number;
  red_zone_efficiency: number;
  source: 'espn' | 'manual' | 'default' | 'historical';
  last_updated: string;
}

const AdminTeamStats: React.FC = () => {
  // const { user } = useAuth(); // Not needed - ESPN API disabled
  const [stats, setStats] = useState<TeamStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing] = useState(false); // Always false - ESPN API disabled
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

  const refreshAllStats = async () => {
    // COMMENTED OUT - ESPN API functionality disabled
    // Use CSV import instead for updating team stats
    alert('ESPN API refresh is disabled. Please use the CSV Import feature above to update team stats.');
    return;

    /* ORIGINAL ESPN API CODE - COMMENTED OUT
    if (!user) return;

    try {
      setRefreshing(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/refresh-team-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh stats');
      }

      alert(result.message);
      await loadTeamStats();
    } catch (err: any) {
      setError(err.message);
      console.error('Error refreshing stats:', err);
    } finally {
      setRefreshing(false);
    }
    */
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
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">NFL Team Statistics</h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage team stats used in Monte Carlo simulations
            </p>
          </div>
          <button
            onClick={refreshAllStats}
            disabled={refreshing}
            className="btn-primary disabled:opacity-50 opacity-50 cursor-not-allowed"
            title="ESPN API disabled - Use CSV Import instead"
          >
            🔄 Refresh All from ESPN (Disabled)
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* ESPN API refresh disabled - use CSV import instead */}
      </div>

      {/* Stats Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Off Yds/G
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Def Yds/G
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  PPG
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  PA/G
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  TO Diff
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  3rd %
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  RZ %
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.map((team) => (
                <tr key={team.team_name} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm font-medium text-white">
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
                          value={editForm.offensive_yards_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, offensive_yards_per_game: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.defensive_yards_allowed || ''}
                          onChange={(e) => setEditForm({ ...editForm, defensive_yards_allowed: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.points_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, points_per_game: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.points_allowed_per_game || ''}
                          onChange={(e) => setEditForm({ ...editForm, points_allowed_per_game: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.turnover_differential || ''}
                          onChange={(e) => setEditForm({ ...editForm, turnover_differential: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.third_down_conversion_rate || ''}
                          onChange={(e) => setEditForm({ ...editForm, third_down_conversion_rate: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.red_zone_efficiency || ''}
                          onChange={(e) => setEditForm({ ...editForm, red_zone_efficiency: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-sm text-right"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.offensive_yards_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.defensive_yards_allowed?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.points_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.points_allowed_per_game?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.turnover_differential !== undefined ? (team.turnover_differential > 0 ? '+' : '') + team.turnover_differential : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.third_down_conversion_rate?.toFixed(1) || 'N/A'}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {team.red_zone_efficiency?.toFixed(1) || 'N/A'}%
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

      {/* Legend */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-3">Data Source Legend:</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            {getSourceBadge('csv')}
            <span className="text-gray-300">Imported from CSV file</span>
          </div>
          <div className="flex items-center space-x-2">
            {getSourceBadge('manual')}
            <span className="text-gray-300">Manually entered by admin</span>
          </div>
          <div className="flex items-center space-x-2">
            {getSourceBadge('espn')}
            <span className="text-gray-300">ESPN API (Legacy - Disabled)</span>
          </div>
          <div className="flex items-center space-x-2">
            {getSourceBadge('historical')}
            <span className="text-gray-300">Historical season data</span>
          </div>
          <div className="flex items-center space-x-2">
            {getSourceBadge('default')}
            <span className="text-gray-300">League averages (unreliable)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeamStats;
