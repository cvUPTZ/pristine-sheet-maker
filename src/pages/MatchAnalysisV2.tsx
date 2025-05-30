import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import TrackerAssignment from '@/components/match/TrackerAssignment';
import MainTabContentV2 from '@/components/match/MainTabContentV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TrackerPianoInput from '@/components/TrackerPianoInput';
import { EventType } from '@/types/matchForm';
import { PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';

const MatchAnalysisV2: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { userRole, user } = useAuth();
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [homeTeam, setHomeTeam] = useState({ name: 'Home Team', formation: '4-4-2' });
  const [awayTeam, setAwayTeam] = useState({ name: 'Away Team', formation: '4-3-3' });
  const [isTracking, setIsTracking] = useState(false);
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[] | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null);
  const { toast } = useToast();

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
      const assignedEventTypesData: EventType[] = eventTypes
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

  const handleEventRecord = async (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => {
    console.log('handleEventRecord called with:', { 
      eventType, 
      player, 
      details, 
      user: user?.id,
      matchId 
    });
    
    if (!matchId) {
      console.error("Match ID is missing.");
      throw new Error("Match ID is missing");
    }

    if (!user?.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    if (!eventType) {
      console.error("Event type is missing");
      throw new Error("Event type is missing");
    }

    try {
      // Determine team context
      let teamContext = null;
      if (player && assignedPlayers) {
        if (assignedPlayers.home?.some(p => p.id === player.id)) {
          teamContext = 'home';
        } else if (assignedPlayers.away?.some(p => p.id === player.id)) {
          teamContext = 'away';
        }
      }

      // Ensure player_id is properly converted to integer or null
      const playerId = player ? parseInt(String(player.id), 10) : null;
      
      // Validate player_id is a valid integer
      if (player && (isNaN(playerId!) || playerId === null)) {
        console.error("Invalid player ID:", player.id);
        throw new Error("Invalid player ID");
      }

      // Use seconds since epoch for timestamp to fit in bigint
      const timestampInSeconds = Math.floor(Date.now() / 1000);

      const eventData = {
        match_id: matchId,
        event_type: eventType.key,
        timestamp: timestampInSeconds,
        player_id: playerId,
        team: teamContext,
        coordinates: details?.coordinates || null,
        created_by: user.id
      };

      console.log('Inserting event data:', eventData);
      console.log('Data types:', {
        match_id: typeof eventData.match_id,
        event_type: typeof eventData.event_type,
        timestamp: typeof eventData.timestamp,
        player_id: typeof eventData.player_id,
        team: typeof eventData.team,
        created_by: typeof eventData.created_by
      });

      const { data, error } = await supabase
        .from('match_events')
        .insert([eventData])
        .select();

      if (error) {
        console.error("Error recording event:", error);
        throw new Error(`Failed to record event: ${error.message}`);
      }

      console.log('Event recorded successfully:', data);
      
    } catch (error: any) {
      console.error("Error in handleEventRecord:", error);
      throw error;
    }
  };

  if (!matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-lg font-semibold">Match ID is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine available tabs based on user role
  const isAdmin = userRole === 'admin';
  const defaultTab = isAdmin ? 'main' : 'piano';

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
      <MatchHeader
        mode={mode}
        setMode={setMode}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        handleToggleTracking={handleToggleTracking}
        handleSave={handleSave}
      />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 h-auto p-1">
          {isAdmin && <TabsTrigger value="main" className="text-xs sm:text-sm py-2">Main</TabsTrigger>}
          <TabsTrigger value="piano" className="text-xs sm:text-sm py-2">Piano Input</TabsTrigger>
          {isAdmin && <TabsTrigger value="tracker" className="text-xs sm:text-sm py-2">Assign Tracker</TabsTrigger>}
        </TabsList>
        
        {isAdmin && (
          <TabsContent value="main" className="mt-2 sm:mt-4">
            <MainTabContentV2
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              isTracking={isTracking}
              onEventRecord={handleEventRecord}
            />
          </TabsContent>
        )}
        
        <TabsContent value="piano" className="mt-2 sm:mt-4">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Piano Input</h2>
              <TrackerPianoInput
                matchId={matchId}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="tracker" className="mt-2 sm:mt-4">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <TrackerAssignment
                  matchId={matchId}
                  homeTeamPlayers={fullMatchRoster?.home || []}
                  awayTeamPlayers={fullMatchRoster?.away || []}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MatchAnalysisV2;
