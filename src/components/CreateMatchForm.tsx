"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useEffect } from "react"; // Added useEffect
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Database } from "@/lib/database.types";

// Define the schema for a single player
export const playerSchema = z.object({ // Exported for potential use elsewhere
  id: z.string().optional(), // For existing players, not part of DB schema for match_rosters directly but useful for UI keying
  name: z.string().min(2, { message: "Player name must be at least 2 characters." }),
  jerseyNumber: z.coerce.number().int().min(0, { message: "Jersey number must be a non-negative integer." }), // Allow 0
  position: z.string().min(2, { message: "Position must be at least 2 characters." }),
});

export type PlayerFormValues = z.infer<typeof playerSchema>; // Exported for potential use elsewhere

// Define the main form schema
export const matchFormSchema = z.object({ // Exported for potential use elsewhere
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
});

export type MatchFormValues = z.infer<typeof matchFormSchema>; // Exported for potential use elsewhere

/*
match_rosters table schema:
- id: uuid (Primary Key, auto-generated)
- match_id: uuid (Foreign Key referencing matches.id)
- team_id: uuid (Foreign Key referencing teams.id) - Assuming you have a teams table. This is not used in current implementation.
- team_context: text (e.g., 'home' or 'away')
- player_name: text
- jersey_number: integer
- position: text
*/

const commonFormations = [
  "None", "Other",
  "4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "4-5-1", "3-4-3",
  "5-3-2", "4-1-4-1", "4-4-1-1", "4-1-3-2", "3-4-1-2",
];

interface CreateMatchFormProps {
  isEditMode?: boolean;
  initialMatchData?: MatchFormValues & { id?: string; home_team_formation?: string; away_team_formation?: string }; // Match ID is crucial for edit mode
  onFormSubmit?: () => void; // Optional callback after successful submission
}

