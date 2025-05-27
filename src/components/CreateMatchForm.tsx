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
import { Formation, Team } from '@/types';
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

const CreateMatchForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([]);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
  const { toast: showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeTeam: '',
      awayTeam: '',
      homeFormation: '4-4-2',
      awayFormation: '4-3-3',
      matchDate: '',
      status: 'draft',
      description: '',
    },
  });

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'tracker');

      if (error) {
        console.error('Error fetching trackers:', error);
        toast.error('Failed to fetch trackers');
      } else {
        // Transform data to include email from id (assuming email is the id)
        const trackersWithEmail = (data || []).map(tracker => ({
          ...tracker,
          email: tracker.id // Assuming id is the email
        }));
        setTrackers(trackersWithEmail);
      }
    } catch (error) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to fetch trackers');
    }
  };

  const generateTeamPlayers = (formation: Formation, teamType: 'home' | 'away') => {
    const startId = teamType === 'home' ? 1 : 100;
    return generatePlayersForFormation(teamType, formation, startId);
  };

  const handleHomeFormationChange = (formation: Formation) => {
    form.setValue('homeFormation', formation);
    const players = generateTeamPlayers(formation, 'home');
    setHomeTeamPlayers(players);
  };

  const handleAwayFormationChange = (formation: Formation) => {
    form.setValue('awayFormation', formation);
    const players = generateTeamPlayers(formation, 'away');
    setAwayTeamPlayers(players);
  };

  const sendNotificationToTrackers = async (matchId: string, matchName: string) => {
    if (selectedTrackers.length === 0) return;

    try {
      // Create notifications for each selected tracker
      const notifications = selectedTrackers.map(trackerId => ({
        user_id: trackerId,
        title: 'New Match Available',
        message: `Match "${matchName}" is now live and ready for tracking`,
        match_id: matchId,
        type: 'match_notification'
      }));

      const { error } = await supabase
        .from('notifications')
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
    try {
      const matchName = `${values.homeTeam} vs ${values.awayTeam}`;
      
      const { data, error } = await supabase
        .from('matches')
        .insert([
          {
            home_team_name: values.homeTeam,
            away_team_name: values.awayTeam,
            home_team_formation: values.homeFormation,
            away_team_formation: values.awayFormation,
            home_team_players: homeTeamPlayers,
            away_team_players: awayTeamPlayers,
            match_date: values.matchDate,
            status: values.status,
            description: values.description,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating match:', error);
        showToast({
          variant: 'destructive',
          title: 'Error creating match',
          description: error.message,
        });
      } else {
        // Send notifications to selected trackers
        await sendNotificationToTrackers(data.id, matchName);
        
        showToast({
          title: 'Success',
          description: 'Match created successfully!',
        });
        
        navigate('/matches');
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      showToast({
        variant: 'destructive',
        title: 'Error creating match',
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
        <h1 className="text-3xl font-bold text-gray-900">Create New Match</h1>
        <p className="text-gray-600 mt-2">Set up teams, formations, and notify trackers</p>
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
                        <Input placeholder="Enter home team name" {...field} />
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
                        value={field.value as Formation}
                        onChange={handleHomeFormationChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {homeTeamPlayers.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">{homeTeamPlayers.length} players generated</p>
                  </div>
                )}
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
                        <Input placeholder="Enter away team name" {...field} />
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
                        value={field.value as Formation}
                        onChange={handleAwayFormationChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {awayTeamPlayers.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">{awayTeamPlayers.length} players generated</p>
                  </div>
                )}
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
            {isLoading ? 'Creating Match...' : 'Create Match'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateMatchForm;
