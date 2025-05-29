
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Match } from '@/types';

const MatchManagement: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

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
          home_team_players,
          away_team_players,
          location,
          competition,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = (data || []).map(match => ({
        ...match,
        venue: match.location, // Map location to venue for compatibility
        created_at: match.created_at || new Date().toISOString(),
        home_team_players: match.home_team_players || [],
        away_team_players: match.away_team_players || []
      }));

      setMatches(typedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading matches...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Match Management
          </CardTitle>
          <Button className="bg-gray-900 text-white hover:bg-gray-800">
            Create New Match
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{match.name || 'Untitled Match'}</h3>
                  <p className="text-sm text-gray-600">
                    {match.home_team_name} vs {match.away_team_name}
                  </p>
                </div>
                <Badge className={getStatusBadgeColor(match.status)}>
                  {match.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {match.match_date 
                    ? new Date(match.match_date).toLocaleDateString() 
                    : 'No date set'
                  }
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  {match.home_team_formation || 'No formation'} vs {match.away_team_formation || 'No formation'}
                </div>
                {match.venue && (
                  <div className="text-sm text-gray-600">
                    📍 {match.venue}
                  </div>
                )}
              </div>

              {(match.home_team_score !== null || match.away_team_score !== null) && (
                <div className="mb-3">
                  <div className="text-lg font-semibold">
                    Score: {match.home_team_score || 0} - {match.away_team_score || 0}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteMatch(match.id)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
          
          {matches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No matches found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchManagement;
