import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MatchHeader } from '@/components/MatchHeader'; // Assuming this is the correct path
import { MainTabContent } from '@/components/MainTabContent';
import { PianoRoll } from '@/components/PianoRoll';
import { toast } from 'sonner'; // Using sonner for notifications
import { Button } from '@/components/ui/button'; // For potential use in placeholders

// Interfaces (assuming these are defined or should be defined)
interface Team {
  name: string;
  formation: string; // Or appropriate type
}

interface MatchData {
  id: string;
  name: string; // Consider if this can be string | null if 'name' can be missing
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_formation: string | null;
  away_team_formation: string | null;
  // Add other relevant match properties
}

interface Event {
  id: string;
  timestamp: number;
  type: string;
  // other event properties
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
    // Actual logic to switch modes or start/stop tracking would go here
    // For example: setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    toast.success('Save action triggered. (Placeholder)');
    // Actual logic for saving match data or configurations
  };

  const loadMatch = useCallback(async () => {
    if (!matchId) {
      setError('No match ID provided.');
      setLoading(false);
      setMatch(null); // Ensure match is null if no ID
      return;
    }

    setLoading(true);
    setError(null);
    setMatch(null); // Reset match state before loading new one

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) {
        // Log the specific Supabase error for PGRST116 or other issues
        console.error('Supabase error fetching match:', JSON.stringify(matchError, null, 2));
        if (matchError.code === 'PGRST116') {
          throw new Error(`Match not found or access denied. (PGRST116: ${matchError.details})`);
        }
        throw new Error(`Failed to fetch match: ${matchError.message}`);
      }
      
      // Log raw data from Supabase to see exactly what's returned
      console.log('Raw matchData from Supabase:', JSON.stringify(matchData, null, 2));

      if (!matchData) {
        // This case should ideally be caught by matchError with PGRST116 if .single() is used
        throw new Error('Match not found (matchData is null/undefined after query).');
      }
      
      // Specifically check if 'name' is missing or null BEFORE setting the state
      if (matchData.name === undefined || matchData.name === null) {
          console.warn(`Match ID ${matchId}: 'name' property is missing or null in fetched data. Value:`, matchData.name);
          // Optionally, provide a default name if it's critical and missing
          // matchData.name = "Unnamed Match (Data Missing)";
      }

      setMatch(matchData as MatchData); // Cast, but be mindful if 'name' can truly be null
      setHomeTeam({
        name: matchData.home_team_name || 'Home Team', // Provide fallbacks
        formation: matchData.home_team_formation || '4-3-3',
      });
      setAwayTeam({
        name: matchData.away_team_name || 'Away Team', // Provide fallbacks
        formation: matchData.away_team_formation || '4-4-2',
      });

      // Placeholder for fetching events related to the match
      // const { data: eventsData, error: eventsError } = await supabase
      //   .from('events')
      //   .select('*')
      //   .eq('match_id', matchId)
      //   .order('timestamp', { ascending: true });
      // if (eventsError) throw eventsError;
      // setEvents(eventsData || []);

      // Simulate fetching events for now
      setEvents([
        { id: '1', timestamp: 10, type: 'Goal' },
        { id: '2', timestamp: 25, type: 'Foul' },
      ]);

    } catch (err: any) {
      console.error("Error in loadMatch:", err); // Log the full error object
      setError(err.message || 'An unexpected error occurred while loading match data.');
      setMatch(null); // Ensure match is null on error
      toast.error(err.message || 'Failed to load match data.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Memoized values for child components
  const timelineEvents = useMemo(() => {
    // Process events for timeline if needed
    return events.map(event => ({
      time: event.timestamp,
      label: event.type,
      // ... other properties for timeline items
    }));
  }, [events]);


  // Guard conditions for rendering
  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading match details...</p>
        {/* Consider adding a spinner component here */}
      </div>
    );
  }

  if (error || !match) { // Check for error state AND if match is null
    console.log("DEBUG: Rendering error/no-match state. Error:", error, "Match:", match);
    return (
      <div className="container mx-auto p-4 text-center">
        <p>{error || 'Match data is not available or match not found.'}</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }
  
  // At this point, match, homeTeam, and awayTeam should be populated
  // If we reach here, `match` is not null.

  // --- BEGIN ADDED CONSOLE LOGS ---
  console.log("DEBUG: Rendering MatchAnalysis - Just before MatchHeader");
  // Safely stringify match. If match.name is problematic, this will show it.
  try {
    console.log("DEBUG: match state:", JSON.stringify(match, null, 2));
  } catch (e) {
    console.error("DEBUG: Error stringifying match state:", e);
    console.log("DEBUG: match state (raw object):", match); // Log raw object if stringify fails
  }
  console.log("DEBUG: homeTeam state:", JSON.stringify(homeTeam, null, 2));
  console.log("DEBUG: awayTeam state:", JSON.stringify(awayTeam, null, 2));
  console.log("DEBUG: mode state:", mode);
  console.log("DEBUG: userRole state:", userRole); // Added for completeness
  // --- END ADDED CONSOLE LOGS ---
  
  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        matchName={match.name || "Unnamed Match"} // Provide a fallback just in case, even if type says string
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
          <PianoRoll 
            // events={events}
            // duration={300} 
          />
        </div>
      )}

      {mode === 'tracking' && (
         <MainTabContent
            matchId={match.id}
            userRole={userRole || ''} 
            // homeTeam={homeTeam}
            // awayTeam={awayTeam}
            // timelineEvents={timelineEvents}
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
