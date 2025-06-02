import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { PushNotificationService } from '@/services/pushNotificationService';

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
  match_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  notification_data?: NotificationData;
  matches?: MatchInfo;
}

const TrackerNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Initialize push notifications when component mounts
  useEffect(() => {
    PushNotificationService.initialize();
  }, []);

  // Play notification sound for urgent notifications
  const playNotificationSound = useCallback(() => {
    if ('Audio' in window) {
      try {
        // Create a more attention-grabbing sound for urgent notifications
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a two-tone urgent sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        console.log('Could not play notification sound:', e);
      }
    }
  }, []);

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
          data,
          user_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get match information for notifications with match_id
      const notificationsWithMatches: Notification[] = [];
      
      for (const notification of data || []) {
        // Check if notification should play sound
        const notificationData = notification.data as any;
        if (notificationData?.with_sound && !notification.is_read) {
          playNotificationSound();
          
          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new window.Notification(notification.title || 'Match Alert', {
              body: notification.message || '',
              icon: '/favicon.ico',
              tag: notification.id
            });
          }
        }

        if (notification.match_id) {
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('name, home_team_name, away_team_name, status')
            .eq('id', notification.match_id)
            .single();

          if (!matchError && matchData) {
            notificationsWithMatches.push({
              id: notification.id,
              match_id: notification.match_id,
              title: notification.title || '',
              message: notification.message || '',
              type: notification.type || 'general',
              is_read: notification.is_read || false,
              created_at: notification.created_at || new Date().toISOString(),
              notification_data: notification.data as NotificationData,
              matches: matchData
            });

            // Send local notification for urgent assignments
            if (notification.type === 'urgent_replacement_assignment' && !notification.is_read) {
              const matchName = matchData.name || `${matchData.home_team_name} vs ${matchData.away_team_name}`;
              PushNotificationService.sendMatchAssignmentNotification(matchName, ['Urgent Replacement']);
            }
          }
        } else {
          notificationsWithMatches.push({
            id: notification.id,
            match_id: notification.match_id,
            title: notification.title || '',
            message: notification.message || '',
            type: notification.type || 'general',
            is_read: notification.is_read || false,
            created_at: notification.created_at || new Date().toISOString(),
            notification_data: notification.data as NotificationData,
          });
        }
      }
      
      setNotifications(notificationsWithMatches);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, playNotificationSound]);

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
      toast.error('Failed to mark notification as read');
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

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification dismissed');
    } catch (error: any) {
      console.error('Error dismissing notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  const handleViewMatch = (matchId: string, notificationId: string) => {
    if (matchId && matchId.length > 0) {
      markAsRead(notificationId);
      navigate(`/match/${matchId}`);
    } else {
      console.error('Match ID is missing or invalid for notification:', notificationId);
      toast.error('Cannot start tracking: Match ID is missing or invalid.');
    }
  };

  useEffect(() => {
    // Request notification permission when component mounts
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (user?.id) {
      fetchNotifications();

      // Subscribe to real-time notifications
      const channel = supabase
        .channel('tracker-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification change received via Supabase RT:', payload);
            fetchNotifications();
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as any;
              
              // Play sound for urgent notifications
              if (newNotification?.data?.with_sound) {
                playNotificationSound();
              }
              
              toast.info('New notification received!');
            }
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
  }, [user?.id, fetchNotifications, playNotificationSound]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
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
            <CardTitle className="text-sm sm:text-base md:text-lg">Notifications</CardTitle>
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
        <CardDescription className="text-xs sm:text-sm">
          Stay updated with match assignments and system alerts
        </CardDescription>
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
                      {!notification.is_read && <Badge variant="secondary" className="text-xs">New</Badge>}
                      <Badge 
                        variant="outline"
                        className="text-xs flex-shrink-0"
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    
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
                    
                    {notification.notification_data && (
                      <div className="text-xs space-y-1 mb-2">
                        {notification.notification_data.assigned_event_types && (
                          <div className="break-words">
                            <strong>Event Types:</strong> {notification.notification_data.assigned_event_types.join(', ')}
                          </div>
                        )}
                        {notification.notification_data.assigned_player_ids && (
                          <div>
                            <strong>Players:</strong> {notification.notification_data.assigned_player_ids.length} assigned
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 sm:gap-2 flex-col items-end flex-shrink-0">
                    {/* Primary action button */}
                    {notification.type === 'match_assignment' && notification.match_id && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewMatch(notification.match_id!, notification.id)}
                        className="h-8 sm:h-9 text-xs mb-1"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="ml-1">{isMobile ? "Track" : "Start Tracking"}</span>
                      </Button>
                    )}
                    
                    {/* Secondary action buttons */}
                    <div className="flex gap-1 sm:gap-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-2"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline sm:ml-1">Dismiss</span>
                      </Button>
                    </div>
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
