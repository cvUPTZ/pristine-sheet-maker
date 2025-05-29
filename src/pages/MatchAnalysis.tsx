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
  name: string;
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
        console.error('Error fetching match:', matchError);
        throw new Error(`Failed to fetch match: ${matchError.message}`);
      }

      if (!matchData) {
        throw new Error('Match not found.');
      }
      
      setMatch(matchData as MatchData);
      setHomeTeam({
        name: matchData.home_team_name || 'Home Team',
        formation: matchData.home_team_formation || '4-3-3',
      });
      setAwayTeam({
        name: matchData.away_team_name || 'Away Team',
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
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setMatch(null); // Ensure match is null on error
      // toast.error(err.message || 'Failed to load match data.'); // Sonner toast
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

  if (error || !match) { // Check for error state as well
    return (
      <div className="container mx-auto p-4 text-center">
        <p>{error || 'Match not found or access denied.'}</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }
  
  // At this point, match, homeTeam, and awayTeam should be populated
  
  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        matchName={match.name} // Pass match name directly
        matchStatus={match.status}
        homeTeam={{ name: homeTeam.name, formation: homeTeam.formation }}
        awayTeam={{ name: awayTeam.name, formation: awayTeam.formation }}
        mode={mode}
        setMode={setMode}
        onToggleTracking={handleToggleTracking} // Renamed prop to onToggleTracking for clarity
        onSave={handleSave} // Renamed prop to onSave
        // Timer and userRole are not direct props of MatchHeader based on its typical design
        // If MatchHeader needs them, they should be added to its props definition
        // For now, assuming they are managed internally or via context by MatchHeader itself if needed.
      />

      {/* Conditional rendering based on mode or other state */}
      {mode === 'piano' && (
        <div className="flex-grow overflow-hidden p-4">
          <PianoRoll 
            // Assuming PianoRoll takes events and other necessary props
            // Example:
            // events={events}
            // duration={match.duration || 300} // Example: total duration in seconds
            // onEventClick={(event) => console.log('Event clicked:', event)}
          />
        </div>
      )}

      {mode === 'tracking' && (
         <MainTabContent
            matchId={match.id}
            userRole={userRole || ''} // Pass userRole; ensure default if null
            // Pass other necessary props to MainTabContent
            // Example: homeTeam, awayTeam, events for display or interaction
            // homeTeam={homeTeam}
            // awayTeam={awayTeam}
            // timelineEvents={timelineEvents}
            // onAddEvent={(newEvent) => setEvents(prev => [...prev, newEvent])}
          />
      )}

      {/* Fallback or other UI elements */}
      {mode !== 'piano' && mode !== 'tracking' && (
        <div className="container mx-auto p-4">
          <p>Selected mode: {mode}. No specific UI configured for this mode.</p>
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;
