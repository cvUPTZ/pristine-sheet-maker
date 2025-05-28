"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react"; // Added useState
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select components
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { Label } from "@/components/ui/label"; // Added Label
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types";

// Define the schema for a single player
export const playerSchema = z.object({ // Exported for potential use elsewhere
  id: z.string().optional(), // For existing players, not part of DB schema for match_rosters directly but useful for UI keying
  name: z.string().min(2, { message: "Player name must be at least 2 characters." }),
  jerseyNumber: z.coerce.number().int().min(0, { message: "Jersey number must be a non-negative integer." }), // Allow 0
  position: z.string().min(2, { message: "Position must be at least 2 characters." }),
});

export type PlayerFormValues = z.infer<typeof playerSchema>; // Exported for potential use elsewhere

// Define the schema for a single tracker assignment configuration
export const trackerAssignmentConfigSchema = z.object({
  id: z.string().optional(), // For UI keying, not directly for DB
  trackerUserId: z.string().min(1, "Tracker selection is required."),
  assignmentScope: z.enum(["ENTIRE_MATCH", "SPECIFIC_PLAYER"], {
    required_error: "Assignment scope is required.",
  }),
  assignedPlayerIdentifier: z.string().optional(), // Format: "home:index" or "away:index"
  assignedEventTypes: z.array(z.string()).optional().default([]),
});

export type TrackerAssignmentConfigFormValues = z.infer<typeof trackerAssignmentConfigSchema>;


