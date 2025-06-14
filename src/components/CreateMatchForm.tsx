// src/components/CreateMatchForm.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AIProcessingService, AIPlayerInfo } from '@/services/aiProcessingService';
import { Plus, Trash2, ChevronDown, ChevronRight, Target } from 'lucide-react';

interface CreateMatchFormProps {
  matchId?: string;
  onMatchSubmit: (match: any) => void;
}

interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'tracker' | 'teacher';
}

interface TrackerAssignment {
  tracker_user_id: string;
  assigned_event_types: string[];
  player_ids: number[];
}

interface Player {
  id: number;
  name: string;
  number: number | null; // Allow null for unassigned numbers
  position: string;
  isSubstitute: boolean; // Flag to identify subs
}

type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3';

const EVENT_TYPE_CATEGORIES = [
  { key: 'ball_actions', label: 'Ball Actions', color: '#3b82f6', events: [ { key: 'pass', label: 'Pass' }, { key: 'shot', label: 'Shot' }, { key: 'cross', label: 'Cross' }, { key: 'dribble', label: 'Dribble' }, { key: 'tackle', label: 'Tackle' }, { key: 'interception', label: 'Interception' }, { key: 'clearance', label: 'Clearance' }, { key: 'save', label: 'Save' } ] },
  { key: 'set_pieces', label: 'Set Pieces', color: '#10b981', events: [ { key: 'corner', label: 'Corner Kick' }, { key: 'freeKick', label: 'Free Kick' }, { key: 'throwIn', label: 'Throw In' }, { key: 'goalKick', label: 'Goal Kick' }, { key: 'penalty', label: 'Penalty' } ] },
  { key: 'fouls_cards', label: 'Fouls & Cards', color: '#ef4444', events: [ { key: 'foul', label: 'Foul' }, { key: 'yellowCard', label: 'Yellow Card' }, { key: 'redCard', label: 'Red Card' }, { key: 'offside', label: 'Offside' } ] },
  { key: 'goals_assists', label: 'Goals & Assists', color: '#f59e0b', events: [ { key: 'goal', label: 'Goal' }, { key: 'assist', label: 'Assist' }, { key: 'ownGoal', label: 'Own Goal' } ] },
  { key: 'possession', label: 'Possession', color: '#8b5cf6', events: [ { key: 'ballLost', label: 'Ball Lost' }, { key: 'ballRecovered', label: 'Ball Recovered' }, { key: 'aerialDuel', label: 'Aerial Duel' }, { key: 'groundDuel', label: 'Ground Duel' } ] },
  { key: 'match_events', label: 'Match Events', color: '#6b7280', events: [ { key: 'substitution', label: 'Substitution' }, { key: 'injury', label: 'Injury' }, { key: 'timeout', label: 'Timeout' }, { key: 'halfTime', label: 'Half Time' } ] }
];

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3'];
const TOTAL_PLAYERS = 23;
const STARTERS_COUNT = 11;
const SUBS_COUNT = TOTAL_PLAYERS - STARTERS_COUNT;

const initializeBlankPlayers = (teamIdentifier: string): Player[] => {
  const players: Player[] = [];
  const timestamp = Date.now();
  for (let i = 0; i < TOTAL_PLAYERS; i++) {
    players.push({
      id: timestamp + i + (teamIdentifier === 'home' ? 1000 : 2000), 
      name: '',
      number: null,
      position: '',
      isSubstitute: i >= STARTERS_COUNT,
    });
  }
  return players;
};

