
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
import { useIsMobile, useBreakpoint } from '@/hooks/use-mobile';
import useBatteryMonitor from '@/hooks/useBatteryMonitor';

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
  const isMobile = useIsMobile();
  const isSmall = useBreakpoint('sm');
  const isMedium = useBreakpoint('md');

  // Call the battery monitor hook
  useBatteryMonitor(user?.id);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className={`animate-spin mx-auto mb-4 text-blue-600 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
          <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>Loading live matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className={`font-bold text-gray-900 mb-2 ${
            isMobile ? 'text-xl sm:text-2xl' : 'text-2xl md:text-3xl'
          }`}>
            Tracker Interface
          </h1>
          <p className={`text-gray-600 px-2 ${
            isMobile ? 'text-xs sm:text-sm' : 'text-sm md:text-base'
          }`}>
            Welcome {user?.email}, join live matches to start tracking
          </p>
        </div>

        {liveMatches.length === 0 ? (
          <Card className="text-center py-8 sm:py-12 mx-2 sm:mx-0">
            <CardContent className="p-4 sm:p-6">
              <AlertCircle className={`mx-auto mb-4 text-gray-400 ${
                isMobile ? 'h-12 w-12' : 'h-16 w-16'
              }`} />
              <h3 className={`font-semibold text-gray-900 mb-2 ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>
                No Live Matches
              </h3>
              <p className={`text-gray-600 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                There are currently no live matches available for tracking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${
            isMobile 
              ? 'grid-cols-1' 
              : isSmall 
                ? 'grid-cols-1 sm:grid-cols-2' 
                : 'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {liveMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className={`pb-2 sm:pb-3 ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
                  <CardTitle className={`flex items-center gap-2 ${
                    isMobile ? 'text-base' : 'text-lg'
                  }`}>
                    <Users className={`text-green-600 ${
                      isMobile ? 'h-4 w-4' : 'h-5 w-5'
                    }`} />
                    <span className={`text-green-600 font-medium ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>
                      LIVE
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 sm:space-y-4 ${
                  isMobile ? 'p-3 pt-0' : 'p-4 sm:p-6 pt-0'
                }`}>
                  <div className="text-center">
                    <h3 className={`font-semibold text-gray-900 ${
                      isMobile ? 'text-sm' : 'text-base lg:text-lg'
                    }`}>
                      {match.home_team_name}
                    </h3>
                    <p className={`text-gray-500 my-1 sm:my-2 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>
                      vs
                    </p>
                    <h3 className={`font-semibold text-gray-900 ${
                      isMobile ? 'text-sm' : 'text-base lg:text-lg'
                    }`}>
                      {match.away_team_name}
                    </h3>
                  </div>
                  
                  {match.match_date && (
                    <div className={`flex items-center justify-center gap-2 text-gray-600 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>
                      <Calendar className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      {new Date(match.match_date).toLocaleDateString()}
                    </div>
                  )}

                  <Button 
                    onClick={() => joinMatch(match.id)}
                    className={`w-full bg-green-600 hover:bg-green-700 text-white font-medium ${
                      isMobile 
                        ? 'py-2 text-sm h-8' 
                        : 'py-2 sm:py-3 text-sm sm:text-base h-9 sm:h-11'
                    }`}
                    size={isMobile ? "sm" : "lg"}
                  >
                    <Play className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
                    Join Match
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className={`mt-8 sm:mt-12 grid gap-3 sm:gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : isSmall 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
              : 'md:grid-cols-3'
        }`}>
          <Card className={`text-center ${isMobile ? 'p-4' : 'p-4 sm:p-6'}`}>
            <Clock className={`mx-auto mb-3 sm:mb-4 text-blue-600 ${
              isMobile ? 'h-8 w-8' : 'h-10 w-10 sm:h-12 sm:w-12'
            }`} />
            <h3 className={`font-semibold text-gray-900 mb-2 ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              Real-time Tracking
            </h3>
            <p className={`text-gray-600 ${
              isMobile ? 'text-xs leading-relaxed' : 'text-sm'
            }`}>
              Track match events in real-time with instant synchronization
            </p>
          </Card>
          
          <Card className={`text-center ${isMobile ? 'p-4' : 'p-4 sm:p-6'}`}>
            <Users className={`mx-auto mb-3 sm:mb-4 text-green-600 ${
              isMobile ? 'h-8 w-8' : 'h-10 w-10 sm:h-12 sm:w-12'
            }`} />
            <h3 className={`font-semibold text-gray-900 mb-2 ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              Team Collaboration
            </h3>
            <p className={`text-gray-600 ${
              isMobile ? 'text-xs leading-relaxed' : 'text-sm'
            }`}>
              Work together with other trackers on the same match
            </p>
          </Card>
          
          <Card className={`text-center ${isMobile ? 'p-4' : 'p-4 sm:p-6'} ${
            isMobile && !isSmall ? 'sm:col-span-2 sm:mx-auto sm:max-w-sm' : ''
          }`}>
            <Play className={`mx-auto mb-3 sm:mb-4 text-purple-600 ${
              isMobile ? 'h-8 w-8' : 'h-10 w-10 sm:h-12 sm:w-12'
            }`} />
            <h3 className={`font-semibold text-gray-900 mb-2 ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              Simple Interface
            </h3>
            <p className={`text-gray-600 ${
              isMobile ? 'text-xs leading-relaxed' : 'text-sm'
            }`}>
              Focus on tracking with our streamlined, distraction-free interface
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackerInterface;
