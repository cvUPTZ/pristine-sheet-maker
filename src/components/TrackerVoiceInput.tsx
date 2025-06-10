import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWhisperJsSpeechRecognition } from '../hooks/useWhisperJsSpeechRecognition';
import { ParsedCommand } from '../lib/ai-parser';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, CloudCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data: parsedCommand, error: functionError } = await supabase.functions.invoke(
        'parse-voice-command',
        {
          body: {
            transcript: newTranscript,
            assignedEventTypes,
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
    if (isParsingCommand) return <><CloudCog size={18} className="inline animate-spin mr-1" /> Parsing command...</>;
    if (isTranscribing) return "✍️ Transcribing audio...";
    if (isListening) return "🎤 Listening...";
    return "🎯 Ready to Record";
  };
  
  const getButtonIcon = () => {
    if (isModelLoading || isParsingCommand) return <Loader2 size={32} className="animate-spin" />;
    if (isTranscribing) return <Loader2 size={32} className="animate-spin" />;
    if (isListening) return <MicOff size={32} />;
    return <Mic size={32} />;
  };

  const getButtonClass = () => {
    let baseClass = 'flex items-center justify-center w-20 h-20 rounded-full border-2 transition-all';
    if (isListening) {
      baseClass += ' bg-red-500 border-red-600 text-white animate-pulse';
    } else if (isModelLoading || isParsingCommand || isTranscribing) {
      baseClass += ' bg-gray-400 border-gray-500 text-white cursor-not-allowed';
    } else {
      baseClass += ' bg-blue-500 border-blue-600 text-white hover:bg-blue-600';
    }
    return baseClass;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">AI Voice Command (Whisper.js)</h3>
        <div className="flex gap-2">
          <button 
            className="p-2 rounded-full hover:bg-gray-100" 
            onClick={() => setIsAudioEnabled(p => !p)} 
            aria-label="Toggle audio feedback"
          >
            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={toggleListening}
            className={getButtonClass()}
            disabled={isModelLoading || isParsingCommand || isTranscribing}
            aria-label={isListening || isTranscribing ? "Stop recording" : "Start recording"}
          >
            {getButtonIcon()}
          </button>
          <p className="text-sm text-center text-gray-600">{getStatusText()}</p>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Available events:</p>
          <div className="flex flex-wrap gap-1">
            {assignedEventTypes.map(eventType => (
              <span key={eventType.key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {eventType.label}
              </span>
            ))}
          </div>
        </div>

        {currentTranscriptFromHook && !isTranscribing && !isParsingCommand && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Last transcript:</p>
            <p className="text-sm italic">"{currentTranscriptFromHook}"</p>
          </div>
        )}

        {feedback && (
          <div className={`flex items-start space-x-2 p-3 rounded-lg ${
            feedback.status === 'error' ? 'bg-red-50 text-red-800' :
            feedback.status === 'success' ? 'bg-green-50 text-green-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {feedback.status === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <p className="text-sm">{feedback.message}</p>
          </div>
        )}
        
        {commandHistory.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Recent Events</h4>
            <div className="space-y-1">
              {commandHistory.map((cmd, idx) => (
                <p key={idx} className="text-sm text-gray-700">{cmd}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
