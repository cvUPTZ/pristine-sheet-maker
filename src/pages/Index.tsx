import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import { Loader2 } from 'lucide-react';
import { usePermissionChecker } from '@/hooks/usePermissionChecker';
import { useMenuItems } from '@/hooks/useMenuItems';






interface Match {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string | null;
  created_at: string | null;
}

const Index: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  
  // Add error boundary for permission checker
  const permissionChecker = usePermissionChecker();
  const { 
    isLoading: permissionsLoading, 
    hasPermission,
    permissions,
    role
  } = permissionChecker || {
    isLoading: true,
    hasPermission: () => false,
    permissions: null,
    role: null
  };
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const menuItems = useMenuItems();

  console.log('Index component - permissions state:', {
    permissionsLoading,
    permissions,
    role,
    hasVideoAnalysis: hasPermission('canAnalyzeVideos'),
    hasStatistics: hasPermission('canViewStatistics'),
    hasAnalytics: hasPermission('canViewAnalytics'),
    hasMatchManagement: hasPermission('canCreateMatches')
  });

  const fetchMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to fetch matches",
          variant: "destructive",
        });
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    } finally {
      setMatchesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleMatchCreated = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);
    navigate(`/match/${newMatch.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      case 'scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const isLoading = matchesLoading || permissionsLoading;
  const canCreateMatch = hasPermission('canCreateMatches');

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex w-full">
        <MatchAnalysisSidebar menuItems={menuItems} groupLabel="Navigation" />
        <SidebarInset>
          <div className="container mx-auto max-w-6xl px-2 sm:px-4 py-4 space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <SidebarTrigger />
              <h1 className="text-2xl sm:text-3xl font-bold">Football Matches</h1>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {canCreateMatch && (
                  <Card className="mb-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg">Create New Match</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <CreateMatchForm onMatchSubmit={handleMatchCreated} />
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((match) => (
                    <Card 
                      key={match.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-0 pt-4 px-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base sm:text-lg">
                            {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                          </CardTitle>
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2 pb-4 px-4">
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            <strong>Teams:</strong> {match.home_team_name} vs {match.away_team_name}
                          </div>
                          {match.match_date && (
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              <strong>Date:</strong> {new Date(match.match_date).toLocaleDateString()}
                            </div>
                          )}
                          <Button 
                            onClick={() => navigate(`/match/${match.id}`)}
                            className="w-full mt-3"
                            size="sm"
                          >
                            View Match
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {matches.length === 0 && !isLoading && (
                  <Card>
                    <CardContent className="text-center py-6">
                      <p className="text-muted-foreground text-sm sm:text-base">No matches found. Create your first match to get started!</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
