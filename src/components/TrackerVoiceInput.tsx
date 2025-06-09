
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Volume2, VolumeX } from 'lucide-react';

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
}

interface TrackerVoiceInputProps {
  matchId: string;
  trackerUserId: string;
  assignedPlayers: AssignedPlayers;
  assignedEventTypes: AssignedEventType[];
  onRecordEvent: (
    eventTypeKey: string,
    playerId?: number,
    teamId?: 'home' | 'away',
    details?: Record<string, any>
  ) => Promise<void>;
}

interface ParsedCommand {
  eventType: AssignedEventType | null;
  player: Player | null;
  teamContext: 'home' | 'away' | null;
  confidence: number;
}

/**
 * Enhanced TrackerVoiceInput component with improved speech recognition and command parsing.
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
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const processedTranscriptsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  // Audio feedback for successful commands
  const playSuccessSound = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Audio feedback not available:', error);
    }
  }, [isAudioEnabled]);

  // Enhanced command parsing with fuzzy matching and multiple patterns
  const parseCommand = useCallback((command: string): ParsedCommand => {
    const normalizedCommand = command.toLowerCase().trim();
    console.log('Parsing command:', normalizedCommand);

    let bestMatch: ParsedCommand = {
      eventType: null,
      player: null,
      teamContext: null,
      confidence: 0
    };

    // Try different parsing patterns
    const patterns = [
      // Pattern 1: "[Event] [Team] [Number]" (e.g., "goal home 10")
      /^(\w+)\s+(home|away)\s+(\d+)$/i,
      // Pattern 2: "[Event] player [Number]" (e.g., "shot player 7")
      /^(\w+)\s+player\s+(\d+)$/i,
      // Pattern 3: "[Event] [Number]" (e.g., "pass 5")
      /^(\w+)\s+(\d+)$/i,
      // Pattern 4: "[Event] [Player Name]" (e.g., "foul john doe")
      /^(\w+)\s+(.+)$/i,
      // Pattern 5: "[Team] [Number] [Event]" (e.g., "home 10 goal")
      /^(home|away)\s+(\d+)\s+(\w+)$/i,
    ];

    for (const pattern of patterns) {
      const match = normalizedCommand.match(pattern);
      if (!match) continue;

      let eventTypeMatch: AssignedEventType | null = null;
      let playerMatch: Player | null = null;
      let teamMatch: 'home' | 'away' | null = null;
      let confidence = 0.5;

      // Parse based on pattern
      if (pattern === patterns[0]) { // "[Event] [Team] [Number]"
        const [, eventStr, team, numberStr] = match;
        eventTypeMatch = findBestEventTypeMatch(eventStr);
        teamMatch = team as 'home' | 'away';
        const jerseyNumber = parseInt(numberStr, 10);
        playerMatch = assignedPlayers[teamMatch]?.find(p => p.jersey_number === jerseyNumber) || null;
        confidence = 0.9;
      } else if (pattern === patterns[1]) { // "[Event] player [Number]"
        const [, eventStr, numberStr] = match;
        eventTypeMatch = findBestEventTypeMatch(eventStr);
        const jerseyNumber = parseInt(numberStr, 10);
        playerMatch = [...assignedPlayers.home, ...assignedPlayers.away]
          .find(p => p.jersey_number === jerseyNumber) || null;
        if (playerMatch) {
          teamMatch = assignedPlayers.home.includes(playerMatch) ? 'home' : 'away';
        }
        confidence = 0.8;
      } else if (pattern === patterns[2]) { // "[Event] [Number]"
        const [, eventStr, numberStr] = match;
        eventTypeMatch = findBestEventTypeMatch(eventStr);
        const jerseyNumber = parseInt(numberStr, 10);
        playerMatch = [...assignedPlayers.home, ...assignedPlayers.away]
          .find(p => p.jersey_number === jerseyNumber) || null;
        if (playerMatch) {
          teamMatch = assignedPlayers.home.includes(playerMatch) ? 'home' : 'away';
        }
        confidence = 0.7;
      } else if (pattern === patterns[3]) { // "[Event] [Player Name]"
        const [, eventStr, playerNameStr] = match;
        eventTypeMatch = findBestEventTypeMatch(eventStr);
        playerMatch = findBestPlayerNameMatch(playerNameStr);
        if (playerMatch) {
          teamMatch = assignedPlayers.home.includes(playerMatch) ? 'home' : 'away';
        }
        confidence = 0.6;
      } else if (pattern === patterns[4]) { // "[Team] [Number] [Event]"
        const [, team, numberStr, eventStr] = match;
        eventTypeMatch = findBestEventTypeMatch(eventStr);
        teamMatch = team as 'home' | 'away';
        const jerseyNumber = parseInt(numberStr, 10);
        playerMatch = assignedPlayers[teamMatch]?.find(p => p.jersey_number === jerseyNumber) || null;
        confidence = 0.8;
      }

      // Calculate final confidence based on matches
      let finalConfidence = confidence;
      if (eventTypeMatch) finalConfidence += 0.3;
      if (playerMatch) finalConfidence += 0.2;
      if (teamMatch) finalConfidence += 0.1;

      if (finalConfidence > bestMatch.confidence) {
        bestMatch = {
          eventType: eventTypeMatch,
          player: playerMatch,
          teamContext: teamMatch,
          confidence: finalConfidence
        };
      }
    }

    return bestMatch;
  }, [assignedPlayers, assignedEventTypes]);

  // Fuzzy matching for event types
  const findBestEventTypeMatch = useCallback((eventStr: string): AssignedEventType | null => {
    const normalized = eventStr.toLowerCase();
    
    // Exact match first
    let match = assignedEventTypes.find(et => et.label.toLowerCase() === normalized);
    if (match) return match;

    // Partial match
    match = assignedEventTypes.find(et => 
      et.label.toLowerCase().includes(normalized) || 
      normalized.includes(et.label.toLowerCase())
    );
    if (match) return match;

    // Common aliases
    const aliases: Record<string, string[]> = {
      'goal': ['score', 'scored'],
      'pass': ['passed', 'passing'],
      'shot': ['shoot', 'shooting'],
      'foul': ['fouled', 'foulcommitted'],
      'tackle': ['tackled', 'tackling'],
      'card': ['yellow', 'red', 'yellowcard', 'redcard'],
      'substitution': ['sub', 'substitute', 'substituted'],
      'corner': ['cornerkick'],
      'freekick': ['free', 'kick'],
      'offside': ['offsides'],
    };

    for (const [key, synonyms] of Object.entries(aliases)) {
      if (synonyms.includes(normalized)) {
        match = assignedEventTypes.find(et => et.label.toLowerCase().includes(key));
        if (match) return match;
      }
    }

    return null;
  }, [assignedEventTypes]);

  // Fuzzy matching for player names
  const findBestPlayerNameMatch = useCallback((nameStr: string): Player | null => {
    const normalized = nameStr.toLowerCase().trim();
    const allPlayers = [...assignedPlayers.home, ...assignedPlayers.away];
    
    // Exact match
    let match = allPlayers.find(p => p.name.toLowerCase() === normalized);
    if (match) return match;

    // Partial match (first name or last name)
    const nameParts = normalized.split(/\s+/);
    for (const part of nameParts) {
      if (part.length < 2) continue;
      match = allPlayers.find(p => 
        p.name.toLowerCase().includes(part) ||
        p.name.toLowerCase().split(/\s+/).some(playerPart => playerPart.startsWith(part))
      );
      if (match) return match;
    }

    return null;
  }, [assignedPlayers]);

  // Enhanced command processing
  const processCommand = useCallback(async (command: string) => {
    if (processedTranscriptsRef.current.has(command) || isProcessingCommand) {
      return;
    }

    processedTranscriptsRef.current.add(command);
    setIsProcessingCommand(true);
    setFeedbackMessage(`Processing: "${command}"`);

    try {
      const parsed = parseCommand(command);
      console.log('Parsed command:', parsed);

      if (parsed.confidence < 0.4) {
        setFeedbackMessage(`Low confidence command. Please try again with clearer speech: "${command}"`);
        return;
      }

      if (!parsed.eventType) {
        setFeedbackMessage(`Event type not recognized in "${command}". Available: ${assignedEventTypes.map(et => et.label).join(', ')}`);
        return;
      }

      if (!parsed.player) {
        setFeedbackMessage(`Player not found in "${command}". Please specify player name or jersey number clearly.`);
        return;
      }

      // Record the event
      await onRecordEvent(
        parsed.eventType.key,
        parsed.player.id,
        parsed.teamContext || undefined,
        {
          recorded_via: 'voice',
          transcript: command,
          confidence: parsed.confidence,
          parsed_data: parsed
        }
      );

      const successMessage = `✅ Recorded: ${parsed.eventType.label} by ${parsed.player.name} (#${parsed.player.jersey_number}) - ${parsed.teamContext?.toUpperCase()}`;
      setFeedbackMessage(successMessage);
      
      // Add to command history
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 4)]);
      
      // Play success sound
      playSuccessSound();

    } catch (error: any) {
      console.error("Error recording event:", error);
      setFeedbackMessage(`❌ Failed to record event: ${error.message}`);
    } finally {
      setIsProcessingCommand(false);
    }
  }, [parseCommand, assignedEventTypes, onRecordEvent, isProcessingCommand, playSuccessSound]);

  // Process transcript when speech recognition stops
  useEffect(() => {
    if (!isListening && transcript.trim() && transcript !== lastProcessedTranscript) {
      setLastProcessedTranscript(transcript);
      processCommand(transcript.trim());
    }
  }, [transcript, isListening, lastProcessedTranscript, processCommand]);

  // Clear processed transcripts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      processedTranscriptsRef.current.clear();
    }, 30000); // Clear every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedbackMessage("🎤 Listening... Speak clearly!");
      startListening();
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Enhanced Voice Input</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudio}
              className="p-2"
            >
              {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-3">
          <Button
            onClick={toggleListening}
            disabled={isProcessingCommand}
            variant={isListening ? 'destructive' : 'outline'}
            size="lg"
            className="w-20 h-20 rounded-full relative"
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-lg font-medium">
              {isListening ? "🎤 Listening..." : 
               isProcessingCommand ? "⚙️ Processing..." : 
               "🎯 Ready to Record"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Say: "[Event] [Team/Player] [Number]" or "[Event] [Player Name]"
            </p>
          </div>
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
            feedbackMessage.includes("❌") || feedbackMessage.toLowerCase().startsWith("error:") ? "destructive" :
            feedbackMessage.includes("✅") || feedbackMessage.toLowerCase().startsWith("recorded:") ? "default" :
            "default"
          }>
            {feedbackMessage.includes("❌") && <AlertCircle className="h-4 w-4" />}
            {feedbackMessage.includes("✅") && <CheckCircle2 className="h-4 w-4" />}
            {!feedbackMessage.includes("❌") && !feedbackMessage.includes("✅") && <Info className="h-4 w-4" />}
            <AlertDescription className="font-medium">{feedbackMessage}</AlertDescription>
          </Alert>
        )}

        {transcript && (
          <div className="p-3 border rounded-lg bg-muted/50">
            <h4 className="font-semibold text-sm mb-1">Last Heard:</h4>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {commandHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Recent Commands:</h4>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {commandHistory.map((cmd, idx) => (
                <p key={idx} className="text-xs text-muted-foreground truncate">
                  {cmd}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2 border-t">
          <div>
            <h5 className="font-medium text-sm mb-2">📋 Quick Reference:</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <strong>Examples:</strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>"Goal home 10"</li>
                  <li>"Shot player 7"</li>
                  <li>"Foul John Doe"</li>
                  <li>"Pass away 5"</li>
                </ul>
              </div>
              <div>
                <strong>Tips:</strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Speak clearly</li>
                  <li>Use jersey numbers</li>
                  <li>Wait for processing</li>
                  <li>Check feedback</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-sm">Available Events:</h5>
            <div className="flex flex-wrap gap-1 mt-1">
              {assignedEventTypes.map(et => (
                <Badge key={et.key} variant="secondary" className="text-xs">
                  {et.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-sm">Players:</h5>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <strong className="text-xs">Home:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {assignedPlayers.home.slice(0, 3).map(p => (
                    <Badge key={`home-${p.id}`} variant="outline" className="text-xs">
                      #{p.jersey_number}
                    </Badge>
                  ))}
                  {assignedPlayers.home.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{assignedPlayers.home.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <strong className="text-xs">Away:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {assignedPlayers.away.slice(0, 3).map(p => (
                    <Badge key={`away-${p.id}`} variant="outline" className="text-xs">
                      #{p.jersey_number}
                    </Badge>
                  ))}
                  {assignedPlayers.away.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{assignedPlayers.away.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerVoiceInput;
