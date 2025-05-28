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
import { Textarea } from '@/components/ui/textarea'; // Corrected import path
import { Switch } from '@/components/ui/switch';

// Schema for form validation using Zod
const matchFormSchema = z.object({
  name: z.string().min(1, 'Match name is required').max(255, 'Match name is too long'),
  match_type: z.string().min(1, 'Match type is required'),
  home_team_name: z.string().min(1, 'Home team name is required').max(100, 'Home team name is too long'),
  away_team_name: z.string().min(1, 'Away team name is required').max(100, 'Away team name is too long'),
  status: z.string().min(1, "Status is required").default('pending'), // Made status required as it's always set
  description: z.string().optional(),
  assigned_tracker_id: z.string().optional(),
  enable_live_tracking: z.boolean().default(false),
});

export type MatchFormData = z.infer<typeof matchFormSchema>;

interface TrackerUser {
  id: string;
  full_name: string;
  email: string;
}

interface CreateMatchFormProps {
  onSuccess?: (matchId: string) => void; // Renamed from onMatchCreated for generality
  isEditMode?: boolean;
  initialData?: Partial<MatchFormData> & { id?: string }; // id is for context, not part of form schema
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onSuccess, isEditMode = false, initialData }) => {
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchTrackersError, setFetchTrackersError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue, // Added for dependent field updates
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

  const fetchTrackersCb = useCallback(async () => { // Renamed to avoid conflict
    setFetchTrackersError(null);
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('get-tracker-users', {
        method: 'GET',
      });

      if (invokeError) throw new Error(`Function invocation failed: ${invokeError.message}`);
      if (responseData && responseData.error) throw new Error(`Error fetching trackers: ${responseData.error.message || responseData.error}`);
      if (!Array.isArray(responseData)) throw new Error('Invalid data format received from server.');

      const mappedData: TrackerUser[] = responseData.map((user: any) => ({
        id: user.id,
        full_name: user.fullName || user.full_name || 'No name provided',
        email: user.email,
      }));
      return mappedData;

    } catch (error: any) {
      console.error('General error in fetchTrackersCb:', error.message);
      const errorMessage = error.message || 'An unexpected error occurred while fetching trackers.';
      setFetchTrackersError(errorMessage);
      sonnerToast.error(errorMessage); // Toast once here
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadTrackers = async () => {
      try {
        const data = await fetchTrackersCb();
        if (isMounted) setTrackers(data);
      } catch (error) {
        if (isMounted) setTrackers([]);
        console.error("Failed to load trackers in component:", error);
      }
    };
    loadTrackers();
    return () => { isMounted = false; };
  }, [fetchTrackersCb]);

  useEffect(() => {
    const populateFormForEdit = async () => {
      if (isEditMode && initialData) {
        let currentAssignedTrackerId = '';
        if (initialData.id) { // Fetch assigned tracker if editing an existing match
          try {
            const { data: assignment, error: assignmentError } = await supabase
              .from('match_tracker_assignments')
              .select('tracker_user_id')
              .eq('match_id', initialData.id)
              // .is('player_id', null) // If you distinguish general match vs player-specific assignments here
              .maybeSingle();

            if (assignmentError) console.error("Error fetching tracker assignment for edit:", assignmentError.message);
            if (assignment) currentAssignedTrackerId = assignment.tracker_user_id;
          } catch (e: any) {
            console.error("Exception fetching tracker assignment:", e.message);
          }
        }

        const dataToReset: Partial<MatchFormData> = {
          name: initialData.name || '',
          match_type: initialData.match_type || '',
          home_team_name: initialData.home_team_name || '',
          away_team_name: initialData.away_team_name || '',
          description: initialData.description || '',
          assigned_tracker_id: currentAssignedTrackerId || initialData.assigned_tracker_id || '',
        };

        if (initialData.status === 'pending_live') {
          dataToReset.enable_live_tracking = true;
          dataToReset.status = 'pending_live'; // Keep it as pending_live for the display
        } else {
          dataToReset.enable_live_tracking = false;
          dataToReset.status = initialData.status || 'pending';
        }
        reset(dataToReset as MatchFormData);
      } else {
        // Reset to creation defaults if not in edit mode or no initial data
        reset({
          name: '', match_type: '', home_team_name: '', away_team_name: '',
          status: 'pending', description: '', assigned_tracker_id: '',
          enable_live_tracking: false,
        });
      }
    };
    populateFormForEdit();
  }, [isEditMode, initialData, reset, supabase]);

  // Effect to manage status when enableLiveTracking changes
  useEffect(() => {
    if (enableLiveTracking) {
      setValue('status', 'pending_live', { shouldValidate: true });
    } else {
      // If was pending_live and now disabled, revert to 'pending' or initial status
      if (watch('status') === 'pending_live') {
        setValue('status', initialData?.status && initialData.status !== 'pending_live' ? initialData.status : 'pending', { shouldValidate: true });
      }
    }
  }, [enableLiveTracking, setValue, initialData, watch]);


  const onSubmit = async (data: MatchFormData) => {
    setIsLoading(true);
    try {
      const matchPayload = {
        name: data.name.trim(),
        match_type: data.match_type.trim(),
        home_team_name: data.home_team_name.trim(),
        away_team_name: data.away_team_name.trim(),
        status: data.enable_live_tracking ? 'pending_live' : (data.status || 'pending'),
        description: data.description?.trim() || null,
      };

      let reportedMatchId: string | undefined;

      if (isEditMode && initialData?.id) {
        console.log('Updating match with payload:', matchPayload, 'for ID:', initialData.id);
        const { data: updatedMatchData, error: updateError } = await supabase
          .from('matches')
          .update(matchPayload)
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        if (!updatedMatchData) throw new Error('Match update failed or no data returned.');
        
        reportedMatchId = updatedMatchData.id;
        console.log('Match updated successfully:', updatedMatchData);
        
        // Handle tracker assignment update for edit mode
        // Remove existing general assignment for this match (if any)
        await supabase.from('match_tracker_assignments').delete().eq('match_id', updatedMatchData.id);
            // .is('player_id', null); // If distinguishing general match trackers

        if (data.assigned_tracker_id) { // If a new tracker is selected
          const { error: assignmentError } = await supabase
            .from('match_tracker_assignments')
            .insert([{ match_id: updatedMatchData.id, tracker_user_id: data.assigned_tracker_id }]);
          if (assignmentError) {
            console.error('Error updating tracker assignment:', assignmentError);
            sonnerToast.warning(`Match updated, but tracker assignment failed: ${assignmentError.message}`);
          }
        }
        sonnerToast.success('Match updated successfully!');

      } else { // Creation Mode
        console.log('Creating match with payload:', matchPayload);
        const { data: newMatchData, error: createError } = await supabase
          .from('matches')
          .insert([matchPayload])
          .select('id')
          .single();

        if (createError) throw createError;
        if (!newMatchData || !newMatchData.id) throw new Error('Match created but no data returned from database');
        
        reportedMatchId = newMatchData.id;
        console.log('Match created successfully:', newMatchData);

        if (data.assigned_tracker_id) {
          const { error: assignmentError } = await supabase
            .from('match_tracker_assignments')
            .insert([{ match_id: newMatchData.id, tracker_user_id: data.assigned_tracker_id }]);
          if (assignmentError) {
            console.error('Error assigning tracker:', assignmentError);
            // Don't throw, match was created. Show a warning/error toast.
            sonnerToast.error(`Match created, but failed to assign tracker: ${assignmentError.message}`);
          }
        }
        sonnerToast.success('Match created successfully!');
        reset(); // Reset form only on successful creation
      }
      
      if (onSuccess && reportedMatchId) {
        onSuccess(reportedMatchId);
      }

    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} match:`, error);
      sonnerToast.error(`Failed to ${isEditMode ? 'update' : 'create'} match: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... JSX structure (unchanged from original except button text) ...
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{isEditMode ? 'Edit Match' : 'Create New Match'}</CardTitle>
          <CardDescription className="text-sm">
            {isEditMode ? 'Update the details for this match.' : 'Fill in the details below to create a new match.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Match Name and Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Match Name <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="match_type" className="text-sm font-medium">
                  Match Type <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="match_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value || ""}>
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
                <Label htmlFor="home_team_name" className="text-sm font-medium">
                  Home Team <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="away_team_name" className="text-sm font-medium">
                  Away Team <span className="text-red-500">*</span>
                </Label>
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
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
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
                {fetchTrackersError && !trackers.length && <p className="text-xs text-red-500">Error loading trackers: {fetchTrackersError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-sm font-medium">Match Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      defaultValue={field.value} 
                      disabled={enableLiveTracking}
                    >
                      <SelectTrigger id="status" className="h-9">
                        <SelectValue placeholder="Set match status" />
                      </SelectTrigger>
                      <SelectContent>
                        {enableLiveTracking && <SelectItem value="pending_live">Pending Live</SelectItem>}
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
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
                      value={field.value || ''} // Ensure controlled component if value can be null/undefined
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
                    Status will be set to 'pending_live'.
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isLoading} className="min-w-32">
                {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Match' : 'Create Match')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMatchForm;
