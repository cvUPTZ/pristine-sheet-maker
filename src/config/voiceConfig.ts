
export interface VoiceConfig {
  iceServers: RTCIceServer[];
  connectionTimeout: number;
  reconnectionAttempts: number;
  audioConstraints: MediaStreamConstraints['audio'];
  qualityThresholds: {
    excellent: { rtt: number; packetLoss: number };
    good: { rtt: number; packetLoss: number };
    fair: { rtt: number; packetLoss: number };
  };
  rooms: {
    maxParticipants: number;
    audioCodec: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
  };
}

export const PRODUCTION_VOICE_CONFIG: VoiceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  connectionTimeout: 30000,
  reconnectionAttempts: 5,
  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  },
  qualityThresholds: {
    excellent: { rtt: 50, packetLoss: 1 },
    good: { rtt: 150, packetLoss: 3 },
    fair: { rtt: 300, packetLoss: 8 }
  },
  rooms: {
    maxParticipants: 50,
    audioCodec: 'opus',
    echoCancellation: true,
    noiseSuppression: true
  }
};

export const VOICE_ROOM_TEMPLATES = {
  main: {
    name: 'Main Communication',
    description: 'Primary coordination channel for all match activities',
    maxParticipants: 25,
    priority: 1,
    permissions: ['tracker', 'admin', 'coordinator'],
    isPrivate: false
  },
  coordinators: {
    name: 'Match Coordinators',
    description: 'Private channel for match coordination staff',
    maxParticipants: 8,
    priority: 2,
    permissions: ['admin', 'coordinator'],
    isPrivate: true
  },
  technical: {
    name: 'Technical Support',
    description: 'Technical assistance and troubleshooting',
    maxParticipants: 12,
    priority: 3,
    permissions: ['tracker', 'admin', 'technical'],
    isPrivate: false
  },
  emergency: {
    name: 'Emergency Channel',
    description: 'Emergency communications only',
    maxParticipants: 50,
    priority: 0,
    permissions: ['tracker', 'admin', 'coordinator', 'emergency'],
    isPrivate: false
  }
};
