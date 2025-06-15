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
import { Plus, Trash2, ChevronDown, ChevronRight, Target, Upload } from 'lucide-react';
import MatchHeader from '@/components/match/MatchHeader';

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
  number: number | null;
  position: string;
  isSubstitute: boolean;
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

  const players: Player[] = parsedPlayers.map((p, index) => ({
    id: p.id || Date.now() + index + (teamIdentifier === 'home' ? 1000 : 2000),
    name: p.name || p.player_name || '',
    number: p.number !== undefined ? p.number : (p.jersey_number !== undefined ? p.jersey_number : null),
    position: p.position || '',
    isSubstitute: p.is_substitute !== undefined ? p.is_substitute : index >= STARTERS_COUNT,
  }));

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
  
  const [homeTeamFlagFile, setHomeTeamFlagFile] = useState<File | null>(null);
  const [awayTeamFlagFile, setAwayTeamFlagFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    homeTeamFormation: '4-4-2' as Formation,
    awayTeamFormation: '4-4-2' as Formation,
    homeTeamFlagUrl: '',
    awayTeamFlagUrl: '',
    matchDate: '',
    location: '',
    competition: '',
    matchType: 'regular',
    status: 'draft' as 'draft' | 'scheduled' | 'live' | 'completed',
    notes: ''
  });

  useEffect(() => {
    fetchTrackers();
    if (matchId) {
      fetchMatchData(matchId);
    } else {
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
        homeTeamFlagUrl: matchData.home_team_flag_url || '',
        awayTeamFlagUrl: matchData.away_team_flag_url || '',
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

  const handleFlagChange = (e: React.ChangeEvent<HTMLInputElement>, team: 'home' | 'away') => {
    const file = e.target.files?.[0];
    if (file) {
        const previewUrl = URL.createObjectURL(file);
        if (team === 'home') {
            setHomeTeamFlagFile(file);
            setFormData(prev => ({...prev, homeTeamFlagUrl: previewUrl}));
        } else {
            setAwayTeamFlagFile(file);
            setFormData(prev => ({...prev, awayTeamFlagUrl: previewUrl}));
        }
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
        // Save placeholder URL if it's a file upload, will be replaced later
        home_team_flag_url: homeTeamFlagFile ? '' : formData.homeTeamFlagUrl,
        away_team_flag_url: awayTeamFlagFile ? '' : formData.awayTeamFlagUrl,
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
      
      let needsFlagUpdate = false;
      const flagUpdatePayload: { home_team_flag_url?: string; away_team_flag_url?: string } = {};

      if (homeTeamFlagFile) {
        const fileExt = homeTeamFlagFile.name.split('.').pop();
        const filePath = `${match.id}/home-flag.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('flag').upload(filePath, homeTeamFlagFile, { upsert: true });
        if (uploadError) throw new Error(`Home flag upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('flag').getPublicUrl(filePath);
        flagUpdatePayload.home_team_flag_url = urlData.publicUrl;
        needsFlagUpdate = true;
      }

      if (awayTeamFlagFile) {
        const fileExt = awayTeamFlagFile.name.split('.').pop();
        const filePath = `${match.id}/away-flag.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('flag').upload(filePath, awayTeamFlagFile, { upsert: true });
        if (uploadError) throw new Error(`Away flag upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('flag').getPublicUrl(filePath);
        flagUpdatePayload.away_team_flag_url = urlData.publicUrl;
        needsFlagUpdate = true;
      }
      
      let finalMatch = match;
      if (needsFlagUpdate) {
        const { data, error } = await supabase.from('matches').update(flagUpdatePayload).eq('id', match.id).select().single();
        if (error) throw error;
        finalMatch = data;
      }

      if (isEditMode && matchId) {
        await supabase.from('match_tracker_assignments').delete().eq('match_id', matchId);
      }
      
      if (trackerAssignments.length > 0) {
        const assignments = trackerAssignments.flatMap(assignment => assignment.player_ids.map(playerId => ({ match_id: finalMatch.id, tracker_user_id: assignment.tracker_user_id, player_id: playerId, player_team_id: homeTeamPlayers.some(p => p.id === playerId) ? 'home' : 'away', assigned_event_types: assignment.assigned_event_types }))).filter(a => a.tracker_user_id && a.player_id);
        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase.from('match_tracker_assignments').insert(assignments);
          if (assignmentError) throw assignmentError;
        }
        await supabase.rpc('notify_assigned_trackers' as any, { p_match_id: finalMatch.id, p_tracker_assignments: trackerAssignments.map(a => ({ tracker_user_id: a.tracker_user_id, assigned_event_types: a.assigned_event_types, player_ids: a.player_ids })) });
      }

      toast({ title: "Success", description: `Match ${isEditMode ? 'updated' : 'created'} successfully!` });
      onMatchSubmit(finalMatch);
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
    if (!selectedImageFile) { toast({ title: "No Image Selected", description: "Please select an image file first.", variant: "destructive" }); return; }
    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(selectedImageFile);
    reader.onload = async () => {
        const base64Image = reader.result as string;
        if (!base64Image) { toast({ title: "File Reading Error", description: "Could not read the image file.", variant: "destructive" }); setIsProcessingImage(false); return; }
        try {
            const aiResponse = await AIProcessingService.extractPlayersFromImage(base64Image);
            if (!aiResponse || !aiResponse.players || aiResponse.players.length === 0) { toast({ title: "No Players Found", description: `The AI could not identify any players in the image for the ${team} team.`, variant: "default" }); setIsProcessingImage(false); return; }
            const aiStarters = aiResponse.players.filter(p => !p.is_substitute);
            const aiSubs = aiResponse.players.filter(p => p.is_substitute);
            const updateTeamPlayers = (currentPlayers: Player[]): Player[] => {
                const newPlayers = [...currentPlayers];
                aiStarters.forEach((aiPlayer, index) => { if (index < STARTERS_COUNT) { newPlayers[index] = { ...newPlayers[index], name: aiPlayer.player_name || newPlayers[index].name, number: aiPlayer.jersey_number !== null ? aiPlayer.jersey_number : newPlayers[index].number, }; } });
                aiSubs.forEach((aiPlayer, index) => { const playerIndex = STARTERS_COUNT + index; if (playerIndex < TOTAL_PLAYERS) { newPlayers[playerIndex] = { ...newPlayers[playerIndex], name: aiPlayer.player_name || newPlayers[playerIndex].name, number: aiPlayer.jersey_number !== null ? aiPlayer.jersey_number : newPlayers[playerIndex].number, }; } });
                return newPlayers;
            };
            if (team === 'home') { setHomeTeamPlayers(current => updateTeamPlayers(current)); } else { setAwayTeamPlayers(current => updateTeamPlayers(current)); }
            toast({ title: "Processing Successful", description: `The ${team === 'home' ? 'Home' : 'Away'} Team player list has been populated.`, });
        } catch (error: any) { console.error("Error processing image:", error); toast({ title: "Processing Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
        } finally { setIsProcessingImage(false); }
    };
    reader.onerror = (error) => { console.error("FileReader error:", error); toast({ title: "File Reading Error", description: "Could not read the selected image file.", variant: "destructive" }); setIsProcessingImage(false); };
  };
  const renderPlayerInputs = (players: Player[], team: 'home' | 'away') => (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 items-center text-sm font-medium px-2 text-muted-foreground"><div className="col-span-1">Number</div><div className="col-span-2">Name</div><div className="col-span-1">Position</div></div>
      {players.map((p) => (<div key={p.id} className="grid grid-cols-4 gap-2 items-center text-sm"><Input type="number" value={p.number ?? ''} onChange={(e) => updatePlayer(team, p.id, 'number', e.target.value ? parseInt(e.target.value) : null)} className="h-8 w-16" min="1" max="99" placeholder="#"/>
      <Input value={p.name} onChange={(e) => updatePlayer(team, p.id, 'name', e.target.value)} placeholder="Player name" className="h-8 col-span-2"/><div className="text-xs text-muted-foreground truncate" title={p.position}>{p.position || (p.isSubstitute ? 'Substitute' : 'Starter')}</div></div>))}
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
            <Card>
              <CardHeader>
                <CardTitle>Match Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="match-name">Match Name (Optional)</Label>
                    <Input
                      id="match-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Will be auto-generated if empty"
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-date">Match Date</Label>
                    <Input
                      id="match-date"
                      type="datetime-local"
                      value={formData.matchDate}
                      onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home-team-name">Home Team Name</Label>
                    <Input
                      id="home-team-name"
                      value={formData.homeTeamName}
                      onChange={(e) => setFormData({ ...formData, homeTeamName: e.target.value })}
                      placeholder="Enter home team name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="away-team-name">Away Team Name</Label>
                    <Input
                      id="away-team-name"
                      value={formData.awayTeamName}
                      onChange={(e) => setFormData({ ...formData, awayTeamName: e.target.value })}
                      placeholder="Enter away team name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Stadium or venue"
                    />
                  </div>
                  <div>
                    <Label htmlFor="competition">Competition</Label>
                    <Input
                      id="competition"
                      value={formData.competition}
                      onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                      placeholder="League, cup, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-type">Match Type</Label>
                    <Select value={formData.matchType} onValueChange={(value) => setFormData({ ...formData, matchType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="cup">Cup</SelectItem>
                        <SelectItem value="playoff">Playoff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional match details"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal notes"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Match Preview */}
            {(formData.homeTeamName || formData.awayTeamName) && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <MatchHeader
                    mode="piano"
                    setMode={() => {}}
                    homeTeam={{
                      name: formData.homeTeamName || "Home Team",
                      formation: formData.homeTeamFormation,
                      flagUrl: formData.homeTeamFlagUrl || null
                    }}
                    awayTeam={{
                      name: formData.awayTeamName || "Away Team", 
                      formation: formData.awayTeamFormation,
                      flagUrl: formData.awayTeamFlagUrl || null
                    }}
                    name={formData.name || `${formData.homeTeamName || "Home"} vs ${formData.awayTeamName || "Away"}`}
                    status={formData.status as 'draft' | 'scheduled' | 'live' | 'completed'}
                    handleToggleTracking={() => {}}
                    handleSave={() => {}}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            {/* AI Image Processing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  AI Player Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Upload Team Sheet Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="mt-2"
                  />
                </div>
                {selectedImageFile && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleProcessImage('home')}
                      disabled={isProcessingImage}
                      className="flex-1"
                    >
                      {isProcessingImage ? 'Processing...' : 'Process for Home Team'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleProcessImage('away')}
                      disabled={isProcessingImage}
                      className="flex-1"
                    >
                      {isProcessingImage ? 'Processing...' : 'Process for Away Team'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HOME TEAM CARD */}
              <Card>
                <CardHeader>
                  <CardTitle>Home Team</CardTitle>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="home-team-flag-url">Team Flag</Label>
                      {formData.homeTeamFlagUrl && (
                        <img 
                          src={formData.homeTeamFlagUrl} 
                          alt="Home team flag preview" 
                          className="w-16 h-12 mt-2 object-contain rounded-md border bg-muted" 
                        />
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id="home-team-flag-url"
                          type="text"
                          value={formData.homeTeamFlagUrl.startsWith('blob:') ? '' : formData.homeTeamFlagUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, homeTeamFlagUrl: e.target.value }))}
                          placeholder="Paste image URL or upload"
                          className="flex-grow"
                        />
                        <Button asChild variant="outline" className="shrink-0">
                          <Label htmlFor="home-flag-upload" className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                            <Input 
                              id="home-flag-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleFlagChange(e, 'home')}
                            />
                          </Label>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Formation</Label>
                      <Select value={formData.homeTeamFormation} onValueChange={(value: Formation) => setFormData({ ...formData, homeTeamFormation: value })}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{FORMATIONS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="starters" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="starters">Starters ({STARTERS_COUNT})</TabsTrigger>
                      <TabsTrigger value="subs">Substitutes ({SUBS_COUNT})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="starters" className="pt-4">{renderPlayerInputs(homeTeamPlayers.filter(p => !p.isSubstitute), 'home')}</TabsContent>
                    <TabsContent value="subs" className="pt-4">{renderPlayerInputs(homeTeamPlayers.filter(p => p.isSubstitute), 'home')}</TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* AWAY TEAM CARD */}
              <Card>
                <CardHeader>
                  <CardTitle>Away Team</CardTitle>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="away-team-flag-url">Team Flag</Label>
                      {formData.awayTeamFlagUrl && (
                        <img 
                          src={formData.awayTeamFlagUrl} 
                          alt="Away team flag preview" 
                          className="w-16 h-12 mt-2 object-contain rounded-md border bg-muted" 
                        />
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id="away-team-flag-url"
                          type="text"
                          value={formData.awayTeamFlagUrl.startsWith('blob:') ? '' : formData.awayTeamFlagUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, awayTeamFlagUrl: e.target.value }))}
                          placeholder="Paste image URL or upload"
                          className="flex-grow"
                        />
                        <Button asChild variant="outline" className="shrink-0">
                          <Label htmlFor="away-flag-upload" className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                            <Input 
                              id="away-flag-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleFlagChange(e, 'away')}
                            />
                          </Label>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Formation</Label>
                      <Select value={formData.awayTeamFormation} onValueChange={(value: Formation) => setFormData({ ...formData, awayTeamFormation: value })}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{FORMATIONS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="starters" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="starters">Starters ({STARTERS_COUNT})</TabsTrigger>
                      <TabsTrigger value="subs">Substitutes ({SUBS_COUNT})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="starters" className="pt-4">{renderPlayerInputs(awayTeamPlayers.filter(p => !p.isSubstitute), 'away')}</TabsContent>
                    <TabsContent value="subs" className="pt-4">{renderPlayerInputs(awayTeamPlayers.filter(p => p.isSubstitute), 'away')}</TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trackers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tracker Assignments
                  <Button type="button" onClick={addTrackerAssignment} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {trackerAssignments.map((assignment, index) => (
                  <Card key={index} className="border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Assignment #{index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrackerAssignment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Tracker</Label>
                        <Select
                          value={assignment.tracker_user_id}
                          onValueChange={(value) => updateTrackerAssignment(index, 'tracker_user_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tracker" />
                          </SelectTrigger>
                          <SelectContent>
                            {trackers.map((tracker) => (
                              <SelectItem key={tracker.id} value={tracker.id}>
                                {tracker.full_name} ({tracker.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Event Type Selection */}
                      <div>
                        <Label className="text-base font-medium">Event Types</Label>
                        <div className="space-y-2 mt-2">
                          {EVENT_TYPE_CATEGORIES.map((category) => {
                            const categoryState = getCategoryState(category, index);
                            return (
                              <Collapsible
                                key={category.key}
                                open={openCategories.includes(category.key)}
                                onOpenChange={() => toggleCategory(category.key)}
                              >
                                <div className="flex items-center space-x-2 p-2 rounded-md border">
                                  <Checkbox
                                    checked={categoryState === 'all'}
                                    onCheckedChange={(checked) => handleCategoryToggle(category, !!checked, index)}
                                    className={categoryState === 'some' ? 'data-[state=checked]:bg-blue-300' : ''}
                                  />
                                  <Badge variant="outline" style={{ backgroundColor: category.color, color: 'white', borderColor: category.color }}>
                                    {category.label}
                                  </Badge>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="ml-auto p-0 h-auto">
                                      {openCategories.includes(category.key) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent className="ml-6 mt-2 space-y-1">
                                  {category.events.map((event) => (
                                    <div key={event.key} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={assignment.assigned_event_types.includes(event.key)}
                                        onCheckedChange={(checked) => handleEventTypeChange(event.key, !!checked, index)}
                                      />
                                      <span className="text-sm">{event.label}</span>
                                    </div>
                                  ))}
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>

                      {/* Player Assignment */}
                      <div>
                        <Label>Assigned Players</Label>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={selectedTeamForAssignment[index] === 'home' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleTeamFilterChange(index, 'home')}
                            >
                              Home
                            </Button>
                            <Button
                              type="button"
                              variant={selectedTeamForAssignment[index] === 'away' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleTeamFilterChange(index, 'away')}
                            >
                              Away
                            </Button>
                            <Button
                              type="button"
                              variant={selectedTeamForAssignment[index] === 'both' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleTeamFilterChange(index, 'both')}
                            >
                              Both
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(['home', 'away'] as const).map((team) => {
                              const filteredPlayers = getFilteredPlayers(index, team);
                              if (filteredPlayers.length === 0) return null;
                              return (
                                <div key={team}>
                                  <h4 className="font-medium text-sm mb-2 capitalize">{team} Team</h4>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {filteredPlayers.map((player) => (
                                      <div key={player.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={assignment.player_ids.includes(player.id)}
                                          onCheckedChange={(checked) => {
                                            const newPlayerIds = checked
                                              ? [...assignment.player_ids, player.id]
                                              : assignment.player_ids.filter(id => id !== player.id);
                                            updateTrackerAssignment(index, 'player_ids', newPlayerIds);
                                          }}
                                        />
                                        <span className="text-sm">
                                          {player.number ? `#${player.number}` : ''} {player.name || `Player ${player.id}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {trackerAssignments.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    No tracker assignments yet. Click "Add Assignment" to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Match' : 'Create Match')}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};

export default CreateMatchForm;
