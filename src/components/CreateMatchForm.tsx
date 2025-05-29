// src/components/forms/CreateMatchForm.tsx
// REMOVED: "use client"; (Not needed for Vite)

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
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
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
<<<<<<< HEAD
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types"; // Assurez-vous que ce chemin est correct
=======
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { Label } from "@/components/ui/label"; // Added Label
import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/database.types";
>>>>>>> da0fd7a34dfbb3503a1abd6127c9ae931aee525a

// --- Supabase Client Initialization for Vite ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  console.error(
    "Supabase URL and/or Anon Key are missing. " +
      "Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}
// --- End Supabase Client Initialization ---

export const playerSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, { message: "Player name must be at least 2 characters." }),
  jerseyNumber: z.coerce
    .number()
    .int()
    .min(0, { message: "Jersey number must be a non-negative integer." }),
  position: z
    .string()
    .min(2, { message: "Position must be at least 2 characters." }),
});
export type PlayerFormValues = z.infer<typeof playerSchema>;

export const matchFormSchema = z.object({
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
  homeTeamFormation: z.string().optional(),
  awayTeamFormation: z.string().optional(),
  homeTeamScore: z.coerce
    .number()
    .int()
    .min(0, { message: "Score must be a non-negative integer." })
    .optional()
    .nullable(),
  awayTeamScore: z.coerce
    .number()
    .int()
    .min(0, { message: "Score must be a non-negative integer." })
    .optional()
    .nullable(),
  homeTeamPlayers: z.array(playerSchema).optional(),
  awayTeamPlayers: z.array(playerSchema).optional(),
  trackerAssignments: z
    .array(
      z.object({
        id: z.string().optional(),
        trackerUserId: z.string().min(1, "Tracker selection is required."),
        assignmentScope: z.enum(["ENTIRE_MATCH", "SPECIFIC_PLAYER"], {
          required_error: "Assignment scope is required.",
        }),
        assignedPlayerIdentifier: z.string().optional(),
        assignedEventTypes: z.array(z.string()).optional().default([]),
      })
    )
    .optional(),
});
export type MatchFormValues = z.infer<typeof matchFormSchema>;

const commonFormations = [
  "None",
  "Other",
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "4-2-3-1",
  "4-5-1",
  "3-4-3",
  "5-3-2",
  "4-1-4-1",
  "4-4-1-1",
  "4-1-3-2",
  "3-4-1-2",
];

interface CreateMatchFormProps {
  isEditMode?: boolean;
  initialMatchData?: MatchFormValues & {
    id?: string;
    home_team_formation?: string;
    away_team_formation?: string;
    assignedTrackers?: string[];
  };
  onFormSubmit?: () => void;
}

interface TrackerUser {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
}

