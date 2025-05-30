
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Match } from '@/types';

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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to Match type
      const transformedMatches: Match[] = (data || []).map(match => ({
        ...match,
        homeTeamName: match.home_team_name,
        awayTeamName: match.away_team_name,
        homeTeamFormation: match.home_team_formation || undefined,
        awayTeamFormation: match.away_team_formation || undefined,
        matchDate: match.match_date || undefined,
        venue: match.location || undefined,
        homeTeam: {
          id: 'home',
          name: match.home_team_name,
          formation: (match.home_team_formation as any) || '4-4-2',
          players: []
        },
        awayTeam: {
          id: 'away', 
          name: match.away_team_name,
          formation: (match.away_team_formation as any) || '4-3-3',
          players: []
        }
      }));

      setMatches(transformedMatches);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      toast.success('Match deleted successfully');
      fetchMatches();
    } catch (error: any) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading matches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Match Management</h2>
        <Button onClick={() => navigate('/create-match')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Match
        </Button>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => (
          <Card key={match.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {match.name || `${match.homeTeamName} vs ${match.awayTeamName}`}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getStatusBadgeVariant(match.status)}>
                      {match.status}
                    </Badge>
                    {match.matchDate && (
                      <span className="text-sm text-gray-500">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/edit-match/${match.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMatch(match.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Home:</span> {match.homeTeamName}
                  {match.homeTeamFormation && (
                    <span className="text-gray-500"> ({match.homeTeamFormation})</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Away:</span> {match.awayTeamName}
                  {match.awayTeamFormation && (
                    <span className="text-gray-500"> ({match.awayTeamFormation})</span>
                  )}
                </div>
                {match.venue && (
                  <div className="col-span-2">
                    <span className="font-medium">Venue:</span> {match.venue}
                  </div>
                )}
                {match.description && (
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span> {match.description}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {matches.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No matches found</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/create-match')}
              >
                Create your first match
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MatchManagement;
