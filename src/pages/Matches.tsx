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
  const { user, userRole } = useAuth(); // Assuming user and userRole are used for conditional rendering/logic
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Matches.tsx: useEffect triggered, calling fetchMatches.");
    fetchMatches();
  }, []); // Empty dependency array means this runs once on mount

  const fetchMatches = async () => {
    console.log("Matches.tsx: fetchMatches called.");
    setLoading(true); // Ensure loading is true at the start of fetching
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*') // Select all columns
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Matches.tsx: Error fetching matches from Supabase:', JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: "Failed to load matches",
          variant: "destructive",
        });
        setMatches([]); // Clear matches on error
        return;
      }

      console.log('Matches.tsx: Raw data received from Supabase:', JSON.stringify(data, null, 2));

      if (!data) {
        console.warn('Matches.tsx: No data received from Supabase for matches, but no explicit error.');
        setMatches([]);
        setLoading(false);
        return;
      }

      // Safely convert the data with proper type handling
      const typedMatches: Match[] = data.map(match => {
        // Log each raw match object before transformation
        // console.log('Matches.tsx: Processing raw match for typing:', JSON.stringify(match, null, 2));
        
        const homePlayers = Array.isArray(match.home_team_players) 
          ? (match.home_team_players as unknown as Player[])
          : [];
        const awayPlayers = Array.isArray(match.away_team_players) 
          ? (match.away_team_players as unknown as Player[])
          : [];
        const stats = match.match_statistics && typeof match.match_statistics === 'object' && !Array.isArray(match.match_statistics)
          ? (match.match_statistics as unknown as Statistics)
          : undefined;
        const ballTracking = Array.isArray(match.ball_tracking_data) 
          ? (match.ball_tracking_data as unknown as BallTrackingPoint[])
          : [];
        
        // Ensure 'status' has a default if it's missing or not one of the expected values
        const statusValue = (match.status as "published" | "draft" | "live" | "completed" | "archived");
        const validStatuses = ["published", "draft", "live", "completed", "archived", "pending", "pending_live", "upcoming", "postponed", "cancelled"]; // Add all known statuses
        const finalStatus = validStatuses.includes(statusValue) ? statusValue : "draft"; // Default to 'draft' if unknown or null

        return {
          ...match, // Spread all properties from the Supabase row
          id: match.id, // Ensure id is explicitly carried over if needed by Match type
          home_team_name: match.home_team_name || "N/A", // Add fallbacks for critical display fields
          away_team_name: match.away_team_name || "N/A",
          home_team_players: homePlayers,
          away_team_players: awayPlayers,
          match_statistics: stats,
          ball_tracking_data: ballTracking,
          status: finalStatus,
        };
      });

      console.log('Matches.tsx: Typed matches after mapping:', JSON.stringify(typedMatches, null, 2));
      setMatches(typedMatches);

    } catch (error: any) { // Catch any other errors during processing
      console.error('Matches.tsx: Catch block error during fetchMatches:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while loading matches.",
        variant: "destructive",
      });
      setMatches([]); // Clear matches on unexpected error
    } finally {
      setLoading(false);
      console.log("Matches.tsx: fetchMatches finished, loading set to false.");
    }
  };

  // Log state before rendering
  console.log("Matches.tsx: Rendering component. Loading state:", loading, "Matches count:", matches.length);
  // console.log("Matches.tsx: Current matches state:", JSON.stringify(matches, null, 2)); // Can be very verbose

  if (loading) {
    console.log("Matches.tsx: Rendering loading state.");
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
              <Link to="/admin" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Match
              </Link>
            </Button>
          )}
        </div>

        {matches.length === 0 ? (
          <>
            {console.log("Matches.tsx: Rendering 'No matches found' state.")}
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No matches found.</p>
              {(userRole === 'admin') && (
                <Button asChild>
                  <Link to="/admin">Create your first match</Link>
                </Button>
              )}
            </Card>
          </>
        ) : (
          <>
            {console.log(`Matches.tsx: Rendering list of ${matches.length} matches.`)}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match, index) => {
                // console.log(`Matches.tsx: Rendering match item ${index + 1}:`, JSON.stringify(match, null, 2));
                return (
                  <Card key={match.id}>
                    <CardHeader>
                      {/* Ensure match.home_team_name and match.away_team_name are always strings or have fallbacks */}
                      <CardTitle>{match.home_team_name || 'N/A'} vs {match.away_team_name || 'N/A'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Not specified'}
                        </p>
                        <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                          {/* Ensure match.status is always a string or has a fallback */}
                          {String(match.status) || 'Unknown Status'}
                        </Badge>
                        <div className="pt-2">
                          <Link to={`/match/${match.id}`}>
                            <Button variant="default" size="sm">View Match</Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Matches;
