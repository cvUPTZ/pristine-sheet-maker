import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MatchHeader } from '@/components/MatchHeader';
import { MainTabContent } from '@/components/MainTabContent';
import { PianoRoll } from '@/components/PianoRoll';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useMatchData, { TeamHeaderData as HookTeamHeaderData, MatchDataInHook, MatchEvent as HookMatchEvent } from '@/hooks/useMatchData';

// Assuming these are defined centrally
interface Player { id: string; name: string; position: string; number: number; }
interface TeamType { name: string; formation: string; players: Player[]; }

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const {
    match: matchDataFromHook,
    homeTeam: homeTeamHeaderDataFromHook, // Renamed for clarity
    awayTeam: awayTeamHeaderDataFromHook, // Renamed for clarity
    events: eventsFromHook,
    isLoading: isLoadingMatchData,
    error: matchDataError,
    refetchMatchData // Assuming useMatchData exposes a refetch function
  } = useMatchData(matchId);

  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');

  // Local full team state (if needed for more detailed components)
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

  // Effect to update local full team data if hook data changes
  // This is important if MainTabContent relies on these names/formations
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull(prev => ({ ...prev, name: homeTeamHeaderDataFromHook.name || "Home Team", formation: homeTeamHeaderDataFromHook.formation || prev.formation }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull(prev => ({ ...prev, name: awayTeamHeaderDataFromHook.name || "Away Team", formation: awayTeamHeaderDataFromHook.formation || prev.formation }));
    }
    // Potentially update home/away team names in matchDataFromHook if they are separate fields there
    // and your MatchHeader takes names from matchDataFromHook instead of team objects.
  }, [homeTeamHeaderDataFromHook, awayTeamHeaderDataFromHook]);


  const handleToggleTracking = () => {
    toast.info(`Tracking toggle clicked. Current mode: ${mode}. (Placeholder)`);
    setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    toast.success('Save action triggered. (Placeholder)');
  };

  const timelineEvents = useMemo(() => {
    if (!eventsFromHook) return [];
    return eventsFromHook.map(event => ({
      time: event.timestamp,
      label: event.event_type,
    }));
  }, [eventsFromHook]);

  // Most critical guard: Ensure all necessary data for MatchHeader is present
  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading match details...</p>
      </div>
    );
  }

  // If there's an error OR essential data for the header is missing, show error/fallback.
  if (matchDataError || !matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook) {
    let message = 'Match not found or access denied.';
    if (matchDataError) {
        message = typeof matchDataError === 'string' ? matchDataError : (matchDataError as Error).message || 'An error occurred.';
    } else if (!matchDataFromHook) {
        message = 'Core match data is missing.';
    } else if (!homeTeamHeaderDataFromHook) {
        message = 'Home team data is missing.';
    } else if (!awayTeamHeaderDataFromHook) {
        message = 'Away team data is missing.';
    }

    return (
      <div className="container mx-auto p-4 text-center">
        <p>{message}</p>
        <Button onClick={() => navigate('/')} className="mt-4 mr-2">Go Home</Button>
        {matchId && refetchMatchData && (
             <Button onClick={() => refetchMatchData(matchId)} className="mt-4">Try Reloading Data</Button>
        )}
      </div>
    );
  }

  // At this point, matchDataFromHook, homeTeamHeaderDataFromHook, and awayTeamHeaderDataFromHook are guaranteed to be defined.
  // The .name properties on these should also be defined if useMatchData ensures it.

  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        // Ensure `name` on matchDataFromHook and team objects is always a string.
        // useMatchData should provide defaults if they can be null/undefined from its source.
        matchName={matchDataFromHook.name} {/* Assumes matchDataFromHook.name is guaranteed by useMatchData */}
        matchStatus={matchDataFromHook.status}
        homeTeam={homeTeamHeaderDataFromHook} {/* Assumes .name, .logo, .formation are present */}
        awayTeam={awayTeamHeaderDataFromHook} {/* Assumes .name, .logo, .formation are present */}
        mode={mode}
        setMode={setMode}
        onToggleTracking={handleToggleTracking}
        onSave={handleSave}
      />

      {mode === 'piano' && eventsFromHook && (
        <div className="flex-grow overflow-hidden p-4">
          <PianoRoll
            events={eventsFromHook}
            // duration={matchDataFromHook.duration || 300}
          />
        </div>
      )}

      {mode === 'tracking' && eventsFromHook && (
         <MainTabContent
            matchId={matchDataFromHook.id}
            userRole={userRole || ''}
            events={eventsFromHook}
            homeTeamFull={homeTeamFull} // Uses local state, updated from hook data
            awayTeamFull={awayTeamFull} // Uses local state, updated from hook data
          />
      )}

      {/* Fallback for unhandled modes */}
      {mode !== 'piano' && mode !== 'tracking' && (
        <div className="container mx-auto p-4">
          <p>Selected mode: {mode}. No specific UI configured for this mode.</p>
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;
