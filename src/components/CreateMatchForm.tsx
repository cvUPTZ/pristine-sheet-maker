import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FormationSelector from './FormationSelector'; // Ensure this path is correct
import { Formation, Player, Team } from '@/types'; // Ensure this path is correct
import { generatePlayersForFormation } from '@/utils/formationUtils'; // Ensure this path is correct
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Send } from 'lucide-react';

const formSchema = z.object({
  homeTeam: z.string().min(2, {
    message: 'Home team name must be at least 2 characters.',
  }),
  awayTeam: z.string().min(2, {
    message: 'Away team name must be at least 2 characters.',
  }),
  homeFormation: z.string().min(1, 'Home formation is required'),
  awayFormation: z.string().min(1, 'Away formation is required'),
  matchDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'live', 'completed', 'archived']).default('draft'),
  description: z.string().max(500, "Description too long").optional(),
});

type MatchFormValues = z.infer<typeof formSchema>;

interface TrackerUser {
  id: string; // user_id from profiles table (which is a FK to auth.users.id)
  full_name: string | null;
  email?: string; // Email fetched from related auth.users table
}

interface CreateMatchFormProps {
  isEditMode?: boolean;
  initialData?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    home_team_formation?: string;
    away_team_formation?: string;
    home_team_players?: Player[];
    away_team_players?: Player[];
    matchDate?: string;
    status?: 'draft' | 'published' | 'live' | 'completed' | 'archived';
    description?: string;
  };
  onSubmitOverride?: (values: MatchFormValues & { home_team_players?: Player[]; away_team_players?: Player[]; }, matchId: string) => Promise<void>;
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeTeam: initialData?.homeTeam || 'Home Team Alpha',
      awayTeam: initialData?.awayTeam || 'Away Team Beta',
      homeFormation: initialData?.home_team_formation || '4-4-2',
      awayFormation: initialData?.away_team_formation || '4-3-3',
      matchDate: initialData?.matchDate || '',
      status: initialData?.status || 'draft',
      description: initialData?.description || '',
    },
  });

  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);

  // fetchTrackers function with the corrected Supabase select query
  const fetchTrackers = useCallback(async () => {
    try {
      // Corrected select syntax:
      // - 'id' and 'full_name' are from 'profiles'.
      // - 'user_email_data:id(email)' means:
      //   - Use the 'id' column of the 'profiles' table (which is an FK to auth.users.id).
      //   - From the related 'auth.users' record, fetch the 'email' column.
      //   - Make this resulting object { email: '...' } available under the alias 'user_email_data'.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_email_data:id(email)') // THIS IS THE CORRECTED SYNTAX
        .eq('role', 'tracker');

      if (error) {
        // The error message you provided (PGRST100 for "...user_auth_email_data:auth.users(email)...")
        // indicates that an older version of this select string was causing the issue.
        // This new string should resolve that specific PGRST100 error.
        console.error('Error fetching trackers:', error);
        sonnerToast.error('Failed to fetch trackers: ' + error.message);

        if (error.code === 'PGRST100') {
            sonnerToast.info("Hint (PGRST100): This indicates a parsing error in the 'select' query. Ensure the syntax for fetching related data is correct, especially if foreign key relationships are involved. The current syntax `user_email_data:id(email)` should be correct if `profiles.id` correctly references `auth.users.id`.");
        } else if (error.code === '42703') { // PostgreSQL: column does not exist
            sonnerToast.info("Hint (42703): A column specified in the query does not exist. Double-check column names and table aliases.");
        } else if (error.code === 'PGRST200') { // PostgREST: schema cache issue
             sonnerToast.info("Hint (PGRST200): This could indicate a schema cache issue or a problem with PostgREST finding relationships. Try reloading the schema in Supabase (Project Settings > API > Reload Schema) or check foreign key definitions.");
        }
        setTrackers([]);
      } else {
        const fetchedTrackers: TrackerUser[] = (data || []).map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          // Access the email from the aliased nested object
          email: profile.user_email_data?.email || 'No email provided'
        }));
        setTrackers(fetchedTrackers);
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchTrackers catch block:', err);
      sonnerToast.error('An unexpected error occurred while fetching trackers: ' + err.message);
      setTrackers([]);
    }
  }, []); // supabase is stable, empty dependency array is fine.

  useEffect(() => {
    const initializeTeam = (
      teamType: 'home' | 'away',
      defaultName: string,
      defaultFormation: Formation,
      playerStartId: number,
      initialPlayers?: Player[],
      initialTeamName?: string,
      initialFormation?: string
    ) => {
      const teamName = isEditMode && initialTeamName ? initialTeamName : form.getValues(teamType === 'home' ? 'homeTeam' : 'awayTeam') || defaultName;
      const formation = (isEditMode && initialFormation ? initialFormation : form.getValues(teamType === 'home' ? 'homeFormation' : 'awayFormation') || defaultFormation) as Formation;
      
      let players: Player[];
      if (isEditMode && initialPlayers && initialPlayers.length > 0) {
        players = initialPlayers;
      } else {
        players = generatePlayersForFormation(teamType, formation, playerStartId);
      }

      return {
        id: isEditMode && initialData ? `${initialData.id}-${teamType}` : `${teamType}-team-create`,
        name: teamName,
        formation: formation,
        players: players,
      };
    };

    setHomeTeam(
      initializeTeam(
        'home',
        'Home Team Alpha',
        '4-4-2',
        1,
        initialData?.home_team_players,
        initialData?.homeTeam,
        initialData?.home_team_formation
      )
    );
    setAwayTeam(
      initializeTeam(
        'away',
        'Away Team Beta',
        '4-3-3',
        100,
        initialData?.away_team_players,
        initialData?.awayTeam,
        initialData?.away_team_formation
      )
    );
    
    fetchTrackers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialData, fetchTrackers, form.getValues]);

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
    }
  }, [isEditMode, initialData, form.reset]);


  const updateTeamName = (teamId: 'home' | 'away', name: string) => {
    const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
    const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
    if (!currentTeam) return;

    teamSetter({ ...currentTeam, name });
    form.setValue(teamId === 'home' ? 'homeTeam' : 'awayTeam', name, { shouldValidate: true });
  };

  const updateTeamFormation = (teamId: 'home' | 'away', newFormation: Formation) => {
    const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
    const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
    if (!currentTeam) return;

    const startId = teamId === 'home' ? 1 : (currentTeam.players && currentTeam.players.length > 0 ? Math.max(...currentTeam.players.map(p=>p.id), 99) + 1 : 100);
    const newPlayers = generatePlayersForFormation(teamId, newFormation, startId);

    teamSetter({
      ...currentTeam,
      formation: newFormation,
      players: newPlayers
    });
    form.setValue(teamId === 'home' ? 'homeFormation' : 'awayFormation', newFormation, { shouldValidate: true });
    sonnerToast.success(`${teamId === 'home' ? 'Home' : 'Away'} team formation updated to ${newFormation}. Players reset.`);
  };

  const addPlayer = (teamId: 'home' | 'away') => {
    const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
    const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
    if (!currentTeam) return;

    const players = currentTeam.players || [];
    const existingIds = players.map(p => p.id);
    let newPlayerId = teamId === 'home' ? 1 : 100;
    if (players.length > 0) {
        newPlayerId = Math.max(...existingIds, teamId === 'home' ? 0 : 99) + 1;
    }
    while (existingIds.includes(newPlayerId)) {
      newPlayerId++;
    }
    
    const newPlayer: Player = {
      id: newPlayerId,
      name: `Player ${newPlayerId}`,
      number: newPlayerId <= 99 ? newPlayerId : (players.length > 0 ? Math.max(...players.map(p => p.number || 0)) + 1 : 1),
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
    if (!currentTeam || !currentTeam.players) return;

    const updatedPlayers = currentTeam.players.map(player =>
      player.id === playerId ? { ...player, ...updates } : player
    );

    teamSetter({ ...currentTeam, players: updatedPlayers });
  };

  const removePlayer = (teamId: 'home' | 'away', playerId: number) => {
    const teamSetter = teamId === 'home' ? setHomeTeam : setAwayTeam;
    const currentTeam = teamId === 'home' ? homeTeam : awayTeam;
    if (!currentTeam || !currentTeam.players) return;

    const updatedPlayers = currentTeam.players.filter(player => player.id !== playerId);
    teamSetter({ ...currentTeam, players: updatedPlayers });
  };

  const sendNotificationToTrackers = async (matchId: string, matchName: string) => {
    if (selectedTrackers.length === 0) return;

    try {
      const notifications = selectedTrackers.map(trackerUserId => ({
        tracker_user_id: trackerUserId,
        message: `Match "${matchName}" created/updated and needs attention.`,
        match_id: matchId,
        is_read: false,
      }));

      const { error } = await supabase
        .from('match_notifications')
        .insert(notifications);

      if (error) {
        console.error('Error sending notifications:', error);
        sonnerToast.error('Failed to send notifications: ' + error.message);
      } else {
        sonnerToast.success(`Notifications sent to ${selectedTrackers.length} tracker(s).`);
      }
    } catch (err: any) {
      console.error('Error sending notifications:', err);
      sonnerToast.error('An unexpected error occurred while sending notifications: ' + err.message);
    }
  };

  const handleFormSubmit = async (values: MatchFormValues) => {
    setIsLoading(true);
    if (!homeTeam || !awayTeam) {
      sonnerToast.error("Team data is not properly initialized.");
      setIsLoading(false);
      return;
    }

    const matchDataPayload = {
      home_team_name: homeTeam.name,
      away_team_name: awayTeam.name,
      home_team_formation: homeTeam.formation,
      away_team_formation: awayTeam.formation,
      home_team_players: homeTeam.players,
      away_team_players: awayTeam.players,
      match_date: values.matchDate || null,
      status: values.status,
      description: values.description || null,
    };

    try {
      if (isEditMode && onSubmitOverride && initialData?.id) {
        const submissionPayloadForOverride = {
            ...values,
            home_team_players: matchDataPayload.home_team_players,
            away_team_players: matchDataPayload.away_team_players,
        };
        await onSubmitOverride(submissionPayloadForOverride, initialData.id);
        sonnerToast.success('Match updated successfully!');
        if (onSuccess) onSuccess();
      } else {
        if (!user?.id) {
          sonnerToast.error("User not authenticated. Cannot create match.");
          setIsLoading(false);
          return;
        }
        const createPayload = { ...matchDataPayload, created_by: user.id };
        const { data: newMatch, error } = await supabase
          .from('matches')
          .insert([createPayload])
          .select()
          .single();

        if (error) throw error;
        if (!newMatch) throw new Error("Match creation failed to return data.");

        const matchName = `${newMatch.home_team_name} vs ${newMatch.away_team_name}`;
        await sendNotificationToTrackers(newMatch.id, matchName);
        sonnerToast.success('Match created successfully!');
        if (onSuccess) onSuccess();
        else navigate('/admin/matches');
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} match:`, error);
      sonnerToast.error(`Error: ${error.message || 'An unknown error occurred.'}`);
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8"> {/* Layout: Increased max-width */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? 'Edit Match' : 'Create New Match'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
          {isEditMode ? 'Update the details of the existing match.' : 'Set up teams, formations, and notify trackers.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 sm:space-y-8">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Home Team Card */}
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
                        value={homeTeam?.formation || field.value as Formation}
                        onChange={(newFormation) => updateTeamFormation('home', newFormation)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold">Players</h3>
                    <Button type="button" onClick={() => addPlayer('home')} size="sm" variant="outline">Add Player</Button>
                  </div>
                  {(!homeTeam?.players || homeTeam.players.length === 0) ? (
                     <div className="text-center py-4 border rounded-md text-gray-500 dark:text-gray-400">
                       <p className="mb-2">No players yet.</p>
                       <Button
                         type="button"
                         onClick={() => updateTeamFormation('home', homeTeam?.formation || form.getValues('homeFormation') as Formation || '4-4-2')}
                         variant="outline"
                         size="sm"
                       >
                         Generate for {homeTeam?.formation || form.getValues('homeFormation') || '4-4-2'}
                       </Button>
                     </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md">
                      {homeTeam.players.map((player, index) => (
                        <div key={`home-player-${player.id}`} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                          <div className="col-span-1 sm:col-span-1">
                            <Input type="number" value={player.number || ''} onChange={(e) => updatePlayer('home', player.id, { number: parseInt(e.target.value) || undefined })} placeholder="#" className="text-xs p-1 h-8 w-full" min="1" max="99"/>
                          </div>
                          <div className="col-span-6 sm:col-span-5">
                            <Input value={player.name} onChange={(e) => updatePlayer('home', player.id, { name: e.target.value })} placeholder={`P ${index + 1}`} className="text-xs p-1 h-8"/>
                          </div>
                          <div className="col-span-3 sm:col-span-4">
                            <Input value={player.position} onChange={(e) => updatePlayer('home', player.id, { position: e.target.value })} placeholder="Pos" className="text-xs p-1 h-8"/>
                          </div>
                          <div className="col-span-2 sm:col-span-2 text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePlayer('home', player.id)} className="text-xs h-8 w-8 text-red-500 hover:text-red-700">X</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Away Team Card */}
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
                        value={awayTeam?.formation || field.value as Formation}
                        onChange={(newFormation) => updateTeamFormation('away', newFormation)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold">Players</h3>
                    <Button type="button" onClick={() => addPlayer('away')} size="sm" variant="outline">Add Player</Button>
                  </div>
                  {(!awayTeam?.players || awayTeam.players.length === 0) ? (
                     <div className="text-center py-4 border rounded-md text-gray-500 dark:text-gray-400">
                       <p className="mb-2">No players yet.</p>
                       <Button
                         type="button"
                         onClick={() => updateTeamFormation('away', awayTeam?.formation || form.getValues('awayFormation') as Formation || '4-3-3')}
                         variant="outline"
                         size="sm"
                       >
                         Generate for {awayTeam?.formation || form.getValues('awayFormation') || '4-3-3'}
                       </Button>
                     </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md">
                      {awayTeam.players.map((player, index) => (
                        <div key={`away-player-${player.id}`} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                           <div className="col-span-1 sm:col-span-1">
                            <Input type="number" value={player.number || ''} onChange={(e) => updatePlayer('away', player.id, { number: parseInt(e.target.value) || undefined })} placeholder="#" className="text-xs p-1 h-8 w-full" min="1" max="99"/>
                          </div>
                          <div className="col-span-6 sm:col-span-5">
                            <Input value={player.name} onChange={(e) => updatePlayer('away', player.id, { name: e.target.value })} placeholder={`P ${index + 1}`} className="text-xs p-1 h-8"/>
                          </div>
                          <div className="col-span-3 sm:col-span-4">
                            <Input value={player.position} onChange={(e) => updatePlayer('away', player.id, { position: e.target.value })} placeholder="Pos" className="text-xs p-1 h-8"/>
                          </div>
                          <div className="col-span-2 sm:col-span-2 text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePlayer('away', player.id)} className="text-xs h-8 w-8 text-red-500 hover:text-red-700">X</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="matchDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Set the date and time for the match.
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
                    The current status of the match.
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
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., League Match - Week 5, Friendly Tussle"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A brief description or title for the match.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Notify Trackers (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trackers.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {trackers.map((tracker) => (
                      <div
                        key={tracker.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors dark:border-gray-600 ${
                          selectedTrackers.includes(tracker.id)
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => toggleTrackerSelection(tracker.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                          <span className="font-medium text-gray-800 dark:text-gray-200">{tracker.full_name || 'Unnamed Tracker'}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tracker.email || `ID: ${tracker.id}`}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No trackers found with the 'tracker' role or unable to fetch tracker details.</p>
                )}
                {selectedTrackers.length > 0 && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-3">
                    {selectedTrackers.length} tracker(s) will be notified upon match creation.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading
              ? (isEditMode ? 'Updating Match...' : 'Creating Match...')
              : (isEditMode ? 'Save Changes' : 'Create Match')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateMatchForm;
