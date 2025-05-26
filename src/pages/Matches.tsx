
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedMatches = data?.map(match => ({
        ...match,
        status: match.status as 'published' | 'draft' | 'live' | 'completed' | 'archived'
      })) || [];
      
      setMatches(typedMatches);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  if (isLoading) {
    return <div>Loading matches...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Matches</h1>
      
      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No matches found.</p>
          </CardContent>
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
                  <Badge variant={match.status === 'published' ? 'secondary' : 'outline'}>{match.status}</Badge>
                  <Link to={`/match/${match.id}`}>
                    <Button>View Match</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
