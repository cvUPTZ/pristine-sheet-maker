import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import TrackerAssignment from '@/components/match/TrackerAssignment';
import MainTabContentV2 from '@/components/match/MainTabContentV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PianoInput } from '@/components/match/PianoInput';
import { EventType } from '@/types/matchForm';
import { PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';

const MatchAnalysisV2: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
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

      // Construct full match roster
      const homePlayers = matchData.home_team_players || [];
      const awayPlayers = matchData.away_team_players || [];
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
    if (!matchId) {
      console.error("Match ID is missing.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tracker assignments",
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        console.log("No tracker assignments found for this match.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        return;
      }

      // Aggregate assigned event types
      const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types)));
      const assignedEventTypesData: EventType[] = eventTypes.map(key => ({ key, label: key }));
      setAssignedEventTypes(assignedEventTypesData);

      // Aggregate assigned players
      const homePlayers: PlayerForPianoInput[] = [];
      const awayPlayers: PlayerForPianoInput[] = [];

      data.forEach(assignment => {
        if (assignment.player_team_id === 'home') {
          const player = fullMatchRoster?.home?.find(p => p.id === assignment.player_id);
          if (player && !homePlayers.some(p => p.id === player.id)) {
            homePlayers.push(player);
          }
        } else if (assignment.player_team_id === 'away') {
          const player = fullMatchRoster?.away?.find(p => p.id === assignment.player_id);
          if (player && !awayPlayers.some(p => p.id === player.id)) {
            awayPlayers.push(player);
          }
        }
      });

      setAssignedPlayers({ home: homePlayers, away: awayPlayers });

    } catch (error: any) {
      console.error("Error fetching tracker assignments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tracker assignments",
        variant: "destructive",
      });
    }
  }, [matchId, toast, fullMatchRoster]);

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
    if (!matchId) {
      console.error("Match ID is missing.");
      toast({
        title: "Error",
        description: "Match ID is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const eventData = {
        match_id: matchId || '',
        event_type: eventType.key,
        timestamp: Date.now(),
        player_id: player?.id || null,
        team: player ? (assignedPlayers?.home?.some(p => p.id === player.id) ? 'home' : 'away') : null,
        coordinates: details?.coordinates || null,
      };

      const { data, error } = await supabase
        .from('match_events')
        .insert([eventData]);

      if (error) {
        console.error("Error recording event:", error);
        toast({
          title: "Error",
          description: "Failed to record event",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Event Recorded",
        description: `Event ${eventType.label} recorded successfully.`,
      });

    } catch (error: any) {
      console.error("Error recording event:", error);
      toast({
        title: "Error",
        description: "Failed to record event",
        variant: "destructive",
      });
    }
  };

  if (!matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center">
            <p className="text-lg font-semibold">Match ID is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <MatchHeader
        mode={mode}
        setMode={setMode}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        handleToggleTracking={handleToggleTracking}
        handleSave={handleSave}
      />

      <Tabs defaultValue="main" className="w-full">
        <TabsList>
          <TabsTrigger value="main">Main</TabsTrigger>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="main" className="mt-4">
          <MainTabContentV2
            matchId={matchId}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            isTracking={isTracking}
            onEventRecord={handleEventRecord}
          />
        </TabsContent>
        <TabsContent value="tracker" className="mt-4">
          <Card>
            <CardContent>
              <TrackerAssignment
                matchId={matchId}
                homeTeamPlayers={fullMatchRoster?.home || []}
                awayTeamPlayers={fullMatchRoster?.away || []}
              />
            </CardContent>
          </Card>
          <Separator className="my-4" />
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold mb-4">Piano Input</h2>
              <PianoInput
                fullMatchRoster={fullMatchRoster}
                assignedEventTypes={assignedEventTypes}
                assignedPlayers={assignedPlayers}
                onEventRecord={handleEventRecord}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatchAnalysisV2;
