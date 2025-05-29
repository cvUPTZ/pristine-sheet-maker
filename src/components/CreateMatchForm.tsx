"use client";

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Plus, 
  Trash2, 
  Upload,
  Save,
  Play,
  FileText
} from 'lucide-react';

interface MatchFormState {
  name: string;
  status: string;
  matchType: string;
  matchDate: string;
  location: string;
  competition: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamScore: number | null;
  awayTeamScore: number | null;
  notes: string;
}

const initialMatchFormState: MatchFormState = {
  name: '',
  status: 'draft',
  matchType: 'friendly',
  matchDate: new Date().toISOString().split('T')[0],
  location: '',
  competition: '',
  homeTeamName: '',
  awayTeamName: '',
  homeTeamScore: null,
  awayTeamScore: null,
  notes: '',
};

const CreateMatchForm: React.FC = () => {
  const [matchDetails, setMatchDetails] = useState<MatchFormState>(initialMatchFormState);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMatchDetails(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'homeTeamScore' | 'awayTeamScore') => {
    const { value } = e.target;
    setMatchDetails(prevState => ({
      ...prevState,
      [field]: value === '' ? null : parseInt(value, 10),
    }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setMatchDetails(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([
          {
            name: matchDetails.name,
            status: matchDetails.status,
            match_type: matchDetails.matchType,
            match_date: matchDetails.matchDate,
            location: matchDetails.location,
            competition: matchDetails.competition,
            home_team_name: matchDetails.homeTeamName,
            away_team_name: matchDetails.awayTeamName,
            home_team_score: matchDetails.homeTeamScore,
            away_team_score: matchDetails.awayTeamScore,
            notes: matchDetails.notes,
          },
        ]);

      if (error) {
        console.error('Error creating match:', error);
        toast.error(`Failed to create match: ${error.message}`);
      } else {
        toast.success('Match created successfully!');
        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Unexpected error creating match:', error);
      toast.error(`Unexpected error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Create New Match</CardTitle>
          <Badge variant="secondary">Admin</Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Match Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={matchDetails.name}
                onChange={handleChange}
                placeholder="Enter match name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={matchDetails.status}
                  onValueChange={(value) => handleSelectChange(value, 'status')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="matchType">Match Type</Label>
                <Select
                  value={matchDetails.matchType}
                  onValueChange={(value) => handleSelectChange(value, 'matchType')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select match type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                    <SelectItem value="cup">Cup</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="matchDate">Match Date</Label>
              <Input
                type="date"
                id="matchDate"
                name="matchDate"
                value={matchDetails.matchDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                type="text"
                id="location"
                name="location"
                value={matchDetails.location}
                onChange={handleChange}
                placeholder="Enter location"
              />
            </div>
            <div>
              <Label htmlFor="competition">Competition</Label>
              <Input
                type="text"
                id="competition"
                name="competition"
                value={matchDetails.competition}
                onChange={handleChange}
                placeholder="Enter competition"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeTeamName">Home Team Name</Label>
                <Input
                  type="text"
                  id="homeTeamName"
                  name="homeTeamName"
                  value={matchDetails.homeTeamName}
                  onChange={handleChange}
                  placeholder="Enter home team name"
                />
              </div>
              <div>
                <Label htmlFor="awayTeamName">Away Team Name</Label>
                <Input
                  type="text"
                  id="awayTeamName"
                  name="awayTeamName"
                  value={matchDetails.awayTeamName}
                  onChange={handleChange}
                  placeholder="Enter away team name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeTeamScore">Home Team Score</Label>
                <Input
                  type="number"
                  id="homeTeamScore"
                  name="homeTeamScore"
                  value={matchDetails.homeTeamScore === null ? '' : matchDetails.homeTeamScore.toString()}
                  onChange={(e) => handleNumberChange(e, 'homeTeamScore')}
                  placeholder="Enter home team score"
                />
              </div>
              <div>
                <Label htmlFor="awayTeamScore">Away Team Score</Label>
                <Input
                  type="number"
                  id="awayTeamScore"
                  name="awayTeamScore"
                  value={matchDetails.awayTeamScore === null ? '' : matchDetails.awayTeamScore.toString()}
                  onChange={(e) => handleNumberChange(e, 'awayTeamScore')}
                  placeholder="Enter away team score"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={matchDetails.notes}
                onChange={handleChange}
                placeholder="Enter match notes"
              />
            </div>
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <>
                  <Play className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Match
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMatchForm;
