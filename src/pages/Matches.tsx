import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player, Statistics } from '@/types';
import { ArrowLeft, Plus, Play, Pause, RotateCcw, Eye, Edit, Trash2, Calendar, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to load matches",
          variant: "destructive",
        });
        return;
      }

      // Safely convert the data with proper type handling
      const typedMatches: Match[] = data.map(match => ({
        ...match,
        home_team_players: Array.isArray(match.home_team_players) 
          ? (match.home_team_players as unknown as Player[])
          : [],
        away_team_players: Array.isArray(match.away_team_players) 
          ? (match.away_team_players as unknown as Player[])
          : [],
        match_statistics: match.match_statistics && typeof match.match_statistics === 'object'
          ? (match.match_statistics as unknown as Statistics)
          : undefined,
        ball_tracking_data: Array.isArray(match.ball_tracking_data) 
          ? match.ball_tracking_data 
          : []
      }));

      setMatches(typedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ... keep existing code (deleteMatch, getStatusColor, getStatusText functions)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Matches</h1>
          </div>
          {(userRole === 'admin' || userRole === 'coach') && (
            <Button asChild>
              <Link to="/admin" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Match
              </Link>
            </Button>
          )}
        </div>

        {matches.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No matches found.</p>
            {(userRole === 'admin' || userRole === 'coach') && (
              <Button asChild>
                <Link to="/admin">Create your first match</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <CardTitle>{match.home_team_name} vs {match.away_team_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Not specified'}
                    </p>
                    {/* Ensure match.status has a value; if it can be undefined, handle that for Badge */}
                    <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                      {match.status || 'Unknown Status'}
                    </Badge>
                    <div className="pt-2"> {/* Added some padding for the button */}
                      <Link to={`/match/${match.id}`}>
                        <Button variant="default" size="sm">View Match</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
