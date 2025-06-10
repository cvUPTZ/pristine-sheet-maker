
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWhisperJsSpeechRecognition } from '../hooks/useWhisperJsSpeechRecognition';
import { ParsedCommand } from '../lib/ai-parser';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, CloudCog, Zap } from 'lucide-react';
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

type Feedback = { status: 'info' | 'success' | 'error' | 'processing' | 'recording'; message: string };

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
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [recordingTimeout, setRecordingTimeout] = useState<NodeJS.Timeout | null>(null);

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
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) { console.warn("Audio feedback failed:", e); }
  }, [isAudioEnabled]);

  const handleTranscriptCompleted = useCallback(async (newTranscript: string) => {
    // Clear any existing recording timeout
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      setRecordingTimeout(null);
    }

    if (!newTranscript.trim()) {
      setFeedback({ status: 'info', message: "No clear speech detected. Try speaking closer to microphone." });
      return;
    }

    setProcessingStartTime(Date.now());
    setFeedback({ status: 'processing', message: `Processing: "${newTranscript}"...` });
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
        throw new Error(`Parsing error: ${functionError.message}`);
      }

      const command = parsedCommand as ParsedCommand;
      const processingTime = processingStartTime ? Date.now() - processingStartTime : 0;

      if (!command || !command.eventType || command.confidence < 0.4) {
        const message = `⚠️ Unclear command: "${newTranscript}". Try saying event type clearly.`;
        setFeedback({ status: 'error', message });
        setIsParsingCommand(false);
        return;
      }

      await onRecordEvent(
        command.eventType.key,
        command.player?.id,
        command.teamContext || undefined,
        { 
          recorded_via: 'voice_whisper_oneshot',
          transcript: newTranscript,
          confidence: command.confidence,
          processing_time_ms: processingTime,
          parsed_data: command,
        }
      );
      
      const successMessage = `⚡ ${command.eventType.label} recorded (${processingTime}ms)`;
      setFeedback({ status: 'success', message: successMessage });
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 4)]);
      playSuccessSound();

    } catch (e: any) {
      console.error("Error during command processing:", e);
      setFeedback({ status: 'error', message: `❌ Failed: ${e.message}` });
    } finally {
      setIsParsingCommand(false);
      setProcessingStartTime(null);
    }
  }, [onRecordEvent, playSuccessSound, assignedEventTypes, processingStartTime, recordingTimeout]);

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

  // Auto-stop recording after 5 seconds
  useEffect(() => {
    if (isListening && !recordingTimeout) {
      const timeout = setTimeout(() => {
        console.log('Auto-stopping recording after timeout');
        stopListening();
        setFeedback({ status: 'info', message: "Recording stopped automatically" });
      }, 5000); // 5 second timeout
      
      setRecordingTimeout(timeout);
    }
    
    if (!isListening && recordingTimeout) {
      clearTimeout(recordingTimeout);
      setRecordingTimeout(null);
    }
    
    return () => {
      if (recordingTimeout) {
        clearTimeout(recordingTimeout);
      }
    };
  }, [isListening, recordingTimeout, stopListening]);

  const handleMicClick = () => {
    if (isModelLoading || isParsingCommand) return;

    if (isListening || isTranscribing) {
      // Stop current recording
      stopListening();
      setFeedback({ status: 'info', message: "Recording stopped" });
    } else {
      // Start one-time recording
      const eventTypeNames = assignedEventTypes.map(et => et.label).join(', ');
      setFeedback({ 
        status: 'recording', 
        message: `🎤 Recording... Say: ${eventTypeNames.split(', ').slice(0, 2).join(', ')}...`
      });
      startListening(handleTranscriptCompleted);
    }
  };

  const getStatusText = () => {
    if (isModelLoading) return "🧠 Loading speech model...";
    if (isParsingCommand) return <><CloudCog size={18} className="inline animate-spin mr-1" /> Processing command...</>;
    if (isTranscribing) return <><Zap size={18} className="inline animate-pulse mr-1" /> Transcribing...</>;
    if (isListening) return "🎤 Recording (5s timeout)...";
    return "🎤 Click to Record Voice Command";
  };
  
  const getButtonIcon = () => {
    if (isModelLoading || isParsingCommand) return <Loader2 size={32} className="animate-spin" />;
    if (isTranscribing) return <Zap size={32} className="animate-pulse" />;
    if (isListening) return <MicOff size={32} />;
    return <Mic size={32} />;
  };

  const getButtonClass = () => {
    let baseClass = 'flex items-center justify-center w-20 h-20 rounded-full border-2 transition-all';
    if (isListening) {
      baseClass += ' bg-red-500 border-red-600 text-white animate-pulse shadow-lg';
    } else if (isModelLoading || isParsingCommand || isTranscribing) {
      baseClass += ' bg-gray-400 border-gray-500 text-white cursor-not-allowed';
    } else {
      baseClass += ' bg-blue-500 border-blue-600 text-white hover:bg-blue-600 shadow-md';
    }
    return baseClass;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5 text-blue-500" />
          One-Shot Voice Commands
        </h3>
        <div className="flex gap-2">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors" 
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
            onClick={handleMicClick}
            className={getButtonClass()}
            disabled={isModelLoading || isParsingCommand}
            aria-label={isListening || isTranscribing ? "Stop recording" : "Start recording"}
          >
            {getButtonIcon()}
          </button>
          <p className="text-sm text-center text-gray-600 font-medium">{getStatusText()}</p>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-2 font-medium">Quick commands:</p>
          <div className="flex flex-wrap gap-1">
            {assignedEventTypes.slice(0, 4).map(eventType => (
              <span key={eventType.key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                "{eventType.label}"
              </span>
            ))}
            {assignedEventTypes.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{assignedEventTypes.length - 4} more
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">💡 Click mic, speak command, auto-stops in 5s</p>
        </div>

        {currentTranscriptFromHook && !isTranscribing && !isParsingCommand && (
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-sm text-gray-500 font-medium">Last heard:</p>
            <p className="text-sm italic">"{currentTranscriptFromHook}"</p>
          </div>
        )}

        {feedback && (
          <div className={`flex items-start space-x-2 p-3 rounded-lg border ${
            feedback.status === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            feedback.status === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
            feedback.status === 'processing' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
            feedback.status === 'recording' ? 'bg-orange-50 text-orange-800 border-orange-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {feedback.status === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'processing' && <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />}
            {feedback.status === 'recording' && <Mic className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />}
            {feedback.status === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}
        
        {commandHistory.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Recent Events
            </h4>
            <div className="space-y-1">
              {commandHistory.map((cmd, idx) => (
                <p key={idx} className="text-sm text-gray-700 font-medium">{cmd}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
