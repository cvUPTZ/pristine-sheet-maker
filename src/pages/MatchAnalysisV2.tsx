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
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import TrackerPianoInput from '@/components/TrackerPianoInput';
import { TrackerVoiceInput } from '@/components/TrackerVoiceInput';
import { EventType as LocalEventType } from '@/types/matchForm';
import { EventType as AppEventType } from '@/types';
import { MatchSpecificEventData, ShotEventData, PassEventData, TackleEventData, FoulCommittedEventData, CardEventData, SubstitutionEventData, GenericEventData } from '@/types/eventData';
import { PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { useIsMobile, useBreakpoint } from '@/hooks/use-mobile';
import { Activity, Piano, Users, Settings, Mic, Zap } from 'lucide-react';

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

  const isAdmin = userRole === 'admin';
  const [activeView, setActiveView] = useState(isAdmin ? 'main' : 'piano');

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Match Not Found</p>
            <p className="text-sm text-gray-500">The match ID is missing or invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex w-full">
        <MatchAnalysisSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset>
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {/* Modern Header */}
            <div className="flex items-center gap-4 mb-8">
              <SidebarTrigger />
              <div className="flex-grow">
                <MatchHeader
                  mode={mode}
                  setMode={setMode}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  handleToggleTracking={handleToggleTracking}
                  handleSave={handleSave}
                />
              </div>
            </div>

            {/* Content based on activeView */}
            {activeView === 'main' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <MainTabContentV2
                      matchId={matchId}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      isTracking={isTracking}
                      onEventRecord={handleRecordEvent}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === 'piano' && (
              <div className="space-y-6 animate-fade-in">
                {/* Voice Collaboration Card */}
                {user?.id && (
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Voice Collaboration</h3>
                          <p className="text-sm text-gray-500">Real-time voice communication</p>
                        </div>
                      </div>
                      <VoiceCollaboration
                        matchId={matchId}
                        userId={user.id}
                      />
                    </CardContent>
                  </Card>
                )}
                
                {/* Piano Input Card */}
                <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Piano className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Piano Input</h3>
                        <p className="text-sm text-gray-500">Quick event recording interface</p>
                      </div>
                    </div>
                    <TrackerPianoInput 
                      matchId={matchId} 
                      onRecordEvent={handleRecordEvent}
                    />
                  </CardContent>
                </Card>

                {/* Voice Input Card */}
                {assignedPlayers && assignedEventTypes && (
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Voice Input</h3>
                          <p className="text-sm text-gray-500">Voice-activated event recording</p>
                        </div>
                      </div>
                      <TrackerVoiceInput
                        assignedPlayers={convertPlayersForVoiceInput(assignedPlayers)}
                        assignedEventTypes={assignedEventTypes}
                        onRecordEvent={handleRecordEvent}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeView === 'planning' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Planning Network</h3>
                        <p className="text-sm text-gray-500">Visualize tracker relationships and assignments</p>
                      </div>
                    </div>
                    <MatchPlanningNetwork 
                      matchId={matchId}
                      width={isMobile ? 350 : 800}
                      height={isMobile ? 400 : 600}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
              
            {activeView === 'tracker' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Tracker Assignment</h3>
                        <p className="text-sm text-gray-500">Manage and assign tracker responsibilities</p>
                      </div>
                    </div>
                    <TrackerAssignment
                      matchId={matchId}
                      homeTeamPlayers={fullMatchRoster?.home || []}
                      awayTeamPlayers={fullMatchRoster?.away || []}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MatchAnalysisV2;
