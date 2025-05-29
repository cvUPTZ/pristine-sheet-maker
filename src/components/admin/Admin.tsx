
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import AccessManagement from './AccessManagement';
import RealTimeMatchEvents from './RealTimeMatchEvents';

interface Match {
  id: string;
  name: string | null;
  status: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_formation: string | null;
  away_team_formation: string | null;
  home_team_score: number | null;
  away_team_score: number | null;
  created_at: string;
  updated_at: string | null;
}

const Admin: React.FC = () => {
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
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = (data || []).map(match => ({
        ...match,
        created_at: match.created_at || new Date().toISOString()
      }));

      setMatches(typedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="access" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="access" className="text-xs sm:text-sm">Access Management</TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm">Match Management</TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm">Live Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value="access" className="space-y-4 mt-4">
          <AccessManagement />
        </TabsContent>
        
        <TabsContent value="matches" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Match Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {loading ? (
                <p className="text-center py-8">Loading matches...</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {matches.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No matches found</p>
                  ) : (
                    matches.map((match) => (
                      <div key={match.id} className="p-3 sm:p-4 border rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">
                              {match.name || 'Unnamed Match'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              {match.home_team_name} vs {match.away_team_name}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:gap-4 mt-1">
                              <p className="text-xs text-gray-500">
                                Status: <span className="font-medium">{match.status}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'TBD'}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right sm:text-left">
                            <p className="font-bold text-lg sm:text-xl">
                              {match.home_team_score ?? 0} - {match.away_team_score ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4 mt-4">
          <RealTimeMatchEvents matchId={matches[0]?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