export default function CreateMatchForm({
  isEditMode = false,
  initialMatchData,
  onFormSubmit,
}: CreateMatchFormProps) {
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
    homeTeamScore:
      initialMatchData?.homeTeamScore === undefined
        ? null
        : initialMatchData.homeTeamScore,
    awayTeamScore:
      initialMatchData?.awayTeamScore === undefined
        ? null
        : initialMatchData.awayTeamScore,
    homeTeamPlayers: initialMatchData?.homeTeamPlayers || [],
    awayTeamPlayers: initialMatchData?.awayTeamPlayers || [],
    trackerAssignments: (initialMatchData as any)?.trackerAssignments || [],
  };

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: defaultVals,
  });

  useEffect(() => {
    // This effect now primarily fetches trackers.
    // The reset logic specific to edit mode is moved to the second useEffect.
    if (!supabase) {
      console.warn("Supabase client not initialized. Cannot fetch trackers.");
      setAvailableTrackers([]);
      return;
    }

    const fetchTrackers = async () => {
      const { data: trackerProfiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("role", "tracker");
      if (error) {
        console.error("Error fetching trackers:", error);
      } else {
        setAvailableTrackers(trackerProfiles || []);
      }
    };
    fetchTrackers();
  }, []); // Removed supabase from deps as it's module-level

  useEffect(() => {
    // This effect handles form reset and data fetching for edit mode.
    if (isEditMode && initialMatchData) {
      form.reset({
        name: initialMatchData.name || "",
        description: initialMatchData.description || "",
        status: initialMatchData.status || "draft",
        match_type: initialMatchData.match_type || "regular",
        matchDate: initialMatchData.matchDate,
        location: initialMatchData.location,
        competition: initialMatchData.competition,
        notes: initialMatchData.notes || "",
        homeTeamName: initialMatchData.homeTeamName,
        awayTeamName: initialMatchData.awayTeamName,
        homeTeamFormation: initialMatchData.homeTeamFormation || "None",
        awayTeamFormation: initialMatchData.awayTeamFormation || "None",
        homeTeamScore:
          initialMatchData.homeTeamScore === undefined
            ? null
            : initialMatchData.homeTeamScore,
        awayTeamScore:
          initialMatchData.awayTeamScore === undefined
            ? null
            : initialMatchData.awayTeamScore,
        homeTeamPlayers: [], // Will be populated by fetchRostersAndExistingAssignments
        awayTeamPlayers: [], // Will be populated by fetchRostersAndExistingAssignments
        trackerAssignments: (initialMatchData as any)?.trackerAssignments || [],
      });

      if (initialMatchData.id) {
        if (!supabase) {
          console.warn(
            "Supabase client not initialized. Cannot fetch rosters for edit mode."
          );
          return;
        }
        const fetchRostersAndExistingAssignments = async (matchId: string) => {
          const { data: rosterData, error: rosterError } = await supabase
            .from("match_rosters")
            .select("player_name, jersey_number, position, team_context")
            .eq("match_id", matchId);

          if (rosterError) {
            console.error("Error fetching rosters for edit:", rosterError);
          } else {
            const homePlayers: PlayerFormValues[] = [];
            const awayPlayers: PlayerFormValues[] = [];
            rosterData?.forEach((player) => {
              const formattedPlayer: PlayerFormValues = {
                name: player.player_name,
                jerseyNumber: player.jersey_number,
                position: player.position,
              };
              if (player.team_context === "home")
                homePlayers.push(formattedPlayer);
              else if (player.team_context === "away")
                awayPlayers.push(formattedPlayer);
            });
            form.setValue("homeTeamPlayers", homePlayers, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue("awayTeamPlayers", awayPlayers, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        };
        fetchRostersAndExistingAssignments(initialMatchData.id);
      }
    } else if (!isEditMode) {
      // Reset to default values if not in edit mode (e.g., when switching from edit to create)
      form.reset(defaultVals);
    }
  }, [isEditMode, initialMatchData, form]); // form is stable

  const {
    fields: homePlayerFields,
    append: appendHomePlayer,
    remove: removeHomePlayer,
  } = useFieldArray({
    control: form.control,
    name: "homeTeamPlayers",
  });
  const {
    fields: awayPlayerFields,
    append: appendAwayPlayer,
    remove: removeAwayPlayer,
  } = useFieldArray({
    control: form.control,
    name: "awayTeamPlayers",
  });
  const {
    fields: trackerAssignmentFields,
    append: appendTrackerAssignment,
    remove: removeTrackerAssignment,
  } = useFieldArray({
    control: form.control,
    name: "trackerAssignments",
  });

  const watchedHomePlayers = form.watch("homeTeamPlayers");
  const watchedAwayPlayers = form.watch("awayTeamPlayers");

  const ALL_EVENT_TYPES_CONFIG = [
    { key: "pass", label: "Pass" },
    { key: "shot", label: "Shot" },
    { key: "foul", label: "Foul" },
    { key: "goal", label: "Goal" },
    { key: "save", label: "Save" },
    { key: "offside", label: "Offside" },
    { key: "corner", label: "Corner Kick" },
    { key: "sub", label: "Substitution" },
  ];

  async function onSubmit(data: MatchFormValues) {
    if (!supabase) {
      console.error("Supabase client not available. Cannot submit form.");
      return;
    }
    let matchIdToUse = initialMatchData?.id;
    try {
      if (isEditMode && initialMatchData?.id) {
        // Update logic
        const { data: updatedMatchData, error: updateMatchError } =
          await supabase
            .from("matches")
            .update({
              /* fields */
            })
            .eq("id", initialMatchData.id)
            .select()
            .single();
        if (updateMatchError) throw updateMatchError;
        matchIdToUse = updatedMatchData!.id;
        // Delete existing rosters and assignments
        await supabase
          .from("match_rosters")
          .delete()
          .eq("match_id", matchIdToUse);
        await supabase
          .from("match_tracker_assignments")
          .delete()
          .eq("match_id", matchIdToUse);
      } else {
        // Insert logic
        const { data: newMatchData, error: insertMatchError } = await supabase
          .from("matches")
          .insert([
            {
              /* fields */
            },
          ])
          .select()
          .single();
        if (insertMatchError) throw insertMatchError;
        matchIdToUse = newMatchData!.id;
      }

      if (!matchIdToUse) throw new Error("Match ID is missing.");

      // Insert home players
      if (data.homeTeamPlayers && data.homeTeamPlayers.length > 0) {
        const homeRoster = data.homeTeamPlayers.map((p) => ({
          ...p,
          match_id: matchIdToUse,
          team_context: "home",
        }));
        await supabase.from("match_rosters").insert(homeRoster);
      }
      // Insert away players
      if (data.awayTeamPlayers && data.awayTeamPlayers.length > 0) {
        const awayRoster = data.awayTeamPlayers.map((p) => ({
          ...p,
          match_id: matchIdToUse,
          team_context: "away",
        }));
        await supabase.from("match_rosters").insert(awayRoster);
      }
      // Insert tracker assignments
      if (data.trackerAssignments && data.trackerAssignments.length > 0) {
        const assignments = data.trackerAssignments.map((a) => ({
          ...a,
          match_id: matchIdToUse,
          assigned_player_identifier:
            a.assignmentScope === "SPECIFIC_PLAYER"
              ? a.assignedPlayerIdentifier
              : null,
        }));
        await supabase.from("match_tracker_assignments").insert(assignments);
      }

      console.log(isEditMode ? "Match updated!" : "Match created!", data);
      if (onFormSubmit) onFormSubmit();
      else if (!isEditMode) form.reset(defaultVals);
    } catch (error) {
      console.error("Submission error:", error);
    }
  }

  const totalSteps = 2;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h2 className="text-xl font-semibold mb-4">
          {isEditMode ? "Edit Match" : "Create New Match"} - Step {currentStep}{" "}
          of {totalSteps}
        </h2>

        {/* Step 1: Core Match & Team Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-3">
              Step 1: Core Match & Team Details
            </h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Local Derby Championship"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ... autres champs de l'étape 1 ... */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Description (Optional)</FormLabel>{" "}
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about the match..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Status</FormLabel>{" "}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    {" "}
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select match status" />
                      </SelectTrigger>
                    </FormControl>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="draft">Draft</SelectItem>{" "}
                      <SelectItem value="upcoming">Upcoming</SelectItem>{" "}
                      <SelectItem value="live">Live</SelectItem>{" "}
                      <SelectItem value="completed">Completed</SelectItem>{" "}
                      <SelectItem value="postponed">Postponed</SelectItem>{" "}
                      <SelectItem value="cancelled">Cancelled</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="match_type"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Match Type (Optional)</FormLabel>{" "}
                  <FormControl>
                    <Input
                      placeholder="e.g., League, Friendly, Cup"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="matchDate"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Match Date</FormLabel>{" "}
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Location</FormLabel>{" "}
                  <FormControl>
                    <Input placeholder="Enter location" {...field} />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="competition"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Competition</FormLabel>{" "}
                  <FormControl>
                    <Input placeholder="Enter competition" {...field} />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeTeamName"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Home Team Name</FormLabel>{" "}
                  <FormControl>
                    <Input placeholder="Enter home team name" {...field} />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="awayTeamName"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Away Team Name</FormLabel>{" "}
                  <FormControl>
                    <Input placeholder="Enter away team name" {...field} />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeTeamFormation"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Home Team Formation</FormLabel>{" "}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || "None"}
                  >
                    {" "}
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select formation" />
                      </SelectTrigger>
                    </FormControl>{" "}
                    <SelectContent>
                      {commonFormations.map((f) => (
                        <SelectItem key={`home-${f}`} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>{" "}
                  </Select>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="awayTeamFormation"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Away Team Formation</FormLabel>{" "}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || "None"}
                  >
                    {" "}
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select formation" />
                      </SelectTrigger>
                    </FormControl>{" "}
                    <SelectContent>
                      {commonFormations.map((f) => (
                        <SelectItem key={`away-${f}`} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>{" "}
                  </Select>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeTeamScore"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Home Team Score (Optional)</FormLabel>{" "}
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="awayTeamScore"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Away Team Score (Optional)</FormLabel>{" "}
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  {" "}
                  <FormLabel>Notes (Optional)</FormLabel>{" "}
                  <FormControl>
                    <Textarea
                      placeholder="Enter any notes"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>{" "}
                  <FormMessage />{" "}
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Step 2: Rosters & Tracker Assignments */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-3">
              Step 2: Rosters & Tracker Assignments
            </h3>
            {/* Home Team Players */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Home Team Players</h4>
              {homePlayerFields.map((item, index) => (
                <div
                  key={item.id}
                  className="space-y-2 p-3 border rounded-md mb-2 bg-gray-50 dark:bg-gray-800"
                >
                  <FormField
                    control={form.control}
                    name={`homeTeamPlayers.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Player Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`homeTeamPlayers.${index}.jerseyNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Jersey Number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`homeTeamPlayers.${index}.position`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Position" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeHomePlayer(index)}
                  >
                    Remove Player
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendHomePlayer({ name: "", jerseyNumber: 0, position: "" })
                }
                className="mt-2"
              >
                Add Home Player
              </Button>
            </div>

            {/* Away Team Players */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Away Team Players</h4>
              {awayPlayerFields.map((item, index) => (
                <div
                  key={item.id}
                  className="space-y-2 p-3 border rounded-md mb-2 bg-gray-50 dark:bg-gray-800"
                >
                  <FormField
                    control={form.control}
                    name={`awayTeamPlayers.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Player Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`awayTeamPlayers.${index}.jerseyNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Jersey Number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`awayTeamPlayers.${index}.position`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Position" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAwayPlayer(index)}
                  >
                    Remove Player
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendAwayPlayer({ name: "", jerseyNumber: 0, position: "" })
                }
                className="mt-2"
              >
                Add Away Player
              </Button>
            </div>

            {/* Tracker Assignments */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-2">Tracker Assignments</h3>
              {trackerAssignmentFields.map((item, index) => {
                const currentScope = form.watch(
                  `trackerAssignments.${index}.assignmentScope`
                );
                return (
                  <div
                    key={item.id}
                    className="space-y-3 p-4 border rounded-md mb-4 bg-white dark:bg-gray-800 shadow"
                  >
                    <FormField
                      control={form.control}
                      name={`trackerAssignments.${index}.trackerUserId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Tracker</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a tracker" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableTrackers.map((t) => (
                                <SelectItem key={t.user_id} value={t.user_id}>
                                  {t.full_name || t.email || t.user_id}
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment Scope</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ENTIRE_MATCH">
                                Entire Match
                              </SelectItem>
                              <SelectItem value="SPECIFIC_PLAYER">
                                Specific Player
                              </SelectItem>
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
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign to Player</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a player" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="" disabled>
                                  Select a player...
                                </SelectItem>
                                {watchedHomePlayers?.map(
                                  (p, pi) =>
                                    p.name && (
                                      <SelectItem
                                        key={`home-${pi}`}
                                        value={`home:${pi}`}
                                      >
                                        {p.name} (Home #
                                        {p.jerseyNumber || "N/A"})
                                      </SelectItem>
                                    )
                                )}
                                {watchedAwayPlayers?.map(
                                  (p, pi) =>
                                    p.name && (
                                      <SelectItem
                                        key={`away-${pi}`}
                                        value={`away:${pi}`}
                                      >
                                        {p.name} (Away #
                                        {p.jerseyNumber || "N/A"})
                                      </SelectItem>
                                    )
                                )}
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
                        {ALL_EVENT_TYPES_CONFIG.map((et) => (
                          <FormField
                            key={et.key}
                            control={form.control}
                            name={`trackerAssignments.${index}.assignedEventTypes`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    id={`event-${index}-${et.key}`}
                                    checked={field.value?.includes(et.key)}
                                    onCheckedChange={(checked) => {
                                      const cv = field.value || [];
                                      return checked
                                        ? field.onChange([...cv, et.key])
                                        : field.onChange(
                                            cv.filter((v) => v !== et.key)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={`event-${index}-${et.key}`}
                                  className="font-normal text-sm"
                                >
                                  {et.label}
                                </Label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTrackerAssignment(index)}
                    >
                      Remove Tracker Assignment
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendTrackerAssignment({
                    trackerUserId: "",
                    assignmentScope: "ENTIRE_MATCH",
                    assignedEventTypes: [],
                  })
                }
                className="mt-2"
              >
                Add Tracker Assignment
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((c) => c - 1)}
            >
              Previous
            </Button>
          ) : (
            <div />
          )}
          {currentStep < totalSteps ? (
            <Button type="button" onClick={() => setCurrentStep((c) => c + 1)}>
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={!supabase || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Submitting..."
                : isEditMode
                ? "Update Match"
                : "Create Match"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
