
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
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize audio context and analyzer for voice level detection
  const initAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && !isMuted) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average / 255);
        } else {
          setAudioLevel(0);
        }
        requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
    }
  }, [isMuted]);

  // Create peer connection
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play().catch(e => console.log('Auto-play blocked:', e));
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
      setConnectedTrackers(prev => prev.map(tracker => 
        tracker.userId === remoteUserId 
          ? { ...tracker, isConnected: pc.connectionState === 'connected' }
          : tracker
      ));
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [userId]);

  // Start voice collaboration
  const startVoiceCollaboration = useCallback(async () => {
    if (isVoiceEnabled) return;

    setIsConnecting(true);
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
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
            const offer = await pc.createOffer();
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
            const answer = await pc.createAnswer();
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
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Announce joining
            channelRef.current.send({
              type: 'broadcast',
              event: 'voice_user_joined',
              payload: { userId, username: 'Tracker' }
            });
            setIsVoiceEnabled(true);
            toast.success('Voice collaboration started');
          }
        });

    } catch (error: any) {
      console.error('Failed to start voice collaboration:', error);
      toast.error('Failed to access microphone');
    } finally {
      setIsConnecting(false);
    }
  }, [isVoiceEnabled, matchId, userId, createPeerConnection, initAudioAnalyzer, onUserJoined, onUserLeft]);

  // Stop voice collaboration
  const stopVoiceCollaboration = useCallback(() => {
    if (!isVoiceEnabled) return;

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

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
    toast.info('Voice collaboration stopped');
  }, [isVoiceEnabled, userId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
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
