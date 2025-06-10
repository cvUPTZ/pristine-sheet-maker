import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWhisperJsSpeechRecognition } from '../hooks/useWhisperJsSpeechRecognition';
import { ParsedCommand } from '../lib/ai-parser';
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, CloudCog, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// --- Types ---
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

type Feedback = { status: 'info' | 'success' | 'error' | 'processing'; message: string; id?: string };

// --- Event Queue for Batch Processing ---
interface QueuedEvent {
  id: string;
  transcript: string;
  timestamp: number;
  retryCount: number;
}

// --- Optimized Component ---
export function TrackerVoiceInput({ 
  onRecordEvent, 
  assignedPlayers, 
  assignedEventTypes 
}: TrackerVoiceInputProps) {
  
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isParsingCommand, setIsParsingCommand] = useState(false);
  const [eventQueue, setEventQueue] = useState<QueuedEvent[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true); // New state for mic toggle
  
  // Performance monitoring
  const metricsRef = useRef({
    totalEvents: 0,
    successfulEvents: 0,
    averageProcessingTime: 0,
    failedEvents: 0
  });

  // Debounced feedback to prevent UI spam
  const feedbackTimeoutRef = useRef<NodeJS.Timeout>();
  const setDebouncedFeedback = useCallback((newFeedback: Feedback) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback(newFeedback);
    
    // Auto-clear success messages after 2 seconds
    if (newFeedback.status === 'success') {
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 2000);
    }
  }, []);

  // Optimized audio feedback with Web Audio API caching
  const audioContextRef = useRef<AudioContext | null>(null);
  const playSuccessSound = useCallback(() => {
    if (!isAudioEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(900, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Reduced volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  }, [isAudioEnabled]);

  // Event queue processor with retry logic
  const processEventQueue = useCallback(async () => {
    if (eventQueue.length === 0 || isParsingCommand) return;

    const eventToProcess = eventQueue[0];
    setIsParsingCommand(true);
    
    const startTime = performance.now();

    try {
      setDebouncedFeedback({ 
        status: 'processing', 
        message: `⚡ Processing: "${eventToProcess.transcript.substring(0, 30)}..."`,
        id: eventToProcess.id
      });

      // Optimized parsing with timeout
      const { data: parsedCommand, error: functionError } = await supabase.functions.invoke(
        'parse-voice-command',
        {
          body: {
            transcript: eventToProcess.transcript,
            assignedEventTypes,
            priority: 'high',
            timeout: 2500
          }
        }
      );

      if (functionError) {
        throw new Error(`Parse error: ${functionError.message}`);
      }

      const command = parsedCommand as ParsedCommand;
      const processingTime = performance.now() - startTime;

      if (!command || !command.eventType || command.confidence < 0.35) {
        throw new Error(`Low confidence (${command?.confidence?.toFixed(2) || 0})`);
      }

      // Record event with minimal data
      await onRecordEvent(
        command.eventType.key,
        command.player?.id,
        command.teamContext || undefined,
        { 
          recorded_via: 'voice_continuous',
          transcript: eventToProcess.transcript,
          confidence: command.confidence,
          processing_time_ms: Math.round(processingTime),
          queue_position: eventQueue.length,
          retry_count: eventToProcess.retryCount
        }
      );
      
      // Update metrics
      metricsRef.current.totalEvents++;
      metricsRef.current.successfulEvents++;
      metricsRef.current.averageProcessingTime = 
        (metricsRef.current.averageProcessingTime + processingTime) / 2;

      const successMessage = `✅ ${command.eventType.label} (${Math.round(processingTime)}ms)`;
      setDebouncedFeedback({ status: 'success', message: successMessage });
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 3)]);
      playSuccessSound();

      // Remove processed event from queue
      setEventQueue(prev => prev.slice(1));

    } catch (error: any) {
      console.error("Event processing error:", error);
      metricsRef.current.failedEvents++;
      
      // Retry logic
      if (eventToProcess.retryCount < 2) {
        setEventQueue(prev => [
          ...prev.slice(1),
          { ...eventToProcess, retryCount: eventToProcess.retryCount + 1 }
        ]);
        setDebouncedFeedback({ 
          status: 'info', 
          message: `🔄 Retrying... (${eventToProcess.retryCount + 1}/2)` 
        });
      } else {
        setEventQueue(prev => prev.slice(1));
        setDebouncedFeedback({ 
          status: 'error', 
          message: `❌ Failed: ${error.message}` 
        });
      }
    } finally {
      setIsParsingCommand(false);
    }
  }, [eventQueue, isParsingCommand, onRecordEvent, playSuccessSound, assignedEventTypes, setDebouncedFeedback]);

  // Process queue when events are added
  useEffect(() => {
    if (eventQueue.length > 0 && !isParsingCommand) {
      processEventQueue();
    }
  }, [eventQueue, isParsingCommand, processEventQueue]);

  // Optimized transcript handler
  const handleTranscriptCompleted = useCallback(async (newTranscript: string) => {
    if (!newTranscript.trim() || newTranscript.length < 3) {
      return; // Don't show feedback for short/empty transcripts in continuous mode
    }

    // Add to queue immediately for fast response
    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedEvent: QueuedEvent = {
      id: eventId,
      transcript: newTranscript,
      timestamp: Date.now(),
      retryCount: 0
    };

    setEventQueue(prev => [...prev, queuedEvent]);
    
    // Immediate user feedback
    setDebouncedFeedback({ 
      status: 'processing', 
      message: `⚡ Processing: "${newTranscript.substring(0, 25)}..."` 
    });

  }, [setDebouncedFeedback]);

  // WhisperJS hook
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
      setDebouncedFeedback({ status: 'error', message: `🎤 ${whisperError}` });
    }
  }, [whisperError, setDebouncedFeedback]);

  // Auto-start listening when component mounts and mic is enabled
  useEffect(() => {
    if (!isModelLoading && isMicEnabled && !isListening && !isTranscribing) {
      startListening(handleTranscriptCompleted);
    }
  }, [isModelLoading, isMicEnabled, isListening, isTranscribing, startListening, handleTranscriptCompleted]);

  // Handle mic toggle
  const toggleMic = useCallback(() => {
    if (isModelLoading) return;

    const newMicState = !isMicEnabled;
    setIsMicEnabled(newMicState);

    if (newMicState) {
      // Turn mic on - start listening
      setDebouncedFeedback({ 
        status: 'info', 
        message: "🎤 Mic enabled - listening continuously..."
      });
      if (!isListening && !isTranscribing) {
        startListening(handleTranscriptCompleted);
      }
    } else {
      // Turn mic off - stop listening
      setDebouncedFeedback({ 
        status: 'info', 
        message: "🔇 Mic disabled - not listening" 
      });
      if (isListening || isTranscribing) {
        stopListening();
      }
    }
  }, [isModelLoading, isMicEnabled, isListening, isTranscribing, startListening, stopListening, setDebouncedFeedback, handleTranscriptCompleted]);

  // Restart listening when a transcription completes (for continuous mode)
  useEffect(() => {
    if (isMicEnabled && !isModelLoading && !isListening && !isTranscribing) {
      // Small delay to avoid rapid restarts
      const timeoutId = setTimeout(() => {
        startListening(handleTranscriptCompleted);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMicEnabled, isModelLoading, isListening, isTranscribing, startListening, handleTranscriptCompleted]);

  // Memoized status and UI elements
  const statusInfo = useMemo(() => {
    if (isModelLoading) return { text: "🧠 Loading model...", icon: <Loader2 size={18} className="animate-spin" /> };
    if (!isMicEnabled) return { text: "🔇 Microphone disabled", icon: <MicOff size={18} /> };
    if (eventQueue.length > 0) return { text: `⚡ Processing ${eventQueue.length} event(s)...`, icon: <CloudCog size={18} className="animate-spin" /> };
    if (isTranscribing) return { text: "🎤 Transcribing...", icon: <Zap size={18} className="animate-pulse" /> };
    if (isListening) return { text: "🎤 Listening continuously...", icon: <Mic size={18} className="animate-pulse" /> };
    return { text: "⚡ Ready to listen", icon: <Zap size={18} /> };
  }, [isModelLoading, isMicEnabled, eventQueue.length, isTranscribing, isListening]);

  const micButtonConfig = useMemo(() => {
    const isDisabled = isModelLoading;
    
    return {
      disabled: isDisabled,
      className: `flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all ${
        isDisabled ? 'bg-gray-400 border-gray-500 text-white cursor-not-allowed' :
        isMicEnabled ? 'bg-green-500 border-green-600 text-white shadow-lg hover:bg-green-600' :
        'bg-red-500 border-red-600 text-white shadow-md hover:bg-red-600'
      }`,
      icon: isDisabled ? <Loader2 size={24} className="animate-spin" /> :
            isMicEnabled ? <Mic size={24} /> : <MicOff size={24} />
    };
  }, [isModelLoading, isMicEnabled]);

  // Performance metrics display
  const performanceMetrics = useMemo(() => {
    const { totalEvents, successfulEvents, averageProcessingTime, failedEvents } = metricsRef.current;
    if (totalEvents === 0) return null;
    
    const successRate = ((successfulEvents / totalEvents) * 100).toFixed(1);
    return {
      successRate,
      avgTime: Math.round(averageProcessingTime),
      failed: failedEvents,
      queued: eventQueue.length
    };
  }, [eventQueue.length, metricsRef.current.totalEvents]);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Continuous Voice Events
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
          {/* Mic Toggle Button */}
          <button
            onClick={toggleMic}
            className={micButtonConfig.className}
            disabled={micButtonConfig.disabled}
            aria-label={isMicEnabled ? "Turn microphone off" : "Turn microphone on"}
          >
            {micButtonConfig.icon}
          </button>
          
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <p className="text-sm text-center text-gray-600 font-medium">{statusInfo.text}</p>
          </div>
          
          {isMicEnabled && !isModelLoading && (
            <p className="text-xs text-center text-gray-500">
              Mic is always listening. Just speak naturally!
            </p>
          )}
        </div>

        {/* Performance Metrics */}
        {performanceMetrics && (
          <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 grid grid-cols-4 gap-2">
            <div>✅ {performanceMetrics.successRate}%</div>
            <div>⏱️ {performanceMetrics.avgTime}ms</div>
            <div>❌ {performanceMetrics.failed}</div>
            <div>📥 {performanceMetrics.queued}</div>
          </div>
        )}

        {/* Quick Commands */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-2 font-medium">Say any of these:</p>
          <div className="flex flex-wrap gap-1">
            {assignedEventTypes.slice(0, 6).map(eventType => (
              <span key={eventType.key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                "{eventType.label}"
              </span>
            ))}
            {assignedEventTypes.length > 6 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{assignedEventTypes.length - 6} more
              </span>
            )}
          </div>
        </div>

        {/* Current Transcript */}
        {currentTranscriptFromHook && isTranscribing && (
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-sm text-gray-500 font-medium">Processing:</p>
            <p className="text-sm italic">"{currentTranscriptFromHook}"</p>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-start space-x-2 p-3 rounded-lg border ${
            feedback.status === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            feedback.status === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
            feedback.status === 'processing' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {feedback.status === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {feedback.status === 'processing' && <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />}
            {feedback.status === 'info' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}
        
        {/* Recent Events */}
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