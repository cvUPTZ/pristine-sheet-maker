
import React from "react";
import { useVoiceCollaborationContext } from "@/context/VoiceCollaborationContext";
import { Mic, Users, VolumeX, Volume2, WifiOff, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VoiceCollaborationOverlay: React.FC = () => {
  const {
    currentRoomId,
    participants,
    isConnected,
    isConnecting,
    localParticipant,
    connectionState,
  } = useVoiceCollaborationContext();

  // Find self in participants for mute status
  let isMuted = true;
  if (localParticipant) {
    // Local participant mute check – robust for both local and remote
    (localParticipant as any).isMicrophoneEnabled !== undefined
      ? (isMuted = !(localParticipant as any).isMicrophoneEnabled)
      : (isMuted = true);
  }

  return (
    <div
      className="
        fixed z-30 max-w-xs w-full 
        right-4 bottom-6
        md:bottom-7 md:right-8
        md:max-w-xs
        sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:top-5 sm:bottom-auto
        shadow-xl pointer-events-none
      "
      style={{ pointerEvents: "none" }}
      aria-live="polite"
    >
      <Card className="backdrop-blur-md bg-white/80 border-0 rounded-2xl shadow-2xl animate-fade-in pointer-events-auto">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg
              ${isConnected ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gray-300"}
            `}
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isConnected ? (
              <Mic className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-semibold text-gray-900 truncate">
              {isConnected
                ? currentRoomId
                  ? `In Voice Room: ${currentRoomId}`
                  : "Voice Connected"
                : isConnecting
                ? "Joining voice room..."
                : "Voice Disconnected"}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-2 min-w-0">
              <Users className="inline w-4 h-4 mr-1" />
              {participants.length}
              {isConnected && (
                <>
                  <span className="mx-2 text-gray-300">|</span>
                  {isMuted ? (
                    <span className="flex items-center text-red-500">
                      <VolumeX className="h-4 w-4 mr-0.5" />
                      Muted
                    </span>
                  ) : (
                    <span className="flex items-center text-emerald-600">
                      <Volume2 className="h-4 w-4 mr-0.5" />
                      Unmuted
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCollaborationOverlay;
