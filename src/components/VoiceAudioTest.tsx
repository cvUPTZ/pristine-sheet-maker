
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

const VoiceAudioTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setupAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      monitorIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setAudioLevel(average / 255);
      }, 100);
      
    } catch (error) {
      console.error('Audio monitoring setup failed:', error);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      setupAudioMonitoring(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
          setHasRecording(true);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
      
    } catch (error: any) {
      console.error('Recording failed:', error);
      toast.error('Failed to start recording: ' + error.message);
    }
  }, [setupAudioMonitoring]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setAudioLevel(0);
      toast.success('Recording stopped');
    }
  }, [isRecording]);

  const playRecording = useCallback(async () => {
    if (!audioElementRef.current || !hasRecording) return;
    
    try {
      audioElementRef.current.volume = 1.0;
      await audioElementRef.current.play();
      setIsPlaying(true);
      toast.success('Playing recording');
    } catch (error: any) {
      console.error('Playback failed:', error);
      toast.error('Playback failed: ' + error.message);
    }
  }, [hasRecording]);

  const pauseRecording = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      toast.info('Playback paused');
    }
  }, []);

  const testDirectAudio = useCallback(async () => {
    try {
      // Test direct audio playback with a simple audio element
      const audio = new Audio();
      audio.volume = 0.5;
      
      // Create a simple test tone
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 1000);
      
      toast.success('Test tone played (440Hz for 1 second)');
      
    } catch (error: any) {
      console.error('Direct audio test failed:', error);
      toast.error('Direct audio test failed: ' + error.message);
    }
  }, []);

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4 text-purple-600" />
          Voice Audio Test
          <Badge variant="outline" className="text-xs">
            Debug Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Audio Level Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Input Level:</span>
            <div className="flex gap-0.5">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded-sm transition-colors ${
                    audioLevel > (i + 1) * 0.1 ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-mono">
              {(audioLevel * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            size="sm"
            variant={isRecording ? "destructive" : "default"}
            className="flex items-center gap-1"
          >
            {isRecording ? (
              <>
                <MicOff className="h-3 w-3" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-3 w-3" />
                Start Recording
              </>
            )}
          </Button>
          
          {hasRecording && (
            <Button
              onClick={isPlaying ? pauseRecording : playRecording}
              size="sm"
              variant="secondary"
              className="flex items-center gap-1"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Play
                </>
              )}
            </Button>
          )}
        </div>

        {/* Direct Audio Test */}
        <div className="border-t pt-2">
          <Button
            onClick={testDirectAudio}
            size="sm"
            variant="outline"
            className="w-full text-xs"
          >
            Test Direct Audio (440Hz Tone)
          </Button>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioElementRef}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />

        {/* Instructions */}
        <div className="text-xs text-gray-600 p-2 bg-purple-100 rounded border">
          <strong>Test Steps:</strong><br/>
          1. Click "Start Recording" and speak<br/>
          2. Watch the input level meter<br/>
          3. Click "Stop Recording"<br/>
          4. Click "Play" to hear your recording<br/>
          5. Try "Test Direct Audio" for system audio
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceAudioTest;
