
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';

const Matches = () => {
  const { userRole } = useAuth();
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

      const formattedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        name: match.name || undefined,
        matchDate: match.match_date || undefined,
        homeTeamName: match.home_team_name,
        awayTeamName: match.away_team_name,
        venue: match.location || undefined,
        status: match.status,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        home_team_formation: match.home_team_formation || undefined,
        away_team_formation: match.away_team_formation || undefined,
        match_date: match.match_date || undefined,
        location: match.location || undefined,
        created_at: match.created_at || undefined,
        updated_at: match.updated_at || undefined,
        created_by: match.created_by || undefined,
        description: match.description || undefined,
        match_type: match.match_type || undefined,
        timer_status: match.timer_status || undefined,
        timer_current_value: match.timer_current_value || undefined,
        timer_last_started_at: match.timer_last_started_at || undefined,
        home_team_score: match.home_team_score || undefined,
        away_team_score: match.away_team_score || undefined,
        competition: match.competition || undefined,
        notes: match.notes || undefined,
        home_team_players: match.home_team_players,
        away_team_players: match.away_team_players,
        match_statistics: match.match_statistics,
        ball_tracking_data: match.ball_tracking_data
      }));

      setMatches(formattedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match =>
    match.home_team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.away_team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (match.name && match.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500';
      case 'completed':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">
            View and manage football matches
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search matches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No matches found
          </div>
        ) : (
          filteredMatches.map((match) => (
            <Card key={match.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                  </CardTitle>
                  <Badge className={`${getStatusColor(match.status)} text-white`}>
                    {match.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{match.home_team_name} vs {match.away_team_name}</span>
                </div>

                {match.match_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(match.match_date).toLocaleDateString()}</span>
                  </div>
                )}

                {match.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{match.location}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/match-analysis-v2/${match.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Matches;
