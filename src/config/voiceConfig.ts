
export const VOICE_ROOM_TEMPLATES = {
  main: {
    name: 'Main Commentary',
    description: 'Primary voice room for live match commentary',
    maxParticipants: 50,
    priority: 1,
    permissions: ['all'],
    isPrivate: false
  },
  coordinators: {
    name: 'Coordinators Room',
    description: 'Private room for match coordinators and administrators',
    maxParticipants: 10,
    priority: 2,
    permissions: ['admin', 'coordinator'],
    isPrivate: true
  },
  technical: {
    name: 'Technical Support',
    description: 'Technical support and troubleshooting room',
    maxParticipants: 15,
    priority: 3,
    permissions: ['admin', 'coordinator', 'tracker'],
    isPrivate: false
  },
  emergency: {
    name: 'Emergency Channel',
    description: 'Emergency communications channel',
    maxParticipants: 25,
    priority: 0,
    permissions: ['all'],
    isPrivate: false
  }
};

export const VOICE_CONFIG = {
  defaultRoom: 'main',
  maxRetries: 3,
  connectionTimeout: 30000,
  heartbeatInterval: 15000,
  qualityThresholds: {
    excellent: { rtt: 50, packetLoss: 0.01 },
    good: { rtt: 150, packetLoss: 0.05 },
    fair: { rtt: 300, packetLoss: 0.10 },
    poor: { rtt: 500, packetLoss: 0.20 }
  }
};

export const PRODUCTION_VOICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    // Placeholder for TURN server - to be filled if credentials are provided
    // {
    //   urls: 'turn:your-turn-server.com:3478', // e.g., 'turn:turn.example.com:3478'
    //   username: 'your-username',
    //   credential: 'your-password',
    //   credentialType: 'password', // Or 'token'
    // },
  ] as RTCIceServer[], // Explicitly type for clarity, though structure matches
  reconnectionAttempts: 5,
  connectionTimeout: 30000,
  heartbeatInterval: 15000,
  qualityCheckInterval: 3000,
  audioConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  }
};
