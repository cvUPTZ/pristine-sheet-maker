import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Player } from '@/types/index';

interface MatchState {
  id: string;
  name?: string;
  description?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  homeTeamFormation?: string;
  awayTeamFormation?: string;
  status: string;
  matchDate?: string;
  venue?: string;
  competition?: string;
  statistics?: any;
  ballTrackingData?: any;
  // Keep database field names for compatibility
  home_team_name: string;
  away_team_name: string;
  home_team_players: Player[];
  away_team_players: Player[];
  home_team_formation?: string;
  away_team_formation?: string;
  match_date?: string;
  match_statistics?: any;
  ball_tracking_data?: any;
}

export const useMatchState = (matchId: string) => {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchMatch = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      // Helper function to parse JSON data safely
      const parseJSONData = (data: any): any => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        return Array.isArray(data) ? data : [];
      };

      // Convert database format to Match type
      const matchData: MatchState = {
        id: data.id,
        name: data.name || undefined,
        description: data.description || undefined,
        homeTeamName: data.home_team_name,
        awayTeamName: data.away_team_name,
        homeTeamPlayers: parseJSONData(data.home_team_players) as Player[],
        awayTeamPlayers: parseJSONData(data.away_team_players) as Player[],
        homeTeamFormation: data.home_team_formation || undefined,
        awayTeamFormation: data.away_team_formation || undefined,
        status: data.status,
        matchDate: data.match_date || undefined,
        venue: data.venue || undefined,
        competition: data.competition || undefined,
        statistics: data.match_statistics as any,
        ballTrackingData: parseJSONData(data.ball_tracking_data),
        // Keep database field names for compatibility
        home_team_name: data.home_team_name,
        away_team_name: data.away_team_name,
        home_team_players: parseJSONData(data.home_team_players) as Player[],
        away_team_players: parseJSONData(data.away_team_players) as Player[],
        home_team_formation: data.home_team_formation || undefined,
        away_team_formation: data.away_team_formation || undefined,
        match_date: data.match_date || undefined,
        match_statistics: data.match_statistics as any,
        ball_tracking_data: parseJSONData(data.ball_tracking_data)
      };

      setMatch(matchData);
    } catch (error: any) {
      console.error('Error fetching match:', error);
      setError(error);
      toast({
        title: 'Error fetching match',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMatch = async (updates: Partial<MatchState>) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          name: updates.name,
          description: updates.description,
          home_team_name: updates.homeTeamName || updates.home_team_name,
          away_team_name: updates.awayTeamName || updates.away_team_name,
          home_team_players: updates.homeTeamPlayers || updates.home_team_players,
          away_team_players: updates.awayTeamPlayers || updates.away_team_players,
          home_team_formation: updates.homeTeamFormation || updates.home_team_formation,
          away_team_formation: updates.awayTeamFormation || updates.away_team_formation,
          status: updates.status,
          match_date: updates.matchDate || updates.match_date,
          venue: updates.venue,
          competition: updates.competition,
          match_statistics: updates.statistics || updates.match_statistics,
          ball_tracking_data: updates.ballTrackingData || updates.ball_tracking_data,
        })
        .eq('id', matchId);

      if (error) throw error;

      // Refresh match data
      await fetchMatch();

      toast({
        title: 'Match updated',
        description: 'Match details have been updated successfully.',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating match:', error);
      toast({
        title: 'Error updating match',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const startMatch = async () => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', matchId);

      if (error) throw error;

      // Refresh match data
      await fetchMatch();

      toast({
        title: 'Match started',
        description: 'Match is now live.',
      });

      return true;
    } catch (error: any) {
      console.error('Error starting match:', error);
      toast({
        title: 'Error starting match',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const endMatch = async () => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', matchId);

      if (error) throw error;

      // Refresh match data
      await fetchMatch();

      toast({
        title: 'Match ended',
        description: 'Match has been marked as completed.',
      });

      return true;
    } catch (error: any) {
      console.error('Error ending match:', error);
      toast({
        title: 'Error ending match',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  return {
    match,
    loading,
    error,
    fetchMatch,
    updateMatch,
    startMatch,
    endMatch,
  };
};
