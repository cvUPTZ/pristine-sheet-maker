
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { eventTypes } from '@/constants/eventTypes';
import { Undo2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackerPianoInputProps {
  matchId: string;
  trackerId: string;
}

interface RecentAction {
  id: string;
  event_type: string;
  timestamp: Date;
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId, trackerId }) => {
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchTeamPlayers();
    fetchRecentActions();
  }, [matchId]);

  const fetchTeamPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('home_team_formation, away_team_formation')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      // Parse team formations to get players
      const homeFormation = data.home_team_formation ? JSON.parse(data.home_team_formation) : { players: [] };
      const awayFormation = data.away_team_formation ? JSON.parse(data.away_team_formation) : { players: [] };

      setHomeTeamPlayers(homeFormation.players || []);
      setAwayTeamPlayers(awayFormation.players || []);
    } catch (error) {
      console.error('Error fetching team players:', error);
    }
  };

  const fetchRecentActions = async () => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('id, event_type, created_at')
        .eq('match_id', matchId)
        .eq('created_by', trackerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const actions = (data || []).map(event => ({
        id: event.id,
        event_type: event.event_type,
        timestamp: new Date(event.created_at)
      }));

      setRecentActions(actions);
    } catch (error) {
      console.error('Error fetching recent actions:', error);
    }
  };

  const handleEventSubmit = async () => {
    if (!selectedEventType) {
      toast({
        title: "Error",
        description: "Please select an event type",
        variant: "destructive",
      });
      return;
    }

    try {
      const eventData = {
        match_id: matchId,
        event_type: selectedEventType,
        team: selectedTeam || null,
        player_id: selectedPlayer,
        created_by: trackerId,
        coordinates: null, // Piano input doesn't include coordinates
        timestamp: Date.now()
      };

      const { data, error } = await supabase
        .from('match_events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Event Recorded",
        description: `${selectedEventType} event has been recorded`,
      });

      // Reset form
      setSelectedEventType('');
      setSelectedTeam('');
      setSelectedPlayer(null);

      // Refresh recent actions
      fetchRecentActions();
    } catch (error) {
      console.error('Error recording event:', error);
      toast({
        title: "Error",
        description: "Failed to record event",
        variant: "destructive",
      });
    }
  };

  const handleUndoLastAction = async () => {
    if (recentActions.length === 0) {
      toast({
        title: "No Actions",
        description: "No recent actions to undo",
        variant: "destructive",
      });
      return;
    }

    try {
      const lastAction = recentActions[0];
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', lastAction.id);

      if (error) throw error;

      toast({
        title: "Action Undone",
        description: `${lastAction.event_type} event has been removed`,
      });

      // Refresh recent actions
      fetchRecentActions();
    } catch (error) {
      console.error('Error undoing action:', error);
      toast({
        title: "Error",
        description: "Failed to undo action",
        variant: "destructive",
      });
    }
  };

  const getPlayersForTeam = (team: string) => {
    return team === 'home' ? homeTeamPlayers : awayTeamPlayers;
  };

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto p-2 sm:p-4">
      {/* Undo Button - Fixed Position */}
      <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-50">
        <Button
          onClick={handleUndoLastAction}
          disabled={recentActions.length === 0}
          variant="destructive"
          size={isMobile ? "sm" : "default"}
          className="shadow-lg"
        >
          <Undo2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {isMobile ? "Undo" : "Annuler Dernière Action"}
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">Piano Input - Event Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
          {/* Event Type Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {eventTypes.map((eventType) => (
              <Button
                key={eventType.id}
                variant={selectedEventType === eventType.id ? "default" : "outline"}
                onClick={() => setSelectedEventType(eventType.id)}
                className="h-auto p-2 sm:p-3 flex flex-col items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <span className="text-lg sm:text-xl">{eventType.icon}</span>
                <span className="text-center leading-tight">{eventType.name}</span>
              </Button>
            ))}
          </div>

          {/* Team Selection */}
          {selectedEventType && (
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-medium">Select Team:</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  variant={selectedTeam === 'home' ? "default" : "outline"}
                  onClick={() => {
                    setSelectedTeam('home');
                    setSelectedPlayer(null);
                  }}
                  className="text-sm sm:text-base"
                  size={isMobile ? "sm" : "default"}
                >
                  Home Team
                </Button>
                <Button
                  variant={selectedTeam === 'away' ? "default" : "outline"}
                  onClick={() => {
                    setSelectedTeam('away');
                    setSelectedPlayer(null);
                  }}
                  className="text-sm sm:text-base"
                  size={isMobile ? "sm" : "default"}
                >
                  Away Team
                </Button>
              </div>
            </div>
          )}

          {/* Player Selection */}
          {selectedTeam && (
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-medium">Select Player (Optional):</label>
              <Select 
                value={selectedPlayer?.toString() || ''} 
                onValueChange={(value) => setSelectedPlayer(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  {getPlayersForTeam(selectedTeam).map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      #{player.number} - {player.name} ({player.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleEventSubmit}
            disabled={!selectedEventType}
            className="w-full text-sm sm:text-base"
            size={isMobile ? "sm" : "default"}
          >
            Record Event
          </Button>

          {/* Recent Actions */}
          {recentActions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm sm:text-base font-medium">Recent Actions:</h3>
              <div className="space-y-1 sm:space-y-2">
                {recentActions.map((action, index) => (
                  <div key={action.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs sm:text-sm">
                    <span>{action.event_type}</span>
                    <Badge variant="outline" className="text-xs">
                      {action.timestamp.toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerPianoInput;
