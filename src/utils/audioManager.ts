
interface AudioManagerOptions {
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

export class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private currentStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onAudioLevel?: (level: number) => void;
  private onError?: (error: Error) => void;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async initialize(options: AudioManagerOptions = {}): Promise<void> {
    if (this.isInitialized) {
      console.log('🎵 AudioManager already initialized');
      return;
    }

    this.onAudioLevel = options.onAudioLevel;
    this.onError = options.onError;

    try {
      await this.createAudioContext();
      this.isInitialized = true;
      console.log('✅ AudioManager initialized');
    } catch (error) {
      console.error('❌ AudioManager initialization failed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private async createAudioContext(): Promise<AudioContext> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('▶️ Resumed existing audio context');
      }
      return this.audioContext;
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      throw new Error('Web Audio API not supported');
    }

    this.audioContext = new AudioContext();
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('▶️ Audio context resumed after creation');
    }

    console.log('🎵 Created new audio context, state:', this.audioContext.state);
    return this.audioContext;
  }

  public async getUserMedia(constraints: MediaStreamConstraints = { audio: true }): Promise<MediaStream> {
    try {
      console.log('🎤 Requesting user media with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.currentStream && this.currentStream !== stream) {
        this.stopCurrentStream();
      }
      
      this.currentStream = stream;
      console.log('✅ Got user media stream with tracks:', stream.getTracks().map(t => t.kind));
      
      return stream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  public async setupAudioMonitoring(stream: MediaStream): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioManager not initialized');
    }

    try {
      await this.createAudioContext();
      
      if (this.sourceNode) {
        this.sourceNode.disconnect();
      }
      
      if (this.analyser) {
        this.analyser.disconnect();
      }

      this.sourceNode = this.audioContext!.createMediaStreamSource(stream);
      this.analyser = this.audioContext!.createAnalyser();
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      
      // IMPORTANT: Only connect to analyser, NOT to destination (no local playback)
      this.sourceNode.connect(this.analyser);
      
      console.log('✅ Audio monitoring setup (source -> analyser only)');
      
      this.startAudioLevelMonitoring();
      
    } catch (error) {
      console.error('❌ Audio monitoring setup failed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private startAudioLevelMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      if (!this.analyser || !this.currentStream?.active) {
        this.onAudioLevel?.(0);
        return;
      }

      try {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = Math.min(average / 255, 1);

        this.onAudioLevel?.(normalizedLevel);
      } catch (error) {
        console.error('❌ Audio level monitoring error:', error);
        this.onAudioLevel?.(0);
      }
    }, 100);

    console.log('✅ Audio level monitoring started');
  }

  public stopAudioLevelMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Audio level monitoring stopped');
    }
  }

  public getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public stopCurrentStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
      this.currentStream = null;
    }
  }

  public async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up AudioManager');
    
    this.stopAudioLevelMonitoring();
    this.stopCurrentStream();
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
      console.log('🔇 Audio context closed');
    }
    
    this.isInitialized = false;
    this.onAudioLevel = undefined;
    this.onError = undefined;
  }

  public static async destroyInstance(): Promise<void> {
    if (AudioManager.instance) {
      await AudioManager.instance.cleanup();
      AudioManager.instance = null;
      console.log('🗑️ AudioManager instance destroyed');
    }
  }

  // Utility methods for stream management
  public muteStream(muted: boolean): boolean {
    if (!this.currentStream) {
      console.warn('⚠️ No current stream to mute/unmute');
      return false;
    }

    const audioTrack = this.currentStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('⚠️ No audio track found in current stream');
      return false;
    }

    audioTrack.enabled = !muted;
    console.log(`${muted ? '🔇' : '🔊'} Stream ${muted ? 'muted' : 'unmuted'}`);
    return true;
  }

  public isStreamActive(): boolean {
    return this.currentStream?.active ?? false;
  }

  public getStreamConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      },
      video: false
    };
  }
}
