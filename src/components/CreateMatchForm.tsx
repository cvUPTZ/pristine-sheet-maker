
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Team, Player, MatchFormData } from '@/types/index';
import TrackerAssignment from '@/components/match/TrackerAssignment';

const createMatchSchema = z.object({
  name: z.string().min(1, 'Match name is required'),
  description: z.string().optional(),
  homeTeamName: z.string().min(1, 'Home team name is required'),
  awayTeamName: z.string().min(1, 'Away team name is required'),
  homeTeamPlayers: z.array(z.object({
    id: z.number(),
    name: z.string(),
    position: z.string(),
    number: z.number(),
    jersey_number: z.number(),
    player_name: z.string()
  })).optional(),
  awayTeamPlayers: z.array(z.object({
    id: z.number(),
    name: z.string(),
    position: z.string(),
    number: z.number(),
    jersey_number: z.number(),
    player_name: z.string()
  })).optional(),
  venue: z.string().optional(),
  competition: z.string().optional(),
});

const CreateMatchForm: React.FC = () => {
  const { toast } = useToast();
  const [homeTeam, setHomeTeam] = useState<Team>({ 
    name: '', 
    formation: '4-4-2', 
    players: [] as Player[]
  });
  const [awayTeam, setAwayTeam] = useState<Team>({ 
    name: '', 
    formation: '4-3-3', 
    players: [] as Player[]
  });
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [showTrackerAssignment, setShowTrackerAssignment] = useState(false);

  const defaultPlayers: Player[] = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    player_name: `Player ${i + 1}`,
    position: 'Forward',
    number: i + 1,
    jersey_number: i + 1,
  }));

  const awayDefaultPlayers: Player[] = Array.from({ length: 11 }, (_, i) => ({
    id: i + 12,
    name: `Player ${i + 12}`,
    player_name: `Player ${i + 12}`,
    position: 'Forward',
    number: i + 1,
    jersey_number: i + 1,
  }));

  const form = useForm<MatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      name: '',
      description: '',
      homeTeamName: '',
      awayTeamName: '',
      homeTeamPlayers: defaultPlayers,
      awayTeamPlayers: awayDefaultPlayers,
      venue: '',
      competition: '',
    },
  });

  const onSubmit = async (data: MatchFormData) => {
    try {
      form.reset({
        name: '',
        description: '',
        homeTeamName: '',
        awayTeamName: '',
        homeTeamPlayers: defaultPlayers,
        awayTeamPlayers: awayDefaultPlayers,
        venue: '',
        competition: '',
      });

      setHomeTeam({
        name: data.homeTeamName,
        formation: '4-4-2',
        players: data.homeTeamPlayers || defaultPlayers,
      });

      setAwayTeam({
        name: data.awayTeamName,
        formation: '4-3-3',
        players: data.awayTeamPlayers || awayDefaultPlayers,
      });

      const matchData = {
        name: data.name,
        description: data.description,
        home_team_name: data.homeTeamName,
        away_team_name: data.awayTeamName,
        home_team_formation: '4-4-2',
        away_team_formation: '4-3-3',
        home_team_players: data.homeTeamPlayers || defaultPlayers,
        away_team_players: data.awayTeamPlayers || awayDefaultPlayers,
        venue: data.venue,
        competition: data.competition,
      };

      const { data: matchResult, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (error) {
        console.error('Error creating match:', error);
        toast({
          title: 'Error',
          description: 'Failed to create match. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setCreatedMatchId(matchResult.id);
      setShowTrackerAssignment(true);

      toast({
        title: 'Success',
        description: 'Match created successfully!',
      });
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (showTrackerAssignment && createdMatchId) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Assign Trackers</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackerAssignment
            matchId={createdMatchId}
            homeTeamPlayers={homeTeam.players}
            awayTeamPlayers={awayTeam.players}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Match Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter match name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                {...form.register('description')}
                placeholder="Enter match description"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeTeamName">Home Team</Label>
                <Input
                  id="homeTeamName"
                  {...form.register('homeTeamName')}
                  placeholder="Home team name"
                />
                {form.formState.errors.homeTeamName && (
                  <p className="text-sm text-red-500">{form.formState.errors.homeTeamName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="awayTeamName">Away Team</Label>
                <Input
                  id="awayTeamName"
                  {...form.register('awayTeamName')}
                  placeholder="Away team name"
                />
                {form.formState.errors.awayTeamName && (
                  <p className="text-sm text-red-500">{form.formState.errors.awayTeamName.message}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue (Optional)</Label>
                <Input
                  id="venue"
                  {...form.register('venue')}
                  placeholder="Match venue"
                />
              </div>

              <div>
                <Label htmlFor="competition">Competition (Optional)</Label>
                <Input
                  id="competition"
                  {...form.register('competition')}
                  placeholder="Competition name"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Create Match
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
