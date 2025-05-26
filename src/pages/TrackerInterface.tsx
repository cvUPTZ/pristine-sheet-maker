
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Flag, 
  Users, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Award, 
  Circle,
  RotateCcw,
  Bookmark,
  CornerDownRight,
  Square,
  Trophy,
  Shuffle,
  Crosshair,
  Eye,
  Play,
  Pause,
  SquareStop
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { EventType } from '@/types';

interface TrackerMatch {
  id: string;
  name: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
}

const TrackerInterface: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [match, setMatch] = useState<TrackerMatch | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

  useEffect(() => {
    if (!matchId) return;
    
    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, status')
        .eq('id', matchId)
        .single();
        
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load match data",
          variant: "destructive"
        });
        return;
      }
      
      setMatch(data);
    };
    
    fetchMatch();
  }, [matchId]);

  const handleEventClick = async (eventType: EventType) => {
    if (!match || !user) return;

    try {
      const { error } = await supabase
        .from('match_events')
        .insert({
          match_id: matchId,
          event_type: eventType,
          team: selectedTeam,
          timestamp: Date.now(),
          created_by: user.id,
          coordinates: { x: 50, y: 50 }
        });

      if (error) throw error;

      toast({
        title: "Event Recorded",
        description: `${eventType} recorded for ${selectedTeam} team`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to record event: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const eventButtons = [
    { type: 'pass' as EventType, icon: Circle, label: 'Pass', color: 'bg-blue-500' },
    { type: 'shot' as EventType, icon: Target, label: 'Shot', color: 'bg-red-500' },
    { type: 'goal' as EventType, icon: Trophy, label: 'Goal', color: 'bg-green-500' },
    { type: 'foul' as EventType, icon: AlertTriangle, label: 'Foul', color: 'bg-yellow-500' },
    { type: 'tackle' as EventType, icon: ShieldCheck, label: 'Tackle', color: 'bg-purple-500' },
    { type: 'corner' as EventType, icon: CornerDownRight, label: 'Corner', color: 'bg-orange-500' },
    { type: 'offside' as EventType, icon: Flag, label: 'Offside', color: 'bg-pink-500' },
    { type: 'yellowCard' as EventType, icon: Bookmark, label: 'Yellow Card', color: 'bg-yellow-600' },
    { type: 'redCard' as EventType, icon: Square, label: 'Red Card', color: 'bg-red-600' },
    { type: 'substitution' as EventType, icon: Shuffle, label: 'Substitution', color: 'bg-indigo-500' },
    { type: 'free-kick' as EventType, icon: Zap, label: 'Free Kick', color: 'bg-cyan-500' },
    { type: 'penalty' as EventType, icon: Crosshair, label: 'Penalty', color: 'bg-emerald-500' }
  ];

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Match...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Match Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {match.home_team_name} vs {match.away_team_name}
            </CardTitle>
            <div className="flex justify-center items-center gap-4">
              <Badge variant={match.status === 'live' ? 'default' : 'secondary'}>
                {match.status}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant={selectedTeam === 'home' ? 'default' : 'outline'}
                  onClick={() => setSelectedTeam('home')}
                  size="sm"
                >
                  {match.home_team_name}
                </Button>
                <Button
                  variant={selectedTeam === 'away' ? 'default' : 'outline'}
                  onClick={() => setSelectedTeam('away')}
                  size="sm"
                >
                  {match.away_team_name}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Event Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {eventButtons.map((event) => {
            const IconComponent = event.icon;
            return (
              <Button
                key={event.type}
                onClick={() => handleEventClick(event.type)}
                className={`h-24 flex flex-col items-center justify-center gap-2 text-white ${event.color} hover:opacity-90`}
                size="lg"
              >
                <IconComponent className="h-8 w-8" />
                <span className="text-sm font-medium">{event.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Control Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            size="lg"
          >
            Back to Dashboard
          </Button>
          <Button
            variant={isTracking ? 'destructive' : 'default'}
            onClick={() => setIsTracking(!isTracking)}
            size="lg"
          >
            {isTracking ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Stop Tracking
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Tracking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackerInterface;
