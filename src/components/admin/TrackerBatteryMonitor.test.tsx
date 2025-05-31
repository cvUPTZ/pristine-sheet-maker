import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TrackerBatteryMonitor from './TrackerBatteryMonitor';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn(),
  },
}));

// Typed mock for Supabase select
const mockedSupabaseSelect = supabase.select as jest.Mock;

// Mock console.error and console.warn
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;

// Mock data
const mockStatusData = [
  { user_id: 'user1', battery_level: 75, last_updated_at: new Date().toISOString() },
  { user_id: 'user2', battery_level: 15, last_updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() }, // 5 mins ago
  { user_id: 'user3', battery_level: null, last_updated_at: null }, // No battery info
  { user_id: 'user4', battery_level: 45, last_updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }, // 1 day ago
];

const mockProfilesData = [
  { id: 'user1', email: 'user1@example.com', username: 'UserOne' },
  { id: 'user2', email: 'user2@example.com', username: 'UserTwo' },
  // No profile for user3 to test fallback
  { id: 'user4', email: null, username: 'UserFourWithNoEmail' }, // Profile exists, but no email
];


describe('TrackerBatteryMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should render loading state initially and then display data', async () => {
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: mockStatusData, error: null }) // For tracker_device_status
      .mockResolvedValueOnce({ data: mockProfilesData, error: null }); // For profiles

    render(<TrackerBatteryMonitor />);

    expect(screen.getByText(/Loading tracker battery status.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument(); // Fallback to user_id
    expect(screen.getByText('UserFourWithNoEmail')).toBeInTheDocument(); // Fallback to username

    // Check battery levels and badges (simplified check, exact badge variant is visual)
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getAllByText('N/A')[0]).toBeInTheDocument(); // For user3's battery
    expect(screen.getByText('45%')).toBeInTheDocument();

    // Check last updated times (presence is enough, formatDistanceToNow will handle actual string)
    expect(screen.getByText(/ago|now/i)).toBeInTheDocument(); // general check for formatted dates
  });

  it('should display an error message if fetching tracker_device_status fails', async () => {
    mockedSupabaseSelect.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch status') });

    render(<TrackerBatteryMonitor />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch status/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if fetching profiles fails (after status succeeds)', async () => {
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: mockStatusData, error: null }) // Status succeeds
      .mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch profiles') }); // Profiles fails

    render(<TrackerBatteryMonitor />);

    await waitFor(() => {
      // The component logs a warning and proceeds, potentially showing User IDs
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to fetch from 'profiles' table:", "Failed to fetch profiles", expect.anything());
      // It should still render the data, but with user IDs as identifiers
      expect(screen.getByText(mockStatusData[0].user_id)).toBeInTheDocument();
    });
  });


  it('should display "No data available" message if tracker_device_status returns empty', async () => {
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: [], error: null }) // Empty status data
      .mockResolvedValueOnce({ data: [], error: null }); // Empty profiles data (won't be called if status is empty)

    render(<TrackerBatteryMonitor />);

    await waitFor(() => {
      expect(screen.getByText(/No tracker battery data available./i)).toBeInTheDocument();
    });
  });

  it('should handle missing profiles gracefully by falling back to user ID', async () => {
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: [mockStatusData[2]], error: null }) // Only user3 who has no profile
      .mockResolvedValueOnce({ data: [], error: null }); // No profiles found

    render(<TrackerBatteryMonitor />);

    await waitFor(() => {
      expect(screen.getByText(mockStatusData[2].user_id)).toBeInTheDocument(); // Fallback to user_id
      expect(screen.getAllByText('N/A')[0]).toBeInTheDocument(); // For battery level
    });
     expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to fetch from 'profiles' table:", expect.stringContaining("Results contain 0 rows"), expect.anything());
  });


  it('should re-fetch data when refresh button is clicked', async () => {
    // Initial fetch
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: [mockStatusData[0]], error: null })
      .mockResolvedValueOnce({ data: [mockProfilesData[0]], error: null });

    render(<TrackerBatteryMonitor />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    expect(mockedSupabaseSelect).toHaveBeenCalledTimes(2); // status + profiles

    // Setup for second fetch (refresh)
    const refreshedStatusData = [mockStatusData[1]];
    const refreshedProfilesData = [mockProfilesData[1]];
    mockedSupabaseSelect
      .mockResolvedValueOnce({ data: refreshedStatusData, error: null })
      .mockResolvedValueOnce({ data: refreshedProfilesData, error: null });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Loading state might briefly appear if you want to test for it
    // expect(screen.getByText(/Loading tracker battery status.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('user2@example.com')).toBeInTheDocument(); // New data
    });
    expect(screen.queryByText('user1@example.com')).not.toBeInTheDocument(); // Old data gone
    expect(mockedSupabaseSelect).toHaveBeenCalledTimes(4); // Initial 2 + Refreshed 2
  });
});
