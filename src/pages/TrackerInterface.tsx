import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Users, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string;
}

const TrackerInterface: React.FC = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveMatches();
    
    // Subscribe to match updates
    const channel = supabase
      .channel('tracker-match-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.live'
        },
        () => {
          fetchLiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, home_team_name, away_team_name, status, match_date')
        .eq('status', 'live');

      if (error) throw error;

      // Convert to LiveMatch format
      const liveMatchesData: LiveMatch[] = (data || []).map(match => ({
        id: match.id,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        status: match.status,
        match_date: match.match_date || new Date().toISOString()
      }));

      setLiveMatches(liveMatchesData);
    } catch (error: any) {
      console.error('Error fetching live matches:', error);
      toast.error('Failed to fetch live matches');
    } finally {
      setIsLoading(false);
    }
  };

  const joinMatch = (matchId: string) => {
    navigate(`/match/${matchId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading live matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracker Interface</h1>
          <p className="text-gray-600">Welcome {user?.email}, join live matches to start tracking</p>
        </div>

        {liveMatches.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Live Matches</h3>
              <p className="text-gray-600">There are currently no live matches available for tracking.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 text-sm font-medium">LIVE</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {match.home_team_name}
                    </h3>
                    <p className="text-gray-500 text-sm my-2">vs</p>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {match.away_team_name}
                    </h3>
                  </div>
                  
                  {match.match_date && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {new Date(match.match_date).toLocaleDateString()}
                    </div>
                  )}

                  <Button 
                    onClick={() => joinMatch(match.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Join Match
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Card className="text-center p-6">
            <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Tracking</h3>
            <p className="text-sm text-gray-600">Track match events in real-time with instant synchronization</p>
          </Card>
          
          <Card className="text-center p-6">
            <Users className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
            <p className="text-sm text-gray-600">Work together with other trackers on the same match</p>
          </Card>
          
          <Card className="text-center p-6">
            <Play className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <h3 className="font-semibold text-gray-900 mb-2">Simple Interface</h3>
            <p className="text-sm text-gray-600">Focus on tracking with our streamlined, distraction-free interface</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackerInterface;
