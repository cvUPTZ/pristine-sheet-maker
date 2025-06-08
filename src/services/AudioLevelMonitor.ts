
export class AudioLevelMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private dataArray: Uint8Array | null = null;
  
  private onAudioLevel?: (level: number) => void;
  private isMonitoring = false;

  constructor(onAudioLevel?: (level: number) => void) {
    this.onAudioLevel = onAudioLevel;
  }

  async startMonitoring(stream: MediaStream): Promise<void> {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      // Set up data array
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isMonitoring = true;
      this.updateAudioLevel();

      console.log('[AudioLevelMonitor] Started monitoring audio levels');
    } catch (error) {
      console.error('[AudioLevelMonitor] Failed to start monitoring:', error);
      throw error;
    }
  }

  private updateAudioLevel = (): void => {
    if (!this.isMonitoring || !this.analyser || !this.dataArray) {
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    
    const average = sum / this.dataArray.length;
    const normalizedLevel = Math.min(average / 255, 1);
    
    this.onAudioLevel?.(normalizedLevel);
    
    this.animationFrame = requestAnimationFrame(this.updateAudioLevel);
  };

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.dataArray = null;
    console.log('[AudioLevelMonitor] Stopped monitoring audio levels');
  }

  setCallback(callback: (level: number) => void): void {
    this.onAudioLevel = callback;
  }
}
