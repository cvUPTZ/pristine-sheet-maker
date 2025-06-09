import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useGeminiSpeechRecognition } from '../hooks/useGeminiSpeechRecognition'
import { ParsedCommand } from '../lib/ai-parser'
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX, ToggleLeft, ToggleRight } from 'lucide-react'

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
  
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null)

  const geminiContext = useMemo(() => ({ assignedPlayers, assignedEventTypes }), [assignedPlayers, assignedEventTypes])

  const playSuccessSound = useCallback(() => {
    if (!isAudioEnabled) return
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.setValueAtTime(900, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } catch (e) { console.warn("Audio feedback failed:", e) }
  }, [isAudioEnabled])

  const handleCommandParsed = useCallback(async (command: ParsedCommand, transcript: string) => {
    const { eventType, confidence, reasoning } = command
    
    // Only require event type and reasonable confidence
    if (confidence < 0.6 || !eventType) {
      const message = `Could not understand event type. (Heard: "${transcript}")\nAI Reason: ${reasoning || 'Low confidence or no event type detected.'}`
      setFeedback({ status: 'error', message })
      
      // In continuous mode, restart listening after a brief delay
      if (continuousMode) {
        setTimeout(() => {
          startListening(handleCommandParsed)
        }, 2000) // Wait 2 seconds before restarting
      }
      return
    }
    
    try {
      // Record event with just the event type - no player or team required
      await onRecordEvent(
        eventType.key,
        undefined, // No player ID needed
        undefined, // No team needed
        { 
          recorded_via: 'voice', 
          transcript, 
          confidence, 
          parsed_data: command,
          event_only: true // Flag to indicate this is an event-only recording
        }
      )
      
      const successMessage = `✅ Recorded: ${eventType.label}`
      setFeedback({ status: 'success', message: successMessage })
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 4)])
      playSuccessSound()
      
      // In continuous mode, restart listening after success
      if (continuousMode) {
        setTimeout(() => {
          startListening(handleCommandParsed)
        }, 1000) // Wait 1 second before restarting
      }
    } catch (e: any) {
      setFeedback({ status: 'error', message: `Failed to record event: ${e.message}` })
      
      // In continuous mode, restart listening after error
      if (continuousMode) {
        setTimeout(() => {
          startListening(handleCommandParsed)
        }, 2000) // Wait 2 seconds before restarting
      }
    }
  }, [onRecordEvent, playSuccessSound, continuousMode])

  const { isListening, isProcessing, transcript, error, startListening, stopListening } = useGeminiSpeechRecognition(geminiContext)
  
  useEffect(() => {
    if (error) {
      setFeedback({ status: 'error', message: error })
      
      // In continuous mode, restart listening after error
      if (continuousMode && !isListening) {
        setTimeout(() => {
          startListening(handleCommandParsed)
        }, 3000) // Wait 3 seconds before restarting after error
      }
    }
  }, [error, continuousMode, isListening])

  // Handle continuous mode toggle
  useEffect(() => {
    if (continuousMode && !isListening && !isProcessing) {
      // Start listening when continuous mode is enabled
      const eventTypeNames = assignedEventTypes.map(et => et.label).join(', ')
      setFeedback({ 
        status: 'info', 
        message: `Continuous mode ON. Say events like: ${eventTypeNames.split(', ').slice(0, 3).join(', ')}${eventTypeNames.split(', ').length > 3 ? '...' : ''}.` 
      })
      startListening(handleCommandParsed)
    } else if (!continuousMode && isListening) {
      // Stop listening when continuous mode is disabled
      stopListening()
    }
  }, [continuousMode])

  const toggleListening = () => {
    if (continuousMode) {
      setContinuousMode(false)
      return
    }

    if (isListening || isProcessing) {
      stopListening()
    } else {
      // Single-shot mode instruction
      const eventTypeNames = assignedEventTypes.map(et => et.label).join(', ')
      setFeedback({ 
        status: 'info', 
        message: `Listening... Say an event type like: ${eventTypeNames.split(', ').slice(0, 3).join(', ')}${eventTypeNames.split(', ').length > 3 ? '...' : ''}.` 
      })
      startListening(handleCommandParsed)
    }
  }

  const toggleContinuousMode = () => {
    setContinuousMode(prev => !prev)
  }

  const getStatusText = () => {
    if (isProcessing) return "🤖 Analyzing..."
    if (isListening) return continuousMode ? "🎤 Always Listening..." : "🎤 Listening..."
    if (continuousMode) return "⏳ Waiting to Listen..."
    return "🎯 Ready to Record"
  }
  
  const getButtonIcon = () => {
    if (isProcessing) return <Loader2 size={32} className="animate-spin" />
    if (continuousMode) return <MicOff size={32} />
    if (isListening) return <MicOff size={32} />
    return <Mic size={32} />
  }

  const getButtonClass = () => {
    let baseClass = 'mic-button'
    if (continuousMode) baseClass += ' continuous'
    else if (isListening) baseClass += ' listening'
    return baseClass
  }

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="card-header">
        <h3 className="card-title">AI Voice Command</h3>
        <div className="flex gap-2">
          <button 
            className="icon-button" 
            onClick={toggleContinuousMode}
            aria-label="Toggle continuous mode"
            title={continuousMode ? "Disable continuous listening" : "Enable continuous listening"}
          >
            {continuousMode ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
          </button>
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
            aria-label={continuousMode ? "Stop continuous recording" : (isListening || isProcessing ? "Stop recording" : "Start recording")}
          >
            {getButtonIcon()}
          </button>
          <p className="status-text">{getStatusText()}</p>
          
          {continuousMode && (
            <p className="text-xs text-gray-500 mt-1">
              Continuous mode active - just speak when ready
            </p>
          )}
        </div>

        {/* Show available event types */}
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

        {transcript && (
          <div className="transcript-box">
            <p className="transcript-text">"{transcript}"</p>
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
      
      <style jsx>{`
        .mic-button.continuous {
          background: linear-gradient(135deg, #10b981, #059669);
          animation: pulse-green 2s infinite;
        }
        
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  )
}