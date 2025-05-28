import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MatchHeader } from '@/components/MatchHeader';
import { MainTabContent } from '@/components/MainTabContent';
import { PianoRoll } from '@/components/PianoRoll';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useMatchData, { TeamHeaderData as HookTeamHeaderData, MatchDataInHook, MatchEvent as HookMatchEvent } from '@/hooks/useMatchData'; // Import hook and types

// Assume TeamType and Player are defined in a central types file (e.g., @/types) for detailed team/player data
// These are distinct from the simpler TeamHeaderData provided by the hook.
interface Player { id: string; name: string; position: string; number: number; }
interface TeamType { name: string; formation: string; players: Player[]; }

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  // Use the custom hook for fetching core match data, header team data, and events
  const { 
    match: matchDataFromHook, // Renamed to avoid collision if we keep detailed match state locally
    homeTeam: homeTeamHeaderData, // Data for MatchHeader
    awayTeam: awayTeamHeaderData, // Data for MatchHeader
    events: eventsFromHook, 
    isLoading: isLoadingMatchData, 
    error: matchDataError 
  } = useMatchData(matchId);

  // Local UI/Interaction States
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  
  // States for detailed team compositions (e.g., for SetupScreen, player interactions in MainTabContent)
  // These are NOT replaced by useMatchData as the hook provides simpler header data.
  // Initialize with defaults or fetch separately if needed.
  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({ 
    name: 'Home Team', 
    formation: '4-3-3', 
    players: Array.from({ length: 11 }, (_, i) => ({ id: `H${i+1}`, name: `Home Player ${i+1}`, position: 'Forward', number: i+1 })) 
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({ 
    name: 'Away Team', 
    formation: '4-4-2', 
    players: Array.from({ length: 11 }, (_, i) => ({ id: `A${i+1}`, name: `Away Player ${i+1}`, position: 'Midfielder', number: i+1 })) 
  });
  // Other local states for UI interactions, setup, etc.
  // const [setupComplete, setSetupComplete] = useState(false);
  // const [teamPositions, setTeamPositions] = useState({});
  // const [selectedPlayer, setSelectedPlayer] = useState(null);
  // const [statistics, setStatistics] = useState({});


  const handleToggleTracking = () => {
    toast.info(`Tracking toggle clicked. Current mode: ${mode}. (Placeholder)`);
    setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    toast.success('Save action triggered. (Placeholder)');
    // Logic for saving match data or configurations
  };
  
  // Example: If full team data needs to be updated when hook data changes (e.g., names)
  // This is a simplified example; real logic might involve fetching full player lists if names change
  // useEffect(() => {
  //   if (homeTeamHeaderData) {
  //     setHomeTeamFull(prev => ({ ...prev, name: homeTeamHeaderData.name, formation: homeTeamHeaderData.formation }));
  //   }
  //   if (awayTeamHeaderData) {
  //     setAwayTeamFull(prev => ({ ...prev, name: awayTeamHeaderData.name, formation: awayTeamHeaderData.formation }));
  //   }
  // }, [homeTeamHeaderData, awayTeamHeaderData]);


  // Memoized values for child components using data from the hook
  const timelineEvents = useMemo(() => {
    return eventsFromHook.map(event => ({
      time: event.timestamp,
      label: event.event_type,
      // ... other properties for timeline items
    }));
  }, [eventsFromHook]);


  // Guard conditions for rendering using hook's state
  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading match details...</p>
      </div>
    );
  }

  if (matchDataError || !matchDataFromHook) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>{matchDataError || 'Match not found or access denied.'}</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }
  
  // At this point, matchDataFromHook, homeTeamHeaderData, and awayTeamHeaderData should be populated
  
  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        matchName={matchDataFromHook.name}
        matchStatus={matchDataFromHook.status}
        homeTeam={homeTeamHeaderData} // Pass header-specific team data
        awayTeam={awayTeamHeaderData} // Pass header-specific team data
        mode={mode}
        setMode={setMode}
        onToggleTracking={handleToggleTracking}
        onSave={handleSave}
      />

      {mode === 'piano' && (
        <div className="flex-grow overflow-hidden p-4">
          <PianoRoll 
            events={eventsFromHook} // Pass events from hook
            // duration={matchDataFromHook.duration || 300} // Example
            // onEventClick={(event) => console.log('Event clicked:', event)}
          />
        </div>
      )}

      {mode === 'tracking' && (
         <MainTabContent
            matchId={matchDataFromHook.id}
            userRole={userRole || ''}
            events={eventsFromHook} // Pass events from hook
            // Pass detailed team data if MainTabContent needs it for player interactions
            homeTeamFull={homeTeamFull} 
            awayTeamFull={awayTeamFull}
            // timelineEvents={timelineEvents} // Already transformed from eventsFromHook
            // onAddEvent={(newEvent) => setEventsFromHook(prev => [...prev, newEvent])} // Hook doesn't expose setter for events
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
