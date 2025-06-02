
interface ConnectionQuality {
  userId: string;
  rtt: number; // Round trip time in ms
  packetsLost: number;
  jitter: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  timestamp: number;
}

interface ConnectionMonitorOptions {
  onQualityChange: (userId: string, quality: ConnectionQuality) => void;
  onConnectionLoss: (userId: string) => void;
  checkInterval?: number;
}

export class ConnectionMonitor {
  private peers = new Map<string, RTCPeerConnection>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onQualityChange: (userId: string, quality: ConnectionQuality) => void;
  private onConnectionLoss: (userId: string) => void;
  private checkInterval: number;

  constructor(options: ConnectionMonitorOptions) {
    this.onQualityChange = options.onQualityChange;
    this.onConnectionLoss = options.onConnectionLoss;
    this.checkInterval = options.checkInterval || 5000; // 5 seconds
  }

  addPeer(userId: string, connection: RTCPeerConnection): void {
    this.peers.set(userId, connection);
    
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState === 'disconnected' || 
          connection.connectionState === 'failed') {
        this.onConnectionLoss(userId);
      }
    });
  }

  removePeer(userId: string): void {
    this.peers.delete(userId);
  }

  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(async () => {
      for (const [userId, connection] of this.peers) {
        try {
          const stats = await this.getConnectionStats(connection);
          const quality = this.calculateQuality(stats);
          
          this.onQualityChange(userId, {
            userId,
            rtt: stats.rtt,
            packetsLost: stats.packetsLost,
            jitter: stats.jitter,
            quality,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn(`Failed to get stats for ${userId}:`, error);
        }
      }
    }, this.checkInterval);

    console.log('🔍 Connection monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 Connection monitoring stopped');
    }
  }

  private async getConnectionStats(connection: RTCPeerConnection): Promise<{
    rtt: number;
    packetsLost: number;
    jitter: number;
  }> {
    const stats = await connection.getStats();
    let rtt = 0;
    let packetsLost = 0;
    let jitter = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime * 1000 || 0;
      }
      
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        packetsLost = report.packetsLost || 0;
        jitter = report.jitter || 0;
      }
    });

    return { rtt, packetsLost, jitter };
  }

  private calculateQuality(stats: { rtt: number; packetsLost: number; jitter: number }): 'excellent' | 'good' | 'fair' | 'poor' {
    const { rtt, packetsLost } = stats;

    if (rtt < 100 && packetsLost < 5) return 'excellent';
    if (rtt < 200 && packetsLost < 15) return 'good';
    if (rtt < 400 && packetsLost < 30) return 'fair';
    return 'poor';
  }

  cleanup(): void {
    this.stopMonitoring();
    this.peers.clear();
  }
}
