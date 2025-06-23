import React, { useState, useEffect } from 'react'; // Added useEffect
import { supabase } from '@/integrations/supabase/client'; // For fetching data
import { useToast } from '@/hooks/use-toast'; // For error notifications
import { useAuth } from '@/context/AuthContext'; // To get current user ID for created_by
import { YouTubeService } from '@/services/youtubeService'; // To save the setup

// Define actual data types based on expected Supabase table structure
interface Match {
  id: string; // Assuming uuid from Supabase
  name: string; // Or home_team_name vs away_team_name
  // Add other relevant match fields if needed for display
}

interface TrackerUser { // Renamed from Tracker to avoid confusion with general 'tracker' term
  id: string; // User ID from profiles/users table
  full_name: string | null;
  email: string | null;
}

// EventType can remain as is for now, or be fetched if dynamic
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
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTrackers, setAllTrackers] = useState<TrackerUser[]>([]);
  const [loadingData, setLoadingData] = useState(false); // For fetching dropdown data
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission

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

  // TODO: Replace with actual event type fetching or import from a shared constant
  const eventTypes: EventType[] = [
    { id: 'pass', name: 'Pass' }, { id: 'shot', name: 'Shot' },
    { id: 'foul', name: 'Foul' }, { id: 'goal', name: 'Goal' }
  ];


  useEffect(() => {
    if (!simplifiedView) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          // Fetch matches
          const { data: matchesData, error: matchesError } = await supabase
            .from('matches')
            .select('id, name, home_team_name, away_team_name') // Adjust columns as needed
            .order('match_date', { ascending: false }); // Example order
          if (matchesError) throw matchesError;
          setAllMatches(matchesData.map(m => ({ id: m.id, name: m.name || `${m.home_team_name} vs ${m.away_team_name}` })));

          // Fetch trackers
          const { data: trackersData, error: trackersError } = await supabase
            .from('profiles') // Assuming 'profiles' table stores full_name, email and role
            .select('id, full_name, email')
            .eq('role', 'tracker'); // Adjust role name if different
          if (trackersError) throw trackersError;
          setAllTrackers(trackersData as TrackerUser[]);

        } catch (error: any) {
          console.error('Error fetching data for VideoMatchSetup:', error);
          toast({
            title: 'Error Fetching Data',
            description: `Could not load matches or trackers: ${error.message}`,
            variant: 'destructive',
          });
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [simplifiedView, toast]);

  const handleSubmit = async () => {
    if (simplifiedView) {
      // In simplified view, this button might not even be shown,
      // or its action is handled by the parent form (CreateMatchForm)
      console.log('handleSubmit called in simplifiedView, typically handled by parent.');
      return;
    }

    if (!selectedMatch) {
      toast({ title: 'Validation Error', description: 'Please select a match.', variant: 'destructive' });
      return;
    }
    if (!videoUrl) {
      toast({ title: 'Validation Error', description: 'Please enter a YouTube video URL.', variant: 'destructive' });
      return;
    }
    if (assignedTrackers.length === 0) {
      toast({ title: 'Validation Error', description: 'Please assign at least one tracker.', variant: 'destructive' });
      return;
    }
    if (!user || !user.id) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a setup.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const videoAssignments = assignedTrackers.map(trackerId => ({
        tracker_id: trackerId,
        // For now, let's assume all selectedEvents apply to each tracker assigned in this UI.
        // A more granular UI could allow per-tracker event type selection.
        assigned_event_types: selectedEvents,
      }));

      const result = await YouTubeService.saveVideoMatchSetup(
        selectedMatch,
        videoUrl,
        videoAssignments,
        user.id
      );

      // Notify assigned trackers
      // This logic is similar to CreateMatchForm, consider refactoring to a shared notification service if it grows
      if (result.videoSetting && result.assignmentResults.length > 0) {
        const matchName = allMatches.find(m => m.id === selectedMatch)?.name || 'Selected Match';
        const notifications = result.assignmentResults.map((assignment: any) => ({
          user_id: assignment.tracker_id,
          match_id: selectedMatch, // The match this video is associated with
          type: 'video_assignment', // Specific type for direct video assignment
          title: `New Video Assignment: ${result.videoSetting.video_title || 'Video'} for ${matchName}`,
          message: `You have been assigned to track video: "${result.videoSetting.video_title || videoUrl}" for match "${matchName}". Events: ${assignment.assigned_event_types.join(', ') || 'All'}`,
          data: {
            match_id: selectedMatch,
            match_video_setting_id: result.videoSetting.id,
            video_tracker_assignment_id: assignment.id,
            video_url: result.videoSetting.video_url,
            video_title: result.videoSetting.video_title,
            assigned_event_types: assignment.assigned_event_types,
          },
          created_by: user.id,
        }));

        if (notifications.length > 0) {
          const { error: notificationError } = await supabase.from('notifications').insert(notifications);
          if (notificationError) {
            console.error('Error creating direct video assignment notifications:', notificationError);
            toast({ title: "Notification Error", description: "Video setup saved, but failed to send notifications.", variant: "warning" });
          } else {
            console.log(`${notifications.length} direct video assignment notifications sent.`);
          }
        }
      }

      toast({ title: 'Success', description: 'Video match setup saved and trackers notified!' });
      // Optionally reset form fields here
      // setSelectedMatch(null);
      // setVideoUrl('');
      // setAssignedTrackers([]);
      // setSelectedEvents([]);

    } catch (error: any) {
      console.error('Error saving video match setup:', error);
      toast({
        title: 'Save Error',
        description: `Failed to save video match setup: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <select
              onChange={(e) => setSelectedMatch(e.target.value)}
              value={selectedMatch || ''}
              className="w-full p-2 border rounded"
              disabled={loadingData}
            >
              <option value="" disabled>{loadingData ? "Loading matches..." : "Select a match"}</option>
              {allMatches.map(match => (
                <option key={match.id} value={match.id}>{match.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label>Assign Trackers:</label>
            {loadingData && <p>Loading trackers...</p>}
            {!loadingData && allTrackers.map(tracker => (
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
                <label htmlFor={`tracker-${tracker.id}`}>{tracker.full_name || tracker.email} ({tracker.id.substring(0,6)})</label>
              </div>
            ))}
             {!loadingData && allTrackers.length === 0 && <p className="text-sm text-gray-500">No trackers found.</p>}
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
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400" // Example styling
            disabled={isSubmitting || loadingData}
          >
            {isSubmitting ? 'Saving...' : 'Save Full Setup & Notify Trackers'}
          </button>
        </>
      )}
    </div>
  );
};

export default VideoMatchSetup;
