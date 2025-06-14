
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import { LayoutDashboard, Play, Calendar, BarChart3, TrendingUp, Target, Loader2 } from 'lucide-react';

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
            ) : matches.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No matches found or available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((match) => {
                  console.log('Rendering match card for:', match);
                  return (
                    <Card key={match.id}>
                      <CardHeader>
                        <CardTitle>{match.home_team_name} vs {match.away_team_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Not specified'}
                          </p>
                          <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                            {match.status || 'Unknown Status'}
                          </Badge>
                          <div className="pt-2 space-y-2">
                            <Link to={`/match/${match.id}`}>
                              <Button variant="default" size="sm" className="w-full">View Match</Button>
                            </Link>
                            <Link to={`/match/${match.id}/edit`}>
                              <Button variant="outline" size="sm" className="w-full">Edit Match</Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Matches;
