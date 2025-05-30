
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Activity, Users, Zap } from 'lucide-react';
import { useRealtimeEventSync } from '@/hooks/useRealtimeEventSync';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchEvent {
  id: string;
  event_type: string;
  player_id: number | null;
  team: string | null;
  timestamp: number | null;
  created_at: string;
  created_by: string;
}

interface Match {
  id: string;
  name: string | null;
  status: string;
  home_team_name: string;
  away_team_name: string;
}

interface RealTimeMatchEventsProps {
  matchId?: string;
}

const RealTimeMatchEvents: React.FC<RealTimeMatchEventsProps> = ({ matchId }) => {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState<{ [key: string]: number }>({});

  // Real-time synchronization for the selected match
  const { isConnected, connectedTrackers } = useRealtimeEventSync({
    matchId: selectedMatchId,
    onEventReceived: (event) => {
      setEvents(prev => {
        // Avoid duplicates and add the new event at the top
        const exists = prev.some(e => e.id === event.id);
        if (exists) return prev;
        
        const newEvents = [event, ...prev];
        updateEventStats(newEvents);
        return newEvents;
      });
    }
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchEvents();
    }
  }, [selectedMatchId]);

  const updateEventStats = (eventList: MatchEvent[]) => {
    const stats: { [key: string]: number } = {};
    eventList.forEach(event => {
      stats[event.event_type] = (stats[event.event_type] || 0) + 1;
    });
    setEventStats(stats);
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          name,
          status,
          home_team_name,
          away_team_name
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = data || [];
      setMatches(typedMatches);
      
      if (!selectedMatchId && typedMatches.length > 0) {
        setSelectedMatchId(typedMatches[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!selectedMatchId) return;
    
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', selectedMatchId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const eventList = data || [];
      setEvents(eventList);
      updateEventStats(eventList);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    return date.toLocaleTimeString();
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'goal': return 'bg-green-100 text-green-800 border-green-200';
      case 'card': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'foul': return 'bg-red-100 text-red-800 border-red-200';
      case 'pass': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shot': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'save': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'corner': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'offside': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Loading live events...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Match Events
            {isConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{connectedTrackers.length} online</span>
            <Zap className="h-4 w-4" />
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No live matches found</p>
            <p className="text-gray-400 text-sm">Live matches will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Match Selector */}
            <div className="flex gap-2 flex-wrap">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 border ${
                    selectedMatchId === match.id
                      ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                </button>
              ))}
            </div>

            {/* Event Statistics */}
            {Object.keys(eventStats).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(eventStats).map(([eventType, count]) => (
                  <div key={eventType} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600 capitalize">{eventType}s</div>
                  </div>
                ))}
              </div>
            )}

            {/* Events List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No events recorded yet</p>
                    <p className="text-gray-400 text-sm">Events will appear here in real-time</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {events.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={`${getEventColor(event.event_type)} border`}>
                            {event.event_type}
                          </Badge>
                          <div>
                            <p className="font-medium">
                              {event.player_id ? `Player ${event.player_id}` : 'Team event'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Team: {event.team || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            {formatTimestamp(event.timestamp)}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeMatchEvents;
