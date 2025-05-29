import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import TeamSetupWithFormation from './TeamSetupWithFormation';
import { Formation, MatchFormData } from '@/types';

interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
}

interface Team {
  id?: string;
  name: string;
  formation: Formation;
  players: Player[];
}

interface CreateMatchFormProps {
  onMatchCreated?: (match: any) => void;
  onSuccess?: () => void;
  isEditMode?: boolean;
  initialData?: any;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ 
  onMatchCreated, 
  onSuccess,
  isEditMode = false,
  initialData
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeTeam, setHomeTeam] = useState<Team>({
    name: '',
    formation: '4-4-2',
    players: Array.from({ length: 11 }, (_, i) => ({
      id: `home_${i + 1}`,
      name: `Player ${i + 1}`,
      position: 'Forward',
      number: i + 1
    }))
  });
  const [awayTeam, setAwayTeam] = useState<Team>({
    name: '',
    formation: '4-3-3',
    players: Array.from({ length: 11 }, (_, i) => ({
      id: `away_${i + 1}`,
      name: `Player ${i + 1}`,
      position: 'Midfielder',
      number: i + 1
    }))
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<MatchFormData>({
    defaultValues: {
      name: '',
      homeTeamName: '',
      awayTeamName: '',
      status: 'draft',
      matchType: 'regular',
      description: '',
      homeTeamScore: '0',
      awayTeamScore: '0',
      notes: ''
    }
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      console.log('Loading initial data for edit:', initialData);
      
      reset({
        name: initialData.name || '',
        homeTeamName: initialData.home_team_name || '',
        awayTeamName: initialData.away_team_name || '',
        status: initialData.status || 'draft',
        matchType: initialData.match_type || 'regular',
        description: initialData.description || '',
        homeTeamScore: (initialData.home_team_score || 0).toString(),
        awayTeamScore: (initialData.away_team_score || 0).toString(),
        notes: initialData.notes || '',
      });

      const homeFormation = initialData.home_team_formation;
      const awayFormation = initialData.away_team_formation;

      setHomeTeam({
        id: 'home',
        name: initialData.home_team_name || '',
        formation: (homeFormation && ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'].includes(homeFormation)) 
          ? homeFormation as Formation 
          : '4-4-2',
        players: initialData.home_team_players || []
      });

      setAwayTeam({
        id: 'away',
        name: initialData.away_team_name || '',
        formation: (awayFormation && ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'].includes(awayFormation)) 
          ? awayFormation as Formation 
          : '4-3-3',
        players: initialData.away_team_players || []
      });
    }
  }, [isEditMode, initialData, reset]);

  const handleFormationChange = (teamType: 'home' | 'away', formation: Formation) => {
    if (teamType === 'home') {
      setHomeTeam(prev => ({ ...prev, formation }));
    } else {
      setAwayTeam(prev => ({ ...prev, formation }));
    }
  };

  const handlePlayerChange = (teamType: 'home' | 'away', playerIndex: number, field: string, value: string) => {
    const updateTeam = teamType === 'home' ? setHomeTeam : setAwayTeam;
    updateTeam(prev => ({
      ...prev,
      players: prev.players.map((player, index) =>
        index === playerIndex ? { ...player, [field]: value } : player
      )
    }));
  };

  const onSubmit = async (data: MatchFormData) => {
    if (!user?.id) {
      toast.error('You must be logged in to create a match');
      return;
    }

    setIsSubmitting(true);

    try {
      const matchData = {
        name: data.name,
        home_team_name: data.homeTeamName,
        away_team_name: data.awayTeamName,
        home_team_formation: homeTeam.formation,
        away_team_formation: awayTeam.formation,
        home_team_players: JSON.stringify(homeTeam.players),
        away_team_players: JSON.stringify(awayTeam.players),
        status: data.status,
        match_type: data.matchType,
        description: data.description,
        home_team_score: parseInt(data.homeTeamScore) || 0,
        away_team_score: parseInt(data.awayTeamScore) || 0,
        notes: data.notes,
        created_by: user.id,
        match_date: new Date().toISOString()
      };

      let result;
      if (isEditMode && initialData?.id) {
        const { data: updatedMatch, error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', initialData.id)
          .select()
          .single();

        result = { data: updatedMatch, error };
      } else {
        const { data: newMatch, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();

        result = { data: newMatch, error };
      }

      if (result.error) {
        console.error('Error saving match:', result.error);
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} match: ${result.error.message}`);
        return;
      }

      toast.success(`Match ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      if (isEditMode && onSuccess) {
        onSuccess();
      } else if (!isEditMode && onMatchCreated && result.data) {
        onMatchCreated(result.data);
      }

      if (!isEditMode) {
        reset();
        setHomeTeam({
          name: '',
          formation: '4-4-2',
          players: Array.from({ length: 11 }, (_, i) => ({
            id: `home_${i + 1}`,
            name: `Player ${i + 1}`,
            position: 'Forward',
            number: i + 1
          }))
        });
        setAwayTeam({
          name: '',
          formation: '4-3-3',
          players: Array.from({ length: 11 }, (_, i) => ({
            id: `away_${i + 1}`,
            name: `Player ${i + 1}`,
            position: 'Midfielder',
            number: i + 1
          }))
        });
      }

    } catch (error: any) {
      console.error('Error in onSubmit:', error);
      toast.error(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Match' : 'Create New Match'}</CardTitle>
          <CardDescription>
            {isEditMode ? 'Update match details and team information' : 'Set up a new football match with team details and formations'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Match Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Match name is required' })}
              placeholder="Enter match name"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="homeTeamName">Home Team</Label>
              <Input
                id="homeTeamName"
                {...register('homeTeamName', { required: 'Home team name is required' })}
                placeholder="Enter home team name"
                onChange={(e) => {
                  setValue('homeTeamName', e.target.value);
                  setHomeTeam(prev => ({ ...prev, name: e.target.value }));
                }}
              />
              {errors.homeTeamName && <p className="text-red-500 text-sm">{errors.homeTeamName.message}</p>}
            </div>

            <div>
              <Label htmlFor="awayTeamName">Away Team</Label>
              <Input
                id="awayTeamName"
                {...register('awayTeamName', { required: 'Away team name is required' })}
                placeholder="Enter away team name"
                onChange={(e) => {
                  setValue('awayTeamName', e.target.value);
                  setAwayTeam(prev => ({ ...prev, name: e.target.value }));
                }}
              />
              {errors.awayTeamName && <p className="text-red-500 text-sm">{errors.awayTeamName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setValue('status', value as any)} defaultValue={watch('status')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="homeTeamScore">Home Score</Label>
              <Input
                id="homeTeamScore"
                type="number"
                {...register('homeTeamScore')}
                placeholder="0"
                min="0"
                value={watch('homeTeamScore') || '0'}
              />
            </div>

            <div>
              <Label htmlFor="awayTeamScore">Away Score</Label>
              <Input
                id="awayTeamScore"
                type="number"
                {...register('awayTeamScore')}
                placeholder="0"
                min="0"
                value={watch('awayTeamScore') || '0'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="matchType">Match Type</Label>
            <Select onValueChange={(value) => setValue('matchType', value)} defaultValue={watch('matchType')}>
              <SelectTrigger>
                <SelectValue placeholder="Select match type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="league">League</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter match description (optional)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <TeamSetupWithFormation
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onFormationChange={handleFormationChange}
        onPlayerChange={handlePlayerChange}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Match' : 'Create Match')}
      </Button>
    </form>
  );
};

export default CreateMatchForm;
export type { MatchFormData };
