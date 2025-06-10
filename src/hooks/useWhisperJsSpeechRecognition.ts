
import { useState, useEffect, useRef, useCallback } from 'react';

// Define the type for the pipeline task
type SpeechToTextPipeline = any;

export const useWhisperJsSpeechRecognition = () => {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const transcriber = useRef<SpeechToTextPipeline | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const onTranscriptCompletedRef = useRef<(transcript: string) => void>(() => {});

  // Initialize the speech-to-text pipeline with optimizations
  useEffect(() => {
    const initializePipeline = async () => {
      try {
        console.log('Initializing optimized speech-to-text pipeline...');
        
        const { pipeline, env } = await import('@huggingface/transformers');
        
        // Configure for browser usage with optimizations
        env.remoteHost = 'https://huggingface.co/';
        env.remotePathTemplate = '{model}/resolve/{revision}/';
        env.allowLocalModels = false; // Force remote loading for faster startup
        
        // Check WebGPU support safely
        const isWebGPUSupported = typeof navigator !== 'undefined' && 
          'gpu' in navigator && 
          navigator.gpu !== undefined;
        
        const device = isWebGPUSupported ? 'webgpu' : 'wasm';
        console.log(`Using device: ${device}`);
        
        // Use the smallest, fastest Whisper model for real-time processing
        transcriber.current = await pipeline(
          'automatic-speech-recognition', 
          'onnx-community/whisper-base.en', // Faster than tiny but still accurate
          {
            device: device,
            dtype: 'fp16', // Use half precision for speed
            cache_dir: './.cache', // Cache model for faster subsequent loads
          }
        );
        
        setIsModelLoading(false);
        console.log('Fast speech-to-text pipeline ready.');
      } catch (e) {
        console.error('Failed to initialize speech-to-text pipeline:', e);
        setError(`Failed to load speech model: ${e instanceof Error ? e.message : String(e)}`);
        setIsModelLoading(false);
      }
    };
    
    initializePipeline();
  }, []);

  // Optimized audio processing with shorter chunks
  const processAudioStream = useCallback(async (audioData: Float32Array) => {
    if (!transcriber.current || isModelLoading || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      console.log('Processing audio stream chunk...');
      
      // Process audio in smaller chunks for faster response
      const output = await transcriber.current(audioData, {
        chunk_length_s: 10, // Process 10-second chunks
        stride_length_s: 2,  // 2-second stride for overlap
        return_timestamps: false, // Skip timestamps for speed
      });

      const recognizedText = typeof output === 'string' ? output : (output as any)?.text || '';
      
      if (recognizedText && recognizedText.trim().length > 0) {
        console.log('Fast transcription:', recognizedText);
        setTranscript(recognizedText);
        onTranscriptCompletedRef.current(recognizedText);
      }

    } catch (e) {
      console.error('Error during fast transcription:', e);
      setError(`Fast transcription failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [isModelLoading, isProcessing]);

  // Real-time audio processing setup
  const setupRealtimeProcessing = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Whisper optimal sample rate
        }
      });
      
      stream.current = mediaStream;
      audioContext.current = new AudioContext({ sampleRate: 16000 });
      
      const source = audioContext.current.createMediaStreamSource(mediaStream);
      
      // Use modern AudioWorklet if available, fallback to ScriptProcessor
      if (audioContext.current.audioWorklet) {
        // For modern browsers - more efficient
        const workletModule = `
          class AudioProcessor extends AudioWorkletProcessor {
            constructor() {
              super();
              this.bufferSize = 4096;
              this.buffer = new Float32Array(this.bufferSize);
              this.bufferIndex = 0;
            }
            
            process(inputs) {
              const input = inputs[0];
              if (input.length > 0) {
                const channelData = input[0];
                for (let i = 0; i < channelData.length; i++) {
                  this.buffer[this.bufferIndex] = channelData[i];
                  this.bufferIndex++;
                  
                  if (this.bufferIndex >= this.bufferSize) {
                    this.port.postMessage(this.buffer.slice());
                    this.bufferIndex = 0;
                  }
                }
              }
              return true;
            }
          }
          registerProcessor('audio-processor', AudioProcessor);
        `;
        
        const blob = new Blob([workletModule], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        
        await audioContext.current.audioWorklet.addModule(workletUrl);
        const workletNode = new AudioWorkletNode(audioContext.current, 'audio-processor');
        
        workletNode.port.onmessage = (event) => {
          if (!isProcessing) {
            processAudioStream(event.data);
          }
        };
        
        source.connect(workletNode);
        URL.revokeObjectURL(workletUrl);
        
      } else {
        // Fallback for older browsers
        processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
        processor.current.onaudioprocess = (event) => {
          if (!isProcessing) {
            const audioData = event.inputBuffer.getChannelData(0);
            processAudioStream(new Float32Array(audioData));
          }
        };
        
        source.connect(processor.current);
        processor.current.connect(audioContext.current.destination);
      }
      
      setIsListening(true);
      console.log('Real-time audio processing started');
      
    } catch (e) {
      console.error('Error setting up real-time processing:', e);
      setError(`Microphone setup failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [processAudioStream, isProcessing]);

  const startListening = useCallback((onTranscriptCompleted: (transcript: string) => void) => {
    if (isModelLoading) {
      setError("Speech model is still loading.");
      return;
    }
    if (isListening) {
      console.warn("Already listening.");
      return;
    }

    onTranscriptCompletedRef.current = onTranscriptCompleted;
    setTranscript('');
    setError(null);
    
    setupRealtimeProcessing();
  }, [isModelLoading, isListening, setupRealtimeProcessing]);

  const stopListening = useCallback(() => {
    console.log('Stopping real-time listening...');
    
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }
    
    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }
    
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

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
