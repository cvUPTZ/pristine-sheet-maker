import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Target, TrendingUp, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface EventAssignment {
  id: string;
  tracker_user_id: string;
  assigned_event_types?: string[] | null;
  priority: number;
  is_specialized: boolean;
  created_at: string;
  tracker?: {
    username: string;
    full_name: string;
  };
}

interface Match {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string | null;
}

const EventAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    specializedTrackers: 0,
    eventTypesCovered: 0,
    averagePriority: 0
  });
  const isMobile = useIsMobile();

  const eventTypes = [
    'goal', 'assist', 'pass', 'tackle', 'foul', 'yellow_card', 'red_card',
    'substitution', 'corner_kick', 'free_kick', 'penalty', 'offside'
  ];

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchAssignments();
    }
  }, [selectedMatch, selectedEventType]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, status, match_date')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        name: match.name,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        status: match.status,
        match_date: match.match_date
      }));
      
      setMatches(transformedMatches);
      if (transformedMatches.length > 0) {
        setSelectedMatch(transformedMatches[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    }
  };

  const fetchAssignments = async () => {
    if (!selectedMatch) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          tracker_user_id,
          assigned_event_types,
          priority,
          is_specialized,
          created_at,
          profiles:tracker_user_id (
            username,
            full_name
          )
        `)
        .eq('match_id', selectedMatch);

      if (selectedEventType !== 'all') {
        query = query.contains('assigned_event_types', [selectedEventType]);
      }

      const { data, error } = await query.order('priority', { ascending: true });

      if (error) throw error;
      
      // Transform the data safely
      const formattedData: EventAssignment[] = (data || []).map(assignment => ({
        id: assignment.id,
        tracker_user_id: assignment.tracker_user_id,
        assigned_event_types: assignment.assigned_event_types,
        priority: assignment.priority || 1,
        is_specialized: assignment.is_specialized || false,
        created_at: assignment.created_at,
        tracker: assignment.profiles ? {
          username: assignment.profiles.username || '',
          full_name: assignment.profiles.full_name || ''
        } : undefined
      }));

      setAssignments(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load event assignments');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: EventAssignment[]) => {
    const totalAssignments = data.length;
    const specializedTrackers = data.filter(a => a.is_specialized).length;
    
    // Calculate event types covered from assigned_event_types arrays
    const allEventTypes = new Set<string>();
    data.forEach(assignment => {
      if (assignment.assigned_event_types) {
        assignment.assigned_event_types.forEach(type => allEventTypes.add(type));
      }
    });
    const eventTypesCovered = allEventTypes.size;
    
    const averagePriority = data.length > 0 
      ? Math.round(data.reduce((sum, a) => sum + a.priority, 0) / data.length * 10) / 10
      : 0;

    setStats({
      totalAssignments,
      specializedTrackers,
      eventTypesCovered,
      averagePriority
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-100 text-red-800';
    if (priority <= 4) return 'bg-orange-100 text-orange-800';
    if (priority <= 6) return 'bg-yellow-100 text-yellow-800';
    if (priority <= 8) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      goal: 'bg-green-500',
      assist: 'bg-blue-500',
      pass: 'bg-gray-500',
      tackle: 'bg-orange-500',
      foul: 'bg-red-500',
      yellow_card: 'bg-yellow-500',
      red_card: 'bg-red-600',
      substitution: 'bg-purple-500',
      corner_kick: 'bg-indigo-500',
      free_kick: 'bg-cyan-500',
      penalty: 'bg-pink-500',
      offside: 'bg-gray-600'
    };
    return colors[eventType as keyof typeof colors] || 'bg-gray-400';
  };

  return (
    <div className={`space-y-3 sm:space-y-4 lg:space-y-6`}>
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'}`}>
            <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
            Event Assignments Management
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'} pt-0`}>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2`}>
                Select Match
              </label>
              <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                <SelectTrigger className={isMobile ? 'h-8 text-xs' : ''}>
                  <SelectValue placeholder="Choose a match" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>
                        {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2`}>
                Filter by Event Type
              </label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className={isMobile ? 'h-8 text-xs' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="capitalize">
                        {type.replace('_', ' ')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`flex ${isMobile ? 'justify-center' : 'justify-end'} items-end`}>
              <Button 
                onClick={fetchAssignments} 
                disabled={loading || !selectedMatch}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'h-8 px-3 text-xs' : ''}
              >
                <RefreshCw className={`${loading ? 'animate-spin' : ''} ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isMobile ? 'Refresh' : 'Refresh Data'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                    Total Assignments
                  </p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                    {stats.totalAssignments}
                  </p>
                </div>
                <Users className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-blue-500`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                    {isMobile ? 'Specialized' : 'Specialized Trackers'}
                  </p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                    {stats.specializedTrackers}
                  </p>
                </div>
                <Target className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-green-500`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                    {isMobile ? 'Event Types' : 'Event Types Covered'}
                  </p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>
                    {stats.eventTypesCovered}
                  </p>
                </div>
                <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-purple-500`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                    {isMobile ? 'Avg Priority' : 'Average Priority'}
                  </p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>
                    {stats.averagePriority}
                  </p>
                </div>
                <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-orange-500`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedMatch && (
        <Card>
          <CardHeader className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
            <CardTitle className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>
              Event Assignment Details
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'} pt-0`}>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                  Loading assignments...
                </p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4`} />
                <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-medium`}>
                  No event assignments found
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>
                  {selectedEventType !== 'all' 
                    ? `No assignments for ${selectedEventType.replace('_', ' ')} events`
                    : 'No event assignments configured for this match'
                  }
                </p>
              </div>
            ) : (
              <div className={`space-y-2 sm:space-y-3 ${isMobile ? 'max-h-96' : 'max-h-[500px]'} overflow-y-auto`}>
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} border rounded-lg hover:bg-gray-50 transition-colors`}
                  >
                    <div className={`flex items-center justify-between ${isMobile ? 'gap-2' : 'gap-4'}`}>
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900 truncate`}>
                            {assignment.tracker?.full_name || assignment.tracker?.username || 'Unknown Tracker'}
                          </div>
                          <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                            {assignment.assigned_event_types ? 
                              assignment.assigned_event_types.join(', ').replace(/_/g, ' ') : 
                              'No specific events assigned'
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                        <Badge 
                          className={`${getPriorityColor(assignment.priority)} ${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}
                        >
                          Priority {assignment.priority}
                        </Badge>
                        {assignment.is_specialized && (
                          <Badge 
                            variant="secondary" 
                            className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}
                          >
                            {isMobile ? 'Spec' : 'Specialized'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventAssignments;
