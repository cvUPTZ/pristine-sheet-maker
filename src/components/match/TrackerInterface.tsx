"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TrackerPianoInput from '@/components/TrackerPianoInput';
import VoiceCollaboration from '@/components/match/VoiceCollaboration';
import TrackerVoiceInput from '@/components/TrackerVoiceInput'; // Added
import { useToast } from '@/components/ui/use-toast'; // Added
import MatchTimer from '@/components/MatchTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { PushNotificationService } from '@/services/pushNotificationService';
import useBatteryMonitor from '@/hooks/useBatteryMonitor';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';

interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  timer_status?: string | null;
  timer_current_value?: number | null;
  timer_last_started_at?: string | null;
}

// --- Types for Voice Input Assignments ---
interface Player {
  id: number;
  name: string;
  jersey_number: number | null;
}

interface AssignedPlayers {
  home: Player[];
  away: Player[];
}

interface AssignedEventType {
  key: string;
  label: string;
}
// --- End Types ---

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const isMobile = useIsMobile();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast(); // Added for handleRecordEvent

  // State for voice input assignments
  const [assignedPlayersForVoice, setAssignedPlayersForVoice] = useState<AssignedPlayers | null>(null);
  const [assignedEventTypesForVoice, setAssignedEventTypesForVoice] = useState<AssignedEventType[]>([]);
  const [isLoadingAssignmentsForVoice, setIsLoadingAssignmentsForVoice] = useState(true);
  
  // Initialize battery monitoring for this tracker
  const batteryStatus = useBatteryMonitor(trackerUserId);
  
  // Use the unified tracker connection system
  const { isConnected, broadcastStatus, cleanup } = useUnifiedTrackerConnection(matchId, trackerUserId);

  console.log('TrackerInterface: Render state', {
    isConnected,
    trackerUserId,
    matchId,
    batteryLevel: batteryStatus.level,
    loading,
    error
  });

  useEffect(() => {
    // Initialize push notifications
    PushNotificationService.initialize();
  }, []);

  useEffect(() => {
    if (!trackerUserId || !matchId) {
      setLoading(false);
      setError("Tracker user ID or Match ID is missing.");
      return;
    }

    async function fetchMatchInfo() {
      setLoading(true);
      setError(null);

      try {
        console.log('TrackerInterface: Fetching match info for:', matchId);
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Failed to fetch match data: ${matchError.message}`);
        }

        setMatchData(matchData);
        console.log('TrackerInterface: Match info loaded:', matchData);

      } catch (e: any) {
        console.error('TrackerInterface: Error fetching match info:', e);
        setError(e.message || "An unexpected error occurred while fetching match information.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchInfo();

    // Set up real-time subscription for timer updates
    const channel = supabase
      .channel(`match-timer-tracker-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          console.log('TrackerInterface: Timer update received:', payload.new);
          setMatchData(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackerUserId, matchId]);

  // --- Centralized Event Recording Function ---
  const handleRecordEvent = async (
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => {
    console.log("TrackerInterface: handleRecordEvent called with:", { eventTypeKey, playerId, teamContext, details });

    const eventToInsert = {
      match_id: matchId,
      event_type_key: eventTypeKey,
      player_id: playerId,
      created_by: trackerUserId,
      timestamp: new Date().toISOString(),
      details: { ...details, recorded_via_interface: true, team_context_from_input: teamContext },
    };

    console.log("Inserting event via TrackerInterface:", eventToInsert);

    const { error: dbError } = await supabase.from('match_events').insert([eventToInsert]);

    if (dbError) {
      console.error('Error recording event in TrackerInterface:', dbError);
      toast({
        title: 'Error Recording Event',
        description: dbError.message,
        variant: 'destructive',
      });
      throw dbError;
    } else {
      toast({
        title: 'Event Recorded Successfully',
        description: `${eventTypeKey} event recorded.`,
      });
    }
  };
  // --- End Centralized Event Recording ---

  // --- Fetch Assignments for Voice Input ---
  useEffect(() => {
    if (!matchId || !trackerUserId) return;

    const fetchAssignmentsForVoice = async () => {
      setIsLoadingAssignmentsForVoice(true);
      try {
        const { data: eventTypesData, error: eventTypesError } = await supabase
          .from('tracker_user_event_types')
          .select('event_type_key, event_types(label)')
          .eq('user_id', trackerUserId);

        if (eventTypesError) throw eventTypesError;
        setAssignedEventTypesForVoice(eventTypesData.map(item => ({
          key: item.event_type_key,
          label: item.event_types?.label || item.event_type_key,
        })));

        const { data: currentMatchData, error: matchDetailsError } = await supabase
          .from('matches')
          .select('home_team_id, away_team_id')
          .eq('id', matchId)
          .single();

        if (matchDetailsError) throw matchDetailsError;
        if (!currentMatchData) throw new Error("Match details not found for assignments.");

        const homeTeamId = currentMatchData.home_team_id;
        const awayTeamId = currentMatchData.away_team_id;

        // Fetch players from 'players' table and filter by team_id based on match's home/away team_id.
        // This assumes players have a direct team_id reference.
        // If player assignments are per-match via team_rosters, adjust accordingly.
        const { data: allPlayersData, error: playersError } = await supabase
          .from('players')
          .select('id, name, jersey_number, team_id');

        if (playersError) throw playersError;

        const homePlayersList: Player[] = [];
        const awayPlayersList: Player[] = [];

        allPlayersData.forEach(player => {
          if (player.team_id === homeTeamId) {
            homePlayersList.push({ id: player.id, name: player.name, jersey_number: player.jersey_number });
          } else if (player.team_id === awayTeamId) {
            awayPlayersList.push({ id: player.id, name: player.name, jersey_number: player.jersey_number });
          }
        });
        // This is a simplified player fetching. A more robust way would be via team_rosters for the specific match.
        // For now, this assumes players are generally part of teams and we filter by the match's team IDs.
        // If your schema uses team_rosters to link players to matches, that query would be better:
        // supabase.from('team_rosters').select('players(id, name, jersey_number, team_id)').eq('match_id', matchId);
        // Then distribute based on player.team_id matching homeTeamId/awayTeamId.
        // The current `TrackerVoiceInput` expects `assignedPlayers: { home: Player[], away: Player[] }`.
        // The example below will use a direct fetch from players and filter.
        // A more accurate fetch based on team_rosters might look like:
        // const { data: rosterPlayersData, error: rosterError } = await supabase
        // .from('team_rosters')
        // .select('players(id, name, jersey_number, team_id)')
        // .eq('match_id', matchId);
        // Then iterate rosterPlayersData... This is implemented in one of my earlier attempts, let's use that.

        const { data: rosterPlayersData, error: rosterError } = await supabase
          .from('team_rosters')
          .select('players(id, name, jersey_number, team_id)')
          .eq('match_id', matchId);

        if (rosterError) throw rosterError;

        const homePlayers: Player[] = [];
        const awayPlayers: Player[] = [];

        rosterPlayersData.forEach(entry => {
          const player = entry.players as any;
          if (player && player.team_id === homeTeamId) {
            homePlayers.push({ id: player.id, name: player.name, jersey_number: player.jersey_number });
          } else if (player && player.team_id === awayTeamId) {
            awayPlayers.push({ id: player.id, name: player.name, jersey_number: player.jersey_number });
          }
        });
        setAssignedPlayersForVoice({ home: homePlayers, away: awayPlayers });

      } catch (e: any) {
        console.error("Error fetching assignments for voice input:", e);
        toast({ title: 'Error Fetching Voice Assignments', description: e.message, variant: 'destructive' });
        setAssignedPlayersForVoice(null);
        setAssignedEventTypesForVoice([]);
      } finally {
        setIsLoadingAssignmentsForVoice(false);
      }
    };
    fetchAssignmentsForVoice();
  }, [matchId, trackerUserId, toast]);
  // --- End Fetch Assignments ---

  // Enhanced status broadcasting with battery and network info
  useEffect(() => {
    if (!trackerUserId || !matchId || !isConnected) {
      console.log('TrackerInterface: Skipping status broadcast', { 
        trackerUserId, 
        matchId, 
        isConnected 
      });
      return;
    }
    
    const getNetworkQuality = (): 'excellent' | 'good' | 'poor' => {
      const connection = (navigator as any).connection;
      if (!connection) return 'good';
      
      if (connection.effectiveType === '4g') return 'excellent';
      if (connection.effectiveType === '3g') return 'good';
      return 'poor';
    };

    // Set up periodic activity updates every 15 seconds
    console.log('TrackerInterface: Setting up periodic status broadcasts');
    intervalRef.current = setInterval(() => {
      console.log('TrackerInterface: Periodic status broadcast');
      broadcastStatus({
        status: 'active',
        timestamp: Date.now(),
        battery_level: batteryStatus.level || undefined,
        network_quality: getNetworkQuality()
      });
    }, 15000);

    return () => {
      console.log('TrackerInterface: Cleaning up status broadcasting');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackerUserId, matchId, isConnected, broadcastStatus, batteryStatus.level]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('TrackerInterface: Component unmounting, cleaning up');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cleanup();
    };
  }, [cleanup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8 min-h-[200px]">
        <div className="text-center">
          <div className="text-sm sm:text-base">Loading tracker interface...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-red-600 text-sm sm:text-base">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchName = matchData?.name || `${matchData?.home_team_name} vs ${matchData?.away_team_name}`;

  return (
    <div className="container mx-auto p-1 sm:p-2 lg:p-4 max-w-6xl">
      <Card className="mb-3 sm:mb-6">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">
            Match Tracking Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-1 sm:space-y-2">
            <p className="text-sm sm:text-base lg:text-lg font-medium truncate">
              {matchName}
            </p>
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>Tracker: {trackerUserId}</span>
              <span>Match: {matchId}</span>
              <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                Status: {isConnected ? 'Connected' : 'Connecting...'}
              </span>
              {batteryStatus.level !== null && (
                <span className={`font-medium ${batteryStatus.level <= 20 ? 'text-red-600' : 'text-green-600'}`}>
                  Battery: {batteryStatus.level}% {batteryStatus.charging ? '⚡' : '🔋'}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Timer Display */}
      {matchData && (
        <div className="mb-3 sm:mb-6">
          <MatchTimer
            dbTimerValue={matchData.timer_current_value}
            timerStatus={matchData.timer_status}
            timerLastStartedAt={matchData.timer_last_started_at}
            timerPeriod="first_half"
            timerAddedTime={0}
          />
        </div>
      )}

      {/* Voice Collaboration */}
      <div className="mb-3 sm:mb-6">
        <VoiceCollaboration
          matchId={matchId}
          userId={trackerUserId}
        />
      </div>
      
      <div className="w-full">
        <TrackerPianoInput
          matchId={matchId}
          onRecordEvent={handleRecordEvent}
        />
      </div>

      {/* TrackerVoiceInput Integration */}
      <div className="w-full mt-6"> {/* Added margin-top for spacing */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Input Module</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAssignmentsForVoice ? (
              <p className="text-center text-gray-500">Loading voice input assignments...</p>
            ) : assignedPlayersForVoice && assignedEventTypesForVoice.length > 0 ? (
              <TrackerVoiceInput
                matchId={matchId}
                trackerUserId={trackerUserId}
                assignedPlayers={assignedPlayersForVoice}
                assignedEventTypes={assignedEventTypesForVoice}
                onRecordEvent={handleRecordEvent}
              />
            ) : (
              <p className="text-center text-red-500">Voice input assignments could not be loaded or are not available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
