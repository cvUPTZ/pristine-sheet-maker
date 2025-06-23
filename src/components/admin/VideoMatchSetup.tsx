import React, { useState } from 'react';

// Mock data types - replace with actual types later
interface Match {
  id: string;
  name: string;
}

interface Tracker {
  id: string;
  name: string;
}

interface EventType {
  id: string;
  name: string;
}

interface VideoMatchSetupProps {
  simplifiedView?: boolean;
  initialVideoUrl?: string;
  onVideoUrlChange?: (url: string) => void;
  // Add onSubmit for simplified view if needed, or let CreateMatchForm handle it.
}

const VideoMatchSetup: React.FC<VideoMatchSetupProps> = ({
  simplifiedView = false,
  initialVideoUrl = '',
  onVideoUrlChange,
}) => {
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);

  // Effect to keep internal state in sync with prop, and notify parent
  useEffect(() => {
    setVideoUrl(initialVideoUrl);
  }, [initialVideoUrl]);

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setVideoUrl(newUrl);
    if (onVideoUrlChange) {
      onVideoUrlChange(newUrl);
    }
  };

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [assignedTrackers, setAssignedTrackers] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Mock data - replace with actual data fetching
  const matches: Match[] = [{ id: '1', name: 'Match A' }, { id: '2', name: 'Match B' }];
  const trackers: Tracker[] = [{ id: 't1', name: 'Tracker 1' }, { id: 't2', name: 'Tracker 2' }];
  const eventTypes: EventType[] = [{ id: 'e1', name: 'Event X' }, { id: 'e2', name: 'Event Y' }];

  const handleSubmit = () => {
    console.log({
      videoUrl,
      selectedMatch,
      assignedTrackers,
      selectedEvents,
    });
    // Logic to save setup and send notifications
  };

  return (
    <div>
      {!simplifiedView && <h3>Video Match Setup</h3>}
      <div>
        <label htmlFor="videoUrlInput">YouTube Video URL:</label>
        <input
          id="videoUrlInput"
          type="text"
          value={videoUrl}
          onChange={handleVideoUrlChange}
          placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          className="w-full p-2 border rounded" // Example styling
        />
      </div>

      {!simplifiedView && (
        <>
          <div className="mt-4">
            <label>Select Match:</label>
            <select onChange={(e) => setSelectedMatch(e.target.value)} value={selectedMatch || ''} className="w-full p-2 border rounded">
              <option value="" disabled>Select a match</option>
              {matches.map(match => (
                <option key={match.id} value={match.id}>{match.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label>Assign Trackers:</label>
            {/* Replace with a multi-select component */}
            {trackers.map(tracker => (
              <div key={tracker.id}>
                <input
                  type="checkbox"
                  id={`tracker-${tracker.id}`}
                  value={tracker.id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAssignedTrackers([...assignedTrackers, tracker.id]);
                    } else {
                      setAssignedTrackers(assignedTrackers.filter(id => id !== tracker.id));
                    }
                  }}
                />
                <label htmlFor={`tracker-${tracker.id}`}>{tracker.name}</label>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label>Select Events:</label>
            {/* Replace with a multi-select component */}
            {eventTypes.map(event => (
              <div key={event.id}>
                <input
                  type="checkbox"
                  id={`event-${event.id}`}
                  value={event.id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEvents([...selectedEvents, event.id]);
                    } else {
                      setSelectedEvents(selectedEvents.filter(id => id !== event.id));
                    }
                  }}
                />
                <label htmlFor={`event-${event.id}`}>{event.name}</label>
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" // Example styling
          >
            Save Full Setup & Notify Trackers
          </button>
        </>
      )}
    </div>
  );
};

export default VideoMatchSetup;
