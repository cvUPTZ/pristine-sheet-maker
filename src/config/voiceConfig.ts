
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
