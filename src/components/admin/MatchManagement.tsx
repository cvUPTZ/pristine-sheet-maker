
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Match } from '@/types';

const MatchManagement: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

      // Transform the data to match our Match interface
      const transformedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        name: match.name || `${match.home_team_name} vs ${match.away_team_name}`,
        status: match.status,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        home_team_formation: match.home_team_formation,
        away_team_formation: match.away_team_formation,
        match_date: match.match_date,
        location: match.location,
        created_at: match.created_at,
        updated_at: match.updated_at || undefined,
        created_by: match.created_by,
        description: match.description,
        match_type: match.match_type,
        timer_status: match.timer_status,
        timer_current_value: match.timer_current_value,
        timer_last_started_at: match.timer_last_started_at,
        home_team_score: match.home_team_score,
        away_team_score: match.away_team_score,
        competition: match.competition,
        notes: match.notes,
        home_team_players: match.home_team_players,
        away_team_players: match.away_team_players,
        match_statistics: match.match_statistics,
        ball_tracking_data: match.ball_tracking_data
      }));

      setMatches(transformedMatches);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      setMatches(matches.filter(match => match.id !== matchId));
      toast.success('Match deleted successfully');
    } catch (error: any) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const filteredMatches = matches.filter(match =>
    match.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.home_team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.away_team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'live': 'default',
      'completed': 'secondary',
      'scheduled': 'outline',
      'draft': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Loading matches...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Match Management</CardTitle>
          <Link to="/create-match">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Match
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search matches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-2">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{match.name}</h3>
                    {getStatusBadge(match.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {match.home_team_name} vs {match.away_team_name}
                  </div>
                  {match.match_date && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Link to={`/match/${match.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Link to={`/edit-match/${match.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMatch(match.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {filteredMatches.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No matches found matching your search.' : 'No matches created yet.'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchManagement;
