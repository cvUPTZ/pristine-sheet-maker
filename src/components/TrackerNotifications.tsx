import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface NotificationData {
  assigned_event_types?: string[];
  assigned_player_ids?: number[];
  assignment_type?: string;
}

interface MatchInfo {
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
}

interface Notification {
  id: string;
  match_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>; // Renamed from notification_data and type changed
  matches?: MatchInfo;
}

const TrackerNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          match_id,
          title,
          message,
          type,
          is_read,
          created_at,
          data, // Changed from notification_data to data
          user_id
        `)
        .eq('user_id', user.id)
        // .not('match_id', 'is', null) // Removed filter to include all notification types
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const processedNotifications: Notification[] = [];
      
      for (const notification of data || []) {
        let matchInfo: MatchInfo | undefined = undefined;
        if (notification.match_id) {
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('name, home_team_name, away_team_name, status')
            .eq('id', notification.match_id)
            .single();

          if (matchError) {
            console.warn(`Error fetching match data for notification ${notification.id}:`, matchError);
            // Decide if you want to include the notification even if match data fails
            // For now, we'll include it without match specific data if fetching fails
          } else if (matchData) {
            matchInfo = matchData;
          }
        }

        processedNotifications.push({
          id: notification.id,
          match_id: notification.match_id, // Will be null if not present
          title: notification.title || '',
          message: notification.message || '',
          type: notification.type || 'general',
          is_read: notification.is_read || false,
          created_at: notification.created_at || new Date().toISOString(),
          data: notification.data as Record<string, any> | undefined, // Use notification.data
          matches: matchInfo
        });
      }
      
      setNotifications(processedNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleViewMatch = (matchId: string, notificationId: string) => {
    markAsRead(notificationId);
    navigate(`/match/${matchId}`);
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Subscribe to real-time notifications
      const channel = supabase
        .channel('tracker-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New notification received via Supabase RT:', payload);
            fetchNotifications();
            toast.info('New match notification received!');
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to tracker-notifications channel for user:', user.id);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Tracker notification channel error:', status, err);
          }
        });

      return () => {
        if (channel) {
          supabase.removeChannel(channel).then(status => {
            console.log('Unsubscribed from tracker-notifications. Status:', status);
          }).catch(error => {
            console.error('Error unsubscribing from tracker-notifications:', error);
          });
        }
      };
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user?.id, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center text-muted-foreground">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <CardTitle className="text-sm sm:text-base md:text-lg">Match Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              onClick={markAllAsRead}
              className="text-xs sm:text-sm"
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {isMobile ? "Mark All" : "Mark All Read"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 sm:py-8">
            No notifications yet
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 sm:p-4 border rounded-lg ${
                  notification.is_read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm sm:text-base truncate">{notification.title}</span>
                      <Badge 
                        variant={notification.matches?.status === 'published' ? 'secondary' : 'outline'}
                        className="text-xs flex-shrink-0"
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    
                    {/* Display match name if available */}
                    {notification.matches && (
                      <div className="mb-2">
                        <span className="font-medium text-sm sm:text-base">
                          {notification.matches.name ||
                           `${notification.matches.home_team_name} vs ${notification.matches.away_team_name}`}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    {/* Conditional rendering for notification.data based on type */}
                    {notification.data && (
                      <div className="text-xs space-y-1 mb-2 bg-muted/50 p-2 rounded-md">
                        {notification.type === 'low_battery' && notification.data.battery_level !== undefined && (
                          <p><strong>Battery Critical:</strong> {String(notification.data.battery_level)}%</p>
                        )}
                        {notification.type === 'match_reminder' && notification.data.match_name && (
                           <p>Reminder for <strong>{String(notification.data.match_name)}</strong> starting at {new Date(String(notification.data.start_time)).toLocaleTimeString()}</p>
                        )}
                        {notification.type === 'tracker_absence' && (
                          <div>
                            <p><strong>Replacement Assignment:</strong></p>
                            <p>Match ID: {String(notification.data.match_id)}</p>
                            {notification.data.absent_tracker_id && <p>Original Tracker: {String(notification.data.absent_tracker_id)}</p>}
                          </div>
                        )}
                        {/* Fallback for 'assignment' type or types with assigned_event_types/assigned_player_ids */}
                        {(notification.type === 'assignment' || // Assuming 'assignment' is a type
                          (!['low_battery', 'match_reminder', 'tracker_absence'].includes(notification.type) &&
                           (notification.data.assigned_event_types || notification.data.assigned_player_ids))
                        ) && (
                          <>
                            {Array.isArray(notification.data.assigned_event_types) && notification.data.assigned_event_types.length > 0 && (
                              <div className="break-words">
                                <strong>Event Types:</strong> {notification.data.assigned_event_types.join(', ')}
                              </div>
                            )}
                            {Array.isArray(notification.data.assigned_player_ids) && notification.data.assigned_player_ids.length > 0 && (
                              <div>
                                <strong>Players:</strong> {notification.data.assigned_player_ids.length} assigned
                              </div>
                            )}
                             {notification.data.assignment_type && (
                              <div>
                                <strong>Assignment Type:</strong> {String(notification.data.assignment_type)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 sm:gap-2 flex-col sm:flex-row flex-shrink-0 items-start">
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-2"
                      >
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline sm:ml-1">Read</span>
                      </Button>
                    )}
                    {/* Conditionally render "Start Tracking" button if there's a match_id */}
                    {notification.match_id && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewMatch(notification.match_id!, notification.id)}
                        className="h-8 sm:h-9 text-xs"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="ml-1">{isMobile ? "Track" : "Start Tracking"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerNotifications;
