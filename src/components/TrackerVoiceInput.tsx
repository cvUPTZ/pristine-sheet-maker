import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useGeminiSpeechRecognition } from '../hooks/useGeminiSpeechRecognition'
import { ParsedCommand } from '../lib/ai-parser'
import { Mic, MicOff, AlertCircle, CheckCircle2, Info, Loader2, Volume2, VolumeX } from 'lucide-react'


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
    const { eventType, player, teamContext, confidence, reasoning } = command
    
    if (confidence < 0.6 || !eventType || !player) {
      const message = `Could not understand. (Heard: "${transcript}")\nAI Reason: ${reasoning || 'Low confidence.'}`
      setFeedback({ status: 'error', message })
      return
    }
    
    try {
      await onRecordEvent(
        eventType.key,
        player.id,
        teamContext || undefined,
        { recorded_via: 'voice', transcript, confidence, parsed_data: command }
      )
      const successMessage = `✅ Recorded: ${eventType.label} for ${player.name} (#${player.jersey_number})`
      setFeedback({ status: 'success', message: successMessage })
      setCommandHistory(prev => [successMessage, ...prev.slice(0, 4)])
      playSuccessSound()
    } catch (e: any) {
      setFeedback({ status: 'error', message: `Failed to record event: ${e.message}` })
    }
  }, [onRecordEvent, playSuccessSound])

  const { isListening, isProcessing, transcript, error, startListening, stopListening } = useGeminiSpeechRecognition(geminiContext)
  
  useEffect(() => {
    if (error) setFeedback({ status: 'error', message: error })
  }, [error])

  const toggleListening = () => {
    if (isListening || isProcessing) {
      stopListening()
    } else {
      setFeedback({ status: 'info', message: "Listening... Speak a command like 'Goal home 10'." })
      startListening(handleCommandParsed)
    }
  }

  const getStatusText = () => {
    if (isProcessing) return "🤖 Analyzing..."
    if (isListening) return "🎤 Listening..."
    return "🎯 Ready to Record"
  }
  
  const getButtonIcon = () => {
    if (isProcessing) return <Loader2 size={32} className="animate-spin" />
    if (isListening) return <MicOff size={32} />
    return <Mic size={32} />
  }

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="card-header">
        <h3 className="card-title">AI Voice Command</h3>
        <button className="icon-button" onClick={() => setIsAudioEnabled(p => !p)} aria-label="Toggle audio feedback">
          {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
      <div className="card-content">
        <div className="voice-control-area">
          <button
            onClick={toggleListening}
            className={`mic-button ${isListening ? 'listening' : ''}`}
            aria-label={isListening || isProcessing ? "Stop recording" : "Start recording"}
          >
            {getButtonIcon()}
          </button>
          <p className="status-text">{getStatusText()}</p>
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
    </div>
  )
}