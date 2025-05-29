
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MatchFormData } from '@/types';
import MatchBasicDetails from '@/components/match/MatchBasicDetails';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MatchFormData>({
    defaultValues: {
      status: 'draft',
      homeTeamFormation: '4-4-2',
      awayTeamFormation: '4-3-3',
    },
  });

  const onSubmit = async (data: MatchFormData) => {
    try {
      const { data: matchData, error } = await supabase
        .from('matches')
        .insert([
          {
            name: data.name,
            description: data.description,
            home_team_name: data.homeTeamName,
            away_team_name: data.awayTeamName,
            home_team_formation: data.homeTeamFormation,
            away_team_formation: data.awayTeamFormation,
            status: data.status || 'draft',
            match_date: data.matchDate,
            location: data.location,
            competition: data.competition,
            match_type: data.matchType,
            home_team_score: data.homeTeamScore ? parseInt(data.homeTeamScore) : null,
            away_team_score: data.awayTeamScore ? parseInt(data.awayTeamScore) : null,
            notes: data.notes,
            home_team_players: JSON.stringify(data.homeTeamPlayers || []),
            away_team_players: JSON.stringify(data.awayTeamPlayers || []),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Match created successfully');
      navigate('/admin');
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">Create New Match</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <MatchBasicDetails
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            isEditMode={false}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin')}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreateMatch;
