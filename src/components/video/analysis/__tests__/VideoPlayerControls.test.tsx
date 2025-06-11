import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { VideoPlayerControls } from '../VideoPlayerControls'; // Adjust path as necessary

const ASSUMED_FPS = 30; // Match the constant in the component

describe('VideoPlayerControls', () => {
  let mockVideoElement: {
    pause: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    currentTime: number;
    playbackRate: number;
    duration: number;
  };
  let videoPlayerRef: React.RefObject<HTMLVideoElement>;

  beforeEach(() => {
    // Reset mocks and video element properties before each test
    mockVideoElement = {
      pause: vi.fn(),
      play: vi.fn(),
      currentTime: 10.0, // Initial time
      playbackRate: 1.0,
      duration: 100.0, // Mock video duration
    };
    videoPlayerRef = { current: mockVideoElement as any }; // Cast as any to simplify mock
  });

  describe('Frame Stepping', () => {
    it('should call pause and increment currentTime on "Next Frame" click', () => {
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const nextFrameButton = screen.getByRole('button', { name: /Next Frame/i });

      fireEvent.click(nextFrameButton);

      expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
      const expectedTime = 10.0 + (1 / ASSUMED_FPS);
      expect(mockVideoElement.currentTime).toBeCloseTo(expectedTime);
    });

    it('should call pause and decrement currentTime on "Previous Frame" click', () => {
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const prevFrameButton = screen.getByRole('button', { name: /Prev Frame/i });

      fireEvent.click(prevFrameButton);

      expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
      const expectedTime = 10.0 - (1 / ASSUMED_FPS);
      expect(mockVideoElement.currentTime).toBeCloseTo(expectedTime);
    });

    it('should not increment currentTime beyond video duration on "Next Frame"', () => {
      mockVideoElement.currentTime = mockVideoElement.duration - (0.5 / ASSUMED_FPS); // Half a frame from the end
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const nextFrameButton = screen.getByRole('button', { name: /Next Frame/i });

      fireEvent.click(nextFrameButton);

      expect(mockVideoElement.currentTime).toBe(mockVideoElement.duration);
    });

    it('should stop at duration if currentTime is already at duration and "Next Frame" is clicked', () => {
      mockVideoElement.currentTime = mockVideoElement.duration;
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const nextFrameButton = screen.getByRole('button', { name: /Next Frame/i });

      fireEvent.click(nextFrameButton);

      expect(mockVideoElement.currentTime).toBe(mockVideoElement.duration);
    });


    it('should not decrement currentTime below 0 on "Previous Frame"', () => {
      mockVideoElement.currentTime = 0.5 / ASSUMED_FPS; // Half a frame from the start
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const prevFrameButton = screen.getByRole('button', { name: /Prev Frame/i });

      fireEvent.click(prevFrameButton);

      expect(mockVideoElement.currentTime).toBe(0);
    });

    it('should stop at 0 if currentTime is already 0 and "Previous Frame" is clicked', () => {
      mockVideoElement.currentTime = 0;
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const prevFrameButton = screen.getByRole('button', { name: /Prev Frame/i });

      fireEvent.click(prevFrameButton);

      expect(mockVideoElement.currentTime).toBe(0);
    });
  });

  describe('Playback Rate Control', () => {
    it('should update video playbackRate on speed change', () => {
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);
      const speedSelector = screen.getByLabelText(/Speed:/i) as HTMLSelectElement;

      fireEvent.change(speedSelector, { target: { value: '1.5' } });

      expect(mockVideoElement.playbackRate).toBe(1.5);
      // Also check if the select element itself reflects the change (testing controlled component behavior)
      expect(speedSelector.value).toBe('1.5');
    });
  });

  describe('Disabled State', () => {
    it('should disable controls when isPlayingPlaylist is true', () => {
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={true} />);

      const nextFrameButton = screen.getByRole('button', { name: /Next Frame/i });
      const prevFrameButton = screen.getByRole('button', { name: /Prev Frame/i });
      const speedSelector = screen.getByLabelText(/Speed:/i);

      expect(nextFrameButton).toBeDisabled();
      expect(prevFrameButton).toBeDisabled();
      expect(speedSelector).toBeDisabled();
    });

    it('should enable controls when isPlayingPlaylist is false', () => {
      render(<VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={false} />);

      const nextFrameButton = screen.getByRole('button', { name: /Next Frame/i });
      const prevFrameButton = screen.getByRole('button', { name: /Prev Frame/i });
      const speedSelector = screen.getByLabelText(/Speed:/i);

      expect(nextFrameButton).not.toBeDisabled();
      expect(prevFrameButton).not.toBeDisabled();
      expect(speedSelector).not.toBeDisabled();
    });
  });
});
