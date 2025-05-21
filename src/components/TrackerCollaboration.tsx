
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { TrackerAssignment } from "@/types/auth";
import { EventType } from "@/types";

interface ActiveTracker {
  id: string;
  name: string;
  category: string;
  lastActive: string;
}

interface TrackerCollaborationProps {
  currentCategory?: string;
  onEventTracked?: (event: { 
    type: EventType;
    trackedBy: string;
    timestamp: string;
  }) => void;
}

export default function TrackerCollaboration({ currentCategory, onEventTracked }: TrackerCollaborationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTrackers, setActiveTrackers] = useState<ActiveTracker[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [myAssignments, setMyAssignments] = useState<TrackerAssignment[]>([]);

  // Load tracker assignments for this user
  useEffect(() => {
    if (!user) return;
    
    const fetchAssignments = async () => {
      try {
        const { data } = await supabase.rpc('get_tracker_assignments', { user_id: user.id });
        setMyAssignments(data as TrackerAssignment[]);
      } catch (error) {
        console.error("Error fetching tracker assignments:", error);
      }
    };
    
    fetchAssignments();
  }, [user]);

  // Join the realtime channel when component mounts
  useEffect(() => {
    if (!user) return;

    // Set up presence channel
    const channel = supabase.channel('tracker_presence', {
      config: { 
        presence: {
          key: user.id,
        },
      },
    });

    // Handle presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const trackers: ActiveTracker[] = [];
        
        // Convert presence state to our tracker format
        Object.entries(state).forEach(([key, presences]) => {
          const presence = presences[0] as any;
          if (presence.category) {
            trackers.push({
              id: key,
              name: presence.name || 'Unknown Tracker',
              category: presence.category,
              lastActive: new Date().toISOString(),
            });
          }
        });
        
        setActiveTrackers(trackers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0] as any;
        if (presence.category) {
          toast({
            title: "Tracker joined",
            description: `${presence.name || 'A tracker'} is now tracking ${presence.category}`,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presence = leftPresences[0] as any;
        if (presence.category) {
          toast({
            description: `${presence.name || 'A tracker'} has stopped tracking ${presence.category}`,
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
          setLoading(false);
        } else {
          setIsOnline(false);
        }
      });

    // Set up broadcast channel for event notifications
    const broadcastChannel = supabase.channel('tracker_events');
    
    broadcastChannel
      .on('broadcast', { event: 'event_tracked' }, (payload) => {
        if (payload.payload && onEventTracked) {
          onEventTracked(payload.payload);
          
          toast({
            title: "Event tracked",
            description: `${payload.payload.trackedBy} tracked a ${payload.payload.type} event`,
          });
        }
      })
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [user, onEventTracked]);

  // Go online for tracking
  const goOnline = async (category: string) => {
    if (!user || !category) return;
    
    const channel = supabase.channel('tracker_presence');
    
    try {
      // Broadcast our presence with the category we're tracking
      await channel.track({
        name: user.email?.split('@')[0] || "Tracker",
        category: category,
        online_at: new Date().toISOString(),
      });
      
      setIsOnline(true);
      
      toast({
        title: "Tracking active",
        description: `You are now actively tracking ${category}`,
      });
    } catch (error) {
      console.error('Error tracking presence:', error);
      toast({
        variant: "destructive",
        title: "Tracking failed",
        description: "Could not activate tracking presence",
      });
    }
  };

  // Go offline
  const goOffline = async () => {
    const channel = supabase.channel('tracker_presence');
    
    try {
      // Untrack our presence
      await channel.untrack();
      setIsOnline(false);
      
      toast({
        title: "Tracking inactive",
        description: "You are no longer actively tracking",
      });
    } catch (error) {
      console.error('Error untracking presence:', error);
    }
  };

  // Broadcast a tracked event to all collaborators
  const broadcastEvent = async (eventType: EventType) => {
    if (!user || !isOnline || !currentCategory) return;
    
    const channel = supabase.channel('tracker_events');
    
    try {
      await channel.send({
        type: 'broadcast',
        event: 'event_tracked',
        payload: {
          type: eventType,
          trackedBy: user.email?.split('@')[0] || "Tracker",
          trackerId: user.id,
          category: currentCategory,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error broadcasting event:', error);
      toast({
        variant: "destructive",
        title: "Broadcast failed",
        description: "Could not broadcast the tracked event",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" /> 
          Collaboration
          {isOnline && (
            <Badge variant="outline" className="bg-green-500 text-white ml-2">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myAssignments.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {myAssignments.map(assignment => (
                <Button 
                  key={assignment.id} 
                  variant={isOnline && currentCategory === assignment.event_category ? "default" : "outline"} 
                  size="sm"
                  onClick={() => goOnline(assignment.event_category)}
                  disabled={isOnline && currentCategory !== assignment.event_category}
                >
                  {isOnline && currentCategory === assignment.event_category && (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  {assignment.event_category}
                </Button>
              ))}
            </div>

            {isOnline && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={goOffline}
              >
                Stop Tracking
              </Button>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Active Trackers</h4>
              {activeTrackers.length > 0 ? (
                <div className="grid gap-2">
                  {activeTrackers.map(tracker => (
                    <div key={tracker.id} className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
                      <div>
                        <span className="font-medium">{tracker.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          tracking {tracker.category}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-green-100">Online</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active trackers at the moment</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            You don't have any tracking assignments yet.
            Please contact an administrator to get assigned to event categories.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
