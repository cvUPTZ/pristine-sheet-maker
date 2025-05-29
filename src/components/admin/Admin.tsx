
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
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  referee: string | null;
  weather_conditions: string | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  pitch_conditions: string | null;
  attendance: number | null;
  competition: string | null;
  ball_tracking_data: any;
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type safe mapping to ensure created_at is never null
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="access" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="access">Access Management</TabsTrigger>
          <TabsTrigger value="matches">Match Management</TabsTrigger>
          <TabsTrigger value="events">Live Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value="access" className="space-y-4">
          <AccessManagement />
        </TabsContent>
        
        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading matches...</p>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{match.name || 'Unnamed Match'}</h3>
                          <p className="text-sm text-gray-600">
                            {match.home_team_name} vs {match.away_team_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status: {match.status} | Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'TBD'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {match.home_team_score ?? 0} - {match.away_team_score ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <RealTimeMatchEvents matchId={matches[0]?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
