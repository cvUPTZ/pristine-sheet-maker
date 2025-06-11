import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import TrackerAssignment from '@/components/match/TrackerAssignment';
import MainTabContentV2 from '@/components/match/MainTabContentV2';
import VoiceCollaboration from '@/components/match/VoiceCollaboration';
import MatchPlanningNetwork from '@/components/match/MatchPlanningNetwork';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TrackerPianoInput from '@/components/TrackerPianoInput';
import { TrackerVoiceInput } from '@/components/TrackerVoiceInput';
import { EventType as LocalEventType } from '@/types/matchForm'; // Renamed to avoid conflict
import { EventType as AppEventType } from '@/types'; // Added for global EventType
import { MatchSpecificEventData, ShotEventData, PassEventData, TackleEventData, FoulCommittedEventData, CardEventData, SubstitutionEventData, GenericEventData } from '@/types/eventData';
import { PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { useIsMobile, useBreakpoint } from '@/hooks/use-mobile';

// Type for TrackerVoiceInput players
interface VoiceInputPlayer {
  id: number;
  name: string;
  jersey_number: number | null;
}

interface VoiceInputAssignedPlayers {
  home: VoiceInputPlayer[];
  away: VoiceInputPlayer[];
}

const MatchAnalysisV2: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { userRole, user } = useAuth();
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [homeTeam, setHomeTeam] = useState({ name: 'Home Team', formation: '4-4-2' });
  const [awayTeam, setAwayTeam] = useState({ name: 'Away Team', formation: '4-3-3' });
  const [isTracking, setIsTracking] = useState(false);
  const [assignedEventTypes, setAssignedEventTypes] = useState<LocalEventType[] | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isSmall = useBreakpoint('sm');

  // Convert PlayerForPianoInput to VoiceInputPlayer format
  const convertPlayersForVoiceInput = (players: AssignedPlayers): VoiceInputAssignedPlayers => {
    return {
      home: players.home.map(player => ({
        id: Number(player.id),
        name: player.player_name,
        jersey_number: player.jersey_number
      })),
      away: players.away.map(player => ({
        id: Number(player.id),
        name: player.player_name,
        jersey_number: player.jersey_number
      }))
    };
  };

  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) {
      console.error("Match ID is missing.");
      return;
    }

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('home_team_name, away_team_name, home_team_formation, away_team_formation, home_team_players, away_team_players')
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error("Error fetching match details:", matchError);
        toast({
          title: "Error",
          description: "Failed to fetch match details",
          variant: "destructive",
        });
        return;
      }

      setHomeTeam({
        name: matchData.home_team_name,
        formation: matchData.home_team_formation || '4-4-2'
      });

      setAwayTeam({
        name: matchData.away_team_name,
        formation: matchData.away_team_formation || '4-3-3'
      });

      // Parse player data safely
      const parsePlayerData = (data: any): PlayerForPianoInput[] => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        return Array.isArray(data) ? data : [];
      };

      const homePlayers = parsePlayerData(matchData.home_team_players);
      const awayPlayers = parsePlayerData(matchData.away_team_players);
      setFullMatchRoster({ home: homePlayers, away: awayPlayers });

    } catch (error: any) {
      console.error("Error fetching match details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch match details",
        variant: "destructive",
      });
    }
  }, [matchId, toast]);

  const fetchTrackerAssignments = useCallback(async () => {
    if (!matchId || !user?.id) {
      console.error("Match ID or user ID is missing.");
      return;
    }

    try {
      console.log('Fetching tracker assignments for:', { matchId, userId: user.id });
      
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tracker assignments",
          variant: "destructive",
        });
        return;
      }

      console.log('Tracker assignments data:', data);

      if (!data || data.length === 0) {
        console.log("No tracker assignments found for this user and match.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        return;
      }

      // Aggregate assigned event types
      const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types || [])));
      const assignedEventTypesData: LocalEventType[] = eventTypes
        .filter(key => key)
        .map(key => ({ key, label: key }));
      setAssignedEventTypes(assignedEventTypesData);
      console.log('Assigned event types:', assignedEventTypesData);

      // Aggregate assigned players
      const homePlayers: PlayerForPianoInput[] = [];
      const awayPlayers: PlayerForPianoInput[] = [];

      data.forEach(assignment => {
        if (assignment.player_team_id === 'home') {
          const player = fullMatchRoster?.home?.find(p => String(p.id) === String(assignment.player_id));
          if (player && !homePlayers.some(p => p.id === player.id)) {
            homePlayers.push(player);
          }
        } else if (assignment.player_team_id === 'away') {
          const player = fullMatchRoster?.away?.find(p => String(p.id) === String(assignment.player_id));
          if (player && !awayPlayers.some(p => p.id === player.id)) {
            awayPlayers.push(player);
          }
        }
      });

      setAssignedPlayers({ home: homePlayers, away: awayPlayers });
      console.log('Assigned players:', { home: homePlayers, away: awayPlayers });

    } catch (error: any) {
      console.error("Error fetching tracker assignments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tracker assignments",
        variant: "destructive",
      });
    }
  }, [matchId, user?.id, toast, fullMatchRoster]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  useEffect(() => {
    if (fullMatchRoster) {
      fetchTrackerAssignments();
    }
  }, [fetchTrackerAssignments, fullMatchRoster]);

  const handleToggleTracking = () => {
    setIsTracking(!isTracking);
  };

  const handleSave = () => {
    toast({
      title: "Match Saved",
      description: "Your match progress has been saved.",
    });
  };

  // Centralized event recording function for MatchAnalysisV2
  const handleRecordEvent = async (
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => {
    console.log("MatchAnalysisV2: handleRecordEvent called with:", { eventTypeKey, playerId, teamContext, details });

    if (!matchId) {
      console.error("Match ID is missing.");
      throw new Error("Match ID is missing");
    }

    if (!user?.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    if (!eventTypeKey) {
      console.error("Event type is missing");
      throw new Error("Event type is missing");
    }

    try {
      const eventToInsert = {
        match_id: matchId,
        event_type: eventTypeKey,
        player_id: playerId,
        created_by: user.id,
        timestamp: Math.floor(Date.now() / 1000),
        team: teamContext,
        coordinates: details?.coordinates || null,
        event_data: { ...details, recorded_via_interface: true, team_context_from_input: teamContext },
      };

      console.log("Inserting event via MatchAnalysisV2:", eventToInsert);

      const { error: dbError } = await supabase.from('match_events').insert([eventToInsert]);

      if (dbError) {
        console.error('Error recording event in MatchAnalysisV2:', dbError);
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
    } catch (error: any) {
      console.error("Error in handleRecordEvent:", error);
      throw error;
    }
  };

  if (!matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-4 sm:p-6">
            <p className="text-base sm:text-lg font-semibold">Match ID is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine available tabs based on user role
  const isAdmin = userRole === 'admin';
  const defaultTab = isAdmin ? 'main' : 'piano';

  return (
    <div className="container mx-auto p-1 sm:p-2 lg:p-4 max-w-7xl">
      <div className="mb-3 sm:mb-4">
        <MatchHeader
          mode={mode}
          setMode={setMode}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          handleToggleTracking={handleToggleTracking}
          handleSave={handleSave}
        />
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className={`
          grid w-full gap-1 h-auto p-1 mb-3 sm:mb-4
          ${isAdmin 
            ? (isMobile ? "grid-cols-2" : isSmall ? "grid-cols-2" : "grid-cols-4")
            : "grid-cols-1"
          }
        `}>
          {isAdmin && (
            <TabsTrigger 
              value="main" 
              className="text-xs sm:text-sm py-2 px-2 sm:px-4"
            >
              {isMobile ? "Main" : "Main Dashboard"}
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="piano" 
            className="text-xs sm:text-sm py-2 px-2 sm:px-4"
          >
            {isMobile ? "Piano" : "Piano Input"}
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger 
                value="planning" 
                className="text-xs sm:text-sm py-2 px-2 sm:px-4"
              >
                {isMobile ? "Plan" : "Planning"}
              </TabsTrigger>
              <TabsTrigger 
                value="tracker" 
                className="text-xs sm:text-sm py-2 px-2 sm:px-4"
              >
                {isMobile ? "Assign" : "Assign Tracker"}
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        {isAdmin && (
          <TabsContent value="main" className="mt-2 sm:mt-4">
            <MainTabContentV2
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              isTracking={isTracking}
              onEventRecord={handleRecordEvent}
            />
          </TabsContent>
        )}
        
        <TabsContent value="piano" className="mt-2 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            {/* Voice Collaboration for Piano Input */}
            {user?.id && (
              <VoiceCollaboration
                matchId={matchId}
                userId={user.id}
              />
            )}
            
            <Card>
              <CardContent className="p-2 sm:p-3 lg:p-6">
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4">
                  Piano Input
                </h2>
                <TrackerPianoInput 
                  matchId={matchId} 
                  onRecordEvent={handleRecordEvent}
                />
              </CardContent>
            </Card>

            {/* Voice Input */}
            {assignedPlayers && assignedEventTypes && (
              <Card>
                <CardContent className="p-2 sm:p-3 lg:p-6">
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4">
                    Voice Input
                  </h2>
                  <TrackerVoiceInput
                    trackerUserId={user?.id || ''}
                    assignedPlayers={convertPlayersForVoiceInput(assignedPlayers)}
                    assignedEventTypes={assignedEventTypes}
                    onRecordEvent={handleRecordEvent}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="planning" className="mt-2 sm:mt-4">
              <MatchPlanningNetwork 
                matchId={matchId}
                width={isMobile ? 350 : 800}
                height={isMobile ? 400 : 600}
              />
            </TabsContent>
            
            <TabsContent value="tracker" className="mt-2 sm:mt-4">
              <Card>
                <CardContent className="p-2 sm:p-3 lg:p-6">
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3 lg:mb-4">
                    Tracker Assignment
                  </h2>
                  <TrackerAssignment
                    matchId={matchId}
                    homeTeamPlayers={fullMatchRoster?.home || []}
                    awayTeamPlayers={fullMatchRoster?.away || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default MatchAnalysisV2;
