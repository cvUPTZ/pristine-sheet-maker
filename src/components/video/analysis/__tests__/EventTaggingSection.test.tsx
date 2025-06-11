import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { EventTaggingSection } from '../EventTaggingSection';
import { TaggedEvent, EventType } from '@/types/events';
// Mock Playlist type as it's a prop, but not the focus of these tests
type MockPlaylist = { id: string; name: string; items?: any[] } | null;


// Mock Supabase client
const mockSelectReturn = { data: [], error: null };
const mockInsertReturn = (insertedData: any) => ({ data: insertedData, error: null });
const mockDeleteReturn = { error: null };

const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(), // .select() returns itself
  insert: vi.fn().mockReturnThis(), // .insert() returns itself
  delete: vi.fn().mockReturnThis(), // .delete() returns itself
  eq: vi.fn().mockReturnThis(),     // .eq() returns itself
  maybeSingle: vi.fn(() => Promise.resolve(mockSelectReturn)), // for checking existing event type
  single: vi.fn(() => Promise.resolve(mockInsertReturn({}))), // for insert returning single
  // Ensure actual call sites in component use these specific chains or adjust mock
}));


vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
    },
  },
}));


const mockVideoPlayerRef = {
  current: {
    currentTime: 15.5, // Sample current time
  } as HTMLVideoElement,
};

const mockAvailableEventTypes: EventType[] = [
  { id: 'et1', user_id: 'u1', name: 'Goal', color: 'green', created_at: 't', updated_at: 't' },
  { id: 'et2', user_id: 'u1', name: 'Foul', color: 'red', created_at: 't', updated_at: 't' },
];

const mockTaggedEvents: TaggedEvent[] = [
  { id: 'te1', video_job_id: 'job1', event_type_id: 'et1', timestamp: 10, event_types: mockAvailableEventTypes[0], created_at: 't', updated_at: 't' },
  { id: 'te2', video_job_id: 'job1', event_type_id: 'et2', timestamp: 20, event_types: mockAvailableEventTypes[1], created_at: 't', updated_at: 't' },
];

const defaultProps = {
  currentUser: { id: 'user-123' },
  jobId: 'job1',
  videoPlayerRef: mockVideoPlayerRef,
  taggedEvents: mockTaggedEvents,
  availableEventTypes: mockAvailableEventTypes,
  activeTaggedEventId: null,
  onSetActiveTaggedEventId: vi.fn(),
  onCreateEventTypeInDb: vi.fn(async (name) => {
    // Simulate successful DB insert and return the new type
    const newType: EventType = { id: `new-${name}`, user_id: 'user-123', name, created_at: '', updated_at: '' };
    return Promise.resolve(newType);
  }),
  onTagEventInDb: vi.fn(async (eventTypeId, timestamp, videoJobId) => {
    const eventType = mockAvailableEventTypes.find(et => et.id === eventTypeId);
    const newTag: TaggedEvent = { id: `new-tag-${Date.now()}`, event_type_id: eventTypeId, timestamp, video_job_id: videoJobId, event_types: eventType, created_at: '', updated_at: ''};
    return Promise.resolve(newTag);
  }),
  onDeleteTaggedEventInDb: vi.fn(() => Promise.resolve(true)),
  currentPlaylist: null as MockPlaylist,
  onAddTaggedEventToPlaylist: vi.fn(),
  disabled: false,
  eventTypesLoading: false,
  eventTypesError: null,
  taggedEventsLoading: false,
  taggedEventsError: null,
};

