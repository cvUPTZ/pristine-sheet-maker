
// Enhanced AudioManager to resolve import in WebRTCManager
export class AudioManager {
  private static instance: AudioManager;
  private currentStream: MediaStream | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async getUserMedia(): Promise<MediaStream> {
    try {
      console.log('[AudioManager] Requesting user media');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      this.currentStream = stream;
      console.log('[AudioManager] User media obtained successfully');
      return stream;
    } catch (error) {
      console.error('[AudioManager] Error getting user media:', error);
      // Return empty stream as fallback
      return new MediaStream();
    }
  }

  public playRemoteStream(stream: MediaStream, peerId?: string): void {
    try {
      console.log('[AudioManager] Playing remote stream for peer:', peerId);
      const audioElement = new Audio();
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      // Use type assertion for playsInline
      (audioElement as any).playsInline = true;
      
      if (peerId) {
        this.audioElements.set(peerId, audioElement);
      }
      
      audioElement.play().catch(error => {
        console.error('[AudioManager] Error playing remote stream:', error);
      });
    } catch (error) {
      console.error('[AudioManager] Error setting up remote stream:', error);
    }
  }

  public removeRemoteStream(peerId: string): void {
    console.log('[AudioManager] Removing remote stream for peer:', peerId);
    const audioElement = this.audioElements.get(peerId);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      this.audioElements.delete(peerId);
    }
  }

  public releaseMediaStream(): void {
    console.log('[AudioManager] Releasing media stream');
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    // Clean up all audio elements
    this.audioElements.forEach((audioElement, peerId) => {
      this.removeRemoteStream(peerId);
    });
  }

  public async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    console.log('[AudioManager] Attempting to get audio output devices.');
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.error('[AudioManager] navigator.mediaDevices.enumerateDevices is not supported.');
      return [];
    }

    try {
      console.log('[AudioManager] Calling navigator.mediaDevices.enumerateDevices().');
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('[AudioManager] Raw devices enumerated:', devices);
      if (!Array.isArray(devices)) {
        console.error('[AudioManager] enumerateDevices did not return an array. Got:', devices);
        return [];
      }
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      console.log('[AudioManager] Filtered audio output devices:', audioOutputDevices);
      return audioOutputDevices;
    } catch (err) {
      console.error('[AudioManager] Error during enumerateDevices call or filtering:', err);
      return [];
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      console.log('[AudioManager] Setting audio output device:', deviceId);
      
      // Update all existing audio elements
      this.audioElements.forEach(async (audioElement) => {
        if ('setSinkId' in audioElement && typeof audioElement.setSinkId === 'function') {
          try {
            await audioElement.setSinkId(deviceId);
            console.log('[AudioManager] Audio output device set successfully for element');
          } catch (error) {
            console.error('[AudioManager] Error setting sink ID for audio element:', error);
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('[AudioManager] Error setting audio output device:', error);
      return false;
    }
  }

  public getAudioLevel(stream: MediaStream): number {
    // Simple placeholder implementation
    // In a real implementation, you'd use Web Audio API to analyze the stream
    return Math.random() * 0.8; // Return random level between 0 and 0.8
  }
}
