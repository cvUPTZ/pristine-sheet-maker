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
      
      // First, let's try to fetch the match data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId);

      console.log('Raw query response:', { matchData, matchError });

      if (matchError) {
        console.error('Supabase error fetching match:', JSON.stringify(matchError, null, 2));
        throw new Error(`Failed to fetch match: ${matchError.message}`);
      }
      
      // Check if we got any results
      if (!matchData || matchData.length === 0) {
        throw new Error('Match not found. It may not exist or you may not have permission to view it.');
      }

      // If we have multiple matches (shouldn't happen with unique ID), take the first one
      const singleMatch = matchData[0];
      
      console.log('Single match data:', JSON.stringify(singleMatch, null, 2));

      // Validate that we have essential data
      if (!singleMatch || !singleMatch.id) {
        throw new Error('Invalid match data received from database.');
      }

      // Handle missing or null name field gracefully
      const matchName = singleMatch.name || `Match ${singleMatch.id.slice(0, 8)}`;
      
      // Create the match object with safe defaults
      const processedMatch: MatchData = {
        ...singleMatch,
        name: matchName,
        status: singleMatch.status || 'unknown',
        home_team_name: singleMatch.home_team_name || null,
        away_team_name: singleMatch.away_team_name || null,
        home_team_formation: singleMatch.home_team_formation || null,
        away_team_formation: singleMatch.away_team_formation || null,
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
      const errorMessage = err.message || 'An unexpected error occurred while loading match data.';
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
