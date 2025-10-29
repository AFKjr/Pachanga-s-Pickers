import { useState, useEffect } from 'react';
import { getTeamRecord, type TeamRecord } from '../services/teamRecords';

export function useTeamRecord(teamName: string) {
  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTeamRecord(teamName);
        setRecord(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch team record');
      } finally {
        setLoading(false);
      }
    }

    if (teamName) {
      fetchRecord();
    }
  }, [teamName]);

  return { record, loading, error };
}

export function useAllTeamRecords() {
  const [records, setRecords] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecords() {
      try {
        setLoading(true);
        setError(null);
        const { getAllTeamRecords } = await import('../services/teamRecords');
        const data = await getAllTeamRecords();
        setRecords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch team records');
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  return { records, loading, error };
}