const parseAndPadPlayers = (playersData: any[] | string | null, teamIdentifier: string): Player[] => {
  let parsedPlayers: any[] = [];
  
  if (typeof playersData === 'string') {
    try {
      parsedPlayers = JSON.parse(playersData);
    } catch (error) {
      console.error('Failed to parse players data:', error);
      parsedPlayers = [];
    }
  } else if (Array.isArray(playersData)) {
    parsedPlayers = playersData;
  }

  // Convert parsed data to Player objects
  const players: Player[] = parsedPlayers.map((p, index) => ({
    id: p.id || Date.now() + index + (teamIdentifier === 'home' ? 1000 : 2000),
    name: p.name || p.player_name || '',
    number: p.number !== undefined ? p.number : (p.jersey_number !== undefined ? p.jersey_number : null),
    position: p.position || '',
    isSubstitute: p.is_substitute !== undefined ? p.is_substitute : index >= STARTERS_COUNT,
  }));

  // Pad with blank players if needed
  while (players.length < TOTAL_PLAYERS) {
    const index = players.length;
    players.push({
      id: Date.now() + index + (teamIdentifier === 'home' ? 1000 : 2000),
      name: '',
      number: null,
      position: '',
      isSubstitute: index >= STARTERS_COUNT,
    });
  }

  return players.slice(0, TOTAL_PLAYERS);
};

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ matchId, onMatchSubmit }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!matchId);
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [trackerAssignments, setTrackerAssignments] = useState<TrackerAssignment[]>([]);
  
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>(() => initializeBlankPlayers('home'));
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>(() => initializeBlankPlayers('away'));
  
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<{[key: number]: 'home' | 'away' | 'both'}>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    homeTeamFormation: '4-4-2' as Formation,
    awayTeamFormation: '4-4-2' as Formation,
    matchDate: '',
    location: '',
    competition: '',
    matchType: 'regular',
    status: 'draft',
    notes: ''
  });

  useEffect(() => {
    fetchTrackers();
    if (matchId) {
      fetchMatchData(matchId);
    } else {
        // Apply default formation positions on initial load for a new match
        applyPositionsToStarters('home', formData.homeTeamFormation);
        applyPositionsToStarters('away', formData.awayTeamFormation);
    }
  }, [matchId]);

  useEffect(() => {
    applyPositionsToStarters('home', formData.homeTeamFormation);
  }, [formData.homeTeamFormation]);

  useEffect(() => {
    applyPositionsToStarters('away', formData.awayTeamFormation);
  }, [formData.awayTeamFormation]);

  const applyPositionsToStarters = (team: 'home' | 'away', formation: Formation) => {
    const positionMap: Record<Formation, string[]> = {
      '4-4-2': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward'],
      '4-3-3': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward', 'Forward'],
      '3-5-2': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward'],
      '4-2-3-1': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward'],
      '5-3-2': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward'],
      '3-4-3': ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward', 'Forward']
    };

    const positions = positionMap[formation];
    const updatePlayers = (prevPlayers: Player[]) => {
      const newPlayers = [...prevPlayers];
      for (let i = 0; i < STARTERS_COUNT; i++) {
        if (newPlayers[i] && !newPlayers[i].isSubstitute) {
          newPlayers[i].position = positions[i] || 'Starter';
        }
      }
      return newPlayers;
    };
    
    if (team === 'home') {
      setHomeTeamPlayers(updatePlayers);
    } else {
      setAwayTeamPlayers(updatePlayers);
    }
  };

  const fetchMatchData = async (id: string) => {
    setLoading(true);
    try {
      const { data: matchData, error: matchError } = await supabase.from('matches').select(`*, match_tracker_assignments (tracker_user_id, assigned_event_types, player_id)`).eq('id', id).single();
      if (matchError) throw matchError;
      if (!matchData) throw new Error("Match not found");

      setFormData({
        name: matchData.name || '',
        description: matchData.description || '',
        homeTeamName: matchData.home_team_name || '',
        awayTeamName: matchData.away_team_name || '',
        homeTeamFormation: (matchData.home_team_formation as Formation) || '4-4-2',
        awayTeamFormation: (matchData.away_team_formation as Formation) || '4-4-2',
        matchDate: matchData.match_date ? new Date(matchData.match_date).toISOString().slice(0, 16) : '',
        location: matchData.location || '',
        competition: matchData.competition || '',
        matchType: matchData.match_type || 'regular',
        status: matchData.status || 'draft',
        notes: matchData.notes || ''
      });

      setHomeTeamPlayers(parseAndPadPlayers(matchData.home_team_players as any[] | string | null, 'home'));
      setAwayTeamPlayers(parseAndPadPlayers(matchData.away_team_players as any[] | string | null, 'away'));

      const assignments: TrackerAssignment[] = [];
      if (Array.isArray(matchData.match_tracker_assignments)) {
        const assignmentsMap = new Map<string, TrackerAssignment>();
        matchData.match_tracker_assignments.forEach((assign: any) => {
          if (!assignmentsMap.has(assign.tracker_user_id)) {
            assignmentsMap.set(assign.tracker_user_id, { tracker_user_id: assign.tracker_user_id, assigned_event_types: [], player_ids: [] });
          }
          const currentAssignment = assignmentsMap.get(assign.tracker_user_id)!;
          currentAssignment.assigned_event_types = Array.from(new Set([...currentAssignment.assigned_event_types, ...assign.assigned_event_types]));
          if (assign.player_id) {
            currentAssignment.player_ids.push(assign.player_id);
          }
        });
        assignments.push(...Array.from(assignmentsMap.values()));
      }
      setTrackerAssignments(assignments);

    } catch (error: any) {
      console.error('Error fetching match data:', error);
      toast({ title: "Error", description: `Failed to load match data: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, role').eq('role', 'tracker').order('full_name');
      if (error) throw error;
      const validTrackers = (data || []).filter(tracker => tracker.id && tracker.email && tracker.full_name).map(tracker => ({ id: tracker.id!, email: tracker.email!, full_name: tracker.full_name!, role: tracker.role as 'admin' | 'user' | 'tracker' | 'teacher' }));
      setTrackers(validTrackers);
    } catch (error: any) {
      console.error('Error fetching trackers:', error);
      toast({ title: "Error", description: "Failed to load trackers", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const toPlayerJson = (player: Player) => ({ 
        id: player.id, 
        name: player.name || '', 
        player_name: player.name || '', 
        number: player.number, 
        jersey_number: player.number, 
        position: player.position,
        is_substitute: player.isSubstitute
      });
      const homePlayersJson = homeTeamPlayers.map(toPlayerJson);
      const awayPlayersJson = awayTeamPlayers.map(toPlayerJson);

      const matchData = {
        name: formData.name || `${formData.homeTeamName} vs ${formData.awayTeamName}`,
        description: formData.description,
        home_team_name: formData.homeTeamName,
        away_team_name: formData.awayTeamName,
        home_team_players: homePlayersJson,
        away_team_players: awayPlayersJson,
        home_team_formation: formData.homeTeamFormation,
        away_team_formation: formData.awayTeamFormation,
        match_date: formData.matchDate,
        location: formData.location,
        competition: formData.competition,
        match_type: formData.matchType,
        status: formData.status,
        notes: formData.notes,
        ...(isEditMode && matchId ? { updated_at: new Date().toISOString() } : {})
      };

      let match: any, matchError: any;
      if (isEditMode && matchId) {
        const { data, error } = await supabase.from('matches').update(matchData).eq('id', matchId).select().single();
        match = data; matchError = error;
      } else {
        const { data, error } = await supabase.from('matches').insert(matchData).select().single();
        match = data; matchError = error;
      }
      if (matchError) throw matchError;
      if (!match) throw new Error(isEditMode ? "Failed to update match." : "Failed to create match.");
      
      if (isEditMode && matchId) {
        await supabase.from('match_tracker_assignments').delete().eq('match_id', matchId);
      }
      
      if (trackerAssignments.length > 0) {
        const assignments = trackerAssignments.flatMap(assignment => assignment.player_ids.map(playerId => ({ match_id: match.id, tracker_user_id: assignment.tracker_user_id, player_id: playerId, player_team_id: homeTeamPlayers.some(p => p.id === playerId) ? 'home' : 'away', assigned_event_types: assignment.assigned_event_types }))).filter(a => a.tracker_user_id && a.player_id);
        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase.from('match_tracker_assignments').insert(assignments);
          if (assignmentError) throw assignmentError;
        }
        await supabase.rpc('notify_assigned_trackers' as any, { p_match_id: match.id, p_tracker_assignments: trackerAssignments.map(a => ({ tracker_user_id: a.tracker_user_id, assigned_event_types: a.assigned_event_types, player_ids: a.player_ids })) });
      }

      toast({ title: "Success", description: `Match ${isEditMode ? 'updated' : 'created'} successfully!` });
      onMatchSubmit(match);
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} match:`, error);
      toast({ title: "Error", description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} match`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const addTrackerAssignment = () => setTrackerAssignments([...trackerAssignments, { tracker_user_id: '', assigned_event_types: [], player_ids: [] }]);
  const removeTrackerAssignment = (index: number) => setTrackerAssignments(trackerAssignments.filter((_, i) => i !== index));
  const updateTrackerAssignment = (index: number, field: keyof TrackerAssignment, value: any) => { const u = [...trackerAssignments]; u[index] = { ...u[index], [field]: value }; setTrackerAssignments(u); };
  
  const updatePlayer = (team: 'home' | 'away', playerId: number, field: keyof Player, value: any) => {
      const updater = (prevPlayers: Player[]) => {
          return prevPlayers.map(p => p.id === playerId ? { ...p, [field]: value } : p);
      };
      if (team === 'home') {
          setHomeTeamPlayers(updater);
      } else {
          setAwayTeamPlayers(updater);
      }
  };

  const toggleCategory = (categoryKey: string) => setOpenCategories(p => p.includes(categoryKey) ? p.filter(k => k !== categoryKey) : [...p, categoryKey]);
  const handleEventTypeChange = (key: string, checked: boolean, index: number) => { const a = trackerAssignments[index]; updateTrackerAssignment(index, 'assigned_event_types', checked ? [...a.assigned_event_types, key] : a.assigned_event_types.filter(k => k !== key)); };
  const handleCategoryToggle = (category: any, checked: boolean, index: number) => { const keys = category.events.map((e: any) => e.key); const a = trackerAssignments[index]; updateTrackerAssignment(index, 'assigned_event_types', checked ? [...new Set([...a.assigned_event_types, ...keys])] : a.assigned_event_types.filter((k: string) => !keys.includes(k))); };
  const getCategoryState = (category: any, index: number) => { const a = trackerAssignments[index]; if (!a) return 'none'; const keys = category.events.map((e: any) => e.key); const count = keys.filter((k: string) => a.assigned_event_types.includes(k)).length; if (count === 0) return 'none'; if (count === keys.length) return 'all'; return 'some'; };
  const handleTeamFilterChange = (index: number, team: 'home' | 'away' | 'both') => setSelectedTeamForAssignment(p => ({ ...p, [index]: team }));
  const getFilteredPlayers = (index: number, team: 'home' | 'away') => { const filter = selectedTeamForAssignment[index]; if (filter && filter !== 'both' && filter !== team) return []; return team === 'home' ? homeTeamPlayers : awayTeamPlayers; };
  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files && event.target.files[0]) { setSelectedImageFile(event.target.files[0]); } else { setSelectedImageFile(null); } };

  const handleProcessImage = async (team: 'home' | 'away') => {
    if (!selectedImageFile) {
        toast({ title: "No Image Selected", description: "Please select an image file first.", variant: "destructive" });
        return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(selectedImageFile);

    reader.onload = async () => {
        const base64Image = reader.result as string;
        if (!base64Image) {
            toast({ title: "File Reading Error", description: "Could not read the image file.", variant: "destructive" });
            setIsProcessingImage(false);
            return;
        }

        try {
            const aiResponse = await AIProcessingService.extractPlayersFromImage(base64Image);

            if (!aiResponse || !aiResponse.players || aiResponse.players.length === 0) {
                toast({ title: "No Players Found", description: `The AI could not identify any players in the image for the ${team} team.`, variant: "default" });
                setIsProcessingImage(false);
                return;
            }

            const aiStarters = aiResponse.players.filter(p => !p.is_substitute);
            const aiSubs = aiResponse.players.filter(p => p.is_substitute);

            const updateTeamPlayers = (currentPlayers: Player[]): Player[] => {
                const newPlayers = [...currentPlayers];
    
                // Populate starters from AI data into the first 11 slots
                aiStarters.forEach((aiPlayer, index) => {
                    if (index < STARTERS_COUNT) {
                        newPlayers[index] = {
                            ...newPlayers[index],
                            name: aiPlayer.player_name || newPlayers[index].name,
                            number: aiPlayer.jersey_number !== null ? aiPlayer.jersey_number : newPlayers[index].number,
                        };
                    }
                });
                
                // Populate substitutes from AI data into the remaining slots
                aiSubs.forEach((aiPlayer, index) => {
                    const playerIndex = STARTERS_COUNT + index;
                    if (playerIndex < TOTAL_PLAYERS) {
                        newPlayers[playerIndex] = {
                            ...newPlayers[playerIndex],
                            name: aiPlayer.player_name || newPlayers[playerIndex].name,
                            number: aiPlayer.jersey_number !== null ? aiPlayer.jersey_number : newPlayers[playerIndex].number,
                        };
                    }
                });
                return newPlayers;
            };

            if (team === 'home') {
                setHomeTeamPlayers(current => updateTeamPlayers(current));
            } else {
                setAwayTeamPlayers(current => updateTeamPlayers(current));
            }

            toast({
                title: "Processing Successful",
                description: `The ${team === 'home' ? 'Home' : 'Away'} Team player list has been populated.`,
            });

        } catch (error: any) {
            console.error("Error processing image:", error);
            toast({ title: "Processing Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsProcessingImage(false);
        }
    };

    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({ title: "File Reading Error", description: "Could not read the selected image file.", variant: "destructive" });
        setIsProcessingImage(false);
    };
  };
  
  const renderPlayerInputs = (players: Player[], team: 'home' | 'away') => (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 items-center text-sm font-medium px-2 text-muted-foreground">
        <div className="col-span-1">Number</div>
        <div className="col-span-2">Name</div>
        <div className="col-span-1">Position</div>
      </div>
      {players.map((p) => (
        <div key={p.id} className="grid grid-cols-4 gap-2 items-center text-sm">
          <Input
            type="number"
            value={p.number ?? ''}
            onChange={(e) => updatePlayer(team, p.id, 'number', e.target.value ? parseInt(e.target.value) : null)}
            className="h-8 w-16"
            min="1" max="99"
            placeholder="#"
          />
          <Input
            value={p.name}
            onChange={(e) => updatePlayer(team, p.id, 'name', e.target.value)}
            placeholder="Player name"
            className="h-8 col-span-2"
          />
          <div className="text-xs text-muted-foreground truncate" title={p.position}>
            {p.position || (p.isSubstitute ? 'Substitute' : 'Starter')}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="teams">Teams & Players</TabsTrigger>
            <TabsTrigger value="trackers">Tracker Assignments</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="space-y-4">
            <Card><CardHeader><CardTitle>Match Details</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label htmlFor="name">Match Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter match name"/></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="homeTeamName">Home Team</Label><Input id="homeTeamName" value={formData.homeTeamName} onChange={(e) => setFormData({ ...formData, homeTeamName: e.target.value })} placeholder="Enter home team name" required/></div>
                <div><Label htmlFor="awayTeamName">Away Team</Label><Input id="awayTeamName" value={formData.awayTeamName} onChange={(e) => setFormData({ ...formData, awayTeamName: e.target.value })} placeholder="Enter away team name" required/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label htmlFor="matchDate">Match Date</Label><Input id="matchDate" type="datetime-local" value={formData.matchDate} onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}/></div>
                <div><Label htmlFor="location">Location</Label><Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Enter location"/></div>
                <div><Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="competition">Competition</Label><Input id="competition" value={formData.competition} onChange={(e) => setFormData({ ...formData, competition: e.target.value })} placeholder="Enter competition name"/></div>
                <div><Label htmlFor="matchType">Match Type</Label>
                  <Select value={formData.matchType} onValueChange={(value) => setFormData({ ...formData, matchType: value })}>
                    <SelectTrigger><SelectValue placeholder="Select match type"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                      <SelectItem value="league">League</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter match description"/></div>
              <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes"/></div>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="teams" className="space-y-4">
            <Card className="mb-6">
              <CardHeader><CardTitle>Upload Formation Image</CardTitle><p className="text-sm text-muted-foreground">Select an image containing the lineup for a single team. The AI will populate names and numbers for starters and subs.</p></CardHeader>
              <CardContent className="space-y-4">
                <div><Label htmlFor="formation-image-upload">Team Lineup Image</Label><Input id="formation-image-upload" type="file" accept="image/*" onChange={handleImageFileChange} className="mt-1"/>{selectedImageFile && (<p className="text-sm text-muted-foreground mt-1">Selected: {selectedImageFile.name}</p>)}</div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button type="button" onClick={() => handleProcessImage('home')} disabled={isProcessingImage || !selectedImageFile} className="flex-1">{isProcessingImage ? 'Processing...' : 'Process for Home Team'}</Button>
                  <Button type="button" onClick={() => handleProcessImage('away')} disabled={isProcessingImage || !selectedImageFile} className="flex-1" variant="secondary">{isProcessingImage ? 'Processing...' : 'Process for Away Team'}</Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                    <CardTitle>Home Team</CardTitle>
                    <div>
                        <Label>Formation</Label>
                        <Select value={formData.homeTeamFormation} onValueChange={(value: Formation) => setFormData({ ...formData, homeTeamFormation: value })}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{FORMATIONS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="starters" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="starters">Starters ({STARTERS_COUNT})</TabsTrigger>
                            <TabsTrigger value="subs">Substitutes ({SUBS_COUNT})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="starters" className="pt-4">
                            {renderPlayerInputs(homeTeamPlayers.filter(p => !p.isSubstitute), 'home')}
                        </TabsContent>
                        <TabsContent value="subs" className="pt-4">
                            {renderPlayerInputs(homeTeamPlayers.filter(p => p.isSubstitute), 'home')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle>Away Team</CardTitle>
                    <div>
                        <Label>Formation</Label>
                        <Select value={formData.awayTeamFormation} onValueChange={(value: Formation) => setFormData({ ...formData, awayTeamFormation: value })}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{FORMATIONS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="starters" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="starters">Starters ({STARTERS_COUNT})</TabsTrigger>
                            <TabsTrigger value="subs">Substitutes ({SUBS_COUNT})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="starters" className="pt-4">
                            {renderPlayerInputs(awayTeamPlayers.filter(p => !p.isSubstitute), 'away')}
                        </TabsContent>
                        <TabsContent value="subs" className="pt-4">
                            {renderPlayerInputs(awayTeamPlayers.filter(p => p.isSubstitute), 'away')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="trackers" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5"/>Event Types by Category</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trackerAssignments.map((assignment, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center"><h4 className="font-medium">Assignment {index + 1}</h4><Button type="button" variant="destructive" size="sm" onClick={() => removeTrackerAssignment(index)}><Trash2 className="h-4 w-4"/></Button></div>
                    <div><Label>Tracker</Label><Select value={assignment.tracker_user_id} onValueChange={(v) => updateTrackerAssignment(index, 'tracker_user_id', v)}><SelectTrigger><SelectValue placeholder="Select tracker"/></SelectTrigger><SelectContent>{trackers.map((t) => (<SelectItem key={t.id} value={t.id}>{t.full_name} ({t.email})</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-3">
                      {EVENT_TYPE_CATEGORIES.map((category) => {
                        const state = getCategoryState(category, index);
                        const isOpen = openCategories.includes(`${category.key}-${index}`);
                        return (<div key={category.key} className="border rounded-lg overflow-hidden"><Collapsible open={isOpen} onOpenChange={() => toggleCategory(`${category.key}-${index}`)}><CollapsibleTrigger className="w-full"><div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-3"><div className="flex items-center gap-2"><Checkbox checked={state === 'all'} ref={(el) => {if(el&&state==='some')(el as any).indeterminate=true;}} onCheckedChange={(c) => handleCategoryToggle(category, !!c, index)} onClick={(e)=>e.stopPropagation()}/><div className="w-3 h-3 rounded-full" style={{backgroundColor: category.color}}/></div><div className="text-left"><h4 className="font-medium">{category.label}</h4><p className="text-sm text-muted-foreground">{category.events.length} event types</p></div></div><div className="flex items-center gap-2"><Badge variant="secondary">{assignment.assigned_event_types.filter(k => category.events.some(e => e.key === k)).length}/{category.events.length}</Badge>{isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</div></div></CollapsibleTrigger><CollapsibleContent><div className="border-t bg-muted/20 p-4 grid grid-cols-2 gap-3">{category.events.map((e) => (<div key={e.key} className="flex items-center space-x-2"><Checkbox id={`event-${index}-${e.key}`} checked={assignment.assigned_event_types.includes(e.key)} onCheckedChange={(c) => handleEventTypeChange(e.key, !!c, index)}/><Label htmlFor={`event-${index}-${e.key}`} className="text-sm leading-none">{e.label}</Label></div>))}</div></CollapsibleContent></Collapsible></div>);
                      })}
                    </div>
                    <div><Label>Assigned Players</Label><div className="mb-3"><Label className="text-sm text-muted-foreground">Filter by Team</Label><Select value={selectedTeamForAssignment[index]||'both'} onValueChange={(v:'home'|'away'|'both') => handleTeamFilterChange(index,v)}><SelectTrigger className="w-48"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="both">Both Teams</SelectItem><SelectItem value="home">Home Team Only</SelectItem><SelectItem value="away">Away Team Only</SelectItem></SelectContent></Select></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {(!selectedTeamForAssignment[index] || ['both', 'home'].includes(selectedTeamForAssignment[index])) && (<div><Label className="text-sm text-muted-foreground">Home Team</Label><div className="space-y-1">{getFilteredPlayers(index, 'home').filter(p => p.number !== null).map((p) => (<div key={`home-${p.id}-assign-${index}`} className="flex items-center space-x-2"><Checkbox id={`home-p-${index}-${p.id}`} checked={assignment.player_ids.includes(p.id)} onCheckedChange={(c) => {const n = c ? [...assignment.player_ids, p.id] : assignment.player_ids.filter(id => id !== p.id); updateTrackerAssignment(index, 'player_ids', n);}}/><Label htmlFor={`home-p-${index}-${p.id}`} className="text-sm">#{p.number} {p.name || 'Unnamed'}</Label></div>))}</div></div>)}
                        {(!selectedTeamForAssignment[index] || ['both', 'away'].includes(selectedTeamForAssignment[index])) && (<div><Label className="text-sm text-muted-foreground">Away Team</Label><div className="space-y-1">{getFilteredPlayers(index, 'away').filter(p => p.number !== null).map((p) => (<div key={`away-${p.id}-assign-${index}`} className="flex items-center space-x-2"><Checkbox id={`away-p-${index}-${p.id}`} checked={assignment.player_ids.includes(p.id)} onCheckedChange={(c) => {const n = c ? [...assignment.player_ids, p.id] : assignment.player_ids.filter(id => id !== p.id); updateTrackerAssignment(index, 'player_ids', n);}}/><Label htmlFor={`away-p-${index}-${p.id}`} className="text-sm">#{p.number} {p.name || 'Unnamed'}</Label></div>))}</div></div>)}
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={addTrackerAssignment} className="w-full"><Plus className="h-4 w-4 mr-2"/>Add Tracker Assignment</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <div className="flex justify-end space-x-2 mt-6">
            <Button type="submit" disabled={loading}>{loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Match' : 'Create Match')}</Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};

export default CreateMatchForm;
