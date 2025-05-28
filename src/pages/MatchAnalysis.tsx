import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MatchHeader } from '@/components/MatchHeader';
import { MainTabContent } from '@/components/MainTabContent';
import { PianoRoll } from '@/components/PianoRoll';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Interfaces
interface Team {
  name: string;
  formation: string;
}

interface MatchData {
  id: string;
  name: string | null; // Allow null since it might be missing
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_formation: string | null;
  away_team_formation: string | null;
  match_type?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Event {
  id: string;
  timestamp: number;
  type: string;
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team>({ name: 'Home Team', formation: '4-3-3' });
  const [awayTeam, setAwayTeam] = useState<Team>({ name: 'Away Team', formation: '4-4-2' });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States and handlers for MatchHeader
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  
  const handleToggleTracking = () => {
    toast.info(`Tracking toggle clicked. Current mode: ${mode}. (Placeholder)`);
  };

  const handleSave = () => {
    toast.success('Save action triggered. (Placeholder)');
  };

  const loadMatch = useCallback(async () => {
    if (!matchId) {
      setError('No match ID provided.');
      setLoading(false);
      setMatch(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMatch(null);

    try {
      console.log('Attempting to fetch match with ID:', matchId);
      
      // Try multiple approaches to fetch the match
      let matchData = null;
      let matchError = null;

      // Approach 1: Try with specific columns to avoid potential RLS issues
      const { data: basicMatchData, error: basicError } = await supabase
        .from('matches')
        .select('id, name, status, home_team_name, away_team_name, home_team_formation, away_team_formation, match_type, description, created_at')
        .eq('id', matchId)
        .maybeSingle(); // Use maybeSingle instead of single to handle 0 results gracefully

      if (basicError) {
        console.error('Basic query failed:', basicError);
        
        // Approach 2: Try with RPC if basic query fails (for RLS bypass if you have such function)
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_match_by_id', { 
            match_id: matchId 
          });
          
          if (rpcError) {
            console.error('RPC query also failed:', rpcError);
            matchError = basicError; // Use the original error
          } else {
            matchData = rpcData;
          }
        } catch (rpcCatchError) {
          console.error('RPC approach failed:', rpcCatchError);
          matchError = basicError; // Use the original error
        }
      } else {
        matchData = basicMatchData;
      }

      console.log('Query results:', { matchData, matchError });

      // Handle specific error cases
      if (matchError) {
        if (matchError.code === 'PGRST116') {
          throw new Error('Match not found. This match may be in draft status or you may not have permission to view it.');
        } else if (matchError.code === '42501') {
          throw new Error('Access denied. You do not have permission to view this match.');
        } else {
          throw new Error(`Database error: ${matchError.message} (Code: ${matchError.code})`);
        }
      }
      
      // Check if we got any results
      if (!matchData) {
        throw new Error('Match not found. It may not exist, be in draft status, or you may not have permission to view it.');
      }

      console.log('Match data received:', JSON.stringify(matchData, null, 2));

      // Validate that we have essential data
      if (!matchData.id) {
        throw new Error('Invalid match data received from database.');
      }

      // Handle missing or null name field gracefully
      const matchName = matchData.name || `Match ${matchData.id.slice(0, 8)}`;
      
      // Create the match object with safe defaults
      const processedMatch: MatchData = {
        id: matchData.id,
        name: matchName,
        status: matchData.status || 'unknown',
        home_team_name: matchData.home_team_name || null,
        away_team_name: matchData.away_team_name || null,
        home_team_formation: matchData.home_team_formation || null,
        away_team_formation: matchData.away_team_formation || null,
        match_type: matchData.match_type || null,
        description: matchData.description || null,
        created_at: matchData.created_at || null,
      };

      console.log('Processed match data:', JSON.stringify(processedMatch, null, 2));

      setMatch(processedMatch);
      
      // Set team data with safe fallbacks
      setHomeTeam({
        name: processedMatch.home_team_name || 'Home Team',
        formation: processedMatch.home_team_formation || '4-3-3',
      });
      
      setAwayTeam({
        name: processedMatch.away_team_name || 'Away Team',
        formation: processedMatch.away_team_formation || '4-4-2',
      });

      // Simulate fetching events for now
      setEvents([
        { id: '1', timestamp: 10, type: 'Goal' },
        { id: '2', timestamp: 25, type: 'Foul' },
      ]);

      console.log('Match loaded successfully');

    } catch (err: any) {
      console.error("Error in loadMatch:", err);
      let errorMessage = 'An unexpected error occurred while loading match data.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setMatch(null);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Memoized values for child components
  const timelineEvents = useMemo(() => {
    return events.map(event => ({
      time: event.timestamp,
      label: event.type,
    }));
  }, [events]);

  // Guard conditions for rendering
  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    console.log("DEBUG: Rendering error/no-match state. Error:", error, "Match:", match);
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-red-500 text-lg">⚠️</div>
          <p className="text-red-600">{error || 'Match data is not available or match not found.'}</p>
          <div className="space-x-2">
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
            <Button onClick={loadMatch} variant="default">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Debug logs - only when match is successfully loaded
  console.log("DEBUG: Rendering MatchAnalysis - match loaded successfully");
  console.log("DEBUG: match.name:", match.name);
  console.log("DEBUG: match.status:", match.status);
  console.log("DEBUG: homeTeam:", homeTeam);
  console.log("DEBUG: awayTeam:", awayTeam);
  
  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        matchName={match.name || "Unnamed Match"}
        matchStatus={match.status}
        homeTeam={{ name: homeTeam.name, formation: homeTeam.formation }}
        awayTeam={{ name: awayTeam.name, formation: awayTeam.formation }}
        mode={mode}
        setMode={setMode}
        onToggleTracking={handleToggleTracking}
        onSave={handleSave}
      />

      {mode === 'piano' && (
        <div className="flex-grow overflow-hidden p-4">
          <PianoRoll />
        </div>
      )}

      {mode === 'tracking' && (
         <MainTabContent
            matchId={match.id}
            userRole={userRole || ''} 
          />
      )}

      {mode !== 'piano' && mode !== 'tracking' && (
        <div className="container mx-auto p-4">
          <p>Selected mode: {mode}. No specific UI configured for this mode.</p>
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;
