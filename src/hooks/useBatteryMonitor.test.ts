import { renderHook, act, waitFor } from '@testing-library/react';
import useBatteryMonitor from './useBatteryMonitor'; // Assuming the hook is in the same directory for simplicity here
import { supabase } from '@/integrations/supabase/client';

// Mock BatteryManager interface and its event handling
interface MockBatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

// Global mock for navigator.getBattery
let mockGetBattery: jest.Mock;
let mockBatteryManager: MockBatteryManager;

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    upsert: jest.fn(),
  },
}));
const mockedSupabaseUpsert = supabase.upsert as jest.Mock;

// Mock console.error and console.log
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();

  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // For debugging tests if needed

  // Default mock for a successful getBattery API call
  mockBatteryManager = {
    level: 0.75, // Default initial level: 75%
    charging: false, // Default initial charging state
    chargingTime: 0,
    dischargingTime: Infinity,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(), // Required by EventTarget, but not directly used by hook
    // Add other EventTarget methods if TS complains, though usually not needed for basic mock
  };

  mockGetBattery = jest.fn(() => Promise.resolve(mockBatteryManager));
  // @ts-ignore
  navigator.getBattery = mockGetBattery;
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
  // @ts-ignore
  delete navigator.getBattery; // Clean up the mock
});

describe('useBatteryMonitor', () => {
  const testUserId = 'test-user-id';

  it('should return initial battery status and report to Supabase if API is available and userId is provided', async () => {
    const { result } = renderHook(() => useBatteryMonitor(testUserId));

    // Wait for the getBattery promise to resolve and initial state update
    await waitFor(() => expect(result.current.level).toBe(0.75));
    expect(result.current.charging).toBe(false);
    expect(mockGetBattery).toHaveBeenCalledTimes(1);

    // Check if Supabase was called with initial values
    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1);
    expect(mockedSupabaseUpsert).toHaveBeenCalledWith(
      {
        user_id: testUserId,
        battery_level: 75, // 0.75 * 100
        last_updated_at: expect.any(String),
      },
      { onConflict: 'user_id' }
    );

    // Check event listeners were added
    expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
  });

  it('should update status and report to Supabase when battery level changes', async () => {
    renderHook(() => useBatteryMonitor(testUserId));
    await waitFor(() => expect(mockGetBattery).toHaveBeenCalled()); // Ensure API call is done

    // Simulate levelchange event
    act(() => {
      mockBatteryManager.level = 0.50; // Change battery level
      // Trigger the event listener manually by calling the function passed to addEventListener
      // This requires capturing the listener function.
      const levelChangeListener = mockBatteryManager.addEventListener.mock.calls.find(call => call[0] === 'levelchange')?.[1];
      if (levelChangeListener) {
        levelChangeListener();
      }
    });

    await waitFor(() => {
      expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(2); // Initial + change
      expect(mockedSupabaseUpsert).toHaveBeenLastCalledWith(
        expect.objectContaining({ battery_level: 50 }),
        expect.anything()
      );
    });
  });

    it('should update status and report to Supabase when charging state changes', async () => {
    const { result } = renderHook(() => useBatteryMonitor(testUserId));
    await waitFor(() => expect(result.current.level).toBe(0.75)); // Initial state set

    mockedSupabaseUpsert.mockClear(); // Clear previous calls for this specific check

    // Simulate chargingchange event
    act(() => {
      mockBatteryManager.charging = true; // Change charging state
      const chargingChangeListener = mockBatteryManager.addEventListener.mock.calls.find(call => call[0] === 'chargingchange')?.[1];
      if (chargingChangeListener) {
        chargingChangeListener();
      }
    });

    await waitFor(() => expect(result.current.charging).toBe(true));

    expect(mockedSupabaseUpsert).toHaveBeenCalledTimes(1);
    expect(mockedSupabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: testUserId, battery_level: 75 }), // Level is still 75, charging changed
      { onConflict: 'user_id' }
    );
  });


  it('should return null status and not call Supabase if API is not available', async () => {
    // @ts-ignore
    delete navigator.getBattery; // API not available

    const { result } = renderHook(() => useBatteryMonitor(testUserId));

    expect(result.current.level).toBeNull();
    expect(result.current.charging).toBeNull();
    expect(mockGetBattery).not.toHaveBeenCalled(); // mockGetBattery itself is defined, but navigator.getBattery is not
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('Battery API not supported or no user ID.');
  });

  it('should not call Supabase if userId is not provided', async () => {
    const { result } = renderHook(() => useBatteryMonitor(undefined));
    await waitFor(() => expect(mockGetBattery).toHaveBeenCalled()); // API might still be called initially

    expect(result.current.level).toBe(0.75); // Battery API data is fetched
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled(); // But not reported
  });

  it('should clean up event listeners on unmount', async () => {
    const { unmount } = renderHook(() => useBatteryMonitor(testUserId));
    await waitFor(() => expect(mockGetBattery).toHaveBeenCalled()); // Ensure setup is done

    unmount();

    expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith('Battery monitor event listeners removed.');
  });

  it('should log an error if Supabase upsert fails', async () => {
    mockedSupabaseUpsert.mockRejectedValueOnce(new Error('Supabase upsert failed'));

    renderHook(() => useBatteryMonitor(testUserId));

    await waitFor(() => expect(mockedSupabaseUpsert).toHaveBeenCalled());
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating battery status to Supabase:', expect.any(Error));
  });

  it('should handle navigator.getBattery() rejection', async () => {
    mockGetBattery.mockRejectedValueOnce(new Error('Permission denied'));
    // @ts-ignore
    navigator.getBattery = mockGetBattery;

    const { result } = renderHook(() => useBatteryMonitor(testUserId));

    await waitFor(() => expect(mockGetBattery).toHaveBeenCalled());

    expect(result.current.level).toBeNull(); // Should remain in initial/default state
    expect(result.current.charging).toBeNull();
    expect(mockedSupabaseUpsert).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting battery status:', expect.any(Error));
  });

});
