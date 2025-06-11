
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';





interface Match {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string | null;
  created_at: string | null;
}

const Index = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchMatches = useCallback(async () => {
    setLoading(true); // Ensure loading is true at the start of fetch
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to fetch matches",
          variant: "destructive",
        });
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]); // Added toast as it's used inside

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]); // Now correctly depends on fetchMatches

  const handleMatchCreated = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);
    navigate(`/match/${newMatch.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      case 'scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Football Matches</h1>
      </div>

      {(userRole === 'admin' || userRole === 'tracker') && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Match</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateMatchForm onMatchSubmit={handleMatchCreated} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => (
          <Card key={match.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(match.status)}`}>
                  {match.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <strong>Teams:</strong> {match.home_team_name} vs {match.away_team_name}
                </div>
                {match.match_date && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Date:</strong> {new Date(match.match_date).toLocaleDateString()}
                  </div>
                )}
                <Button 
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="w-full mt-4"
                >
                  View Match
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {matches.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No matches found. Create your first match to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Index;