// Define the main form schema
export const matchFormSchema = z.object({ // Exported for potential use elsewhere
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().min(1, { message: "Status is required." }),
  match_type: z.string().optional(),
  matchDate: z.string().min(1, { message: "Match date is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  competition: z.string().min(1, { message: "Competition is required." }),
  notes: z.string().optional(),
  homeTeamName: z.string().min(1, { message: "Home team name is required." }),
  awayTeamName: z.string().min(1, { message: "Away team name is required." }),
  homeTeamFormation: z.string().optional(), // Added home team formation
  awayTeamFormation: z.string().optional(), // Added away team formation
  homeTeamScore: z.coerce.number().int().min(0, { message: "Score must be a non-negative integer." }).optional(),
  awayTeamScore: z.coerce.number().int().min(0, { message: "Score must be a non-negative integer." }).optional().nullable(),
  homeTeamPlayers: z.array(playerSchema).optional(),
  awayTeamPlayers: z.array(playerSchema).optional(),
  trackerAssignments: z.array(trackerAssignmentConfigSchema).optional(),
});

export type MatchFormValues = z.infer<typeof matchFormSchema>; 

const commonFormations = [
  "None", "Other",
  "4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "4-5-1", "3-4-3",
  "5-3-2", "4-1-4-1", "4-4-1-1", "4-1-3-2", "3-4-1-2",
];

// Placeholder for global event type configuration
const ALL_EVENT_TYPES_CONFIG = [
    { key: 'pass', label: 'Pass' }, { key: 'shot', label: 'Shot' }, { key: 'foul', label: 'Foul' },
    { key: 'goal', label: 'Goal' }, { key: 'save', label: 'Save' }, { key: 'offside', label: 'Offside' },
    { key: 'corner', label: 'Corner Kick' }, { key: 'sub', label: 'Substitution' },
    { key: 'yellow_card', label: 'Yellow Card'}, { key: 'red_card', label: 'Red Card'}
    // Add more event types as defined in your system
];

interface CreateMatchFormProps {
  isEditMode?: boolean;
  initialMatchData?: MatchFormValues & { id?: string }; 
  onFormSubmit?: () => void; 
}

interface TrackerUser {
  user_id: string;
  full_name?: string | null; 
  email?: string | null; 
}

export function CreateMatchForm({ isEditMode = false, initialMatchData, onFormSubmit }: CreateMatchFormProps) {
  const supabase = createClientComponentClient<Database>();
  const [availableTrackers, setAvailableTrackers] = useState<TrackerUser[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const defaultVals: MatchFormValues = {
    name: initialMatchData?.name || "",
    description: initialMatchData?.description || "",
    status: initialMatchData?.status || "draft", 
    match_type: initialMatchData?.match_type || "regular",
    matchDate: initialMatchData?.matchDate || "",
    location: initialMatchData?.location || "",
    competition: initialMatchData?.competition || "",
    notes: initialMatchData?.notes || "",
    homeTeamName: initialMatchData?.homeTeamName || "",
    awayTeamName: initialMatchData?.awayTeamName || "",
    homeTeamFormation: initialMatchData?.homeTeamFormation || "None", 
    awayTeamFormation: initialMatchData?.awayTeamFormation || "None", 
    homeTeamScore: initialMatchData?.homeTeamScore === undefined ? null : initialMatchData.homeTeamScore, 
    awayTeamScore: initialMatchData?.awayTeamScore === undefined ? null : initialMatchData.awayTeamScore, 
    homeTeamPlayers: initialMatchData?.homeTeamPlayers || [], 
    awayTeamPlayers: initialMatchData?.awayTeamPlayers || [], 
    trackerAssignments: initialMatchData?.trackerAssignments || [],
  };


  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: defaultVals,
  });
  
  useEffect(() => {
    if (isEditMode && initialMatchData) {
      const resetData = {
        ...defaultVals,
        ...initialMatchData,
        homeTeamPlayers: initialMatchData.homeTeamPlayers || [], // Ensure arrays are initialized
        awayTeamPlayers: initialMatchData.awayTeamPlayers || [],
        trackerAssignments: initialMatchData.trackerAssignments || [],
      };
      form.reset(resetData);
    }
    
    const fetchTrackers = async () => {
      const { data: trackerProfiles, error } = await supabase
        .from('profiles') 
        .select('user_id, full_name, email') 
        .eq('role', 'tracker');
      if (error) {
        console.error('Error fetching trackers:', error);
      } else {
        setAvailableTrackers(trackerProfiles || []);
      }
    };
    fetchTrackers();
  }, [isEditMode, initialMatchData, supabase, form, defaultVals]);


  const { fields: homePlayerFields, append: appendHomePlayer, remove: removeHomePlayer } = useFieldArray({
    control: form.control,
    name: "homeTeamPlayers",
  });

  const { fields: awayPlayerFields, append: appendAwayPlayer, remove: removeAwayPlayer } = useFieldArray({
    control: form.control,
    name: "awayTeamPlayers",
  });

  const { fields: trackerAssignmentFields, append: appendTrackerAssignment, remove: removeTrackerAssignment } = useFieldArray({
    control: form.control,
    name: "trackerAssignments",
  });

  const watchedHomePlayers = form.watch("homeTeamPlayers");
  const watchedAwayPlayers = form.watch("awayTeamPlayers");

async function onSubmit(data: MatchFormValues) {
  if (!supabase) {
    console.error("Supabase client not available.");
    // Consider using a toast notification for user feedback
    return;
  }

  let matchIdToUse = initialMatchData?.id;
  let savedMatchName = data.homeTeamName && data.awayTeamName ? `${data.homeTeamName} vs ${data.awayTeamName}` : (data.name || "the match");
  const matchDateForNotification = data.matchDate ? new Date(data.matchDate).toLocaleDateString() : 'an unspecified date';


  // 1. Create or Update Match
  try {
    if (isEditMode && initialMatchData?.id) {
      const { data: updatedMatchData, error: updateMatchError } = await supabase
        .from("matches")
        .update({
          name: data.name,
          description: data.description,
          match_date: data.matchDate,
          location: data.location,
          competition: data.competition,
          notes: data.notes,
          home_team_name: data.homeTeamName,
          away_team_name: data.awayTeamName,
          home_team_formation: data.homeTeamFormation,
          away_team_formation: data.awayTeamFormation,
          home_team_score: data.homeTeamScore,
          away_team_score: data.awayTeamScore,
          status: data.status,
          match_type: data.match_type,
          // updated_at is typically handled by DB trigger
        })
        .eq("id", initialMatchData.id)
        .select("id, name, home_team_name, away_team_name, match_date") // Select fields needed for notifications
        .single();

      if (updateMatchError) throw updateMatchError;
      if (!updatedMatchData) throw new Error("No data returned after updating match");
      matchIdToUse = updatedMatchData.id;
      savedMatchName = `${updatedMatchData.home_team_name || 'Home'} vs ${updatedMatchData.away_team_name || 'Away'}`;
    } else {
      const { data: newMatchData, error: insertMatchError } = await supabase
        .from("matches")
        .insert([{
          name: data.name,
          description: data.description,
          match_date: data.matchDate,
          location: data.location,
          competition: data.competition,
          notes: data.notes,
          home_team_name: data.homeTeamName,
          away_team_name: data.awayTeamName,
          home_team_formation: data.homeTeamFormation,
          away_team_formation: data.awayTeamFormation,
          home_team_score: data.homeTeamScore,
          away_team_score: data.awayTeamScore,
          status: data.status,
          match_type: data.match_type,
          // created_by: userId // If you have user ID
        }])
        .select("id, name, home_team_name, away_team_name, match_date") // Select fields needed for notifications
        .single();

      if (insertMatchError) throw insertMatchError;
      if (!newMatchData) throw new Error("No data returned after inserting match");
      matchIdToUse = newMatchData.id;
      savedMatchName = `${newMatchData.home_team_name || 'Home'} vs ${newMatchData.away_team_name || 'Away'}`;
    }

    if (!matchIdToUse) {
      console.error("Match ID is missing.");
      // Consider toast notification
      return;
    }

    // 2. Save Player Rosters and Retrieve DB IDs
    // Delete existing rosters if in edit mode
    if (isEditMode) {
      const { error: deleteRostersError } = await supabase
        .from("match_rosters")
        .delete()
        .eq("match_id", matchIdToUse);
      if (deleteRostersError) {
        console.error("Error deleting existing rosters:", deleteRostersError);
        // Potentially show error and return
      }
    }

    let savedHomePlayersWithDbId: Array<{ id: string; name: string; jersey_number: number; team_context: string; form_player_index: number }> = [];
    if (data.homeTeamPlayers && data.homeTeamPlayers.length > 0) {
      const homeRosterData = data.homeTeamPlayers.map(player => ({
        match_id: matchIdToUse!,
        team_context: "home",
        player_name: player.name,
        jersey_number: player.jerseyNumber,
        position: player.position,
      }));
      const { data: insertedHome, error: homeRosterError } = await supabase
        .from("match_rosters")
        .insert(homeRosterData)
        .select("id, player_name, jersey_number, team_context"); 
      if (homeRosterError) {
        console.error("Error inserting home team roster:", homeRosterError);
      } else {
        savedHomePlayersWithDbId = (insertedHome || []).map((p, idx) => ({ 
          id: p.id, 
          name: p.player_name!, 
          jersey_number: p.jersey_number!,
          team_context: p.team_context!,
          form_player_index: idx 
        }));
      }
    }
    
    let savedAwayPlayersWithDbId: Array<{ id: string; name: string; jersey_number: number; team_context: string; form_player_index: number }> = [];
    if (data.awayTeamPlayers && data.awayTeamPlayers.length > 0) {
      const awayRosterData = data.awayTeamPlayers.map(player => ({
        match_id: matchIdToUse!,
        team_context: "away",
        player_name: player.name,
        jersey_number: player.jerseyNumber,
        position: player.position,
      }));
      const { data: insertedAway, error: awayRosterError } = await supabase
        .from("match_rosters")
        .insert(awayRosterData)
        .select("id, player_name, jersey_number, team_context");
      if (awayRosterError) {
        console.error("Error inserting away team roster:", awayRosterError);
      } else {
        savedAwayPlayersWithDbId = (insertedAway || []).map((p, idx) => ({ 
          id: p.id, 
          name: p.player_name!,
          jersey_number: p.jersey_number!,
          team_context: p.team_context!,
          form_player_index: idx 
        }));
      }
    }

    // 3. Save Tracker Assignments
    if (isEditMode) {
      const { error: deleteAssignmentsError } = await supabase
        .from("match_tracker_assignments")
        .delete()
        .eq("match_id", matchIdToUse);
      if (deleteAssignmentsError) console.error("Error deleting existing tracker assignments:", deleteAssignmentsError);
    }

    const assignmentsToInsertDb = [];
    const notificationsToCreate = [];

    if (data.trackerAssignments && data.trackerAssignments.length > 0) {
      for (const assignmentConfig of data.trackerAssignments) {
        let resolvedPlayerRosterId: string | null = null;
        let assignedPlayerNameForNotif = "the entire match";

        if (assignmentConfig.assignmentScope === "SPECIFIC_PLAYER" && assignmentConfig.assignedPlayerIdentifier) {
          const [teamContext, identifier] = assignmentConfig.assignedPlayerIdentifier.split(':');
          const playerIndex = parseInt(identifier, 10);
          const playersToSearch = teamContext === 'home' ? savedHomePlayersWithDbId : savedAwayPlayersWithDbId;
          
          const foundPlayer = playersToSearch.find(p => p.form_player_index === playerIndex);
          if (foundPlayer) {
            resolvedPlayerRosterId = foundPlayer.id;
            assignedPlayerNameForNotif = `player ${foundPlayer.name} (#${foundPlayer.jersey_number})`;
          } else {
            console.warn(`Could not find player for identifier: ${assignmentConfig.assignedPlayerIdentifier}`);
          }
        }

        assignmentsToInsertDb.push({
          match_id: matchIdToUse,
          tracker_user_id: assignmentConfig.trackerUserId,
          assigned_player_id: resolvedPlayerRosterId, 
          assigned_event_types: assignmentConfig.assignedEventTypes && assignmentConfig.assignedEventTypes.length > 0 ? assignmentConfig.assignedEventTypes : null,
        });
        
        // Prepare notification for this assignment
        const eventTypesStr = (assignmentConfig.assignedEventTypes && assignmentConfig.assignedEventTypes.length > 0) 
                              ? ` for event types: ${assignmentConfig.assignedEventTypes.join(', ')}` 
                              : "";
        notificationsToCreate.push({
          user_id: assignmentConfig.trackerUserId,
          match_id: matchIdToUse,
          message: `You have been assigned to ${savedMatchName} on ${matchDateForNotification} (assigned to ${assignedPlayerNameForNotif}${eventTypesStr}).`,
        });
      }

      if (assignmentsToInsertDb.length > 0) {
        const { data: insertedDbAssignments, error: assignmentsError } = await supabase
          .from("match_tracker_assignments")
          .insert(assignmentsToInsertDb)
          .select(); // Added select to get inserted data for notifications
          
        if (assignmentsError) {
          console.error("Error inserting tracker assignments:", assignmentsError);
        } else {
          console.log("Tracker assignments saved successfully.");
          // 4. Create Notifications (only if assignments were successful)
          if (notificationsToCreate.length > 0) { // Use the already prepared notificationsToCreate
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert(notificationsToCreate);
            if (notificationError) {
              console.error('Error inserting notifications:', notificationError);
            } else {
              console.log('Notifications created for assigned trackers.');
            }
          }
        }
      }
    }
    
    console.log(isEditMode ? "Match updated successfully!" : "Match created successfully!");
    // Consider toast success message

    if (onFormSubmit) {
      onFormSubmit();
    }
    if (!isEditMode) {
      const freshDefaultVals: MatchFormValues = { 
        matchDate: "", location: "", competition: "", notes: "",
        homeTeamName: "", awayTeamName: "", homeTeamFormation: "None", awayTeamFormation: "None",
        homeTeamScore: null, awayTeamScore: null, homeTeamPlayers: [], awayTeamPlayers: [],
        name: "", description: "", status: "draft", match_type: "regular",
        trackerAssignments: [],
      };
      form.reset(freshDefaultVals);
      setCurrentStep(1); // Reset to step 1
    }

  } catch (error: any) {
    console.error("Error in onSubmit:", error.message);
    // Consider toast error message for the user
    // E.g., toast.error(`Submission failed: ${error.message}`);
  }
}

  const totalSteps = 2; 

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h2 className="text-xl font-semibold mb-4">
          {isEditMode ? "Edit Match Details" : "Create New Match"} - Step {currentStep} of {totalSteps}
        </h2>

        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Step 1: Core Match & Team Details</h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Local Derby Championship" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any notes about the match..." {...field} />
                  </FormControl>
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
                        <SelectValue placeholder="Select match status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="postponed">Postponed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="match_type"
              render={({ field }) => (
                <FormItem>
                  {/* TODO: Consider changing to Select if a predefined list of match types is better */}
                  <FormLabel>Match Type (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., League, Friendly, Cup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="matchDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Enter location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="competition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competition</FormLabel>
              <FormControl>
                <Input placeholder="Enter competition" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="homeTeamName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Home Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter home team name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="awayTeamName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Away Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter away team name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="homeTeamFormation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Home Team Formation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select formation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commonFormations.map(formation => (
                    <SelectItem key={`home-${formation}`} value={formation}>
                      {formation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="awayTeamFormation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Away Team Formation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select formation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commonFormations.map(formation => (
                    <SelectItem key={`away-${formation}`} value={formation}>
                      {formation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="homeTeamScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Home Team Score</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="awayTeamScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Away Team Score</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter any notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Player Rosters and Tracker Assignments are intentionally removed from Step 1 UI */}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Step 2: Rosters & Tracker Assignments</h3>
            
            {/* Home Team Players - Moved from Step 1 */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Home Team Players</h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded">
                {homePlayerFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 p-3 border rounded-md mb-2 bg-gray-50">
                    <FormField control={form.control} name={`homeTeamPlayers.${index}.name`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Player Name</FormLabel><FormControl><Input placeholder="Player Name" {...RHFfield} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`homeTeamPlayers.${index}.jerseyNumber`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Jersey Number</FormLabel><FormControl><Input type="number" placeholder="Jersey Number" {...RHFfield} value={RHFfield.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`homeTeamPlayers.${index}.position`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Position</FormLabel><FormControl><Input placeholder="Position" {...RHFfield} /></FormControl><FormMessage /></FormItem> )} />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeHomePlayer(index)}>Remove Player</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendHomePlayer({ name: "", jerseyNumber: 0, position: "" })} className="mt-2">Add Home Player</Button>
              </div>
            </div>

            {/* Away Team Players - Moved from Step 1 */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Away Team Players</h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded">
                {awayPlayerFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 p-3 border rounded-md mb-2 bg-gray-50">
                    <FormField control={form.control} name={`awayTeamPlayers.${index}.name`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Player Name</FormLabel><FormControl><Input placeholder="Player Name" {...RHFfield} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`awayTeamPlayers.${index}.jerseyNumber`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Jersey Number</FormLabel><FormControl><Input type="number" placeholder="Jersey Number" {...RHFfield} value={RHFfield.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`awayTeamPlayers.${index}.position`} render={({ field: RHFfield }) => ( <FormItem><FormLabel>Position</FormLabel><FormControl><Input placeholder="Position" {...RHFfield} /></FormControl><FormMessage /></FormItem> )} />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeAwayPlayer(index)}>Remove Player</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendAwayPlayer({ name: "", jerseyNumber: 0, position: "" })} className="mt-2">Add Away Player</Button>
              </div>
            </div>

            {/* Tracker Assignments Section */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-2">Tracker Assignments</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded">
                {trackerAssignmentFields.map((field, index) => {
                  const currentScope = form.watch(`trackerAssignments.${index}.assignmentScope`);
                  return (
                    <div key={field.id} className="space-y-3 p-4 border rounded-md mb-4 bg-white shadow">
                      <FormField
                        control={form.control}
                      name={`trackerAssignments.${index}.trackerUserId`}
                      render={({ field: RHFfield }) => (
                        <FormItem>
                          <FormLabel>Assign Tracker</FormLabel>
                          <Select onValueChange={RHFfield.onChange} defaultValue={RHFfield.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a tracker" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {availableTrackers.map(tracker => (
                                <SelectItem key={tracker.user_id} value={tracker.user_id}>
                                  {tracker.full_name || tracker.email || tracker.user_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`trackerAssignments.${index}.assignmentScope`}
                      render={({ field: RHFfield }) => (
                        <FormItem>
                          <FormLabel>Assignment Scope</FormLabel>
                          <Select onValueChange={RHFfield.onChange} defaultValue={RHFfield.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="ENTIRE_MATCH">Entire Match</SelectItem>
                              <SelectItem value="SPECIFIC_PLAYER">Specific Player</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {currentScope === "SPECIFIC_PLAYER" && (
                      <FormField
                        control={form.control}
                        name={`trackerAssignments.${index}.assignedPlayerIdentifier`}
                        render={({ field: RHFfield }) => (
                          <FormItem>
                            <FormLabel>Assign to Player</FormLabel>
                            <Select onValueChange={RHFfield.onChange} defaultValue={RHFfield.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a player" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="" disabled>Select a player...</SelectItem>
                                {watchedHomePlayers?.map((player, playerIdx) => player.name && (
                                  <SelectItem key={`home-${playerIdx}`} value={`home:${playerIdx}`}>
                                    {player.name} (Home #{player.jerseyNumber || 'N/A'})
                                  </SelectItem>
                                ))}
                                {watchedAwayPlayers?.map((player, playerIdx) => player.name && (
                                  <SelectItem key={`away-${playerIdx}`} value={`away:${playerIdx}`}>
                                    {player.name} (Away #{player.jerseyNumber || 'N/A'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormItem>
                      <FormLabel>Assign Event Types (Optional)</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-md">
                        {ALL_EVENT_TYPES_CONFIG.map(eventType => (
                          <FormField
                            key={eventType.key}
                            control={form.control}
                            name={`trackerAssignments.${index}.assignedEventTypes`}
                            render={({ field: RHFfield }) => (
                              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={RHFfield.value?.includes(eventType.key)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = RHFfield.value || [];
                                      return checked
                                        ? RHFfield.onChange([...currentValue, eventType.key])
                                        : RHFfield.onChange(currentValue.filter(value => value !== eventType.key));
                                    }}
                                  />
                                </FormControl>
                                <Label htmlFor={`event-${index}-${eventType.key}`} className="font-normal text-sm">
                                  {eventType.label}
                                </Label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                       <FormMessage />
                    </FormItem>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeTrackerAssignment(index)}>Remove Tracker Assignment</Button>
                  </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendTrackerAssignment({ trackerUserId: '', assignmentScope: 'ENTIRE_MATCH', assignedEventTypes: [] })}
                  className="mt-2"
                >
                  Add Tracker Assignment
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation and Submission Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          ) : (
            <div /> // Empty div to maintain space if Previous is not shown
          )}

          {currentStep < totalSteps ? (
            <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
              Next
            </Button>
          ) : (
            <Button type="submit" className="w-full md:w-auto"> {/* Changed from type="submit" on Next button to only on the final step */}
              {isEditMode ? "Update Match" : "Create Match"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
