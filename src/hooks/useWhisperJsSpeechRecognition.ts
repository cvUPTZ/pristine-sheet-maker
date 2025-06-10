import { useState, useEffect, useRef, useCallback } from 'react';

// Define the type for the pipeline task
type SpeechToTextPipeline = any; // Adjust if a more specific type is available from transformers.js

export const useWhisperJsSpeechRecognition = () => {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For transcription processing
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const transcriber = useRef<SpeechToTextPipeline | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const onTranscriptCompletedRef = useRef<(transcript: string) => void>(() => {});

  // Initialize the speech-to-text pipeline
  useEffect(() => {
    const initializePipeline = async () => {
      try {
        console.log('Initializing speech-to-text pipeline...');
        
        // Dynamic import to avoid build issues
        const { pipeline, env } = await import('@huggingface/transformers');
        
        // Configure for browser usage
        env.remoteHost = 'https://huggingface.co/';
        env.remotePathTemplate = '{model}/resolve/{revision}/';
        
        // Determine the best available device - check for WebGPU support safely
        const isWebGPUSupported = typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu !== undefined;
        const device = isWebGPUSupported ? 'webgpu' : 'wasm';
        
        console.log(`Using device: ${device}`);
        
        // Load a small Whisper model
        transcriber.current = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
          device: device, // Use webgpu if available, otherwise wasm
        });
        
        setIsModelLoading(false);
        console.log('Speech-to-text pipeline initialized successfully.');
      } catch (e) {
        console.error('Failed to initialize speech-to-text pipeline:', e);
        setError(`Failed to load speech model: ${e instanceof Error ? e.message : String(e)}`);
        setIsModelLoading(false);
      }
    };
    
    initializePipeline();
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!transcriber.current || isModelLoading) {
      setError('Transcription model not ready.');
      setIsProcessing(false);
      return;
    }

    try {
      const audioBuffer = await audioBlob.arrayBuffer();
      
      // Create AudioContext for proper audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 }); // Whisper expects 16kHz
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      const monoAudioData = decodedAudio.getChannelData(0); // Get mono channel

      console.log('Transcribing audio data...');
      const output = await transcriber.current(monoAudioData);

      const recognizedText = typeof output === 'string' ? output : (output as any)?.text || '';
      console.log('Transcription output:', recognizedText);
      setTranscript(recognizedText);
      onTranscriptCompletedRef.current(recognizedText);

    } catch (e) {
      console.error('Error during transcription:', e);
      setError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [isModelLoading]);

  const startListening = useCallback((onTranscriptCompleted: (transcript: string) => void) => {
    if (isModelLoading) {
      setError("Speech model is still loading.");
      console.warn("Attempted to start listening while model is loading.");
      return;
    }
    if (isListening || isProcessing) {
      console.warn("Already listening or processing.");
      return;
    }

    onTranscriptCompletedRef.current = onTranscriptCompleted;
    setTranscript('');
    setError(null);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];

        mediaRecorder.current.ondataavailable = event => {
          audioChunks.current.push(event.data);
        };

        mediaRecorder.current.onstop = async () => {
          setIsListening(false);
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
          // Stop microphone tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.current.start();
        setIsListening(true);
        console.log('Started listening via MediaRecorder.');
      })
      .catch(e => {
        console.error('Error getting user media (microphone):', e);
        setError(`Microphone access denied or error: ${e instanceof Error ? e.message : String(e)}`);
        setIsListening(false);
      });
  }, [isModelLoading, isListening, isProcessing, processAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorder.current && isListening) {
      mediaRecorder.current.stop(); // This will trigger onstop, then processing
      console.log('Stopped listening.');
    }
    // If not listening but mediaRecorder is active (e.g. from previous error), try to stop tracks
    else if (mediaRecorder.current?.stream) {
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isListening]);

  return {
    isModelLoading,
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening
  };
};
