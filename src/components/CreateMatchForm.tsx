
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Formation } from '@/types';

interface CreateMatchFormProps {
  onSubmit: (matchData: any) => void;
  onCancel: () => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onSubmit, onCancel }) => {
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [homeTeamFormation, setHomeTeamFormation] = useState<Formation>('4-4-2');
  const [awayTeamFormation, setAwayTeamFormation] = useState<Formation>('4-3-3');
  const [matchDate, setMatchDate] = useState<Date>();
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [competition, setCompetition] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const matchData = {
      home_team_name: homeTeamName,
      away_team_name: awayTeamName,
      home_team_formation: homeTeamFormation,
      away_team_formation: awayTeamFormation,
      match_date: matchDate?.toISOString(),
      location,
      description,
      competition,
      status: 'draft'
    };

    onSubmit(matchData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Home Team */}
          <div className="space-y-2">
            <Label htmlFor="homeTeam">Home Team</Label>
            <Input
              id="homeTeam"
              value={homeTeamName}
              onChange={(e) => setHomeTeamName(e.target.value)}
              placeholder="Enter home team name"
              required
            />
          </div>

          {/* Away Team */}
          <div className="space-y-2">
            <Label htmlFor="awayTeam">Away Team</Label>
            <Input
              id="awayTeam"
              value={awayTeamName}
              onChange={(e) => setAwayTeamName(e.target.value)}
              placeholder="Enter away team name"
              required
            />
          </div>

          {/* Formations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Home Team Formation</Label>
              <Select value={homeTeamFormation} onValueChange={(value) => setHomeTeamFormation(value as Formation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4-4-2">4-4-2</SelectItem>
                  <SelectItem value="4-3-3">4-3-3</SelectItem>
                  <SelectItem value="3-5-2">3-5-2</SelectItem>
                  <SelectItem value="4-5-1">4-5-1</SelectItem>
                  <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                  <SelectItem value="3-4-3">3-4-3</SelectItem>
                  <SelectItem value="5-3-2">5-3-2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Away Team Formation</Label>
              <Select value={awayTeamFormation} onValueChange={(value) => setAwayTeamFormation(value as Formation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4-4-2">4-4-2</SelectItem>
                  <SelectItem value="4-3-3">4-3-3</SelectItem>
                  <SelectItem value="3-5-2">3-5-2</SelectItem>
                  <SelectItem value="4-5-1">4-5-1</SelectItem>
                  <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                  <SelectItem value="3-4-3">3-4-3</SelectItem>
                  <SelectItem value="5-3-2">5-3-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Match Date */}
          <div className="space-y-2">
            <Label>Match Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !matchDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {matchDate ? format(matchDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={matchDate}
                  onSelect={setMatchDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter match location"
            />
          </div>

          {/* Competition */}
          <div className="space-y-2">
            <Label htmlFor="competition">Competition</Label>
            <Input
              id="competition"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              placeholder="Enter competition name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter match description"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Create Match
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
