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
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  onUserJoined,
  onUserLeft
}: VoiceCollaborationOptions) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted to prevent feedback
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Enhanced audio constraints with better noise suppression
  const getAudioConstraints = () => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
      channelCount: 1,
      volume: 0.8,
      // Advanced constraints for better quality
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false
    }
  });

  // Initialize audio context with better processing
  const initAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      // Clean up existing context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Set up audio processing chain
      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      
      // Configure analyzer for better voice detection
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Set initial gain (volume control)
      gainNodeRef.current.gain.value = isMuted ? 0 : 0.7;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && isVoiceEnabled) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Focus on voice frequency range (85Hz to 255Hz for fundamental frequencies)
          const voiceRange = dataArray.slice(8, 24);
          const average = voiceRange.reduce((sum, value) => sum + value, 0) / voiceRange.length;
          setAudioLevel(isMuted ? 0 : average / 255);
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
  }, [isMuted, isVoiceEnabled]);

  // Create peer connection with better configuration
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    // Add local stream with audio processing
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        // Apply additional audio processing to outgoing track
        if (track.kind === 'audio') {
          track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          });
        }
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream with volume control
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let remoteAudio = remoteAudiosRef.current.get(remoteUserId);
      
      if (!remoteAudio) {
        remoteAudio = new Audio();
        remoteAudio.volume = 0.6; // Lower volume to prevent feedback
        remoteAudio.autoplay = true;
        remoteAudiosRef.current.set(remoteUserId, remoteAudio);
      }
      
      remoteAudio.srcObject = remoteStream;
      remoteAudio.play().catch(e => {
        console.log('Auto-play blocked for remote audio:', e);
        toast.info('Click to enable audio from other trackers');
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'voice_ice_candidate',
          payload: {
            candidate: event.candidate,
            targetUserId: remoteUserId,
            fromUserId: userId
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Clean up failed connection
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
  }, [userId]);

  // Start voice collaboration with better error handling
  const startVoiceCollaboration = useCallback(async () => {
    if (isVoiceEnabled) return;

    setIsConnecting(true);
    try {
      // Request microphone access with enhanced constraints
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      
      localStreamRef.current = stream;
      initAudioAnalyzer(stream);

      // Set up Supabase channel for voice signaling
      channelRef.current = supabase.channel(`voice_${matchId}`);
      
      channelRef.current
        .on('broadcast', { event: 'voice_user_joined' }, async ({ payload }: any) => {
          if (payload.userId !== userId) {
            setConnectedTrackers(prev => {
              const exists = prev.find(t => t.userId === payload.userId);
              if (!exists) {
                onUserJoined?.(payload.userId);
                return [...prev, {
                  userId: payload.userId,
                  isMuted: false,
                  isSpeaking: false,
                  isConnected: false,
                  username: payload.username
                }];
              }
              return prev;
            });

            // Create offer for new user
            const pc = createPeerConnection(payload.userId);
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              voiceActivityDetection: true
            });
            await pc.setLocalDescription(offer);
            
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_offer',
              payload: {
                offer,
                targetUserId: payload.userId,
                fromUserId: userId
              }
            });
          }
        })
        .on('broadcast', { event: 'voice_offer' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId) {
            const pc = createPeerConnection(payload.fromUserId);
            await pc.setRemoteDescription(payload.offer);
            const answer = await pc.createAnswer({
              voiceActivityDetection: true
            });
            await pc.setLocalDescription(answer);
            
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_answer',
              payload: {
                answer,
                targetUserId: payload.fromUserId,
                fromUserId: userId
              }
            });
          }
        })
        .on('broadcast', { event: 'voice_answer' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId) {
            const pc = peerConnectionsRef.current.get(payload.fromUserId);
            if (pc) {
              await pc.setRemoteDescription(payload.answer);
            }
          }
        })
        .on('broadcast', { event: 'voice_ice_candidate' }, async ({ payload }: any) => {
          if (payload.targetUserId === userId) {
            const pc = peerConnectionsRef.current.get(payload.fromUserId);
            if (pc) {
              await pc.addIceCandidate(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'voice_user_left' }, ({ payload }: any) => {
          if (payload.userId !== userId) {
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
          setConnectedTrackers(prev => prev.map(tracker => 
            tracker.userId === payload.userId 
              ? { ...tracker, isMuted: payload.isMuted }
              : tracker
          ));
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Announce joining
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_user_joined',
              payload: { userId, username: 'Tracker' }
            });
            setIsVoiceEnabled(true);
            toast.success('Voice collaboration started - You are muted by default');
          }
        });

    } catch (error: any) {
      console.error('Failed to start voice collaboration:', error);
      toast.error('Failed to access microphone: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  }, [isVoiceEnabled, matchId, userId, createPeerConnection, initAudioAnalyzer, onUserJoined, onUserLeft]);

  // Stop voice collaboration with thorough cleanup
  const stopVoiceCollaboration = useCallback(() => {
    if (!isVoiceEnabled) return;

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
        payload: { userId }
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true); // Reset to muted
    toast.info('Voice collaboration stopped');
  }, [isVoiceEnabled, userId]);

  // Toggle mute with gain control
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        
        // Also control gain node for additional volume control
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = isMuted ? 0.7 : 0;
        }
        
        setIsMuted(!isMuted);
        
        // Broadcast mute status
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'voice_mute_status',
            payload: { userId, isMuted: !isMuted }
          });
        }
        
        toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  }, [isMuted, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVoiceEnabled) {
        stopVoiceCollaboration();
      }
    };
  }, [isVoiceEnabled, stopVoiceCollaboration]);

  return {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    connectedTrackers,
    audioLevel,
    startVoiceCollaboration,
    stopVoiceCollaboration,
    toggleMute
  };
};
