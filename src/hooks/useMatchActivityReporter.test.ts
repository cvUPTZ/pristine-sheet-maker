import { renderHook, act } from '@testing-library/react';
import useMatchActivityReporter from './useMatchActivityReporter'; // Assuming same directory
import { supabase } from '@/integrations/supabase/client';

// Constants
const REPORT_INTERVAL_MS = 60 * 1000; // Must match the interval in the hook

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(), // Allows chaining .upsert()
    upsert: jest.fn(),
  },
}));

// Typed mock for Supabase upsert
const mockedSupabaseUpsert = supabase.upsert as jest.Mock;

// Mock console.error and console.log
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance; // Useful for seeing hook's own logs during test development

describe('useMatchActivityReporter', () => {
  const testUserId = 'test-user-123';
  const testMatchId = 'test-match-456';

  beforeAll(() => {
    jest.useFakeTimers(); // Enable fake timers for all tests in this suite
  });

  beforeEach(() => {
    // Reset mocks and spies before each test
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers(); // Clear any timers set during the test
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    jest.useRealTimers(); // Restore real timers
  });

  it('should report activity on mount and periodically when userId and matchId are provided', () => {
    renderHook(() => useMatchActivityReporter(testUserId, testMatchId));

    // 1. Check initial call on mount
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1);
    expect(mockedSupabaseUpsert).toHaveBeenCalledWith(
      { user_id: testUserId, match_id: testMatchId },
      { onConflict: 'match_id,user_id' }
    );

    // 2. Advance time by less than one interval - should not call again yet
    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS / 2);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1);

    // 3. Advance time to complete one interval
    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS / 2);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(2); // Called again
    expect(mockedSupabaseUpsert).toHaveBeenLastCalledWith(
      { user_id: testUserId, match_id: testMatchId },
      { onConflict: 'match_id,user_id' }
    );

    // 4. Advance time for another interval
    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(3); // Called again
  });

  it('should not report activity if userId is undefined', () => {
    renderHook(() => useMatchActivityReporter(undefined, testMatchId));
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS * 2); // Advance time
    });
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled(); // Still not called
    expect(consoleLogSpy).toHaveBeenCalledWith('useMatchActivityReporter: userId or matchId is undefined. Interval not set.');
  });

  it('should not report activity if matchId is undefined', () => {
    renderHook(() => useMatchActivityReporter(testUserId, undefined));
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS * 2); // Advance time
    });
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled(); // Still not called
     expect(consoleLogSpy).toHaveBeenCalledWith('useMatchActivityReporter: userId or matchId is undefined. Interval not set.');
  });

  it('should clear the interval on unmount', () => {
    const { unmount } = renderHook(() => useMatchActivityReporter(testUserId, testMatchId));
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1); // Initial call

    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(2); // Second call after interval

    unmount(); // Unmount the hook

    // Advance time again, after unmount
    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS * 2);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(2); // Should NOT have been called again
    // Check for cleanup log if available (it was in the hook code)
    // expect(consoleLogSpy).toHaveBeenCalledWith(`useMatchActivityReporter: Interval cleared for user ${testUserId}, match ${testMatchId}`);
  });

  it('should clear interval and restart if userId changes', () => {
    let currentUserId: string | undefined = testUserId;
    const { rerender } = renderHook(() => useMatchActivityReporter(currentUserId, testMatchId));
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1); // Initial call for testUserId

    // Change userId to undefined
    currentUserId = undefined;
    rerender();

    // It should have called reportActivity for the new (undefined) ids, which does nothing for upsert
    // and the log for interval not set.
    expect(consoleLogSpy).toHaveBeenCalledWith('useMatchActivityReporter: userId or matchId is undefined. Interval not set.');
    mockedSupabaseUpsert.mockClear(); // Clear calls for the next part of the test

    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS);
    });
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled(); // No call for undefined userId

    // Change userId to a new valid ID
    const newUserId = 'new-user-789';
    currentUserId = newUserId;
    rerender();
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1); // Initial call for newUserId
    expect(mockedSupabaseUpsert).toHaveBeenCalledWith(
      { user_id: newUserId, match_id: testMatchId },
      { onConflict: 'match_id,user_id' }
    );

    act(() => {
      jest.advanceTimersByTime(REPORT_INTERVAL_MS);
    });
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(2); // Periodic call for newUserId
  });


  it('should log an error if Supabase upsert fails', () => {
    mockedSupabaseUpsert.mockRejectedValueOnce(new Error('Supabase test error'));
    renderHook(() => useMatchActivityReporter(testUserId, testMatchId));

    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1); // Attempted initial call
    // Need to wait for the promise in reportActivity to settle
    return Promise.resolve().then(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'useMatchActivityReporter: Error reporting match activity:',
        'Supabase test error'
      );
    });
  });
});
