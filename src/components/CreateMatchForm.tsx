"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { generatePlayersForFormation } from '@/utils/formationUtils';
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
  FileText,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Team, Player } from '@/types';
import { MatchFormData, TrackerAssignment } from '@/types/matchForm';
import TeamSetupWithFormation from './TeamSetupWithFormation';
// Button is already imported via lucide-react, but if a specific Button component from ui/button is needed, ensure it's aliased or imported directly.
// For this task, assuming the existing Button or a new import from '@/components/ui/button' will be used.
// import { Button } from '@/components/ui/button'; // Already imported, or ensure it's the correct one.

const initialMatchFormState: MatchFormData = {
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

interface TrackerProfile {
  id: string;
  full_name: string | null;
  email: string;
}

const CreateMatchForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [matchDetails, setMatchDetails] = useState<MatchFormData>(initialMatchFormState);
  const [homeTeam, setHomeTeam] = useState<Team>({
    id: 'home',
    name: '',
    formation: '4-4-2',
    players: []
  });
  const [awayTeam, setAwayTeam] = useState<Team>({
    id: 'away',
    name: '',
    formation: '4-3-3',
    players: []
  });
  const [trackers, setTrackers] = useState<TrackerProfile[]>([]);
  const [trackerAssignments, setTrackerAssignments] = useState<TrackerAssignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleLoadBothTeamsPlayers = () => {
    if (!homeTeam.formation || !awayTeam.formation) {
      toast.error('Please select formations for both teams first.');
      return;
    }
    if (!matchDetails.homeTeamName || !matchDetails.awayTeamName) {
      toast.error('Please enter team names for both teams first.');
      return;
    }

    // Use matchDetails.homeTeamName and matchDetails.awayTeamName as they are the source of truth for team names
    const generatedHomePlayers = generatePlayersForFormation(homeTeam.formation, matchDetails.homeTeamName);
    const generatedAwayPlayers = generatePlayersForFormation(awayTeam.formation, matchDetails.awayTeamName);

    setHomeTeam(prev => ({ ...prev, players: generatedHomePlayers }));
    setAwayTeam(prev => ({ ...prev, players: generatedAwayPlayers }));

    toast.success('Player lists for both teams have been loaded/updated!');
  };

  const eventTypes = [
    'goal', 'assist', 'yellow_card', 'red_card', 'substitution', 
    'foul', 'offside', 'corner', 'free_kick', 'penalty', 'pass', 'shot'
  ];

  useEffect(() => {
    fetchTrackers();
  }, []);

  useEffect(() => {
    setHomeTeam(prev => ({ ...prev, name: matchDetails.homeTeamName }));
    setAwayTeam(prev => ({ ...prev, name: matchDetails.awayTeamName }));
  }, [matchDetails.homeTeamName, matchDetails.awayTeamName]);

  const fetchTrackers = async () => {
    try {
      // Use the get_trackers_with_email function to get trackers with their emails
      const { data, error } = await supabase.rpc('get_trackers_with_email');

      if (error) throw error;
      
      // Transform the data to match our TrackerProfile interface
      const transformedData: TrackerProfile[] = (data || []).map((tracker: any) => ({
        id: tracker.id,
        full_name: tracker.full_name,
        email: tracker.email || 'No email'
      }));
      
      setTrackers(transformedData);
    } catch (error: any) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to load trackers');
    }
  };

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

  const handleHomeTeamUpdate = (team: Team) => {
    setHomeTeam(team);
  };

  const handleAwayTeamUpdate = (team: Team) => {
    setAwayTeam(team);
  };

  const handleTrackerAssignment = (trackerId: string, eventType: string, checked: boolean) => {
    setTrackerAssignments(prev => {
      const existing = prev.find(ta => ta.trackerId === trackerId);
      if (existing) {
        return prev.map(ta => 
          ta.trackerId === trackerId 
            ? {
                ...ta,
                eventTypes: checked 
                  ? [...ta.eventTypes, eventType]
                  : ta.eventTypes.filter(et => et !== eventType)
              }
            : ta
        );
      } else if (checked) {
        return [...prev, { trackerId, eventTypes: [eventType], playerIds: [] }];
      }
      return prev;
    });
  };

  const handlePlayerAssignment = (trackerId: string, playerId: string, checked: boolean) => {
    setTrackerAssignments(prev => {
      const existing = prev.find(ta => ta.trackerId === trackerId);
      if (existing) {
        return prev.map(ta => 
          ta.trackerId === trackerId 
            ? {
                ...ta,
                playerIds: checked 
                  ? [...ta.playerIds, playerId]
                  : ta.playerIds.filter(pid => pid !== playerId)
              }
            : ta
        );
      } else if (checked) {
        return [...prev, { trackerId, eventTypes: [], playerIds: [playerId] }];
      }
      return prev;
    });
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!matchDetails.name || !matchDetails.homeTeamName || !matchDetails.awayTeamName) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create the match
      const { data: matchData, error: matchError } = await supabase
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
            home_team_formation: homeTeam.formation,
            away_team_formation: awayTeam.formation,
            home_team_players: homeTeam.players,
            away_team_players: awayTeam.players,
            notes: matchDetails.notes,
          },
        ])
        .select()
        .single();

      if (matchError) {
        throw matchError;
      }

      // Create tracker assignments - only create if both event types and players are assigned
      for (const assignment of trackerAssignments) {
        if (assignment.eventTypes.length > 0 && assignment.playerIds.length > 0) {
          // Create separate assignments for each player
          for (const playerId of assignment.playerIds) {
            const { error: assignmentError } = await supabase
              .from('match_tracker_assignments')
              .insert({
                match_id: matchData.id,
                tracker_user_id: assignment.trackerId,
                assigned_event_types: assignment.eventTypes,
                player_id: parseInt(playerId), // Convert string to number
                player_team_id: homeTeam.players.find(p => p.id === playerId) ? 'home' : 'away'
              });

            if (assignmentError) {
              console.error('Error creating tracker assignment:', assignmentError);
            }
          }
        }
      }

      // Send notifications to assigned trackers
      for (const assignment of trackerAssignments) {
        if (assignment.eventTypes.length > 0 && assignment.playerIds.length > 0) {
          const { error: notificationError } = await supabase
            .from('match_notifications')
            .insert({
              match_id: matchData.id,
              tracker_id: assignment.trackerId,
              message: `You have been assigned to track events for match: ${matchDetails.name}`,
            });

          if (notificationError) {
            console.error('Error sending notification:', notificationError);
          }
        }
      }

      toast.success('Match created successfully!');
      navigate('/admin');
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast.error(`Failed to create match: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">
            Create New Match - Step {currentStep} of 2
          </CardTitle>
          <Badge variant="secondary">Admin</Badge>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <form className="space-y-4">
              <div>
                <Label htmlFor="name">Match Name *</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={matchDetails.name}
                  onChange={handleChange}
                  placeholder="Enter match name"
                  required
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
                  <Label htmlFor="homeTeamName">Home Team Name *</Label>
                  <Input
                    type="text"
                    id="homeTeamName"
                    name="homeTeamName"
                    value={matchDetails.homeTeamName}
                    onChange={handleChange}
                    placeholder="Enter home team name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="awayTeamName">Away Team Name *</Label>
                  <Input
                    type="text"
                    id="awayTeamName"
                    name="awayTeamName"
                    value={matchDetails.awayTeamName}
                    onChange={handleChange}
                    placeholder="Enter away team name"
                    required
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

              <div className="flex justify-end">
                <Button type="button" onClick={nextStep}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Next: Team Setup
                </Button>
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamSetupWithFormation 
                  team={homeTeam}
                  onTeamUpdate={handleHomeTeamUpdate}
                  teamType="home"
                />
                <TeamSetupWithFormation 
                  team={awayTeam}
                  onTeamUpdate={handleAwayTeamUpdate}
                  teamType="away"
                />
              </div>

              <div className="my-4 flex justify-center">
                <Button
                  type="button"
                  onClick={handleLoadBothTeamsPlayers}
                  disabled={!homeTeam.formation || !awayTeam.formation || !matchDetails.homeTeamName || !matchDetails.awayTeamName}
                >
                  Load/Reload Players for Both Teams
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Tracker Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  {trackers.length === 0 ? (
                    <p className="text-muted-foreground">No trackers available</p>
                  ) : (
                    <div className="space-y-6">
                      {trackers.map((tracker) => (
                        <div key={tracker.id} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3">
                            {tracker.full_name || tracker.email}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Event Types</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {eventTypes.map((eventType) => (
                                  <div key={eventType} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${tracker.id}-${eventType}`}
                                      checked={trackerAssignments
                                        .find(ta => ta.trackerId === tracker.id)
                                        ?.eventTypes.includes(eventType) || false}
                                      onCheckedChange={(checked) => 
                                        handleTrackerAssignment(tracker.id, eventType, checked as boolean)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`${tracker.id}-${eventType}`}
                                      className="text-sm"
                                    >
                                      {eventType.replace('_', ' ')}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Players</Label>
                              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                                {[...homeTeam.players, ...awayTeam.players].map((player) => (
                                  <div key={player.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${tracker.id}-player-${player.id}`}
                                      checked={trackerAssignments
                                        .find(ta => ta.trackerId === tracker.id)
                                        ?.playerIds.includes(player.id) || false}
                                      onCheckedChange={(checked) => 
                                        handlePlayerAssignment(tracker.id, player.id, checked as boolean)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`${tracker.id}-player-${player.id}`}
                                      className="text-sm"
                                    >
                                      {player.name} (#{player.number}) - {player.position}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button disabled={isSaving} onClick={handleSubmit}>
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMatchForm;
export type { MatchFormData };
