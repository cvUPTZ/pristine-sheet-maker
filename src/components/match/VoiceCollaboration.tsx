import React, { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useVoiceCollaboration, VoiceParticipant } from '@/hooks/useVoiceCollaboration'; // Import the hook and new type
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  className?: string;
}

// NOTE: The `VoiceRoom` local interface is no longer needed as the hook handles it.

const VoiceCollaboration: React.FC<VoiceCollaborationProps> = ({
  matchId,
  userId,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string>('tracker');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // The hook call is now simpler
  const {
    token, serverUrl, isConnecting, isMuted, participants, audioLevel,
    toggleMute, availableRooms, currentRoom, isRoomAdmin,
    joinVoiceRoom, leaveVoiceRoom, networkStatus, connectionState,
    adminSetParticipantMute, audioOutputDevices, selectedAudioOutputDeviceId,
    selectAudioOutputDevice, error: hookError, fetchAvailableRooms,
  } = useVoiceCollaboration({ userId, userRole });

  // Your original initialization logic is preserved
  useEffect(() => {
    const initializeSystem = async () => {
      setInitialized(false);
      setUiError(null);
      try {
        const voiceService = VoiceRoomService.getInstance();
        const connected = await voiceService.testDatabaseConnection();
        if (!connected) throw new Error("Database connection test failed.");
        
        const { data, error: roleError } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (roleError) throw roleError;
        setUserRole(data?.role || 'tracker');

        if(matchId) await fetchAvailableRooms(matchId);

      } catch (e: any) {
        setUiError(e.message);
      } finally {
        setInitialized(true);
      }
    };
    initializeSystem();
  }, [userId, matchId, fetchAvailableRooms]);

  useEffect(() => {
    if (hookError) setUiError(hookError);
  }, [hookError]);

  const handleRejoin = () => {
    if (isConnecting || !currentRoom) return;
    // The new hook logic makes rejoining simpler
    leaveVoiceRoom();
    setTimeout(() => joinVoiceRoom(currentRoom), 250);
  };

  // Your UI sub-components are preserved
  const AudioLevelIndicator = ({ level }: { level: number }) => ( /* ... your original code ... */ );
  const getRoleIcon = (role?: string) => ( /* ... your original code ... */ );
  const getRoomColorClass = (roomName?: string) => ( /* ... your original code ... */ );
  const getNetworkIcon = () => ( /* ... your original code ... */ );
  const getWebRTCStatusIndicator = (state: string | null) => ( /* ... your original code, it will now work with the mapped state ... */ );
  const getPeerStatusIndicator = () => <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />; // Simplified as LiveKit handles this

  // Loading and Error states are preserved
  if (!initialized) return ( /* ... your original loading UI ... */ );
  if (uiError && !token) return ( /* ... your original error UI ... */ );
  
  // --- The new component structure ---

  const ConnectedView = () => (
    <>
      {/* This one component replaces all your manual <audio> element logic */}
      <RoomAudioRenderer sinkId={selectedAudioOutputDeviceId ?? undefined} />
      
      {/* The rest of your connected UI is preserved, just consuming the new hook data */}
      <div className="space-y-3">
        {/* ... (Your original "Connected to: Room Name" UI) ... */}
        {/* ... (Your original "Your Audio Level" UI) ... */}
        {/* ... (Your original "Participants" list UI, mapping over the `participants` from the new hook) ... */}
      </div>
    </>
  );

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* This is no longer needed: {audioElements} */}
      <Card className={`border-blue-200 ${connectionState === 'connected' ? 'bg-green-50/50' : 'bg-blue-50/50'}`}>
        <CardHeader>
           {/* ... Your original CardHeader ... */}
        </CardHeader>
        <CardContent>
          {/* ... Your original showConnectionDetails / settings UI ... */}

          {/* This is the new core rendering logic */}
          {token && serverUrl ? (
            <LiveKitRoom
              serverUrl={serverUrl}
              token={token}
              connect={true}
              audio={true}
              onDisconnected={leaveVoiceRoom} // Important for handling unexpected disconnects
            >
              <ConnectedView />
            </LiveKitRoom>
          ) : (
            // This is your original UI for the disconnected state
            <div className="space-y-2">
              {/* ... (Your original "Available Voice Rooms" mapping logic) ... */}
            </div>
          )}
          
          {/* ... Your original failed/rejoin and audio output settings UI ... */}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCollaboration;