
import React from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchFormData } from '@/types/matchForm';

interface MatchBasicDetailsProps {
  register: UseFormRegister<MatchFormData>;
  errors: FieldErrors<MatchFormData>;
  setValue: UseFormSetValue<MatchFormData>;
  watch: UseFormWatch<MatchFormData>;
  isEditMode?: boolean;
}

const MatchBasicDetails: React.FC<MatchBasicDetailsProps> = ({
  register,
  errors,
  setValue,
  watch,
  isEditMode = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Match Details' : 'Match Details'}</CardTitle>
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
            <Label htmlFor="home_team_name">Home Team</Label>
            <Input
              id="home_team_name"
              {...register('home_team_name', { required: 'Home team name is required' })}
              placeholder="Enter home team name"
            />
            {errors.home_team_name && <p className="text-red-500 text-sm">{errors.home_team_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="away_team_name">Away Team</Label>
            <Input
              id="away_team_name"
              {...register('away_team_name', { required: 'Away team name is required' })}
              placeholder="Enter away team name"
            />
            {errors.away_team_name && <p className="text-red-500 text-sm">{errors.away_team_name.message}</p>}
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
            <Label htmlFor="home_team_score">Home Score</Label>
            <Input
              id="home_team_score"
              type="number"
              {...register('home_team_score')}
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="away_team_score">Away Score</Label>
            <Input
              id="away_team_score"
              type="number"
              {...register('away_team_score')}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="match_type">Match Type</Label>
          <Select onValueChange={(value) => setValue('match_type', value)} defaultValue={watch('match_type')}>
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
            rows={2}
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
  );
};

export default MatchBasicDetails;
