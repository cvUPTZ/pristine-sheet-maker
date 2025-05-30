
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

interface Notification {
  id: string;
  match_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  notification_data?: {
    assigned_event_types?: string[];
    assigned_player_ids?: number[];
    assignment_type?: string;
  };
  matches?: {
    name: string | null;
    home_team_name: string;
    away_team_name: string;
    status: string;
  };
}

const TrackerNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

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
          *,
          matches:match_id (
            name,
            home_team_name,
            away_team_name,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter and type-cast the data properly
      const validNotifications = (data || [])
        .filter(notification => notification.match_id) // Only keep notifications with valid match_id
        .map(notification => ({
          ...notification,
          match_id: notification.match_id as string, // Type assertion since we filtered out nulls
          is_read: notification.is_read || false,
          type: notification.type || 'general',
          created_at: notification.created_at || new Date().toISOString()
        }));
      
      setNotifications(validNotifications);
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
    navigate(`/tracker-interface?matchId=${matchId}&trackerUserId=${user?.id}`);
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
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Match Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            No notifications yet
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg ${
                  notification.is_read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                      <span className="font-medium">{notification.title}</span>
                      <Badge variant={notification.matches?.status === 'published' ? 'secondary' : 'outline'}>
                        {notification.type}
                      </Badge>
                    </div>
                    
                    <div className="mb-2">
                      <span className="font-medium">
                        {notification.matches?.name || 
                         `${notification.matches?.home_team_name} vs ${notification.matches?.away_team_name}`}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.notification_data && (
                      <div className="text-xs space-y-1">
                        {notification.notification_data.assigned_event_types && (
                          <div>
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
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleViewMatch(notification.match_id!, notification.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Start Tracking
                    </Button>
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
