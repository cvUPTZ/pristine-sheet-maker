import React, { useState, useEffect, useCallback } from 'react';
import { useWhisperJsSpeechRecognition } from '../hooks/useWhisperJsSpeechRecognition';
import { ParsedCommand } from '../lib/ai-parser';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, CloudCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// --- Prop and State Types ---
interface Player { id: number; name: string; jersey_number: number | null; }
interface AssignedPlayers { home: Player[]; away: Player[]; }
interface AssignedEventType { key: string; label: string; }

interface TrackerVoiceInputProps {
  onRecordEvent: ( 
    eventTypeKey: string, 
    playerId?: number, 
    teamId?: 'home' | 'away', 
    details?: Record<string, any> 
  ) => Promise<void>;
  assignedPlayers: AssignedPlayers;
  assignedEventTypes: AssignedEventType[];
}

type Feedback = { status: 'info' | 'success' | 'error'; message: string };

// --- The Component ---
export function TrackerVoiceInput({ 
  onRecordEvent, 
  assignedPlayers, 
  assignedEventTypes 
}: TrackerVoiceInputProps) {
  
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isParsingCommand, setIsParsingCommand] = useState(false);

  // ... keep existing code (playSuccessSound)
  const playSuccessSound = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.setValueAtTime(900, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) { console.warn("Audio feedback failed:", e); }
  }, [isAudioEnabled]);

  // ... keep existing code (handleTranscriptCompleted)
  const handleTranscriptCompleted = useCallback(async (newTranscript: string) => {
    if (!newTranscript.trim()) {
      setFeedback({ status: 'info', message: "No speech detected or transcript empty." });
      return;
    }

    setFeedback({ status: 'info', message: `Transcript: "${newTranscript}". Now parsing command...` });
    setIsParsingCommand(true);

    try {
      const { data: parsedCommand, error: functionError } = await supabase.functions.invoke(
        'parse-voice-command',
        {
          body: {
            transcript: newTranscript,
            assignedEventTypes,
            assignedPlayers,
          }
        }
      );

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(`Error from parsing function: ${functionError.message}`);
      }

      const command = parsedCommand as ParsedCommand;

      if (!command || !command.eventType || command.confidence < 0.5) {
        const message = `Could not reliably parse command from: "${newTranscript}". Reason: ${command?.reasoning || 'Low confidence or no event type.'}`;
        setFeedback({ status: 'error', message });
        setIsParsingCommand(false);
        return;
      }

      await onRecordEvent(
        command.eventType.key,
        command.player?.id,
        command.teamContext || undefined, // Convert null to undefined
        { 
          recorded_via: 'voice_whisper_js',
          transcript: newTranscript,
          confidence: command.confidence,
          parsed_data: command,
        }
      );
      
      const playerInfo = command.player ? ` for ${command.player.name}` : '';
      const successMessage = `✅ Recorded: ${command.eventType.label}${playerInfo}`;
      setFeedback({ status: 'success', message: successMessage });
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 4)]);
      playSuccessSound();

    } catch (e: any) {
      console.error("Error during command parsing or recording:", e);
      setFeedback({ status: 'error', message: `Failed to process command: ${e.message}` });
    } finally {
      setIsParsingCommand(false);
    }
  }, [onRecordEvent, playSuccessSound, assignedEventTypes, assignedPlayers]);

  const {
    isModelLoading,
    isListening,
    isProcessing: isTranscribing,
    transcript: currentTranscriptFromHook,
    error: whisperError,
    startListening,
    stopListening
  } = useWhisperJsSpeechRecognition();
  
  useEffect(() => {
    if (whisperError) {
      setFeedback({ status: 'error', message: whisperError });
    }
  }, [whisperError]);

  const toggleListening = () => {
    if (isModelLoading || isParsingCommand) return;

    if (isListening || isTranscribing) {
      stopListening();
    } else {
      const eventTypeNames = assignedEventTypes.map(et => et.label).join(', ');
      setFeedback({ 
        status: 'info', 
        message: `Listening... Say an event like: ${eventTypeNames.split(', ').slice(0, 3).join(', ')}${eventTypeNames.split(', ').length > 3 ? '...' : ''}.`
      });
      startListening(handleTranscriptCompleted);
    }
  };

  const getStatusText = () => {
    if (isModelLoading) return "🧠 Loading speech model...";
    if (isParsingCommand) return <><CloudCog size={16} className="inline animate-spin mr-1" /> Parsing command...</>;
    if (isTranscribing) return "✍️ Transcribing audio...";
    if (isListening) return "🎤 Listening...";
    return "Ready to Record";
  };
  
  const getButtonIcon = () => {
    if (isModelLoading || isParsingCommand) return <Loader2 size={32} className="animate-spin" />;
    if (isTranscribing) return <Loader2 size={32} className="animate-spin" />;
    if (isListening) return <MicOff size={32} />;
    return <Mic size={32} />;
  };

  const getButtonClass = () => {
    const baseClass = 'flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105';
    if (isListening) {
      return `${baseClass} bg-red-500 border-red-700 text-white animate-pulse`;
    }
    if (isModelLoading || isParsingCommand || isTranscribing) {
      return `${baseClass} bg-gray-400 border-gray-600 text-white cursor-not-allowed`;
    }
    return `${baseClass} bg-primary border-primary/80 text-primary-foreground hover:bg-primary/90`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">AI Voice Command</CardTitle>
          <button 
            className="p-2 rounded-full text-muted-foreground hover:bg-accent" 
            onClick={() => setIsAudioEnabled(p => !p)} 
            aria-label="Toggle audio feedback"
          >
            {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
        <CardDescription>Use your voice to record match events.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4 py-6 bg-background rounded-lg">
          <button
            onClick={toggleListening}
            className={getButtonClass()}
            disabled={isModelLoading || isParsingCommand || isTranscribing}
            aria-label={isListening || isTranscribing ? "Stop recording" : "Start recording"}
          >
            {getButtonIcon()}
          </button>
          <div className="h-5 mt-4">
            <p className="text-sm text-center text-muted-foreground flex items-center justify-center">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {feedback && (
          <div className={`flex items-start space-x-3 p-3 rounded-lg border ${
            feedback.status === 'error' ? 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-500/30' :
            feedback.status === 'success' ? 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-500/30' :
            'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-500/30'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {feedback.status === 'error' && <AlertCircle className="w-5 h-5" />}
              {feedback.status === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {feedback.status === 'info' && <Info className="w-5 h-5" />}
            </div>
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        {currentTranscriptFromHook && !isListening && !isTranscribing && !isParsingCommand && (
          <div className="bg-muted/50 p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Last Transcript</p>
            <p className="text-sm italic text-foreground/80 pt-1">"{currentTranscriptFromHook}"</p>
          </div>
        )}
        
        <Separator />
        
        <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Available Event Types</h4>
              <div className="flex flex-wrap gap-2">
                {assignedEventTypes.map(eventType => (
                  <Badge key={eventType.key} variant="secondary">
                    {eventType.label}
                  </Badge>
                ))}
              </div>
            </div>

            {commandHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Recent Events</h4>
                <div className="space-y-1.5 bg-muted/50 p-3 rounded-lg border">
                  {commandHistory.map((cmd, idx) => (
                    <p key={idx} className="text-sm text-foreground/90 flex items-center">
                       <CheckCircle2 className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" /> 
                       <span>{cmd.replace('✅ Recorded: ', '')}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