export function CreateMatchForm({ isEditMode = false, initialMatchData, onFormSubmit }: CreateMatchFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Ensure defaultValues are fully defined to avoid uncontrolled component warnings
  const defaultVals: MatchFormValues = {
    matchDate: initialMatchData?.matchDate || "",
    location: initialMatchData?.location || "",
    competition: initialMatchData?.competition || "",
    notes: initialMatchData?.notes || "",
    homeTeamName: initialMatchData?.homeTeamName || "",
    awayTeamName: initialMatchData?.awayTeamName || "",
    homeTeamFormation: initialMatchData?.homeTeamFormation || "None", // Default to "None"
    awayTeamFormation: initialMatchData?.awayTeamFormation || "None", // Default to "None"
    homeTeamScore: initialMatchData?.homeTeamScore === undefined ? null : initialMatchData.homeTeamScore, // Handle undefined by setting to null
    awayTeamScore: initialMatchData?.awayTeamScore === undefined ? null : initialMatchData.awayTeamScore, // Handle undefined by setting to null
    homeTeamPlayers: initialMatchData?.homeTeamPlayers || [],
    awayTeamPlayers: initialMatchData?.awayTeamPlayers || [],
  };


  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: defaultVals,
  });

  useEffect(() => {
    // Populate form with initialMatchData if in edit mode
    // Rosters are fetched separately if initialMatchData.id is present
    if (isEditMode && initialMatchData) {
      form.reset({ // Reset form with all initial data, except rosters which are fetched next
        matchDate: initialMatchData.matchDate,
        location: initialMatchData.location,
        competition: initialMatchData.competition,
        notes: initialMatchData.notes || "",
        homeTeamName: initialMatchData.homeTeamName,
        awayTeamName: initialMatchData.awayTeamName,
        homeTeamFormation: initialMatchData.homeTeamFormation || "None",
        awayTeamFormation: initialMatchData.awayTeamFormation || "None",
        homeTeamScore: initialMatchData.homeTeamScore === undefined ? null : initialMatchData.homeTeamScore,
        awayTeamScore: initialMatchData.awayTeamScore === undefined ? null : initialMatchData.awayTeamScore,
        homeTeamPlayers: [], // Will be populated by fetched data
        awayTeamPlayers: [], // Will be populated by fetched data
      });

      if (initialMatchData.id) {
        // Ensure form values for formations are explicitly set from initialMatchData if available
        // This covers cases where initialMatchData might have these fields even if not in defaultVals directly
        // or if they need to be specifically re-validated/marked as dirty.
        if (initialMatchData.homeTeamFormation) {
            form.setValue("homeTeamFormation", initialMatchData.homeTeamFormation, { shouldDirty: true, shouldValidate: true });
        }
        if (initialMatchData.awayTeamFormation) {
            form.setValue("awayTeamFormation", initialMatchData.awayTeamFormation, { shouldDirty: true, shouldValidate: true });
        }

        const fetchRosters = async (matchId: string) => {
          const { data: rosterData, error } = await supabase
            .from("match_rosters")
            .select("player_name, jersey_number, position, team_context")
            .eq("match_id", matchId);

          if (error) {
            console.error("Error fetching rosters for edit:", error);
            return;
          }

          const homePlayers: PlayerFormValues[] = [];
          const awayPlayers: PlayerFormValues[] = [];

          rosterData?.forEach(player => {
            const formattedPlayer: PlayerFormValues = {
              name: player.player_name,
              jerseyNumber: player.jersey_number,
              position: player.position,
            };
            if (player.team_context === "home") {
              homePlayers.push(formattedPlayer);
            } else if (player.team_context === "away") {
              awayPlayers.push(formattedPlayer);
            }
          });
          
          // Update form state with fetched rosters
          // This should trigger a re-render with the player fields populated
          form.setValue("homeTeamPlayers", homePlayers, { shouldDirty: true, shouldValidate: true });
          form.setValue("awayTeamPlayers", awayPlayers, { shouldDirty: true, shouldValidate: true });

        };
        fetchRosters(initialMatchData.id);
      }
    }
  }, [isEditMode, initialMatchData, supabase, form]);


  const { fields: homePlayerFields, append: appendHomePlayer, remove: removeHomePlayer } = useFieldArray({
    control: form.control,
    name: "homeTeamPlayers",
  });

  const { fields: awayPlayerFields, append: appendAwayPlayer, remove: removeAwayPlayer } = useFieldArray({
    control: form.control,
    name: "awayTeamPlayers",
  });

  async function onSubmit(data: MatchFormValues) {
    if (!supabase) {
      console.error("Supabase client not available.");
      return;
    }
    
    let matchIdToUse = initialMatchData?.id;

    try {
      if (isEditMode && initialMatchData?.id) {
        // ---- EDIT MODE ----
        const { data: updatedMatchData, error: updateMatchError } = await supabase
          .from("matches")
          .update({
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
          })
          .eq("id", initialMatchData.id)
          .select()
          .single();

        if (updateMatchError) {
          console.error("Error updating match:", updateMatchError);
          // Handle error
          return;
        }
        if (!updatedMatchData) {
          console.error("No data returned after updating match");
          return;
        }
        matchIdToUse = updatedMatchData.id;

        // Delete existing rosters for this match
        const { error: deleteRostersError } = await supabase
          .from("match_rosters")
          .delete()
          .eq("match_id", matchIdToUse);

        if (deleteRostersError) {
          console.error("Error deleting existing rosters:", deleteRostersError);
          // Handle error, possibly alert user or attempt rollback/compensation
          return;
        }
      } else {
        // ---- CREATE MODE ----
        const { data: newMatchData, error: insertMatchError } = await supabase
          .from("matches")
          .insert([
            {
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
              // created_by: userId // Assuming you have a way to get the current user's ID
            },
          ])
          .select()
          .single();

        if (insertMatchError) {
          console.error("Error inserting match:", insertMatchError);
          return;
        }
        if (!newMatchData) {
          console.error("No data returned after inserting match");
          return;
        }
        matchIdToUse = newMatchData.id;
      }

      if (!matchIdToUse) {
        console.error("Match ID is missing, cannot save rosters.");
        return;
      }

      // Save home team players (common for both create and edit after rosters are cleared for edit)
      if (data.homeTeamPlayers && data.homeTeamPlayers.length > 0) {
        const homeRosterData = data.homeTeamPlayers.map(player => ({
          match_id: matchIdToUse!,
          team_context: "home",
          player_name: player.name,
          jersey_number: player.jerseyNumber,
          position: player.position,
        }));

        const { error: homeRosterError } = await supabase
          .from("match_rosters")
          .insert(homeRosterData);

        if (homeRosterError) {
          console.error("Error inserting home team roster:", homeRosterError);
          // Handle error
        }
      }

      // Save away team players (common for both create and edit)
      if (data.awayTeamPlayers && data.awayTeamPlayers.length > 0) {
        const awayRosterData = data.awayTeamPlayers.map(player => ({
          match_id: matchIdToUse!,
          team_context: "away",
          player_name: player.name,
          jersey_number: player.jerseyNumber,
          position: player.position,
        }));

        const { error: awayRosterError } = await supabase
          .from("match_rosters")
          .insert(awayRosterData);

        if (awayRosterError) {
          console.error("Error inserting away team roster:", awayRosterError);
          // Handle error
        }
      }

      console.log(isEditMode ? "Match updated:" : "Match created:", data);
      if (onFormSubmit) {
        onFormSubmit(); // Call the callback
      } else {
        // Default behavior if no callback is provided (e.g., redirect or reset)
        if (!isEditMode) form.reset(defaultVals); // Reset form only in create mode or if specified
         // Potentially redirect or show success notification
      }
      // Optionally, always reset if that's the desired UX after edit too
      // form.reset(defaultVals); 
      // router.push("/path-to-matches-list"); // Or use router from props if needed

    } catch (error) {
      console.error("Submission error:", error);
      // Handle error (e.g., show global notification to user)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h2 className="text-xl font-semibold">{isEditMode ? "Edit Match Details" : "Create New Match"}</h2>
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

        {/* Home Team Players */}
        <div>
          <h3 className="text-lg font-medium">Home Team Players</h3>
          {homePlayerFields.map((field, index) => (
            <div key={field.id} className="space-y-2 p-2 border rounded-md">
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
                      <Input type="number" placeholder="Jersey Number" {...field} value={field.value ?? ''} />
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
              <Button type="button" variant="outline" onClick={() => removeHomePlayer(index)}>Remove Player</Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => appendHomePlayer({ name: "", jerseyNumber: 0, position: "" })}
            className="mt-2"
          >
            Add Home Player
          </Button>
        </div>

        {/* Away Team Players */}
        <div>
          <h3 className="text-lg font-medium">Away Team Players</h3>
          {awayPlayerFields.map((field, index) => (
            <div key={field.id} className="space-y-2 p-2 border rounded-md">
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
                      <Input type="number" placeholder="Jersey Number" {...field} value={field.value ?? ''} />
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
              <Button type="button" variant="outline" onClick={() => removeAwayPlayer(index)}>Remove Player</Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => appendAwayPlayer({ name: "", jerseyNumber: 0, position: "" })}
            className="mt-2"
          >
            Add Away Player
          </Button>
        </div>

        <Button type="submit" className="w-full md:w-auto">
          {isEditMode ? "Update Match" : "Create Match"}
        </Button>
      </form>
    </Form>
  );
}
