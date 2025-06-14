import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import { LayoutDashboard, Play, Calendar, BarChart3, TrendingUp, Target, Loader2, Eye, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userRole } = useAuth();

  const menuItems = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' }
  ];

  if (userRole === 'admin' || userRole === 'tracker') {
    menuItems.push({ value: 'new-match', label: 'New Match', icon: Play, path: '/match' });
  }
  if (userRole === 'admin' || userRole === 'manager') {
    menuItems.push({ value: 'match-history', label: 'Match History', icon: Calendar, path: '/matches' });
  }
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') {
    menuItems.push({ value: 'statistics', label: 'Statistics', icon: BarChart3, path: '/statistics' });
  }
  if (userRole === 'admin' || userRole === 'manager') {
    menuItems.push({ value: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' });
  }
  if (userRole === 'admin') {
    menuItems.push({ value: 'admin', label: 'Admin Panel', icon: Target, path: '/admin' });
  }

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching matches:', error);
        throw error;
      }
      console.log('Fetched raw matches:', data);

      if (!data || !Array.isArray(data)) {
        setMatches([]);
        return; 
      }

      const processedMatches = data
        .filter(item => {
          if (item === null || typeof item !== 'object') {
            console.warn('Skipping invalid item from Supabase (null or not an object):', item);
            return false;
          }
          if (typeof item.id === 'undefined' || item.id === null || String(item.id).trim() === '') {
            console.warn('Skipping item from Supabase due to missing or invalid id:', item);
            return false;
          }
          return true;
        })
        .map(dbMatch => {
          return {
            ...dbMatch,
            id: String(dbMatch.id),
            home_team_name: dbMatch.home_team_name || 'N/A',
            away_team_name: dbMatch.away_team_name || 'N/A',
            match_date: dbMatch.match_date,
            status: (dbMatch.status || 'draft') as 'published' | 'draft' | 'live' | 'completed' | 'archived', 
          };
        });
      
      console.log('Processed matches to be set:', processedMatches);
      setMatches(processedMatches as Match[]);

    } catch (error: any) {
      console.error('Error in fetchMatches process:', error.message);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex w-full">
        <MatchAnalysisSidebar menuItems={menuItems} groupLabel="Navigation" />
        <SidebarInset>
          <div className="container mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <h1 className="text-3xl font-bold">Match History</h1>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Matches</CardTitle>
                  <CardDescription>Browse and manage all recorded matches.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Match</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.length > 0 ? (
                        matches.map((match) => (
                          <TableRow key={match.id}>
                            <TableCell>
                              <div className="font-medium">{match.home_team_name} vs {match.away_team_name}</div>
                              <div className="text-sm text-muted-foreground hidden md:inline">ID: {match.id}</div>
                            </TableCell>
                            <TableCell>
                              {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                                {match.status || 'draft'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Link to={`/match/${match.id}`}>
                                  <Button variant="outline" size="icon">
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View Match</span>
                                  </Button>
                                </Link>
                                <Link to={`/match/${match.id}/edit`}>
                                  <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Match</span>
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No matches found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Matches;
