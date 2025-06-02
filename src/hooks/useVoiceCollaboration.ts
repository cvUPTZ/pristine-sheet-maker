
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceCollaborationOptions {
  matchId: string;
  userId: string;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
}

interface TrackerVoiceStatus {
  userId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  username?: string;
  role?: 'main' | 'specialized' | 'admin';
  audioLevel?: number;
}

interface VoiceRoom {
  id: string;
  name: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  onUserJoined,
  onUserLeft
}: VoiceCollaborationOptions) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // State-of-the-art audio constraints optimized for large groups
  const getAudioConstraints = () => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
      latency: 0.01, // Low latency for real-time
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false,
      googBeamforming: true,
      googArrayGeometry: true
    }
  });

  // Initialize rooms for scalable voice architecture
  const initializeVoiceRooms = useCallback(() => {
    const rooms: VoiceRoom[] = [
      {
        id: `${matchId}_main`,
        name: 'Main Communication',
        maxParticipants: 20,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_coordinators`,
        name: 'Match Coordinators',
        maxParticipants: 8,
        currentParticipants: 0,
        isPrivate: true
      },
      {
        id: `${matchId}_team_a`,
        name: 'Team A Trackers',
        maxParticipants: 25,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_team_b`,
        name: 'Team B Trackers',
        maxParticipants: 25,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_events`,
        name: 'Event Specialists',
        maxParticipants: 15,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_technical`,
        name: 'Technical Support',
        maxParticipants: 10,
        currentParticipants: 0,
        isPrivate: false
      }
    ];
    setAvailableRooms(rooms);
  }, [matchId]);

  // Advanced audio processing with spatial audio preparation
  const initAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new AudioContext({ 
        sampleRate: 48000,
        latencyHint: 'interactive'
      });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      // Advanced audio processing chain
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const compressor = audioContextRef.current.createDynamicsCompressor();
      const filter = audioContextRef.current.createBiquadFilter();
      
      // Configure compressor for voice optimization
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      // Configure high-pass filter to remove low-frequency noise
      filter.type = 'highpass';
      filter.frequency.value = 100;
      filter.Q.value = 1;
      
      // Audio processing chain: source -> filter -> compressor -> gain -> analyser
      source.connect(filter);
      filter.connect(compressor);
      compressor.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      
      // Configure analyzer for better voice detection
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      gainNodeRef.current.gain.value = isMuted ? 0 : 0.8;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && isVoiceEnabled) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Focus on voice frequency range (200Hz to 3000Hz)
          const voiceStart = Math.floor(200 * bufferLength / 24000);
          const voiceEnd = Math.floor(3000 * bufferLength / 24000);
          const voiceRange = dataArray.slice(voiceStart, voiceEnd);
          const average = voiceRange.reduce((sum, value) => sum + value, 0) / voiceRange.length;
          const normalizedLevel = Math.min(average / 128, 1);
          setAudioLevel(isMuted ? 0 : normalizedLevel);
          
          // Voice activity detection
          const isSpeaking = normalizedLevel > 0.1;
          if (channelRef.current && isSpeaking !== connectedTrackers.find(t => t.userId === userId)?.isSpeaking) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_activity',
              payload: { userId, isSpeaking, audioLevel: normalizedLevel }
            });
          }
        } else {
          setAudioLevel(0);
        }
        if (isVoiceEnabled) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      toast.error('Audio processing initialization failed');
    }
  }, [isMuted, isVoiceEnabled, userId, connectedTrackers]);

  // Enhanced peer connection with bandwidth optimization
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Add local stream with bandwidth optimization
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (track.kind === 'audio') {
          // Apply bandwidth constraints for large groups
          track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          });
        }
        
        const sender = pc.addTrack(track, localStreamRef.current!);
        
        // Optimize encoding parameters for voice in large groups
        if (track.kind === 'audio') {
          const params = sender.getParameters();
          if (params.encodings.length > 0) {
            params.encodings[0].maxBitrate = 32000; // 32kbps for voice
            params.encodings[0].priority = 'high';
          }
          sender.setParameters(params);
        }
      });
    }

    // Handle remote stream with spatial audio preparation
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let remoteAudio = remoteAudiosRef.current.get(remoteUserId);
      
      if (!remoteAudio) {
        remoteAudio = new Audio();
        remoteAudio.volume = 0.7;
        remoteAudio.autoplay = true;
        remoteAudiosRef.current.set(remoteUserId, remoteAudio);
      }
      
      remoteAudio.srcObject = remoteStream;
      remoteAudio.play().catch(e => {
        console.log('Auto-play blocked for remote audio:', e);
      });
    };

    // Optimized ICE handling
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'voice_ice_candidate',
          payload: {
            candidate: event.candidate,
            targetUserId: remoteUserId,
            fromUserId: userId,
            roomId: currentRoom?.id
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        const remoteAudio = remoteAudiosRef.current.get(remoteUserId);
        if (remoteAudio) {
          remoteAudio.pause();
          remoteAudio.srcObject = null;
          remoteAudiosRef.current.delete(remoteUserId);
        }
      }
      
      setConnectedTrackers(prev => prev.map(tracker => 
        tracker.userId === remoteUserId 
          ? { ...tracker, isConnected: pc.connectionState === 'connected' }
          : tracker
      ));
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [userId, currentRoom?.id]);

  // Join specific voice room
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) return;

    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      
      localStreamRef.current = stream;
      initAudioAnalyzer(stream);
      setCurrentRoom(room);

      // Set up room-specific channel
      channelRef.current = supabase.channel(`voice_${room.id}`);
      
      channelRef.current
        .on('broadcast', { event: 'voice_user_joined' }, async ({ payload }: any) => {
          if (payload.userId !== userId && payload.roomId === room.id) {
            setConnectedTrackers(prev => {
              const exists = prev.find(t => t.userId === payload.userId);
              if (!exists && prev.length < room.maxParticipants) {
                onUserJoined?.(payload.userId);
                return [...prev, {
                  userId: payload.userId,
                  isMuted: false,
                  isSpeaking: false,
                  isConnected: false,
                  username: payload.username,
                  role: payload.role
                }];
              }
              return prev;
            });

            // Create selective connections (mesh for small groups, star for large)
            if (room.maxParticipants <= 15) {
              // Full mesh for small groups
              const pc = createPeerConnection(payload.userId);
              const offer = await pc.createOffer({ offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);
              
              channelRef.current.send({
                type: 'broadcast',
                event: 'voice_offer',
                payload: {
                  offer,
                  targetUserId: payload.userId,
                  fromUserId: userId,
                  roomId: room.id
                }
              });
            }
          }
        })
        .on('broadcast', { event: 'voice_offer' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId && payload.roomId === room.id) {
            const pc = createPeerConnection(payload.fromUserId);
            await pc.setRemoteDescription(payload.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_answer',
              payload: {
                answer,
                targetUserId: payload.fromUserId,
                fromUserId: userId,
                roomId: room.id
              }
            });
          }
        })
        .on('broadcast', { event: 'voice_answer' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId && payload.roomId === room.id) {
            const pc = peerConnectionsRef.current.get(payload.fromUserId);
            if (pc) {
              await pc.setRemoteDescription(payload.answer);
            }
          }
        })
        .on('broadcast', { event: 'voice_ice_candidate' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId && payload.roomId === room.id) {
            const pc = peerConnectionsRef.current.get(payload.fromUserId);
            if (pc) {
              await pc.addIceCandidate(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'voice_user_left' }, ({ payload }: any) => {
          if (payload.userId !== userId && payload.roomId === room.id) {
            const pc = peerConnectionsRef.current.get(payload.userId);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(payload.userId);
            }
            
            const remoteAudio = remoteAudiosRef.current.get(payload.userId);
            if (remoteAudio) {
              remoteAudio.pause();
              remoteAudio.srcObject = null;
              remoteAudiosRef.current.delete(payload.userId);
            }
            
            setConnectedTrackers(prev => prev.filter(t => t.userId !== payload.userId));
            onUserLeft?.(payload.userId);
          }
        })
        .on('broadcast', { event: 'voice_mute_status' }, ({ payload }: any) => {
          if (payload.roomId === room.id) {
            setConnectedTrackers(prev => prev.map(tracker => 
              tracker.userId === payload.userId 
                ? { ...tracker, isMuted: payload.isMuted }
                : tracker
            ));
          }
        })
        .on('broadcast', { event: 'voice_activity' }, ({ payload }: any) => {
          if (payload.roomId === room.id) {
            setConnectedTrackers(prev => prev.map(tracker => 
              tracker.userId === payload.userId 
                ? { ...tracker, isSpeaking: payload.isSpeaking, audioLevel: payload.audioLevel }
                : tracker
            ));
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Announce joining with role information
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_user_joined',
              payload: { 
                userId, 
                username: 'Tracker',
                role: 'main',
                roomId: room.id
              }
            });
            setIsVoiceEnabled(true);
            toast.success(`Joined ${room.name} - You are muted by default`);
          }
        });

    } catch (error: any) {
      console.error('Failed to join voice room:', error);
      toast.error('Failed to access microphone: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  }, [isVoiceEnabled, userId, createPeerConnection, initAudioAnalyzer, onUserJoined, onUserLeft]);

  // Legacy start function for backward compatibility
  const startVoiceCollaboration = useCallback(async () => {
    const mainRoom = availableRooms.find(room => room.id.includes('_main'));
    if (mainRoom) {
      await joinVoiceRoom(mainRoom);
    }
  }, [availableRooms, joinVoiceRoom]);

  // Leave current voice room
  const leaveVoiceRoom = useCallback(() => {
    if (!isVoiceEnabled || !currentRoom) return;

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Stop and clean up all remote audio elements
    remoteAudiosRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Announce leaving and unsubscribe
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'voice_user_left',
        payload: { userId, roomId: currentRoom.id }
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true);
    setCurrentRoom(null);
    setIsRoomAdmin(false);
    toast.info(`Left ${currentRoom.name}`);
  }, [isVoiceEnabled, userId, currentRoom]);

  // Legacy stop function for backward compatibility
  const stopVoiceCollaboration = useCallback(() => {
    leaveVoiceRoom();
  }, [leaveVoiceRoom]);

  // Enhanced mute toggle with room notification
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = isMuted ? 0.8 : 0;
        }
        
        setIsMuted(!isMuted);
        
        // Broadcast mute status to current room
        if (channelRef.current && currentRoom) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'voice_mute_status',
            payload: { userId, isMuted: !isMuted, roomId: currentRoom.id }
          });
        }
        
        toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  }, [isMuted, userId, currentRoom]);

  // Initialize rooms on mount
  useEffect(() => {
    initializeVoiceRooms();
  }, [initializeVoiceRooms]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVoiceEnabled) {
        leaveVoiceRoom();
      }
    };
  }, [isVoiceEnabled, leaveVoiceRoom]);

  return {
    // Legacy compatibility
    isVoiceEnabled,
    isMuted,
    isConnecting,
    connectedTrackers,
    audioLevel,
    startVoiceCollaboration,
    stopVoiceCollaboration,
    toggleMute,
    
    // New room-based features
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom
  };
};
