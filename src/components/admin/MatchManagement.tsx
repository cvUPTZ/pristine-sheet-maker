import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player } from '@/types';
import { toast } from 'sonner';
import { Trash2, Edit, Eye, Plus } from 'lucide-react';

const MatchManagement: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          name,
          status,
          match_date,
          home_team_name,
          away_team_name,
          home_team_formation,
          away_team_formation,
          home_team_score,
          away_team_score,
          location,
          competition,
          home_team_players,
          away_team_players,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = (data || []).map(match => ({
        ...match,
        name: match.name || `${match.home_team_name} vs ${match.away_team_name}`,
        created_at: match.created_at || new Date().toISOString(),
        updated_at: match.updated_at || undefined, // Convert null to undefined
        venue: match.location || undefined,
        home_team_players: parsePlayerData(match.home_team_players),
        away_team_players: parsePlayerData(match.away_team_players)
      }));

      setMatches(typedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const parsePlayerData = (data: any): Player[] => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.filter(match => match.id !== matchId));
      toast.success('Match deleted successfully');
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'destructive';
      case 'completed':
        return 'secondary';
      case 'scheduled':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="p-4">Loading matches...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Match Management</h2>
        <Button 
          onClick={() => navigate('/create-match')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Match
        </Button>
      </div>

      <div className="grid gap-4">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No matches found</p>
              <Button 
                onClick={() => navigate('/create-match')}
                className="mt-4"
              >
                Create your first match
              </Button>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {match.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getStatusBadgeVariant(match.status)}>
                        {match.status}
                      </Badge>
                      {match.match_date && (
                        <span className="text-sm text-gray-500">
                          {new Date(match.match_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/match/${match.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/edit-match/${match.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMatch(match.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Home:</span>
                    <br />
                    {match.home_team_name}
                    {match.home_team_formation && (
                      <span className="text-gray-500"> ({match.home_team_formation})</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Away:</span>
                    <br />
                    {match.away_team_name}
                    {match.away_team_formation && (
                      <span className="text-gray-500"> ({match.away_team_formation})</span>
                    )}
                  </div>
                  {match.location && (
                    <div>
                      <span className="font-medium">Location:</span>
                      <br />
                      {match.location}
                    </div>
                  )}
                  {match.competition && (
                    <div>
                      <span className="font-medium">Competition:</span>
                      <br />
                      {match.competition}
                    </div>
                  )}
                </div>
                {(match.home_team_score !== null || match.away_team_score !== null) && (
                  <div className="mt-4 text-center">
                    <span className="text-lg font-bold">
                      {match.home_team_score || 0} - {match.away_team_score || 0}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MatchManagement;
