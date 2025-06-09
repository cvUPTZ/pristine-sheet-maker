import { useState, useEffect, useRef, useCallback } from 'react'
import { parseCommandWithAI, ParsedCommand, GeminiContext } from '@/lib/ai-parser'

export const useGeminiSpeechRecognition = (context: GeminiContext) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onCommandParsedRef = useRef<(command: ParsedCommand, transcript: string) => void>(() => {})

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognitionAPI) {
      setError("Speech recognition is not supported by your browser.")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false // Process after each pause
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)
    
    recognition.onend = () => {
      setIsListening(false)
      // If it ends without processing, it means no final speech was detected
      if (!isProcessing) setTranscript('')
    }
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
         setError(`Speech error: ${event.error}`)
      }
    }
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1]
      const currentTranscript = lastResult[0].transcript
      setTranscript(currentTranscript)
      
      if (lastResult.isFinal) {
        setIsProcessing(true)
        parseCommandWithAI(currentTranscript, context)
          .then(parsedCommand => {
            onCommandParsedRef.current(parsedCommand, currentTranscript)
          })
          .catch((e: Error) => setError(`Command parsing failed: ${e.message}`))
          .finally(() => setIsProcessing(false))
      }
    }

    return () => recognitionRef.current?.abort()
  }, [context, isProcessing]) // re-run if isProcessing changes to handle onend correctly

  const startListening = useCallback((onCommandParsed: (command: ParsedCommand, transcript: string) => void) => {
    if (recognitionRef.current && !isListening) {
      onCommandParsedRef.current = onCommandParsed
      setTranscript('')
      setError(null)
      recognitionRef.current.start()
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  return { isListening, isProcessing, transcript, error, startListening, stopListening }
}