
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
            <Label htmlFor="homeTeamName">Home Team</Label>
            <Input
              id="homeTeamName"
              {...register('homeTeamName', { required: 'Home team name is required' })}
              placeholder="Enter home team name"
            />
            {errors.homeTeamName && <p className="text-red-500 text-sm">{errors.homeTeamName.message}</p>}
          </div>

          <div>
            <Label htmlFor="awayTeamName">Away Team</Label>
            <Input
              id="awayTeamName"
              {...register('awayTeamName', { required: 'Away team name is required' })}
              placeholder="Enter away team name"
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
