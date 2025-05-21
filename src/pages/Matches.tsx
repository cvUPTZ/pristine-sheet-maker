
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface SavedMatch {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  date: string;
  elapsedTime: number;
  statistics: {
    shots?: {
      home?: { onTarget?: number };
      away?: { onTarget?: number };
    };
  };
}

const Matches: React.FC = () => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  
  useEffect(() => {
    loadSavedMatches();
  }, []);
  
  const loadSavedMatches = () => {
    const savedMatches: SavedMatch[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('efootpad_match_')) {
        try {
          const matchData = JSON.parse(localStorage.getItem(key) || '{}');
          savedMatches.push({
            id: matchData.matchId,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            date: new Date(matchData.date).toLocaleString(),
            elapsedTime: matchData.elapsedTime,
            statistics: matchData.statistics
          });
        } catch (error) {
          console.error('Error parsing match data:', error);
        }
      }
    }
    
    // Sort by date (newest first)
    savedMatches.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setMatches(savedMatches);
  };
  
  const deleteMatch = (id: string) => {
    try {
      localStorage.removeItem(`efootpad_match_${id}`);
      loadSavedMatches();
      
      toast({
        title: 'Match Deleted',
        description: 'The match has been removed successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete match',
        variant: 'destructive'
      });
    }
  };
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">Match History</h1>
          <Button asChild>
            <Link to="/match" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Match
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Matches</CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No matches have been recorded yet</p>
                <Button asChild>
                  <Link to="/match">Record First Match</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => {
                    const homeGoals = match.statistics?.shots?.home?.onTarget || 0;
                    const awayGoals = match.statistics?.shots?.away?.onTarget || 0;
                    
                    return (
                      <TableRow key={match.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(match.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {homeGoals} - {awayGoals}
                        </TableCell>
                        <TableCell>
                          {formatDuration(match.elapsedTime)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/match/${match.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => deleteMatch(match.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Matches;
