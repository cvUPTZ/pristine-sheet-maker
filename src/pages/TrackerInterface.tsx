
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Zap, Activity, AlertTriangle, Award, Play, Pause, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Stat } from '@/components/ui/stat';

interface EventAssignment {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
}

interface EventStats {
  total: number;
  today: number;
  thisWeek: number;
}

const eventIcons: Record<string, React.ComponentType<any>> = {
  pass: Target,
  shot: Zap,
  tackle: Activity,
  foul: AlertTriangle,
  goal: Award,
  card: AlertTriangle,
  corner: Target,
  offside: AlertTriangle,
  substitution: Activity,
};

const eventColors: Record<string, string> = {
  pass: 'bg-blue-500 hover:bg-blue-600',
  shot: 'bg-red-500 hover:bg-red-600',
  tackle: 'bg-green-500 hover:bg-green-600',
  foul: 'bg-yellow-500 hover:bg-yellow-600',
  goal: 'bg-purple-500 hover:bg-purple-600',
  card: 'bg-orange-500 hover:bg-orange-600',
  corner: 'bg-indigo-500 hover:bg-indigo-600',
  offside: 'bg-pink-500 hover:bg-pink-600',
  substitution: 'bg-teal-500 hover:bg-teal-600',
};

const TrackerInterface: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [stats, setStats] = useState<Record<string, EventStats>>({});
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_event_assignments')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching assignments:', error);
          toast.error('Failed to load your assignments');
        } else {
          // Convert id to string to match interface
          const typedAssignments: EventAssignment[] = (data || []).map((assignment: any) => ({
            id: assignment.id.toString(),
            user_id: assignment.user_id,
            event_type: assignment.event_type,
            created_at: assignment.created_at,
          }));
          setAssignments(typedAssignments);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user?.id]);

  useEffect(() => {
    // Generate mock stats for demo purposes
    const mockStats: Record<string, EventStats> = {};
    assignments.forEach(assignment => {
      mockStats[assignment.event_type] = {
        total: Math.floor(Math.random() * 100) + 10,
        today: Math.floor(Math.random() * 20) + 1,
        thisWeek: Math.floor(Math.random() * 50) + 5,
      };
    });
    setStats(mockStats);
  }, [assignments]);

  const handleEventClick = (eventType: string) => {
    if (!isTracking) {
      toast.error('Please start tracking first');
      return;
    }

    // Mock event recording
    toast.success(`${eventType.charAt(0).toUpperCase() + eventType.slice(1)} recorded!`);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        total: prev[eventType].total + 1,
        today: prev[eventType].today + 1,
      }
    }));
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
    toast.success(isTracking ? 'Tracking stopped' : 'Tracking started');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading your tracker interface...</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">No Event Assignments</h2>
              <p className="text-gray-600 mb-4">
                You haven't been assigned any event types to track yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracker Interface</h1>
          <p className="text-gray-600">Track events assigned to you during live matches</p>
        </div>

        {/* Tracking Control */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tracking Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Status: <Badge variant={isTracking ? 'default' : 'secondary'}>
                    {isTracking ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
                <p className="text-xs text-gray-500">
                  {isTracking ? 'You can now record events' : 'Click start to begin tracking'}
                </p>
              </div>
              <Button
                onClick={toggleTracking}
                size="lg"
                variant={isTracking ? 'destructive' : 'default'}
                className="flex items-center gap-2"
              >
                {isTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Object.values(stats).reduce((sum, stat) => sum + stat.today, 0)}
                </div>
                <div className="text-sm text-gray-600">Events Today</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {Object.values(stats).reduce((sum, stat) => sum + stat.thisWeek, 0)}
                </div>
                <div className="text-sm text-gray-600">Events This Week</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {assignments.length}
                </div>
                <div className="text-sm text-gray-600">Assigned Event Types</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assigned Events</CardTitle>
            <p className="text-sm text-gray-600">
              Click on the buttons below to record events during the match
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assignments.map((assignment) => {
                const IconComponent = eventIcons[assignment.event_type] || Target;
                const colorClass = eventColors[assignment.event_type] || 'bg-gray-500 hover:bg-gray-600';
                const eventStat = stats[assignment.event_type];

                return (
                  <div key={assignment.id} className="group">
                    <Button
                      onClick={() => handleEventClick(assignment.event_type)}
                      disabled={!isTracking}
                      className={`
                        w-full h-24 flex flex-col items-center justify-center gap-2 
                        ${colorClass} text-white shadow-lg transform transition-all duration-200
                        ${isTracking ? 'hover:scale-105 hover:shadow-xl' : 'opacity-50 cursor-not-allowed'}
                        group-hover:ring-2 group-hover:ring-white group-hover:ring-opacity-50
                      `}
                    >
                      <IconComponent className="h-8 w-8" />
                      <span className="text-sm font-medium capitalize">
                        {assignment.event_type}
                      </span>
                    </Button>
                    
                    {/* Event Stats */}
                    {eventStat && (
                      <div className="mt-2 bg-white rounded-lg p-2 shadow-sm border">
                        <div className="grid grid-cols-3 gap-1 text-xs text-center">
                          <div>
                            <div className="font-medium text-gray-900">{eventStat.today}</div>
                            <div className="text-gray-500">Today</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{eventStat.thisWeek}</div>
                            <div className="text-gray-500">Week</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{eventStat.total}</div>
                            <div className="text-gray-500">Total</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Getting Started</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Click "Start Tracking" to begin recording events</li>
                  <li>• Watch the live match carefully</li>
                  <li>• Click the appropriate event button when you see it happen</li>
                  <li>• Your stats will update in real-time</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tips for Accuracy</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Focus only on your assigned event types</li>
                  <li>• Record events immediately when they happen</li>
                  <li>• If unsure, it's better to not record than to record incorrectly</li>
                  <li>• Take breaks if you feel tired or distracted</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrackerInterface;
