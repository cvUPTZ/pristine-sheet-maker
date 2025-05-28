import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player, Statistics, BallTrackingPoint } from '@/types'; // Assuming Match type is correctly defined
import { ArrowLeft, Plus } from 'lucide-react';

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // console.log("Matches.tsx: Component mounted. Fetching matches.");
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    // console.log("Matches.tsx: fetchMatches initiated.");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*') // Fetches all columns
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Matches.tsx: Supabase error fetching matches:', error);
        toast({
          title: "Error Fetching Matches",
          description: error.message || "Could not load matches from the server.",
          variant: "destructive",
        });
        setMatches([]);
        return; // Exit early on error
      }

      // console.log('Matches.tsx: Raw data from Supabase:', data);

      if (!data) {
        console.warn('Matches.tsx: No data array received from Supabase for matches.');
        setMatches([]);
        // setLoading(false); // Done in finally
        return;
      }

      const typedMatches: Match[] = data
        .filter(match => match != null) // Add a filter for null/undefined match objects from the DB
        .map(match => {
          // Defensive typing and defaults
          const homePlayers = Array.isArray(match.home_team_players)
            ? (match.home_team_players as Player[]) // Assuming direct cast is safe or further validation happens in Player type
            : [];
          const awayPlayers = Array.isArray(match.away_team_players)
            ? (match.away_team_players as Player[])
            : [];
          const stats = match.match_statistics && typeof match.match_statistics === 'object' && !Array.isArray(match.match_statistics)
            ? (match.match_statistics as Statistics)
            : undefined; // Or a default Statistics object
          const ballTracking = Array.isArray(match.ball_tracking_data)
            ? (match.ball_tracking_data as BallTrackingPoint[])
            : [];

          const statusValue = match.status as string; // Cast to string first for includes check
          const validStatuses = ["published", "draft", "live", "completed", "archived", "pending", "pending_live", "upcoming", "postponed", "cancelled"];
          const finalStatus = validStatuses.includes(statusValue) ? statusValue : "draft";

          return {
            ...match, // Spread all other properties from Supabase
            id: String(match.id), // Ensure ID is a string if your Match type expects string
            name: match.name || `Match on ${new Date(match.match_date || match.created_at).toLocaleDateString()}`, // Provide a default for match.name if it can be null
            home_team_name: match.home_team_name || "Home Team (TBD)",
            away_team_name: match.away_team_name || "Away Team (TBD)",
            home_team_players: homePlayers,
            away_team_players: awayPlayers,
            match_statistics: stats,
            ball_tracking_data: ballTracking,
            status: finalStatus as Match['status'], // Cast back to the specific status type
            match_date: match.match_date || new Date().toISOString(), // Ensure match_date is always present
            created_at: match.created_at || new Date().toISOString(), // Ensure created_at is always present
            // Ensure all other required fields from Match type have fallbacks or are handled
          } as Match; // Explicitly cast to Match type
        });

      // console.log('Matches.tsx: Processed typedMatches:', typedMatches);
      setMatches(typedMatches);

    } catch (error: any) {
      console.error('Matches.tsx: Error during match processing:', error);
      toast({
        title: "Processing Error",
        description: error.message || "An unexpected error occurred while processing match data.",
        variant: "destructive",
      });
      setMatches([]);
    } finally {
      setLoading(false);
      // console.log("Matches.tsx: fetchMatches completed.");
    }
  };

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
          {(userRole === 'admin') && (
            <Button asChild>
              <Link to="/admin" className="flex items-center gap-2"> {/* Ensure this navigates to where CreateMatchForm is hosted */}
                <Plus className="h-4 w-4" />
                Create Match
              </Link>
            </Button>
          )}
        </div>

        {matches.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No matches found.</p>
            {(userRole === 'admin') && (
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
                  {/* Accessing match.name here - ensure it's defined by fetchMatches */}
                  <CardTitle>{match.name || `${match.home_team_name} vs ${match.away_team_name}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Teams: {match.home_team_name} vs {match.away_team_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Not specified'}
                    </p>
                    <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                      {String(match.status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                    </Badge>
                    <div className="pt-2">
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
