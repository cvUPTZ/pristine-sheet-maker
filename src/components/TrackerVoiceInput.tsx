import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWhisperJsSpeechRecognition } from '../hooks/useWhisperJsSpeechRecognition'; // New Hook
// Assuming ParsedCommand is still relevant for the structure returned by the Edge Function
import { ParsedCommand } from '../lib/ai-parser';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, ToggleLeft, ToggleRight, CloudCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // For calling Edge Function

// --- Prop and State Types (assuming these remain the same) ---
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

// Environment variable for the Edge Function URL
const PARSE_COMMAND_FUNCTION_URL = process.env.REACT_APP_PARSE_COMMAND_FUNCTION_URL || '';
if (!PARSE_COMMAND_FUNCTION_URL) {
  console.warn('REACT_APP_PARSE_COMMAND_FUNCTION_URL is not set. Voice command parsing will fail.');
}


// --- The Component ---
export function TrackerVoiceInput({ 
  onRecordEvent, 
  assignedPlayers, 
  assignedEventTypes 
}: TrackerVoiceInputProps) {
  
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isParsingCommand, setIsParsingCommand] = useState(false); // New state for Edge Function call

  // const geminiContext = useMemo(() => ({ assignedPlayers, assignedEventTypes }), [assignedPlayers, assignedEventTypes]); // Context for parser

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

  const handleTranscriptCompleted = useCallback(async (newTranscript: string) => {
    if (!newTranscript.trim()) {
      setFeedback({ status: 'info', message: "No speech detected or transcript empty." });
      return;
    }

    setFeedback({ status: 'info', message: `Transcript: "${newTranscript}". Now parsing command...` });
    setIsParsingCommand(true);

    try {
      if (!PARSE_COMMAND_FUNCTION_URL) {
        throw new Error("Parse command function URL is not configured.");
      }

      // console.log("Sending to Supabase fn:", { transcript: newTranscript, assignedEventTypes, assignedPlayers });

      const { data: parsedCommand, error: functionError } = await supabase.functions.invoke(
        'parse-voice-command', // Name of your Supabase Edge Function
        {
          body: {
            transcript: newTranscript,
            assignedEventTypes,
            // assignedPlayers // Send if your Edge function uses it
          }
        }
      );

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(`Error from parsing function: ${functionError.message}`);
      }

      // Assuming parsedCommand is of type ParsedCommand
      const command = parsedCommand as ParsedCommand;
      // console.log("Parsed command from Supabase:", command);


      if (!command || !command.eventType || command.confidence < 0.5) { // Adjust confidence as needed
        const message = `Could not reliably parse command from: "${newTranscript}". Reason: ${command?.reasoning || 'Low confidence or no event type.'}`;
        setFeedback({ status: 'error', message });
        setIsParsingCommand(false);
        return;
      }

      await onRecordEvent(
        command.eventType.key,
        command.playerId,
        command.teamId,
        { 
          recorded_via: 'voice_whisper_js',
          transcript: newTranscript,
          confidence: command.confidence,
          parsed_data: command,
          event_only: command.event_only // Assuming the edge function sets this
        }
      );
      
      const successMessage = `✅ Recorded: ${command.eventType.label}`;
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
    isProcessing: isTranscribing, // Renaming for clarity from the hook's perspective
    transcript: currentTranscriptFromHook, // We mainly use the callback transcript
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
    if (isModelLoading || isParsingCommand) return; // Don't allow if model loading or parsing

    if (isListening || isTranscribing) {
      stopListening();
    } else {
      const eventTypeNames = assignedEventTypes.map(et => et.label).join(', ');
      setFeedback({ 
        status: 'info', 
        message: `Listening... Say an event like: ${eventTypeNames.split(', ').slice(0, 3).join(', ')}${eventTypeNames.split(', ').length > 3 ? '...' : ''}.`
      });
      // The hook now takes a callback for when transcription is complete
      startListening(handleTranscriptCompleted);
    }
  };

  const getStatusText = () => {
    if (isModelLoading) return "🧠 Loading speech model...";
    if (isParsingCommand) return <><CloudCog size={18} className="inline animate-spin mr-1" /> Parsing command...</>;
    if (isTranscribing) return "✍️ Transcribing audio...";
    if (isListening) return "🎤 Listening...";
    return "🎯 Ready to Record";
  };
  
  const getButtonIcon = () => {
    if (isModelLoading || isParsingCommand) return <Loader2 size={32} className="animate-spin" />;
    if (isTranscribing) return <Loader2 size={32} className="animate-spin" />; // Could use a different icon for transcribing
    if (isListening) return <MicOff size={32} />;
    return <Mic size={32} />;
  };

  const getButtonClass = () => {
    let baseClass = 'mic-button'; // Define this class in your CSS
    if (isListening) baseClass += ' listening'; // Define this class
    return baseClass;
  };

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="card-header">
        <h3 className="card-title">AI Voice Command (Whisper.js)</h3>
        <div className="flex gap-2">
          {/* Continuous mode toggle removed for simplicity with Whisper.js, can be added back if needed */}
          <button className="icon-button" onClick={() => setIsAudioEnabled(p => !p)} aria-label="Toggle audio feedback">
            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>
      <div className="card-content">
        <div className="voice-control-area">
          <button
            onClick={toggleListening}
            className={getButtonClass()}
            disabled={isModelLoading || isParsingCommand || isTranscribing}
            aria-label={isListening || isTranscribing ? "Stop recording" : "Start recording"}
          >
            {getButtonIcon()}
          </button>
          <p className="status-text">{getStatusText()}</p>
        </div>

        <div className="event-types-hint">
          <p className="text-sm text-gray-600 mb-2">Available events:</p>
          <div className="flex flex-wrap gap-1">
            {assignedEventTypes.map(eventType => (
              <span key={eventType.key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {eventType.label}
              </span>
            ))}
          </div>
        </div>

        {/* Display transcript from the hook as it's being recognized (interim results if available) */}
        {/* For this hook, transcript is set upon completion, so this might show the last final transcript */}
        {currentTranscriptFromHook && !isTranscribing && !isParsingCommand && (
          <div className="transcript-box">
            <p className="text-sm text-gray-500">Last transcript:</p>
            <p className="transcript-text">"{currentTranscriptFromHook}"</p>
          </div>
        )}

        {feedback && (
          <div className={`alert alert-${feedback.status}`}>
            {feedback.status === 'error' && <AlertCircle className="icon" />}
            {feedback.status === 'success' && <CheckCircle2 className="icon" />}
            {feedback.status === 'info' && <Info className="icon" />}
            <p className="alert-description">{feedback.message}</p>
          </div>
        )}
        
        {commandHistory.length > 0 && (
          <div className="history-section">
            <h4 className="history-title">Recent Events</h4>
            <div className="history-list">
              {commandHistory.map((cmd, idx) => (
                <p key={idx} className="history-item">{cmd}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Basic styles, assuming similar CSS structure as before */}
      <style jsx>{`
        .mic-button { /* Basic style */ }
        .mic-button.listening { /* Style when listening */ }
        .status-text { /* Style for status text */ }
        .transcript-box { margin-top: 1rem; padding: 0.5rem; background-color: #f9f9f9; border-radius: 4px; }
        .transcript-text { font-style: italic; }
        .alert { /* Your alert styles */ }
        .history-section { margin-top: 1rem; }
        /* Add other styles as needed */
      `}</style>
    </div>
  );
}