import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast as sonnerToast } from 'sonner';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';

// Schema for form validation using Zod
const matchFormSchema = z.object({
  name: z.string().min(1, 'Match name is required'),
  match_type: z.string().min(1, 'Match type is required'),
  home_team_name: z.string().min(1, 'Home team name is required'),
  away_team_name: z.string().min(1, 'Away team name is required'),
  status: z.string().optional().default('pending'),
  description: z.string().optional(),
  assigned_tracker_id: z.string().optional(),
  enable_live_tracking: z.boolean().default(false),
});

type MatchFormData = z.infer<typeof matchFormSchema>;

interface TrackerUser {
  id: string;
  full_name: string;
  email: string;
}

interface CreateMatchFormProps {
  onMatchCreated?: (matchId: string) => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchTrackersError, setFetchTrackersError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      name: '',
      match_type: '',
      home_team_name: '',
      away_team_name: '',
      status: 'pending',
      description: '',
      assigned_tracker_id: '',
      enable_live_tracking: false,
    },
  });

  const enableLiveTracking = watch('enable_live_tracking');

  const fetchTrackers = useCallback(async () => {
    setFetchTrackersError(null);
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('get-tracker-users', {
        method: 'GET',
      });

      if (invokeError) {
        console.error('Error invoking get-tracker-users function:', invokeError);
        sonnerToast.error(`Function invocation failed: ${invokeError.message}`);
        throw new Error(`Function invocation failed: ${invokeError.message}`);
      }

      if (responseData && responseData.error) {
        console.error('Error from get-tracker-users function:', responseData.error);
        sonnerToast.error(`Error fetching trackers: ${responseData.error.message || responseData.error}`);
        throw new Error(`Error fetching trackers: ${responseData.error.message || responseData.error}`);
      }
      
      if (!Array.isArray(responseData)) {
          console.error('Invalid data format received from get-tracker-users:', responseData);
          sonnerToast.error('Invalid data format received from server.');
          throw new Error('Invalid data format received from server.');
      }

      const mappedData: TrackerUser[] = responseData.map((user: any) => ({
        id: user.id,
        full_name: user.fullName || 'No name provided',
        email: user.email,
      }));
      return mappedData;

    } catch (error: any) {
      console.error('General error in fetchTrackers:', error.message);
      setFetchTrackersError(error.message || 'An unexpected error occurred while fetching trackers.');
      if (!error.message.includes('Function invocation failed') && 
          !error.message.includes('Error fetching trackers') &&
          !error.message.includes('Invalid data format received')) {
          sonnerToast.error(error.message || 'An unexpected error occurred while fetching trackers.');
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadTrackers = async () => {
      try {
        const data = await fetchTrackers();
        if (isMounted) {
          setTrackers(data);
        }
      } catch (error) {
        if (isMounted) {
          setTrackers([]);
        }
        console.error("Failed to load trackers in component:", error);
      }
    };

    loadTrackers();
    return () => {
      isMounted = false;
    };
  }, [fetchTrackers]);

  const onSubmit = async (data: MatchFormData) => {
    setIsLoading(true);
    try {
      const { data: matchData, error } = await supabase
        .from('matches')
        .insert([
          {
            name: data.name,
            match_type: data.match_type,
            home_team_name: data.home_team_name,
            away_team_name: data.away_team_name,
            status: data.enable_live_tracking ? 'pending_live' : data.status,
            description: data.description,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (matchData && data.assigned_tracker_id) {
        const { error: assignmentError } = await supabase
          .from('match_tracker_assignments')
          .insert([
            {
              match_id: matchData.id,
              tracker_user_id: data.assigned_tracker_id,
            },
          ]);
        if (assignmentError) {
          sonnerToast.error(`Match created, but failed to assign tracker: ${assignmentError.message}`);
        }
      }
      
      sonnerToast.success('Match created successfully!');
      reset();
      if (onMatchCreated && matchData) {
        onMatchCreated(matchData.id);
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      sonnerToast.error(`Failed to create match: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create New Match</CardTitle>
          <CardDescription className="text-sm">Fill in the details below to create a new match.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Match Name and Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Match Name</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="name" 
                      placeholder="e.g., Champions League Final" 
                      className="h-9"
                      {...field} 
                    />
                  )}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="match_type" className="text-sm font-medium">Match Type</Label>
                <Controller
                  name="match_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="match_type" className="h-9">
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="league">League</SelectItem>
                        <SelectItem value="cup">Cup</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.match_type && <p className="text-xs text-red-500">{errors.match_type.message}</p>}
              </div>
            </div>

            {/* Row 2: Team Names */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="home_team_name" className="text-sm font-medium">Home Team</Label>
                <Controller
                  name="home_team_name"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="home_team_name" 
                      placeholder="Enter home team name" 
                      className="h-9"
                      {...field} 
                    />
                  )}
                />
                {errors.home_team_name && <p className="text-xs text-red-500">{errors.home_team_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="away_team_name" className="text-sm font-medium">Away Team</Label>
                <Controller
                  name="away_team_name"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="away_team_name" 
                      placeholder="Enter away team name" 
                      className="h-9"
                      {...field} 
                    />
                  )}
                />
                {errors.away_team_name && <p className="text-xs text-red-500">{errors.away_team_name.message}</p>}
              </div>
            </div>

            {/* Row 3: Tracker Assignment and Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assigned_tracker_id" className="text-sm font-medium">Assign Tracker</Label>
                <Controller
                  name="assigned_tracker_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="assigned_tracker_id" className="h-9">
                        <SelectValue placeholder="Select a tracker (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {trackers.map((tracker) => (
                          <SelectItem key={tracker.id} value={tracker.id}>
                            {tracker.full_name} ({tracker.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {fetchTrackersError && <p className="text-xs text-red-500">Error loading trackers</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-sm font-medium">Match Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={enableLiveTracking}
                    >
                      <SelectTrigger id="status" className="h-9">
                        <SelectValue placeholder="Set match status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="postponed">Postponed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
              </div>
            </div>

            {/* Row 4: Description and Live Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="description"
                      placeholder="Add any relevant notes..."
                      className="resize-none h-20"
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="space-y-3 lg:pt-6">
                <div className="flex items-center space-x-2">
                  <Controller
                    name="enable_live_tracking"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="enable_live_tracking"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="enable_live_tracking" className="text-sm cursor-pointer">
                    Enable Live Tracking
                  </Label>
                </div>
                {enableLiveTracking && (
                  <p className="text-xs text-muted-foreground">
                    Status will be set to 'pending_live'
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isLoading} className="min-w-32">
                {isLoading ? 'Creating...' : 'Create Match'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMatchForm;
