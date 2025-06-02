
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, TestTube } from 'lucide-react';

const AudioTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🧪 AUDIO TEST:', logMessage);
    setLogs(prev => [...prev.slice(-4), logMessage]);
  };

  const startTest = async () => {
    try {
      addLog('🎤 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      addLog(`✅ Got stream with ${stream.getTracks().length} tracks`);
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        addLog(`📡 Audio track: enabled=${audioTrack.enabled}, muted=${audioTrack.muted}, state=${audioTrack.readyState}`);
        const settings = audioTrack.getSettings();
        addLog(`🎛️ Settings: sampleRate=${settings.sampleRate}, channelCount=${settings.channelCount}`);
      }
      
      streamRef.current = stream;
      
      // Setup audio analysis
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        addLog('▶️ Resumed audio context');
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      source.connect(analyserRef.current);
      addLog('🔗 Connected audio analysis pipeline');
      
      setIsRecording(true);
      
      // Start monitoring
      const monitorAudio = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255;
        setAudioLevel(normalizedLevel);
        
        if (normalizedLevel > 0.01) {
          addLog(`🔊 Audio detected: ${(normalizedLevel * 100).toFixed(1)}%`);
        }
      };
      
      intervalRef.current = setInterval(monitorAudio, 100);
      addLog('🎵 Started audio monitoring');
      
    } catch (error: any) {
      addLog(`❌ Error: ${error.name} - ${error.message}`);
      console.error('Audio test error:', error);
    }
  };

  const stopTest = () => {
    addLog('🛑 Stopping audio test');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        addLog(`🛑 Stopped track: ${track.kind}`);
      });
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    addLog('✅ Cleanup complete');
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopTest();
      }
    };
  }, [isRecording]);

  const AudioLevelBar = () => (
    <div className="flex items-center gap-2">
      <Mic className="h-4 w-4" />
      <div className="flex gap-1">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-4 rounded-sm transition-colors ${
              audioLevel > (i + 1) * 0.1 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-mono">
        {(audioLevel * 100).toFixed(1)}%
      </span>
    </div>
  );

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-4 w-4" />
          Audio Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={isRecording ? stopTest : startTest}
            variant={isRecording ? "destructive" : "default"}
          >
            {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isRecording ? 'Stop Test' : 'Start Test'}
          </Button>
        </div>
        
        {isRecording && (
          <div className="space-y-2">
            <AudioLevelBar />
            <div className="text-xs text-green-600">
              🎤 Speak into your microphone to test audio detection
            </div>
          </div>
        )}
        
        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 text-xs p-2 rounded font-mono max-h-32 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioTest;
