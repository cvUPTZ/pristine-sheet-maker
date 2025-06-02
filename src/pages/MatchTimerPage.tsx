
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MatchTimerControl from '@/components/match/MatchTimerControl';
import MatchTimer from '@/components/MatchTimer';
import { ArrowLeft, Users, Activity } from 'lucide-react';

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  match_date: string | null;
  status: string;
  timer_status?: string | null;
  timer_current_value?: number | null;
  timer_last_started_at?: string | null;
}

const MatchTimerPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectedTrackers, setConnectedTrackers] = useState<number>(0);

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
      setupRealtimeSubscription();
    }
  }, [matchId]);

  const fetchMatchData = async () => {
    if (!matchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      setMatch(data);
    } catch (error: any) {
      console.error('Error fetching match:', error);
      toast({
        title: 'Error Loading Match',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`match-timer-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          setMatch(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTimerStateChange = (state: 'running' | 'paused' | 'stopped', currentTime: number) => {
    // Timer state changes are handled by the MatchTimerControl component
    // This can be used for additional UI updates if needed
    if (state === 'running') {
      toast({
        title: 'Timer Started',
        description: 'All connected trackers have been notified'
      });
    }
  };

  const handleMatchEnd = () => {
    toast({
      title: 'Match Completed',
      description: 'Match report has been generated'
    });
    // Optionally redirect to match summary or stay on page
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading match data...
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
            <p className="text-gray-600 mb-4">The requested match could not be found.</p>
            <Button onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
            </h1>
            <p className="text-gray-600">
              {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date set'} • Status: {match.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            {connectedTrackers} Connected Trackers
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Activity className="h-4 w-4" />
            Live Match Control
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Control Panel */}
        <div className="lg:col-span-2">
          <MatchTimerControl
            matchId={matchId!}
            onTimerStateChange={handleTimerStateChange}
            onMatchEnd={handleMatchEnd}
          />
        </div>

        {/* Timer Display for Trackers View */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracker View Timer</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchTimer
                dbTimerValue={match.timer_current_value}
                timerStatus={match.timer_status}
                timerLastStartedAt={match.timer_last_started_at}
                timerPeriod="first_half"
                timerAddedTime={0}
              />
              <div className="mt-4 text-center text-sm text-gray-600">
                This is what trackers see on their devices
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Match Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Home Team:</span>
                <span className="font-medium">{match.home_team_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Away Team:</span>
                <span className="font-medium">{match.away_team_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date set'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium capitalize">{match.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connected Trackers:</span>
                <span className="font-medium">{connectedTrackers}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchTimerPage;
