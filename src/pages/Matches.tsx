
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Eye, ListVideo } from 'lucide-react'; // Added Eye, ListVideo
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Interface for a match fetched from Supabase
interface Match {
  id: string; // UUID
  name?: string | null;
  description?: string | null;
  home_team_name: string;
  away_team_name: string;
  match_date?: string | null; // ISO string
  status: 'draft' | 'published' | 'live' | 'completed' | 'archived';
  created_at?: string; // ISO string
}

const MatchesPage: React.FC = () => {
  const { toast } = useToast();
  const { session } = useAuth(); // Use auth context
  const [publishedMatches, setPublishedMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublishedMatches = useCallback(async () => {
    if (!session) {
      setError("Please log in to view matches.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, match_date, status, created_at')
        .or('status.eq.published,status.eq.live') // Fetch both published and live matches
        .order('match_date', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }
      setPublishedMatches(data || []);
    } catch (err: any) {
      console.error('Error fetching published matches:', err);
      setError(err.message || 'Failed to fetch matches. Please try again.');
      toast({
        title: 'Error Fetching Matches',
        description: err.message || 'Could not load matches.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    fetchPublishedMatches();
  }, [fetchPublishedMatches]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">Available Matches</h1>
          {/* "New Match" button can be kept or removed based on broader app strategy.
              For now, it's assumed to link to a local match setup. */}
          <Button asChild>
            <Link to="/match" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Local Match
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListVideo /> Published & Live Matches</CardTitle>
            <CardDescription>Select a match to view details or start tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading matches...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p>{error}</p>
                <Button onClick={fetchPublishedMatches} className="mt-4">Try Again</Button>
              </div>
            ) : publishedMatches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No published or live matches available at the moment.</p>
                {/* Optional: Link to admin panel if user is admin for creating matches
                <Button asChild>
                  <Link to="/admin">Go to Admin Panel</Link>
                </Button> */}
              </div>
            ) : (
              <Table>
                <TableCaption>Select a match to view its details or start live tracking.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishedMatches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="font-medium">{match.name || `${match.home_team_name} vs ${match.away_team_name}`}</div>
                        {!match.name && <div className="text-xs text-muted-foreground">{`${match.home_team_name} vs ${match.away_team_name}`}</div>}
                      </TableCell>
                      <TableCell>
                        {match.match_date ? new Date(match.match_date).toLocaleString() : 'Not Set'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          match.status === 'live' ? 'destructive' :
                          match.status === 'published' ? 'default' :
                          'outline'
                        }>
                          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/match/${match.id}`} className="flex items-center gap-1">
                            <Eye className="h-4 w-4" /> View / Track
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchesPage;
