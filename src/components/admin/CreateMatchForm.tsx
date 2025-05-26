
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Team, Formation } from '@/types';
import TeamSetupWithFormation from '@/components/TeamSetupWithFormation';

interface CreateMatchFormProps {
  onMatchCreated: () => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [matchData, setMatchData] = useState({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    matchDate: ''
  });
  
  const [teams, setTeams] = useState<{ home: Team | null; away: Team | null }>({
    home: null,
    away: null
  });

  const handleInputChange = (field: string, value: string) => {
    setMatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamsChange = (updatedTeams: { home: Team; away: Team }) => {
    setTeams(updatedTeams);
    setMatchData(prev => ({
      ...prev,
      homeTeamName: updatedTeams.home.name,
      awayTeamName: updatedTeams.away.name
    }));
  };

  const notifyTrackers = async (matchId: string, matchName: string) => {
    try {
      // Get all trackers
      const { data: trackers, error: trackersError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      if (trackers && trackers.length > 0) {
        // Create notifications for all trackers
        const notifications = trackers.map(tracker => ({
          match_id: matchId,
          tracker_id: tracker.user_id,
          message: `New match "${matchName}" has been created and is ready for tracking.`,
        }));

        const { error: notificationError } = await supabase
          .from('match_notifications')
          .insert(notifications);

        if (notificationError) throw notificationError;

        toast.success(`Match created and ${trackers.length} tracker(s) notified.`);
      } else {
        toast.success('Match created successfully.');
      }
    } catch (error: any) {
      console.error('Error notifying trackers:', error);
      toast.error('Match created but failed to notify trackers.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchData.name || !matchData.homeTeamName || !matchData.awayTeamName) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!teams.home || !teams.away) {
      toast.error('Please set up both teams with formations and players.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          name: matchData.name,
          description: matchData.description,
          home_team_name: matchData.homeTeamName,
          away_team_name: matchData.awayTeamName,
          home_team_formation: teams.home.formation,
          away_team_formation: teams.away.formation,
          home_team_players: teams.home.players,
          away_team_players: teams.away.players,
          match_date: matchData.matchDate ? new Date(matchData.matchDate).toISOString() : null,
          status: 'published'
        })
        .select()
        .single();

      if (error) throw error;

      // Notify trackers about the new match
      await notifyTrackers(match.id, match.name || 'Unnamed Match');

      // Reset form
      setMatchData({
        name: '',
        description: '',
        homeTeamName: '',
        awayTeamName: '',
        matchDate: ''
      });
      setTeams({ home: null, away: null });

      onMatchCreated();
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="teams">Teams & Formation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="matchName">Match Name *</Label>
                  <Input
                    id="matchName"
                    value={matchData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Barcelona vs Real Madrid"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="matchDate">Match Date</Label>
                  <Input
                    id="matchDate"
                    type="datetime-local"
                    value={matchData.matchDate}
                    onChange={(e) => handleInputChange('matchDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeTeam">Home Team Name *</Label>
                  <Input
                    id="homeTeam"
                    value={matchData.homeTeamName}
                    onChange={(e) => handleInputChange('homeTeamName', e.target.value)}
                    placeholder="Home team name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="awayTeam">Away Team Name *</Label>
                  <Input
                    id="awayTeam"
                    value={matchData.awayTeamName}
                    onChange={(e) => handleInputChange('awayTeamName', e.target.value)}
                    placeholder="Away team name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={matchData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional match description"
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="teams">
              <TeamSetupWithFormation
                teams={teams}
                onTeamsChange={handleTeamsChange}
                onConfirm={() => {}} // Not used in this context
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Match'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
