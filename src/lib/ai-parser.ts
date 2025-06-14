
import { supabase } from '@/integrations/supabase/client';

// TypeScript Interfaces for our data
interface Player { id: number; name: string; jersey_number: number | null; }
interface AssignedEventType { key: string; label: string; }
export interface GeminiContext {
  assignedPlayers: { home: Player[]; away: Player[]; };
  assignedEventTypes: AssignedEventType[];
}

export interface ParsedCommand {
  eventType: AssignedEventType | null;
  player: Player | null;
  teamContext: 'home' | 'away' | null;
  confidence: number;
  reasoning?: string;
}

// This function calls our Supabase Edge Function
export const parseCommandWithAI = async (
  transcript: string,
  context: GeminiContext
): Promise<ParsedCommand> => {
  const { assignedPlayers, assignedEventTypes } = context;
  const { data, error } = await supabase.functions.invoke('parse-voice-command', {
    body: { transcript, assignedPlayers, assignedEventTypes },
  })

  if (error) {
    throw new Error(`Supabase function error: ${error.message}`)
  }
  return data
}
