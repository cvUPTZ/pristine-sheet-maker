
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import AccessManagement from './AccessManagement';
import RealTimeMatchEvents from './RealTimeMatchEvents';
import UserManagement from './UserManagement';
import MatchManagement from './MatchManagement';
import EventAssignments from './EventAssignments';
import PlayerAssignments from './PlayerAssignments';
import AuditLogs from './AuditLogs';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6">Admin Panel</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 h-auto' : 'grid-cols-6 h-10'} gap-1 sm:gap-0`}>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Users
          </TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Matches
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            {isMobile ? 'Events' : 'Event Assignments'}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="players" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
                Player Assignments
              </TabsTrigger>
              <TabsTrigger value="access" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
                Access Management
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
                Audit
              </TabsTrigger>
            </>
          )}
          {isMobile && (
            <TabsTrigger value="more" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
              More
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="users" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="matches" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <MatchManagement />
        </TabsContent>

        <TabsContent value="events" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <EventAssignments />
        </TabsContent>

        {isMobile ? (
          <TabsContent value="more" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <Tabs defaultValue="players" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="players" className="text-xs">Players</TabsTrigger>
                <TabsTrigger value="access" className="text-xs">Access</TabsTrigger>
                <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
              </TabsList>
              
              <TabsContent value="players" className="space-y-4 mt-4">
                <PlayerAssignments />
              </TabsContent>
              
              <TabsContent value="access" className="space-y-4 mt-4">
                <AccessManagement />
              </TabsContent>
              
              <TabsContent value="audit" className="space-y-4 mt-4">
                <AuditLogs />
              </TabsContent>
            </Tabs>
          </TabsContent>
        ) : (
          <>
            <TabsContent value="players" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <PlayerAssignments />
            </TabsContent>
            
            <TabsContent value="access" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <AccessManagement />
            </TabsContent>

            <TabsContent value="audit" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <AuditLogs />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Admin;
