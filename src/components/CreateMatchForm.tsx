import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FormationSelector from './FormationSelector';
import { Formation, Player, Team } from '@/types';
import { generatePlayersForFormation } from '@/utils/formationUtils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Send } from 'lucide-react';

const formSchema = z.object({
  homeTeam: z.string().min(2, {
    message: 'Home team must be at least 2 characters.',
  }),
  awayTeam: z.string().min(2, {
    message: 'Away team must be at least 2 characters.',
  }),
  homeFormation: z.string().min(1, 'Home formation is required'),
  awayFormation: z.string().min(1, 'Away formation is required'),
  matchDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'live', 'completed', 'archived']).default('draft'),
  description: z.string().optional(),
});

type MatchFormValues = z.infer<typeof formSchema>;

interface TrackerUser {
  id: string;
  full_name: string;
  email: string;
}

interface CreateMatchFormProps {
  isEditMode?: boolean;
  initialData?: {
    id: string;
    homeTeam: string; // Name
    awayTeam: string; // Name
    home_team_formation?: string; 
    away_team_formation?: string;
    home_team_players?: Player[];
    away_team_players?: Player[];
    matchDate?: string;
    status?: 'draft' | 'published' | 'live' | 'completed' | 'archived';
    description?: string;
  };
  onSubmitOverride?: (values: MatchFormValues, matchId: string) => Promise<void>;
  onSuccess?: () => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ 
  isEditMode = false, 
  initialData, 
  onSubmitOverride, 
  onSuccess 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([]);
  const { toast: showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeTeam: 'Home Team', // Default name
      awayTeam: 'Away Team', // Default name
      homeFormation: '4-4-2',
      awayFormation: '4-3-3',
      matchDate: '',
      status: 'draft',
      description: '',
    },
  });

  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);

  // Effect for initializing teams (create mode or default setup)
  useEffect(() => {
    if (!isEditMode || !initialData) {
      const initialHomeFormation = form.getValues('homeFormation') as Formation || '4-4-2';
      setHomeTeam({
        id: 'home-team-create', // Distinguish ID for creation
        name: form.getValues('homeTeam') || 'Home Team',
        formation: initialHomeFormation,
        players: generatePlayersForFormation('home', initialHomeFormation, 1)
      });

      const initialAwayFormation = form.getValues('awayFormation') as Formation || '4-3-3';
      setAwayTeam({
        id: 'away-team-create', // Distinguish ID for creation
        name: form.getValues('awayTeam') || 'Away Team',
        formation: initialAwayFormation,
        players: generatePlayersForFormation('away', initialAwayFormation, 100)
      });
    }
    fetchTrackers();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial setup only, form.getValues is okay here for initial defaults.

  // Effect for loading data in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        homeTeam: initialData.homeTeam,
        awayTeam: initialData.awayTeam,
        homeFormation: initialData.home_team_formation || '4-4-2',
        awayFormation: initialData.away_team_formation || '4-3-3',
        matchDate: initialData.matchDate || '',
        status: initialData.status || 'draft',
        description: initialData.description || '',
      });

      const homeFormation = (initialData.home_team_formation || '4-4-2') as Formation;
      setHomeTeam({
        id: initialData.id + '-home', // Construct a unique ID for the team state
        name: initialData.homeTeam,
        formation: homeFormation,
        players: initialData.home_team_players && initialData.home_team_players.length > 0 
                   ? initialData.home_team_players 
                   : generatePlayersForFormation('home', homeFormation, 1)
      });
      form.setValue('homeFormation', homeFormation); // Sync form state

      const awayFormation = (initialData.away_team_formation || '4-3-3') as Formation;
      setAwayTeam({
        id: initialData.id + '-away', // Construct a unique ID for the team state
        name: initialData.awayTeam,
        formation: awayFormation,
        players: initialData.away_team_players && initialData.away_team_players.length > 0
                   ? initialData.away_team_players
                   : generatePlayersForFormation('away', awayFormation, 100)
      });
      form.setValue('awayFormation', awayFormation); // Sync form state
    }
  }, [isEditMode, initialData, form.reset, form.setValue]);


  const fetchTrackers = async () => {
    try {
      // Fetch users who have the 'tracker' role in user_roles, and get their profile info
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role,
          profiles (
            id,
            full_name
          )
        `)
        .eq('role', 'tracker');

      if (error) {
        console.error('Error fetching trackers:', error);
        toast.error('Failed to fetch trackers');
        setTrackers([]); // Ensure trackers is empty on error
      } else {
        // Transform data to fit the TrackerUser interface
        // The data will be an array of objects like: { role: 'tracker', profiles: { id: 'uuid', full_name: 'John Doe' } }
        // We need to ensure 'profiles' is not null before accessing its properties.
        const trackersWithEmail = (data || [])
          .filter(item => item.profiles) // Ensure profile data exists
          .map(item => ({
            id: item.profiles.id,          // This is profiles.id which should be the user_id
            full_name: item.profiles.full_name,
            email: item.profiles.id        // Assuming profiles.id (user_id) is used as email or unique identifier for display
          }));
        setTrackers(trackersWithEmail);
      }
    } catch (error) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to fetch trackers');
      setTrackers([]); // Ensure trackers is empty on catch
    }
  };

// --- Logic adapted from TeamSetupWithFormation ---

const updateTeamName = (teamId: 'home' | 'away', name: string) => {
  const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
  const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
  if (!currentTeam) return;

  teamSetter({
    ...currentTeam,
    name
  });
  // Also update the form value for team name
  form.setValue(teamId === 'home' ? 'homeTeam' : 'awayTeam', name);
  };

const updateTeamFormation = (teamId: 'home' | 'away', formation: Formation) => {
  const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
  const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
  if (!currentTeam) return;

  const startId = teamId === 'home' ? 1 : 100;
  const newPlayers = generatePlayersForFormation(teamId, formation, startId);

  teamSetter({
    ...currentTeam,
    formation,
    players: newPlayers
  });
  form.setValue(teamId === 'home' ? 'homeFormation' : 'awayFormation', formation);
  toast.success(`${teamId === 'home' ? 'Home' : 'Away'} team formation updated to ${formation} with new players.`);
  };

const addPlayer = (teamId: 'home' | 'away') => {
  const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
  const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
  if (!currentTeam) return;

  const players = currentTeam.players || [];
  const playerId = teamId === 'home' ?
    Math.max(...(players.map(p => p.id) || [0]), 0) + 1 :
    Math.max(...(players.map(p => p.id) || [99]), 99) + 1; // Ensure away IDs start higher

  const newPlayer: Player = {
    id: playerId,
    name: `Player ${players.length + 1}`,
    number: players.length + 1,
    position: 'Substitute'
  };

  teamSetter({
    ...currentTeam,
    players: [...players, newPlayer]
  });
};

const updatePlayer = (teamId: 'home' | 'away', playerId: number, updates: Partial<Player>) => {
  const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
  const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
  if (!currentTeam) return;

  const updatedPlayers = (currentTeam.players || []).map(player =>
    player.id === playerId ? { ...player, ...updates } : player
  );

  teamSetter({
    ...currentTeam,
    players: updatedPlayers
  });
};

const removePlayer = (teamId: 'home' | 'away', playerId: number) => {
  const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
  const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
  if (!currentTeam) return;

  const updatedPlayers = (currentTeam.players || []).filter(player => player.id !== playerId);

  teamSetter({
    ...currentTeam,
    players: updatedPlayers
  });
  };
// --- End of adapted logic ---


  const sendNotificationToTrackers = async (matchId: string, matchName: string) => {
    if (selectedTrackers.length === 0) return;

    try {
      // Create notifications for each selected tracker
      const notifications = selectedTrackers.map(trackerId => ({
        tracker_id: trackerId, // Changed from user_id
        message: `Match "${matchName}" is now live and ready for tracking`,
        match_id: matchId,
        is_read: false // Explicitly set
        // title and type fields removed
      }));

      const { error } = await supabase
        .from('match_notifications') // Changed table name
        .insert(notifications);

      if (error) {
        console.error('Error sending notifications:', error);
        toast.error('Failed to send notifications to trackers');
      } else {
        toast.success(`Notifications sent to ${selectedTrackers.length} trackers`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    }
  };

  const handleFormSubmit = async (values: MatchFormValues) => {
    setIsLoading(true);
    const matchDataPayload = {
      home_team_name: homeTeam?.name || values.homeTeam,
      away_team_name: awayTeam?.name || values.awayTeam,
      home_team_formation: homeTeam?.formation || values.homeFormation,
      away_team_formation: awayTeam?.formation || values.awayFormation,
      home_team_players: homeTeam?.players || [],
      away_team_players: awayTeam?.players || [],
      match_date: values.matchDate,
      status: values.status,
      description: values.description,
      // created_by is only for new matches
    };

    try {
      if (isEditMode && onSubmitOverride && initialData) {
        // Prepare values specifically for the override, ensuring they match MatchFormValues
        const submissionValues: MatchFormValues = {
          homeTeam: matchDataPayload.home_team_name,
          awayTeam: matchDataPayload.away_team_name,
          homeFormation: matchDataPayload.home_team_formation,
          awayFormation: matchDataPayload.away_team_formation,
          matchDate: matchDataPayload.match_date,
          status: matchDataPayload.status as MatchFormValues['status'],
          description: matchDataPayload.description,
        };
        // Additionally, pass the player data if onSubmitOverride needs it,
        // though the current signature doesn't explicitly list them.
        // For now, we'll extend it ad-hoc or assume onSubmitOverride fetches them if needed.
        const fullPayloadForOverride = {
            ...submissionValues, // The Zod schema conformant part
            home_team_players: matchDataPayload.home_team_players,
            away_team_players: matchDataPayload.away_team_players,
        };

        await onSubmitOverride(fullPayloadForOverride as any, initialData.id); // Cast as any if payload differs
        showToast({
          title: 'Success',
          description: 'Match updated successfully!',
        });
        if (onSuccess) onSuccess();
      } else {
        // Create new match
        const matchName = `${matchDataPayload.home_team_name} vs ${matchDataPayload.away_team_name}`;
        const { data, error } = await supabase
          .from('matches')
          .insert([{ ...matchDataPayload, created_by: user?.id }])
          .select()
          .single();

        if (error) throw error;

        await sendNotificationToTrackers(data.id, matchName);
        showToast({
          title: 'Success',
          description: 'Match created successfully!',
        });
        if (onSuccess) onSuccess();
        else navigate('/matches'); // Default navigation if no onSuccess provided for create
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} match:`, error);
      showToast({
        variant: 'destructive',
        title: `Error ${isEditMode ? 'updating' : 'creating'} match`,
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTrackerSelection = (trackerId: string) => {
    setSelectedTrackers(prev => 
      prev.includes(trackerId) 
        ? prev.filter(id => id !== trackerId)
        : [...prev, trackerId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit Match' : 'Create New Match'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isEditMode ? 'Update the details of the existing match.' : 'Set up teams, formations, and notify trackers.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Home Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="homeTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter home team name" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            updateTeamName('home', e.target.value);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="homeFormation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formation</FormLabel>
                      <FormationSelector
                        value={(homeTeam?.formation || field.value) as Formation}
                        onChange={(newFormation) => updateTeamFormation('home', newFormation)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Player Management UI for Home Team */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold">Players</h3>
                    <Button type="button" onClick={() => addPlayer('home')} size="sm">Add Player</Button>
                  </div>
                  {(!homeTeam?.players || homeTeam.players.length === 0) ? (
                    <div className="text-center py-4 border rounded-md">
                      <p className="text-muted-foreground mb-2">No players added yet.</p>
                      <Button 
                        type="button" 
                        onClick={() => updateTeamFormation('home', homeTeam?.formation || '4-4-2')}
                        variant="outline"
                        size="sm"
                      >
                        Generate Players for {homeTeam?.formation || '4-4-2'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {homeTeam.players.map((player, index) => (
                        <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                          <div className="col-span-1">
                            <Input
                              type="number"
                              value={player.number}
                              onChange={(e) => updatePlayer('home', player.id, { number: parseInt(e.target.value) })}
                              placeholder="#"
                              className="text-xs p-1 h-8"
                              min="1"
                              max="99"
                            />
                          </div>
                          <div className="col-span-5">
                            <Input
                              value={player.name}
                              onChange={(e) => updatePlayer('home', player.id, { name: e.target.value })}
                              placeholder={`Player ${index + 1}`}
                              className="text-xs p-1 h-8"
                            />
                          </div>
                          <div className="col-span-4">
                            <Input
                              value={player.position}
                              onChange={(e) => updatePlayer('home', player.id, { position: e.target.value })}
                              placeholder="Position"
                              className="text-xs p-1 h-8"
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removePlayer('home', player.id)} className="text-xs h-8">
                              X
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Away Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="awayTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter away team name" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            updateTeamName('away', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="awayFormation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formation</FormLabel>
                      <FormationSelector
                        value={(awayTeam?.formation || field.value) as Formation}
                        onChange={(newFormation) => updateTeamFormation('away', newFormation)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Player Management UI for Away Team */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold">Players</h3>
                    <Button type="button" onClick={() => addPlayer('away')} size="sm">Add Player</Button>
                  </div>
                  {(!awayTeam?.players || awayTeam.players.length === 0) ? (
                    <div className="text-center py-4 border rounded-md">
                      <p className="text-muted-foreground mb-2">No players added yet.</p>
                      <Button 
                        type="button" 
                        onClick={() => updateTeamFormation('away', awayTeam?.formation || '4-3-3')}
                        variant="outline"
                        size="sm"
                      >
                        Generate Players for {awayTeam?.formation || '4-3-3'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {awayTeam.players.map((player, index) => (
                        <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                           <div className="col-span-1">
                            <Input
                              type="number"
                              value={player.number}
                              onChange={(e) => updatePlayer('away', player.id, { number: parseInt(e.target.value) })}
                              placeholder="#"
                              className="text-xs p-1 h-8"
                              min="1"
                              max="99"
                            />
                          </div>
                          <div className="col-span-5">
                            <Input
                              value={player.name}
                              onChange={(e) => updatePlayer('away', player.id, { name: e.target.value })}
                              placeholder={`Player ${index + 1}`}
                              className="text-xs p-1 h-8"
                            />
                          </div>
                          <div className="col-span-4">
                            <Input
                              value={player.position}
                              onChange={(e) => updatePlayer('away', player.id, { position: e.target.value })}
                              placeholder="Position"
                              className="text-xs p-1 h-8"
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removePlayer('away', player.id)} className="text-xs h-8">
                              X
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="matchDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Set the date and time for the match.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Set the status of the match.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter match description"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Write a brief description of the match.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Notify Trackers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {trackers.map((tracker) => (
                  <div
                    key={tracker.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTrackers.includes(tracker.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleTrackerSelection(tracker.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{tracker.full_name || 'Unknown'}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{tracker.email}</p>
                  </div>
                ))}
              </div>
              {selectedTrackers.length > 0 && (
                <p className="text-sm text-blue-600 mt-3">
                  {selectedTrackers.length} tracker(s) will be notified
                </p>
              )}
            </CardContent>
          </Card>

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading 
              ? (isEditMode ? 'Updating Match...' : 'Creating Match...') 
              : (isEditMode ? 'Update Match' : 'Create Match')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateMatchForm;
