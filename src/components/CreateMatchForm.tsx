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
import { toast as sonnerToast } from 'sonner'; // Using sonner for notifications
import { Textarea } from './ui/textarea'; // Assuming Textarea is available
import { Switch } from './ui/switch'; // Assuming Switch is available

// Schema for form validation using Zod
const matchFormSchema = z.object({
  name: z.string().min(1, 'Match name is required'),
  match_type: z.string().min(1, 'Match type is required'),
  home_team_name: z.string().min(1, 'Home team name is required'),
  away_team_name: z.string().min(1, 'Away team name is required'),
  status: z.string().optional().default('pending'), // Default status
  description: z.string().optional(),
  assigned_tracker_id: z.string().optional(), // Optional: Can be assigned later
  enable_live_tracking: z.boolean().default(false),
});

type MatchFormData = z.infer<typeof matchFormSchema>;

interface TrackerUser {
  id: string;
  full_name: string; // Ensure this is always a string
  email: string;
}

interface CreateMatchFormProps {
  onMatchCreated?: (matchId: string) => void;
  // Add any other props if needed, e.g., for pre-filling form, specific UI variations
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchTrackersError, setFetchTrackersError] = useState<string | null>(null); // For displaying error in UI if needed

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
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

  const fetchTrackers = useCallback(async () => {
    setFetchTrackersError(null); // Clear previous errors
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
        full_name: user.fullName || 'No name provided', // Default if fullName is null
        email: user.email,
      }));
      return mappedData;

    } catch (error: any) {
      console.error('General error in fetchTrackers:', error.message);
      setFetchTrackersError(error.message || 'An unexpected error occurred while fetching trackers.');
      // Avoid double-toasting if already handled by specific checks
      if (!error.message.includes('Function invocation failed') && 
          !error.message.includes('Error fetching trackers') &&
          !error.message.includes('Invalid data format received')) {
          sonnerToast.error(error.message || 'An unexpected error occurred while fetching trackers.');
      }
      throw error; // Re-throw so the calling useEffect can handle it
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
        // Error is already toasted in fetchTrackers
        // fetchTrackersError state is also set in fetchTrackers
        if (isMounted) {
          setTrackers([]); // Clear trackers on error
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
      const { data: matchData, error }_ = await supabase
        .from('matches')
        .insert([
          {
            name: data.name,
            match_type: data.match_type,
            home_team_name: data.home_team_name,
            away_team_name: data.away_team_name,
            status: data.enable_live_tracking ? 'pending_live' : data.status, // Adjust status if live tracking enabled
            description: data.description,
          },
        ])
        .select()
        .single(); // Assuming you want the created match back

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
          // Optionally, implement logic to delete the match if tracker assignment is critical
        }
      }
      
      sonnerToast.success('Match created successfully!');
      reset(); // Reset form fields
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
        <CardDescription>Fill in the details below to create a new match.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Match Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Match Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" placeholder="e.g., Champions League Final" {...field} />}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="match_type">Match Type</Label>
              <Controller
                name="match_type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="match_type">
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
              {errors.match_type && <p className="text-sm text-red-500">{errors.match_type.message}</p>}
            </div>
          </div>

          {/* Team Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="home_team_name">Home Team Name</Label>
              <Controller
                name="home_team_name"
                control={control}
                render={({ field }) => <Input id="home_team_name" placeholder="Enter home team name" {...field} />}
              />
              {errors.home_team_name && <p className="text-sm text-red-500">{errors.home_team_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="away_team_name">Away Team Name</Label>
              <Controller
                name="away_team_name"
                control={control}
                render={({ field }) => <Input id="away_team_name" placeholder="Enter away team name" {...field} />}
              />
              {errors.away_team_name && <p className="text-sm text-red-500">{errors.away_team_name.message}</p>}
            </div>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Match Description (Optional)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="description"
                  placeholder="Add any relevant notes or description for the match..."
                  {...field}
                  rows={3}
                />
              )}
            />
          </div>

          {/* Tracker Assignment and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="assigned_tracker_id">Assign Tracker (Optional)</Label>
              <Controller
                name="assigned_tracker_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="assigned_tracker_id">
                      <SelectValue placeholder="Select a tracker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem> {/* Allow unassigning or not assigning */}
                      {trackers.map((tracker) => (
                        <SelectItem key={tracker.id} value={tracker.id}>
                          {tracker.full_name} ({tracker.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {fetchTrackersError && <p className="text-sm text-red-500">Error loading trackers: {fetchTrackersError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Match Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={control.getValues('enable_live_tracking')}>
                    <SelectTrigger id="status">
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
              {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
            </div>
          </div>

          {/* Enable Live Tracking */}
          <div className="flex items-center space-x-2 pt-2">
            <Controller
              name="enable_live_tracking"
              control={control}
              render={({ field }) => (
                <Switch
                  id="enable_live_tracking"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    // If live tracking is enabled, status might be auto-set or disabled
                    if (checked) {
                      // Optionally reset or disable the manual status field
                      // control.setValue('status', 'pending_live', { shouldValidate: true });
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="enable_live_tracking" className="cursor-pointer">
              Enable Live Tracking for this Match
            </Label>
          </div>
          {control.getValues('enable_live_tracking') && (
            <p className="text-sm text-muted-foreground">
              If enabled, match status will be 'pending_live' and can be started by the assigned tracker.
            </p>
          )}


          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Match...' : 'Create Match'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
