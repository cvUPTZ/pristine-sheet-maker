
import React from "react";
import { useVoiceCollaborationContext } from "@/context/VoiceCollaborationContext";
import { Mic, Users, VolumeX, Volume2, WifiOff, Loader2, Move } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDraggableOverlay } from "@/hooks/useDraggableOverlay";

/**
 * Draggable, beautiful minimalist overlay displaying live voice collaboration status.
 */
const VoiceCollaborationOverlay: React.FC = () => {
  const {
    currentRoomId,
    participants,
    isConnected,
    isConnecting,
    localParticipant,
    connectionState,
  } = useVoiceCollaborationContext();

  // DRAGGABLE OVERLAY state & handlers from hook
  const {
    position,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
  } = useDraggableOverlay("voice-overlay-position", {
    x: 32,
    y: window.innerWidth < 640 ? 24 : window.innerHeight - 180 // top for mobile, bottom for desktop
  });

  // Robust mute detection
  let isMuted = true;
  if (localParticipant) {
    (localParticipant as any).isMicrophoneEnabled !== undefined
      ? (isMuted = !(localParticipant as any).isMicrophoneEnabled)
      : (isMuted = true);
  }

  return (
    <div
      className="pointer-events-none"
      aria-live="polite"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999, // Make absolutely sure it floats above the rest.
        maxWidth: 350,
        minWidth: 250,
      }}
    >
      <Card
        className="
          backdrop-blur-md bg-white/80 border-0 rounded-2xl shadow-2xl 
          animate-fade-in pointer-events-auto
          transition-shadow hover:shadow-2xl
        "
        style={{
          cursor: "grab",
        }}
      >
        {/* Drag handle (top area with move icon) */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-300/40 cursor-grab select-none rounded-t-2xl bg-gradient-to-r from-blue-50 to-indigo-50"
          style={{ touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          // Accessibility: reset on double click/tap
          onDoubleClick={resetPosition}
          title="Drag to move overlay. Double-click to reset position."
        >
          <Move className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">
            Voice Collaboration Status
          </span>
          <button
            className="text-[10px] px-2 ml-auto bg-white/40 rounded hover:bg-white/70 border border-gray-200 text-gray-500"
            aria-label="Reset position"
            tabIndex={0}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetPosition();
            }}
          >
            Reset
          </button>
        </div>
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
