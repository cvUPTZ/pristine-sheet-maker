import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { YouTubeService } from '@/services/youtubeService';

// Define actual data types based on expected Supabase table structure
interface Match {
  id: string;
  name: string;
}

interface TrackerUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface EventType {
  id: string;
  name: string;
}

// REFACTORED: Props are updated for the Controlled Component pattern.
// 'initialVideoUrl' is now 'videoUrl' to represent the current value.
// 'onVideoUrlChange' is now required as it's the only way to update the URL.
interface VideoMatchSetupProps {
  simplifiedView?: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
}

const VideoMatchSetup: React.FC<VideoMatchSetupProps> = ({
  simplifiedView = false,
  videoUrl, // Use the prop directly
  onVideoUrlChange,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // REMOVED: No longer using local state for the video URL.
  // const [videoUrl, setVideoUrl] = useState(initialVideoUrl);

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTrackers, setAllTrackers] = useState<TrackerUser[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [assignedTrackers, setAssignedTrackers] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Event types - replace with actual fetching if needed
  const eventTypes: EventType[] = [
    { id: 'pass', name: 'Pass' },
    { id: 'shot', name: 'Shot' },
    { id: 'foul', name: 'Foul' },
    { id: 'goal', name: 'Goal' }
  ];

  // REMOVED: This effect was an anti-pattern (derived state).
  // The component is now fully controlled by its parent via props.
  /*
  useEffect(() => {
    setVideoUrl(initialVideoUrl);
  }, [initialVideoUrl]);
  */

  // REFACTORED: Data fetching effect is now safer.
  useEffect(() => {
    // 1. A flag to prevent state updates if the component has unmounted.
    let isMounted = true;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('id, name, home_team_name, away_team_name')
          .order('match_date', { ascending: false });
        
        if (matchesError) throw matchesError;
        
        // Only update state if the component is still mounted
        if (isMounted) {
          setAllMatches(matchesData.map(m => ({ 
            id: m.id, 
            name: m.name || `${m.home_team_name} vs ${m.away_team_name}` 
          })));
        }

        // Fetch trackers
        const { data: trackersData, error: trackersError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'tracker');
        
        if (trackersError) throw trackersError;
        
        if (isMounted) {
          setAllTrackers(trackersData as TrackerUser[]);
        }

      } catch (error: any) {
        console.error('Error fetching data for VideoMatchSetup:', error);
        if (isMounted) {
          toast({
            title: 'Error Fetching Data',
            description: `Could not load matches or trackers: ${error.message}`,
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };
    
    // Only fetch data if not in simplified view
    if (!simplifiedView) {
      fetchData();
    }

    // 2. The cleanup function: runs when the component unmounts or
    // before the effect runs again.
    return () => {
      isMounted = false;
    };

    // 3. Dependency Array: `toast` is included. For this to be performant,
    // the `useToast` hook MUST return a memoized `toast` function (using useCallback).
    // Otherwise, this effect will re-run on every render.
  }, [simplifiedView, toast]);

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Directly call the parent's handler. No local state update needed.
    onVideoUrlChange(e.target.value);
  };

  const handleSubmit = async () => {
    if (simplifiedView) {
      console.log('handleSubmit called in simplifiedView, typically handled by parent.');
      return;
    }

    // Validation
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
        assigned_event_types: selectedEvents,
      }));

      const result = await YouTubeService.saveVideoMatchSetup(
        selectedMatch,
        videoUrl,
        videoAssignments,
        user.id
      );

      // Send notifications to assigned trackers
      if (result.videoSetting && result.assignmentResults.length > 0) {
        const matchName = allMatches.find(m => m.id === selectedMatch)?.name || 'Selected Match';
        const notifications = result.assignmentResults.map((assignment: any) => ({
          user_id: assignment.tracker_id,
          match_id: selectedMatch,
          type: 'video_assignment',
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
            toast({ 
              title: "Notification Error", 
              description: "Video setup saved, but failed to send notifications.", 
              variant: "warning" 
            });
          } else {
            console.log(`${notifications.length} direct video assignment notifications sent.`);
          }
        }
      }

      toast({ title: 'Success', description: 'Video match setup saved and trackers notified!' });
      
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
          value={videoUrl} // The input value is now controlled directly by the prop
          onChange={handleVideoUrlChange}
          placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          className="w-full p-2 border rounded"
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
              <option value="" disabled>
                {loadingData ? "Loading matches..." : "Select a match"}
              </option>
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
                <label htmlFor={`tracker-${tracker.id}`}>
                  {tracker.full_name || tracker.email} ({tracker.id.substring(0,6)})
                </label>
              </div>
            ))}
            {!loadingData && allTrackers.length === 0 && (
              <p className="text-sm text-gray-500">No trackers found.</p>
            )}
          </div>

          <div className="mt-4">
            <label>Select Events:</label>
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
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
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