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
  name: string;
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_formation: string | null;
  away_team_formation: string | null;
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

  // Feature flag for collaboration
  const DISABLE_COLLABORATION_FEATURE = true;

  let sendCollaborationEvent = (...args: any[]) => {
    console.warn('Collaboration feature is disabled. sendEvent called but did nothing.', args);
  };

  if (!DISABLE_COLLABORATION_FEATURE) {
    const collaborationHookResult = useMatchCollaboration({
      matchId: matchId,
      userId: user?.id,
    });
    sendCollaborationEvent = collaborationHookResult.sendEvent;
  } else {
    console.log('[MatchAnalysis] Real-time collaboration feature is currently disabled for testing.');
  }

  const [match, setMatch] = useState<MatchData | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team>({ name: 'Home Team', formation: '4-3-3' });
  const [awayTeam, setAwayTeam] = useState<Team>({ name: 'Away Team', formation: '4-4-2' });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

      // Simulate event data for now
      setEvents([
        { id: '1', timestamp: 10, type: 'Goal' },
        { id: '2', timestamp: 25, type: 'Foul' },
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const timelineEvents = useMemo(() => {
    return events.map(event => ({
      time: event.timestamp,
      label: event.type,
    }));
  }, [events]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading match details...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>{error || 'Match not found or access denied.'}</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <MatchHeader
        matchName={match.name}
        matchStatus={match.status}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
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
    </div>
  );
};

export default MatchAnalysis;
