import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Assuming this context provides user roles
import  MatchHeader  from '@/components/match/MatchHeader'; // Your component for the top bar
import  MainTabContent  from '@/components/match/MainTabContent'; // Your component for tracking mode content
import  PianoRoll  from '@/components/match/PianoInput'; // Your component for piano roll view
import { toast } from 'sonner'; // For notifications
import { Button } from '@/components/ui/button'; // ShadCN Button
import useMatchData, {
  TeamHeaderData as HookTeamHeaderData,
  MatchDataInHook, // Make sure this type correctly defines what useMatchData.match returns
  MatchEvent as HookMatchEvent
} from '@/hooks/useMatchData'; // Your custom hook for fetching match data

// Define or import detailed Player and Team types if MainTabContent or other parts need them
// These are distinct from the simpler TeamHeaderData provided by the hook for the MatchHeader.
interface Player {
  id: string; // Or number, ensure consistency
  name: string;
  position: string;
  number: number;
  // Add other relevant player details
}

interface TeamType {
  name: string;
  formation: string;
  players: Player[];
  // Add other relevant team details like logo, coach, etc.
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>(); // Get matchId from URL
  const navigate = useNavigate();
  const { userRole } = useAuth(); // Get user role for conditional UI (e.g., edit/save buttons)

  // Fetching core match data, header-specific team data, and events using the custom hook
  const {
    match: matchDataFromHook, // This should be of type MatchDataInHook or similar
    homeTeam: homeTeamHeaderDataFromHook, // This should be of type HookTeamHeaderData
    awayTeam: awayTeamHeaderDataFromHook, // This should be of type HookTeamHeaderData
    events: eventsFromHook, // Array of HookMatchEvent
    isLoading: isLoadingMatchData,
    error: matchDataError,
    refetchMatchData // Optional: if your hook provides a way to manually refetch
  } = useMatchData(matchId); // Pass the matchId to the hook

  // Local UI/Interaction States
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano'); // To toggle between views

  // Local state for more detailed team compositions (e.g., for player lists in MainTabContent)
  // These are typically initialized with defaults or fetched separately if not fully covered by useMatchData
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

  // Effect to synchronize local detailed team data if the simpler header data from the hook changes
  // This is useful if MainTabContent needs to display team names/formations consistent with MatchHeader
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull(prev => ({
        ...prev,
        name: homeTeamHeaderDataFromHook.name || "Home Team", // Fallback
        formation: homeTeamHeaderDataFromHook.formation || prev.formation // Fallback or keep previous
      }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull(prev => ({
        ...prev,
        name: awayTeamHeaderDataFromHook.name || "Away Team", // Fallback
        formation: awayTeamHeaderDataFromHook.formation || prev.formation // Fallback or keep previous
      }));
    }
  }, [homeTeamHeaderDataFromHook, awayTeamHeaderDataFromHook]);


  // UI Action Handlers
  const handleToggleTracking = () => {
    // toast.info(`Tracking mode toggled. (Placeholder)`);
    setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    // Placeholder for actual save logic (e.g., saving event edits, configurations)
    // This might involve calling a Supabase function or updating tables
    toast.success('Save action triggered. (Data saving not yet implemented)');
  };

  // Memoized transformation of events for components like a timeline (if different from raw events)
  const timelineEvents = useMemo(() => {
    if (!eventsFromHook || !Array.isArray(eventsFromHook)) return []; // Guard against undefined/non-array
    return eventsFromHook.map(event => ({
      time: event.timestamp, // Assuming timestamp is a key property
      label: event.event_type, // Assuming event_type is a key property
      // Potentially add more transformed properties specific to the timeline component
      // e.g., color, icon based on event_type
    }));
  }, [eventsFromHook]);


  // --- Render Logic ---

  // 1. Loading State
  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match details...</p>
        {/* You could add a spinner component here */}
      </div>
    );
  }

  // 2. Error State or Missing Essential Data
  // This guard is crucial to prevent rendering with undefined data that child components might expect
  if (matchDataError || !matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook) {
    let message = 'Match not found or there was an issue loading its data.';
    if (matchDataError) {
      // Attempt to get a more specific error message
      message = typeof matchDataError === 'string' ? matchDataError : ((matchDataError as Error)?.message || 'An error occurred.');
    } else if (!matchDataFromHook) {
      message = 'Core match data is missing. Please try again or contact support.';
    } else if (!homeTeamHeaderDataFromHook) {
      message = 'Home team details are missing. Please try again or contact support.';
    } else if (!awayTeamHeaderDataFromHook) {
      message = 'Away team details are missing. Please try again or contact support.';
    }

    return (
      <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
          {matchId && typeof refetchMatchData === 'function' && (
            <Button onClick={() => refetchMatchData(matchId)}>Try Reloading Data</Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Successful Data Load: Render the main analysis UI
  // At this point, matchDataFromHook, homeTeamHeaderDataFromHook, and awayTeamHeaderDataFromHook
  // are guaranteed to be defined. Their internal properties (like .name) should also be guaranteed
  // by the useMatchData hook (i.e., the hook should provide defaults if the source is sparse).
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MatchHeader
        matchName={matchDataFromHook.name} // Expects string
        matchStatus={matchDataFromHook.status} // Expects string
        homeTeam={homeTeamHeaderDataFromHook} // Expects HookTeamHeaderData (with .name, .logo, .formation as strings)
        awayTeam={awayTeamHeaderDataFromHook} // Expects HookTeamHeaderData
        mode={mode}
        setMode={setMode} // Pass setter if MatchHeader directly controls mode
        onToggleTracking={handleToggleTracking} // Pass handler
        onSave={handleSave} // Pass handler
        // Add any other props MatchHeader needs, like userRole for conditional buttons
        userRole={userRole}
      />

      {/* Conditional rendering based on the selected mode */}
      <div className="flex-grow overflow-auto p-2 md:p-4"> {/* Added overflow-auto for content scroll */}
        {mode === 'piano' && (
          <PianoRoll
            events={eventsFromHook || []} // Pass events, ensure it's an array
            // duration={matchDataFromHook.duration || 3600} // Example: default to 60 mins if duration isn't in hook data
            // onEventClick={(event) => console.log('PianoRoll Event clicked:', event)}
          />
        )}

        {mode === 'tracking' && (
          <MainTabContent
            matchId={matchDataFromHook.id} // Pass match ID
            userRole={userRole || ''} // Pass user role for permissions
            events={eventsFromHook || []} // Pass events, ensure it's an array
            homeTeamFull={homeTeamFull} // Pass detailed local team data
            awayTeamFull={awayTeamFull} // Pass detailed local team data
            // timelineEvents={timelineEvents} // If MainTabContent needs specifically transformed events
            // onAddEvent={(newEvent) => { /* Logic to add event, might involve calling a fn from useMatchData or a Supabase mutation */ }}
          />
        )}

        {/* Fallback for any other unhandled modes (optional) */}
        {mode !== 'piano' && mode !== 'tracking' && (
          <div className="text-center p-10">
            <p className="text-muted-foreground">
              Selected mode: <span className="font-semibold">{mode}</span>.
              No specific UI is configured for this view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchAnalysis;