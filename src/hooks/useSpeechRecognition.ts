
import { useState, useRef } from 'react';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

/**
 * @typedef {object} SpeechRecognitionHook
 * @property {boolean} isListening - Whether speech recognition is currently active.
 * @property {string} transcript - The latest recognized speech transcript.
 * @property {string | null} error - Any error message from speech recognition.
 * @property {() => void} startListening - Function to start speech recognition.
 * @property {() => void} stopListening - Function to stop speech recognition.
 */

/**
 * Custom hook for speech recognition functionality.
 * @returns {SpeechRecognitionHook}
 */
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /**
   * Initializes and starts speech recognition.
   */
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Clean up any existing recognition instance
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    setIsListening(true);
    setTranscript('');
    setError(null);

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i];
        if (segment.isFinal) {
          finalTranscript += segment[0].transcript;
        } else {
          interimTranscript += segment[0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  /**
   * Stops speech recognition.
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
};

export default useSpeechRecognition;
