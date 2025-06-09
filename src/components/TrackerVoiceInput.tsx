import React, { useState, useEffect, useCallback } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Keep for player/event type badges
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Added
import { Mic, MicOff, AlertCircle, CheckCircle2, Info } from 'lucide-react'; // Added icons

// --- Prop Types ---
interface Player {
  id: number;
  name: string;
  jersey_number: number | null;
}

interface AssignedPlayers {
  home: Player[];
  away: Player[];
}

interface AssignedEventType {
  key: string;
  label: string;
  // TODO: Potentially add more fields like 'requiresPlayer', 'requiresTeamContext' if needed for parsing
}

interface TrackerVoiceInputProps {
  matchId: string; // Currently unused in this component's logic, but good for context
  trackerUserId: string; // Currently unused, for context
  assignedPlayers: AssignedPlayers;
  assignedEventTypes: AssignedEventType[];
  onRecordEvent: (
    eventTypeKey: string,
    playerId?: number,
    teamId?: 'home' | 'away',
    details?: Record<string, any>
  ) => Promise<void>;
}

/**
 * TrackerVoiceInput component allows users to record events using speech recognition.
 */
const TrackerVoiceInput: React.FC<TrackerVoiceInputProps> = ({
  matchId,
  trackerUserId,
  assignedPlayers,
  assignedEventTypes,
  onRecordEvent,
}) => {
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  // --- Command Parsing Logic ---
  const parseAndRecordEvent = useCallback(async (command: string) => {
    setIsProcessingCommand(true);
    setFeedbackMessage(`Processing: "${command}"`);

    const normalizedCommand = command.toLowerCase().trim();
    let eventTypeFound: AssignedEventType | undefined = undefined;
    let playerFound: Player | undefined = undefined;
    let teamContext: 'home' | 'away' | undefined = undefined;

    // 1. Find Event Type
    for (const et of assignedEventTypes) {
      if (normalizedCommand.startsWith(et.label.toLowerCase())) {
        eventTypeFound = et;
        // Remove event type label from command for further parsing
        const remainingCommand = normalizedCommand.substring(et.label.length).trim();

        // Try to parse different player patterns
        // Pattern: "[Event Type Label] [Player Name]"
        // Pattern: "[Event Type Label] player [Player Jersey Number]"
        // Pattern: "[Event Type Label] home [Player Jersey Number]"
        // Pattern: "[Event Type Label] away [Player Jersey Number]"

        const playerRegex = /player\s+(\d+)/i;
        const homePlayerRegex = /home\s+(\d+)/i;
        const awayPlayerRegex = /away\s+(\d+)/i;

        let match;

        if ((match = homePlayerRegex.exec(remainingCommand)) !== null) {
          const jerseyNumber = parseInt(match[1], 10);
          playerFound = assignedPlayers.home.find(p => p.jersey_number === jerseyNumber);
          teamContext = 'home';
        } else if ((match = awayPlayerRegex.exec(remainingCommand)) !== null) {
          const jerseyNumber = parseInt(match[1], 10);
          playerFound = assignedPlayers.away.find(p => p.jersey_number === jerseyNumber);
          teamContext = 'away';
        } else if ((match = playerRegex.exec(remainingCommand)) !== null) {
          const jerseyNumber = parseInt(match[1], 10);
          // Search in both teams if no team context
          playerFound = assignedPlayers.home.find(p => p.jersey_number === jerseyNumber) ||
                        assignedPlayers.away.find(p => p.jersey_number === jerseyNumber);
          if (playerFound) {
            teamContext = assignedPlayers.home.includes(playerFound) ? 'home' : 'away';
          }
        } else {
          // Assume remaining part is player name
          const playerName = remainingCommand.trim();
          playerFound = [...assignedPlayers.home, ...assignedPlayers.away].find(
            p => p.name.toLowerCase() === playerName
          );
          if (playerFound) {
            teamContext = assignedPlayers.home.includes(playerFound) ? 'home' : 'away';
          }
        }
        break; // Found event type, exit loop
      }
    }

    if (!eventTypeFound) {
      setFeedbackMessage(`Error: Event type not recognized in "${command}". Please check available event types and command formats below.`);
      setIsProcessingCommand(false);
      return;
    }

    if (!playerFound) {
      // If event type implies no player, it could be valid. For now, most events imply a player.
      // This part might need adjustment based on specific event types.
      // For this task, we assume player is generally required.
      setFeedbackMessage(`Error: Player not recognized or not specified clearly in "${command}". Please check available player names/numbers and command formats below.`);
      setIsProcessingCommand(false);
      return;
    }

    try {
      await onRecordEvent(eventTypeFound.key, playerFound.id, teamContext, {
        recorded_via: 'voice',
        transcript: command, // command is the normalized transcript
      });
      setFeedbackMessage(`Recorded: ${eventTypeFound.label} by ${playerFound.name} (${teamContext ? teamContext : 'N/A'})`);
    } catch (e: any) {
      console.error("Error recording event:", e);
      setFeedbackMessage(`Error: Could not record event. ${e.message || ''}`);
    }

    setIsProcessingCommand(false);
  }, [assignedEventTypes, assignedPlayers, onRecordEvent]);


  // --- Effect to process transcript ---
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessingCommand) {
      // Added !isProcessingCommand to prevent re-entry if transcript somehow changes while processing
      parseAndRecordEvent(transcript.trim());
    }
  }, [transcript, isListening, parseAndRecordEvent, isProcessingCommand]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedbackMessage("Listening...");
      startListening();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Voice Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-2">
          <Button
            onClick={toggleListening}
            disabled={isProcessingCommand}
            variant={isListening ? 'destructive' : 'outline'}
            size="icon"
            className="w-16 h-16 rounded-full"
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isListening ? "Listening..." : isProcessingCommand ? "Processing..." : "Tap to speak"}
          </p>
        </div>

        {speechError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Speech Recognition Error</AlertTitle>
            <AlertDescription>{speechError}</AlertDescription>
          </Alert>
        )}

        {feedbackMessage && (
          <Alert variant={
            feedbackMessage.toLowerCase().startsWith("error:") ? "destructive" :
            feedbackMessage.toLowerCase().startsWith("recorded:") || feedbackMessage.toLowerCase().startsWith("command recognized:") ? "default" : // Using default for success, can create a "success" variant if available
            "default" // Default for info like "Processing..."
          }>
            {feedbackMessage.toLowerCase().startsWith("error:") && <AlertCircle className="h-4 w-4" />}
            {feedbackMessage.toLowerCase().startsWith("recorded:") && <CheckCircle2 className="h-4 w-4" />}
            {!feedbackMessage.toLowerCase().startsWith("error:") && !feedbackMessage.toLowerCase().startsWith("recorded:") && <Info className="h-4 w-4" />}
            <AlertTitle>
              {feedbackMessage.toLowerCase().startsWith("error:") ? "Error" :
               feedbackMessage.toLowerCase().startsWith("recorded:") ? "Success" : "Info"}
            </AlertTitle>
            <AlertDescription>{feedbackMessage}</AlertDescription>
          </Alert>
        )}

        {transcript && (
          <div>
            <h4 className="font-semibold mt-2">Last Transcript:</h4>
            <p className="text-sm text-muted-foreground p-2 border rounded bg-slate-50 dark:bg-slate-800">{transcript}</p>
          </div>
        )}

        <div className="pt-2">
          <h4 className="font-semibold text-base mb-1">Voice Command Help:</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Supported command formats:
            <ul className="list-disc list-inside pl-2 my-1">
              <li>"[Event Type] [Player Name]" (e.g., "Goal John Doe")</li>
              <li>"[Event Type] player [Number]" (e.g., "Foul player 10")</li>
              <li>"[Event Type] home [Number]" (e.g., "Shot home 7")</li>
              <li>"[Event Type] away [Number]" (e.g., "Save away 1")</li>
            </ul>
            See available keywords below. Parsing is case-insensitive.
          </p>

          <h5 className="font-medium mt-2">Available Event Types:</h5>
          <div className="flex flex-wrap gap-1 mt-1">
            {assignedEventTypes.map(et => <Badge key={et.key} variant="secondary">{et.label}</Badge>)}
          </div>
        </div>

        <div>
          <h5 className="font-medium mt-2">Available Players:</h5>
          <p className="text-xs text-muted-foreground">(Name, #Jersey). Use full names as listed, or team context with jersey number (e.g., "home 10", "away 7").</p>
          <div className="mt-1">
            <strong className="text-sm">Home:</strong>
            <div className="flex flex-wrap gap-1 mt-1">
              {assignedPlayers.home.map(p => <Badge key={`home-${p.id}`} variant="outline" className="text-xs">{p.name} (#{p.jersey_number})</Badge>)}
            </div>
          </div>
          <div className="mt-2">
            <strong className="text-sm">Away:</strong>
            <div className="flex flex-wrap gap-1 mt-1">
              {assignedPlayers.away.map(p => <Badge key={`away-${p.id}`} variant="outline" className="text-xs">{p.name} (#{p.jersey_number})</Badge>)}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default TrackerVoiceInput;
