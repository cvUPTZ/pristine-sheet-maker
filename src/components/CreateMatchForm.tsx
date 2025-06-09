import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayerForPianoInput } from './TrackerPianoInput';

interface CreateMatchFormProps {
  matchId?: string;
  onMatchSubmit?: (match: any) => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ matchId, onMatchSubmit }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    homeTeamName: '',
    awayTeamName: '',
    matchDate: '',
    venue: '',
    homeTeamFormation: '4-4-2',
    awayTeamFormation: '4-3-3',
    homeTeamPlayers: [] as PlayerForPianoInput[],
    awayTeamPlayers: [] as PlayerForPianoInput[],
  });
  const [trackerAssignments, setTrackerAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (matchId) {
      fetchMatchData(matchId);
    } else {
      setLoading(false);
    }
  }, [matchId]);

  const fetchMatchData = async (id: string) => {
    try {
      setLoading(true);
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (matchError) throw matchError;

      if (matchData) {
        setFormData({
          name: matchData.name || '',
          homeTeamName: matchData.home_team_name || '',
          awayTeamName: matchData.away_team_name || '',
          matchDate: matchData.match_date ? new Date(matchData.match_date).toISOString().slice(0, 16) : '',
          venue: matchData.location || '', // Use location since venue doesn't exist in DB
          homeTeamFormation: matchData.home_team_formation || '4-4-2',
          awayTeamFormation: matchData.away_team_formation || '4-3-3',
          homeTeamPlayers: Array.isArray(matchData.home_team_players) 
            ? (matchData.home_team_players as unknown as PlayerForPianoInput[]) 
            : [],
          awayTeamPlayers: Array.isArray(matchData.away_team_players) 
            ? (matchData.away_team_players as unknown as PlayerForPianoInput[]) 
            : [],
        });
      }

      // Fetch tracker assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setTrackerAssignments([]);
      } else {
        setTrackerAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
      toast({
        title: "Error",
        description: "Failed to load match data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleTeamPlayersChange = (team: 'homeTeamPlayers' | 'awayTeamPlayers', players: PlayerForPianoInput[]) => {
    setFormData(prevData => ({
      ...prevData,
      [team]: players
    }));
  };

  const handleFormationChange = (team: 'homeTeamFormation' | 'awayTeamFormation', formation: string) => {
    setFormData(prevData => ({
      ...prevData,
      [team]: formation
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const matchData = {
        name: formData.name,
        home_team_name: formData.homeTeamName,
        away_team_name: formData.awayTeamName,
        match_date: formData.matchDate ? new Date(formData.matchDate).toISOString() : null,
        location: formData.venue, // Use location instead of venue
        home_team_formation: formData.homeTeamFormation,
        away_team_formation: formData.awayTeamFormation,
        home_team_players: formData.homeTeamPlayers as any, // Cast to any for JSON compatibility
        away_team_players: formData.awayTeamPlayers as any, // Cast to any for JSON compatibility
        status: 'scheduled'
      };

      let savedMatch;
      if (matchId) {
        const { data, error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', matchId)
          .select()
          .single();

        if (error) throw error;
        savedMatch = data;
      } else {
        const { data, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();

        if (error) throw error;
        savedMatch = data;
      }

      toast({
        title: "Success",
        description: matchId ? "Match updated successfully" : "Match created successfully"
      });

      if (onMatchSubmit) {
        onMatchSubmit(savedMatch);
      }
    } catch (error) {
      console.error('Error saving match:', error);
      toast({
        title: "Error",
        description: "Failed to save match",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading match data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Match Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter match name"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="homeTeamName">Home Team Name</Label>
          <Input
            type="text"
            id="homeTeamName"
            name="homeTeamName"
            value={formData.homeTeamName}
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
            value={formData.awayTeamName}
            onChange={handleChange}
            placeholder="Enter away team name"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="matchDate">Match Date and Time</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !formData.matchDate && "text-muted-foreground"
              )}
            >
              {formData.matchDate ? (
                format(new Date(formData.matchDate), "yyyy-MM-dd HH:mm")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.matchDate ? new Date(formData.matchDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm");
                  setFormData(prevData => ({
                    ...prevData,
                    matchDate: formattedDate
                  }));
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor="venue">Venue</Label>
        <Input
          type="text"
          id="venue"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          placeholder="Enter venue"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="homeTeamFormation">Home Team Formation</Label>
          <Select value={formData.homeTeamFormation} onValueChange={(value) => handleFormationChange('homeTeamFormation', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select formation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4-4-2">4-4-2</SelectItem>
              <SelectItem value="4-3-3">4-3-3</SelectItem>
              <SelectItem value="3-5-2">3-5-2</SelectItem>
              <SelectItem value="5-3-2">5-3-2</SelectItem>
              <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
              <SelectItem value="3-4-3">3-4-3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="awayTeamFormation">Away Team Formation</Label>
          <Select value={formData.awayTeamFormation} onValueChange={(value) => handleFormationChange('awayTeamFormation', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select formation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4-4-2">4-4-2</SelectItem>
              <SelectItem value="4-3-3">4-3-3</SelectItem>
              <SelectItem value="3-5-2">3-5-2</SelectItem>
              <SelectItem value="5-3-2">5-3-2</SelectItem>
              <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
              <SelectItem value="3-4-3">3-4-3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : (matchId ? 'Update Match' : 'Create Match')}
      </Button>
      <Button type="button" variant="ghost" onClick={() => navigate(matchId ? `/match/${matchId}` : '/admin')}>
        Cancel
      </Button>
    </form>
  );
};

export default CreateMatchForm;
