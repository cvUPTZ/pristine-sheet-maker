
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MatchBasicDetails from './match/MatchBasicDetails';
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
  const [activeTab, setActiveTab] = useState('details');
  
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
      home_team_name: '',
      away_team_name: '',
      status: 'draft',
      match_type: 'regular',
      description: '',
      home_team_score: '0',
      away_team_score: '0',
      notes: ''
    }
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      console.log('Loading initial data for edit:', initialData);
      
      reset({
        name: initialData.name || '',
        home_team_name: initialData.home_team_name || '',
        away_team_name: initialData.away_team_name || '',
        status: initialData.status || 'draft',
        match_type: initialData.match_type || 'regular',
        description: initialData.description || '',
        home_team_score: (initialData.home_team_score || 0).toString(),
        away_team_score: (initialData.away_team_score || 0).toString(),
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

  // Update team names when form values change
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'home_team_name') {
        setHomeTeam(prev => ({ ...prev, name: value.home_team_name || '' }));
      }
      if (name === 'away_team_name') {
        setAwayTeam(prev => ({ ...prev, name: value.away_team_name || '' }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

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
        home_team_name: data.home_team_name,
        away_team_name: data.away_team_name,
        home_team_formation: homeTeam.formation,
        away_team_formation: awayTeam.formation,
        home_team_players: JSON.stringify(homeTeam.players),
        away_team_players: JSON.stringify(awayTeam.players),
        status: data.status,
        match_type: data.match_type,
        description: data.description,
        home_team_score: parseInt(data.home_team_score) || 0,
        away_team_score: parseInt(data.away_team_score) || 0,
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
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Match Details</TabsTrigger>
            <TabsTrigger value="teams">Team Setup</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <MatchBasicDetails
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              isEditMode={isEditMode}
            />
          </TabsContent>
          
          <TabsContent value="teams" className="space-y-4">
            <TeamSetupWithFormation
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              onFormationChange={handleFormationChange}
              onPlayerChange={handlePlayerChange}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          {activeTab === 'teams' && (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setActiveTab('details')}
            >
              Previous
            </Button>
          )}
          
          {activeTab === 'details' && (
            <Button 
              type="button" 
              onClick={() => setActiveTab('teams')}
              className="ml-auto"
            >
              Next: Team Setup
            </Button>
          )}
          
          {activeTab === 'teams' && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Match' : 'Create Match')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateMatchForm;
export type { MatchFormData };
