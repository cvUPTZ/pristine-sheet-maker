
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Player, MatchFormData } from '@/types';

interface CreateMatchFormProps {
  onMatchCreated?: (newMatch: any) => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const [formData, setFormData] = useState<MatchFormData>({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    venue: '',
    competition: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const defaultPlayers: Player[] = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        player_name: `Player ${i + 1}`,
        position: i === 0 ? 'GK' : i <= 4 ? 'DEF' : i <= 8 ? 'MID' : 'FWD',
        number: i + 1,
        jersey_number: i + 1
      }));

      const matchData = {
        name: formData.name,
        description: formData.description,
        home_team_name: formData.homeTeamName,
        away_team_name: formData.awayTeamName,
        home_team_formation: '4-4-2',
        away_team_formation: '4-4-2',
        home_team_players: JSON.stringify(defaultPlayers),
        away_team_players: JSON.stringify(defaultPlayers),
        venue: formData.venue,
        competition: formData.competition,
        status: 'scheduled'
      };

      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Match created successfully!');
      
      if (onMatchCreated) {
        onMatchCreated(data);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        homeTeamName: '',
        awayTeamName: '',
        venue: '',
        competition: ''
      });

    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Match Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter match name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="competition">Competition</Label>
              <Input
                id="competition"
                value={formData.competition || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, competition: e.target.value }))}
                placeholder="Enter competition name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="homeTeam">Home Team</Label>
              <Input
                id="homeTeam"
                value={formData.homeTeamName}
                onChange={(e) => setFormData(prev => ({ ...prev, homeTeamName: e.target.value }))}
                placeholder="Enter home team name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="awayTeam">Away Team</Label>
              <Input
                id="awayTeam"
                value={formData.awayTeamName}
                onChange={(e) => setFormData(prev => ({ ...prev, awayTeamName: e.target.value }))}
                placeholder="Enter away team name"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              placeholder="Enter venue"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter match description (optional)"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Match'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
