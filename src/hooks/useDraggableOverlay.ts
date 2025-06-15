
import { useRef, useState, useEffect } from "react";

/**
 * Simple hook for making an overlay draggable and storing its position in localStorage.
 * @param overlayKey String key to persist position per overlay (optional).
 * @param defaultPosition Starting position {x, y} in px.
 */
export function useDraggableOverlay(
  overlayKey: string = "voice-overlay-position",
  defaultPosition: { x: number; y: number } = { x: 32, y: 64 }
) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return defaultPosition;
    const stored = window.localStorage.getItem(overlayKey);
    return stored
      ? JSON.parse(stored)
      : defaultPosition;
  });

  const dragging = useRef(false);
  const offset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Save position
  useEffect(() => {
    window.localStorage.setItem(overlayKey, JSON.stringify(position));
  }, [position, overlayKey]);

  // Mouse handlers (desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  // Touch handlers (mobile)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    dragging.current = true;
    const touch = e.touches[0];
    offset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - offset.current.x,
      y: touch.clientY - offset.current.y,
    });
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  };

  // Keyboard accessibility (reset position)
  const resetPosition = () => setPosition(defaultPosition);

  return {
    position,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
  };
}
