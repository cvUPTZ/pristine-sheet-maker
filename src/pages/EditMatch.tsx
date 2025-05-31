
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MatchBasicDetails from '@/components/match/MatchBasicDetails';
import { MatchFormData } from '@/types/matchForm';

const EditMatch: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<MatchFormData>();

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId) {
        navigate('/admin');
        return;
      }

      try {
        const { data: match, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (error) {
          console.error('Error fetching match:', error);
          toast.error('Failed to load match data');
          navigate('/admin');
          return;
        }

        // Populate form with existing data, converting numbers to strings for form fields
        reset({
          name: match.name || '',
          homeTeamName: match.home_team_name || '',
          awayTeamName: match.away_team_name || '',
          status: match.status || 'draft',
          homeTeamScore: match.home_team_score?.toString() || '0',
          awayTeamScore: match.away_team_score?.toString() || '0',
          matchType: match.match_type || 'regular',
          description: match.description || '',
          notes: match.notes || '',
        });

      } catch (error) {
        console.error('Error loading match:', error);
        toast.error('Failed to load match data');
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId, navigate, reset]);

  const onSubmit = async (data: MatchFormData) => {
    if (!matchId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          name: data.name,
          home_team_name: data.homeTeamName,
          away_team_name: data.awayTeamName,
          status: data.status,
          home_team_score: parseInt(data.homeTeamScore) || 0,
          away_team_score: parseInt(data.awayTeamScore) || 0,
          match_type: data.matchType,
          description: data.description,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) throw error;

      toast.success('Match updated successfully');
      navigate('/admin');
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading match data...</div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold">Edit Match</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <MatchBasicDetails
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            isEditMode={true}
          />

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin')}
                className="flex-1"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default EditMatch;
