import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TrackerNotifications from './TrackerNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// --- Mocks ---
jest.mock('@/integrations/supabase/client');
jest.mock('@/context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Keep other exports like Link if needed
  useNavigate: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false), // Default to not mobile
}));
// Mock date-fns if specific date strings are critical, otherwise allow actual implementation
// jest.mock('date-fns', () => ({
//   ...jest.requireActual('date-fns'),
//   formatDistanceToNow: jest.fn((date, options) => `${date.toISOString()} (mocked)`),
// }));


// --- Typed Mocks ---
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockUseAuth = useAuth as jest.Mock;
const mockNavigate = useNavigate as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;
const mockUseIsMobile = require('@/hooks/use-mobile').useIsMobile as jest.Mock;


// --- Test Suite ---
describe('TrackerNotifications', () => {
  let mockSupabaseChannel: {
    on: jest.Mock;
    subscribe: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: User is logged in
    mockUseAuth.mockReturnValue({ user: { id: 'test-user-id', email: 'user@example.com' }, loading: false });
    mockUseIsMobile.mockReturnValue(false); // Default to desktop

    // Supabase client mocks
    mockSupabase.from = jest.fn().mockReturnThis() as any; // `any` to allow chaining flexibility in tests
    mockSupabase.select = jest.fn().mockResolvedValue({ data: [], error: null }); // Default to no notifications
    mockSupabase.update = jest.fn().mockResolvedValue({ data: null, error: null });

    // Supabase channel mocks
    mockSupabaseChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        // Simulate successful subscription immediately
        if (typeof callback === 'function') {
          callback('SUBSCRIBED');
        }
        return mockSupabaseChannel; // Return self for chaining
      }),
    };
    mockSupabase.channel = jest.fn().mockReturnValue(mockSupabaseChannel as any);
    mockSupabase.removeChannel = jest.fn().mockResolvedValue({ status: 'ok', error: null });
  });

  const mockNotifications = {
    lowBattery: {
      id: 'noti1', match_id: null, title: 'Low Battery', message: 'Your device is running low on battery.', type: 'low_battery', is_read: false, created_at: new Date().toISOString(),
      data: { battery_level: 15 },
    },
    matchReminder: {
      id: 'noti2', match_id: 'match1', title: 'Match Reminder', message: 'Match XYZ is starting soon.', type: 'match_reminder', is_read: false, created_at: new Date().toISOString(),
      data: { match_name: 'Match XYZ', start_time: new Date(Date.now() + 30 * 60000).toISOString() },
      matches: { name: 'Match XYZ', home_team_name: 'Home', away_team_name: 'Away', status: 'published' },
    },
    trackerAbsence: {
      id: 'noti3', match_id: 'match2', title: 'Replacement Needed', message: 'Tracker A is absent. You are assigned.', type: 'tracker_absence', is_read: true, created_at: new Date().toISOString(),
      data: { match_id: 'match2', absent_tracker_id: 'trackerA-id', replacement_tracker_id: 'test-user-id' },
      matches: { name: 'Match ABC', home_team_name: 'Team A', away_team_name: 'Team B', status: 'published' },
    },
    genericAssignment: {
      id: 'noti4', match_id: 'match3', title: 'New Assignment', message: 'You have been assigned to track events.', type: 'assignment', is_read: false, created_at: new Date().toISOString(),
      data: { assigned_event_types: ['goal', 'foul'], assigned_player_ids: ['p1', 'p2'], assignment_type: 'Primary Tracker' },
      matches: { name: 'Another Match', home_team_name: 'Team C', away_team_name: 'Team D', status: 'published' },
    }
  };

  it('should render loading state and then "No notifications yet" if no data', async () => {
    render(<TrackerNotifications />);
    expect(screen.getByText(/Loading notifications.../i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument());
    expect(mockSupabase.select).toHaveBeenCalledTimes(1); // Initial fetch
    expect(mockSupabase.channel).toHaveBeenCalledWith('tracker-notifications');
    expect(mockSupabaseChannel.subscribe).toHaveBeenCalled();
  });

  it('should display "No notifications yet" if user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<TrackerNotifications />);
    // No "Loading..." because fetchNotifications returns early
    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
    expect(mockSupabase.select).not.toHaveBeenCalled();
  });

  it('should display an error toast if fetching notifications fails', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Fetch error') });
    render(<TrackerNotifications />);
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to load notifications'));
  });

  describe('Notification Type Rendering', () => {
    it('renders a "low_battery" notification correctly', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [mockNotifications.lowBattery], error: null });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Low Battery')).toBeInTheDocument());
      expect(screen.getByText(/Battery Critical: 15%/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /track/i })).not.toBeInTheDocument(); // "Start Tracking"
    });

    it('renders a "match_reminder" notification correctly', async () => {
      mockSupabase.select.mockImplementation(queryBuilder => {
        if (queryBuilder._table === 'notifications') {
          return Promise.resolve({ data: [mockNotifications.matchReminder], error: null });
        }
        if (queryBuilder._table === 'matches') { // Simulate match data fetch
          return Promise.resolve({ data: mockNotifications.matchReminder.matches, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Match Reminder')).toBeInTheDocument());
      expect(screen.getByText(/Match XYZ is starting soon./i)).toBeInTheDocument();
      expect(screen.getByText(/Reminder for Match XYZ/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /track/i })).toBeInTheDocument();
    });

    it('renders a "tracker_absence" notification correctly', async () => {
       mockSupabase.select.mockImplementation(queryBuilder => {
        if (queryBuilder._table === 'notifications') {
          return Promise.resolve({ data: [mockNotifications.trackerAbsence], error: null });
        }
        if (queryBuilder._table === 'matches') {
          return Promise.resolve({ data: mockNotifications.trackerAbsence.matches, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Replacement Needed')).toBeInTheDocument());
      expect(screen.getByText(/Match ID: match2/i)).toBeInTheDocument();
      expect(screen.getByText(/Original Tracker: trackerA-id/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /track/i })).toBeInTheDocument();
    });

    it('renders a generic "assignment" notification correctly', async () => {
       mockSupabase.select.mockImplementation(queryBuilder => {
        if (queryBuilder._table === 'notifications') {
          return Promise.resolve({ data: [mockNotifications.genericAssignment], error: null });
        }
        if (queryBuilder._table === 'matches') {
          return Promise.resolve({ data: mockNotifications.genericAssignment.matches, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('New Assignment')).toBeInTheDocument());
      expect(screen.getByText(/Event Types: goal, foul/i)).toBeInTheDocument();
      expect(screen.getByText(/Players: 2 assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/Assignment Type: Primary Tracker/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /track/i })).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('marks a notification as read', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [mockNotifications.lowBattery], error: null });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Low Battery')).toBeInTheDocument());

      const markReadButton = screen.getByRole('button', { name: /read/i });
      fireEvent.click(markReadButton);

      await waitFor(() => expect(mockSupabase.update).toHaveBeenCalledWith({ is_read: true }));
      // Check if UI updates (e.g., button disappears or notification style changes)
      // The test setup makes the button disappear due to re-render logic in component
      expect(screen.queryByRole('button', { name: /read/i })).not.toBeInTheDocument();
    });

    it('marks all notifications as read', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [mockNotifications.lowBattery, mockNotifications.matchReminder], error: null });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Low Battery')).toBeInTheDocument());
      expect(screen.getByText('Match Reminder')).toBeInTheDocument();

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      fireEvent.click(markAllReadButton);

      await waitFor(() => expect(mockSupabase.update).toHaveBeenCalledWith({ is_read: true }));
      expect(mockToast.success).toHaveBeenCalledWith('All notifications marked as read');
      // All individual "Read" buttons should disappear
      expect(screen.queryAllByRole('button', { name: /read/i }).length).toBe(0);
    });

    it('navigates when "Start Tracking" is clicked', async () => {
      mockSupabase.select.mockImplementation(queryBuilder => {
        if (queryBuilder._table === 'notifications') {
          return Promise.resolve({ data: [mockNotifications.matchReminder], error: null });
        }
        if (queryBuilder._table === 'matches') {
          return Promise.resolve({ data: mockNotifications.matchReminder.matches, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });
      render(<TrackerNotifications />);
      await waitFor(() => expect(screen.getByText('Match Reminder')).toBeInTheDocument());

      const viewMatchButton = screen.getByRole('button', { name: /start tracking/i });
      fireEvent.click(viewMatchButton);

      await waitFor(() => expect(mockSupabase.update).toHaveBeenCalledWith({ is_read: true })); // Marks as read
      expect(mockNavigate).toHaveBeenCalledWith('/match/match1');
    });
  });

  it('should clean up Supabase channel on unmount', async () => {
    const { unmount } = render(<TrackerNotifications />);
    await waitFor(() => expect(mockSupabase.channel).toHaveBeenCalled());

    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

});