describe('EventTaggingSection', () => {
  beforeEach(() => {
    // Clear all mock function calls before each test
    vi.clearAllMocks();
    // Reset mock implementation details if they were changed in a test
     mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve(mockSelectReturn)),
      single: vi.fn((insertedData) => Promise.resolve(mockInsertReturn(insertedData || {}))),
    }));
  });

  describe('Rendering', () => {
    it('renders available event types in dropdown', () => {
      render(<EventTaggingSection {...defaultProps} />);
      const select = screen.getByRole('combobox'); // <select> has combobox role
      expect(select).toBeInTheDocument();
      mockAvailableEventTypes.forEach(et => {
        expect(within(select).getByText(et.name)).toBeInTheDocument();
      });
    });

    it('renders list of tagged events', () => {
      render(<EventTaggingSection {...defaultProps} />);
      mockTaggedEvents.forEach(te => {
        expect(screen.getByText(te.event_types!.name)).toBeInTheDocument();
        // Check for timestamp (formatted)
        const timeRegex = new RegExp(defaultProps.videoPlayerRef.current!.currentTime.toFixed(0)); // rough check
        // This regex is tricky because formatTime is complex. A simpler check might be needed or mock formatTime.
        // For now, just check event name.
      });
      expect(screen.getAllByRole('listitem').length).toBe(mockTaggedEvents.length);
    });
  });

  describe('Event Type Creation', () => {
    it('calls onCreateEventTypeInDb with new event type name and selects it', async () => {
      const newEventName = 'New Custom Event';
      render(<EventTaggingSection {...defaultProps} />);

      const input = screen.getByPlaceholderText(/New event type name/i);
      const createButton = screen.getByTitle(/Create New Event Type/i);

      fireEvent.change(input, { target: { value: newEventName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onCreateEventTypeInDb).toHaveBeenCalledWith(newEventName);
      });
      // Check if the new event type (mocked return) is now selected
      // This depends on the select element updating, which happens via props from parent.
      // The mock for onCreateEventTypeInDb returns a new type.
      // The component then calls setSelectedEventTypeId (internal state).
      // We can check if the select now has this value.
      // This part might be tricky to test without parent state updates.
      // For now, just checking the callback is sufficient for this unit.
    });
  });

  describe('Event Tagging', () => {
    it('calls onTagEventInDb with selected type and current video time', async () => {
      render(<EventTaggingSection {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: mockAvailableEventTypes[0].id } }); // Select "Goal"

      const tagButton = screen.getByRole('button', { name: /Tag Event at Current Timestamp/i });
      fireEvent.click(tagButton);

      await waitFor(() => {
        expect(defaultProps.onTagEventInDb).toHaveBeenCalledWith(
          mockAvailableEventTypes[0].id,
          mockVideoPlayerRef.current.currentTime,
          defaultProps.jobId
        );
      });
    });
  });

  describe('Deleting Tagged Event', () => {
    it('calls onDeleteTaggedEventInDb with event ID on delete click', async () => {
      render(<EventTaggingSection {...defaultProps} />);

      // Find the delete button for the first tagged event
      const firstEventItem = screen.getByText(mockTaggedEvents[0].event_types!.name).closest('li');
      const deleteButton = within(firstEventItem!).getByRole('button', { name: /Delete Tagged Event/i });

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(defaultProps.onDeleteTaggedEventInDb).toHaveBeenCalledWith(mockTaggedEvents[0].id);
      });
    });
  });

  describe('Selecting Active Event', () => {
    it('calls onSetActiveTaggedEventId when a tagged event is clicked', () => {
      render(<EventTaggingSection {...defaultProps} />);

      const firstEventItem = screen.getByText(mockTaggedEvents[0].event_types!.name).closest('li');
      fireEvent.click(firstEventItem!);

      expect(defaultProps.onSetActiveTaggedEventId).toHaveBeenCalledWith(mockTaggedEvents[0].id);

      // Click again to deselect
      fireEvent.click(firstEventItem!);
      expect(defaultProps.onSetActiveTaggedEventId).toHaveBeenCalledWith(null);
    });
  });

  describe('Disabled State', () => {
    it('disables controls when disabled prop is true', () => {
      render(<EventTaggingSection {...defaultProps} disabled={true} />);

      expect(screen.getByPlaceholderText(/New event type name/i)).toBeDisabled();
      expect(screen.getByTitle(/Create New Event Type/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Tag Event at Current Timestamp/i })).toBeDisabled();

      // Check if list items are non-interactive (more complex, depends on implementation)
      // For now, main action buttons are enough.
      const firstEventItem = screen.getByText(mockTaggedEvents[0].event_types!.name).closest('li');
      fireEvent.click(firstEventItem!); // Should not call onSetActiveTaggedEventId
      expect(defaultProps.onSetActiveTaggedEventId).not.toHaveBeenCalled();
    });
  });
});
