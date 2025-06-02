import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import AccessManagement from '@/components/admin/AccessManagement';
import RealTimeMatchEvents from '@/components/admin/RealTimeMatchEvents';
import UserManagement from '@/components/admin/UserManagement';
import MatchManagement from '@/components/admin/MatchManagement';
import EventAssignments from '@/components/admin/EventAssignments';
import PlayerAssignments from '@/components/admin/PlayerAssignments';
import AuditLogs from '@/components/admin/AuditLogs';
import TrackerBatteryMonitor from '@/components/admin/TrackerBatteryMonitor';
import MatchTrackingMatrix from '@/components/admin/MatchTrackingMatrix';
import MatchPlanningNetwork from '@/components/match/MatchPlanningNetwork';
import TrackerAbsenceManager from '@/components/admin/TrackerAbsenceManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Users, CheckCircle2 } from 'lucide-react';

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
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [planningData, setPlanningData] = useState<any>(null);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchPlanningData();
    }
  }, [selectedMatchId]);

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
      if (typedMatches.length > 0 && !selectedMatchId) {
        setSelectedMatchId(typedMatches[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanningData = async () => {
    if (!selectedMatchId) return;
    
    setLoadingPlanning(true);
    try {
      // Fetch tracker assignments
      const { data: assignments } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', selectedMatchId);

      // Fetch available trackers
      const { data: trackers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tracker');

      // Fetch match details
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', selectedMatchId)
        .single();

      setPlanningData({
        assignments: assignments || [],
        trackers: trackers || [],
        match: match
      });
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoadingPlanning(false);
    }
  };

  const getAssignmentStats = () => {
    if (!planningData) return { assigned: 0, total: 0, coverage: 0 };
    
    const totalPlayers = (planningData.match?.home_team_players?.length || 0) + 
                        (planningData.match?.away_team_players?.length || 0);
    const assignedPlayers = planningData.assignments.filter((a: any) => a.player_id).length;
    const coverage = totalPlayers > 0 ? Math.round((assignedPlayers / totalPlayers) * 100) : 0;
    
    return {
      assigned: assignedPlayers,
      total: totalPlayers,
      coverage
    };
  };

  const getTrackerStats = () => {
    if (!planningData) return { assigned: 0, available: 0, active: 0 };
    
    const assignedTrackers = new Set(planningData.assignments.map((a: any) => a.tracker_user_id)).size;
    const availableTrackers = planningData.trackers.length;
    const activeTrackers = planningData.trackers.filter((t: any) => 
      planningData.assignments.some((a: any) => a.tracker_user_id === t.id)
    ).length;
    
    return {
      assigned: assignedTrackers,
      available: availableTrackers,
      active: activeTrackers
    };
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 max-w-7xl">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6">Admin Panel</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 h-auto' : 'grid-cols-9 h-10'} gap-1 sm:gap-0`}>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Users
          </TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Matches
          </TabsTrigger>
          <TabsTrigger value="planning" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5 bg-blue-100 border-blue-300">
            📋 Match Planning
          </TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            {isMobile ? 'Matrix' : 'Tracking Matrix'}
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            {isMobile ? 'Events' : 'Event Assignments'}
          </TabsTrigger>
          <TabsTrigger value="battery" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Battery
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

        <TabsContent value="planning" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="space-y-6">
            {/* Enhanced Match Selection Header */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  📋 Comprehensive Match Planning Center
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Complete planning, assignment management, readiness tracking, and absence monitoring for match operations
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    Loading matches...
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-lg font-medium">No matches available for planning</p>
                    <p className="text-sm">Create a match first to access comprehensive planning features</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Select Match to Plan</label>
                        <select
                          value={selectedMatchId || ''}
                          onChange={(e) => setSelectedMatchId(e.target.value)}
                          className="w-full max-w-md p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {matches.map((match) => (
                            <option key={match.id} value={match.id}>
                              {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                              {match.match_date && ` - ${new Date(match.match_date).toLocaleDateString()}`}
                              {` (${match.status.toUpperCase()})`}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {planningData && (
                        <div className="flex gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-lg text-blue-600">{getAssignmentStats().coverage}%</div>
                            <div className="text-gray-600">Coverage</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg text-green-600">{getTrackerStats().active}</div>
                            <div className="text-gray-600">Active Trackers</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Planning Overview Cards */}
            {selectedMatchId && planningData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Player Assignment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-2xl font-bold text-green-600">{getAssignmentStats().assigned}</span>
                        <span className="text-sm text-gray-500">of {getAssignmentStats().total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${getAssignmentStats().coverage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {getAssignmentStats().coverage}% players assigned to trackers
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tracker Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-2xl font-bold text-blue-600">{getTrackerStats().active}</span>
                        <span className="text-sm text-gray-500">of {getTrackerStats().available}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {getTrackerStats().active} Active
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {getTrackerStats().available - getTrackerStats().active} Available
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Absence Monitoring
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">🔍</div>
                        <div className="text-sm font-medium text-orange-600">Active</div>
                      </div>
                      <div className="text-xs text-center text-gray-600">
                        Real-time tracker monitoring enabled
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Match Readiness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-center">
                        {getAssignmentStats().coverage >= 80 ? (
                          <>
                            <div className="text-2xl">✅</div>
                            <div className="text-sm font-medium text-green-600">Ready</div>
                          </>
                        ) : getAssignmentStats().coverage >= 50 ? (
                          <>
                            <div className="text-2xl">⚠️</div>
                            <div className="text-sm font-medium text-yellow-600">Partial</div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl">❌</div>
                            <div className="text-sm font-medium text-red-600">Not Ready</div>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-center text-gray-600">
                        {getAssignmentStats().coverage >= 80 ? 'Match is ready to start' : 
                         getAssignmentStats().coverage >= 50 ? 'More assignments needed' : 
                         'Critical assignments missing'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tracker Absence Management */}
            {selectedMatchId && (
              <TrackerAbsenceManager matchId={selectedMatchId} />
            )}

            {/* Quick Actions */}
            {selectedMatchId && planningData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ⚡ Quick Planning Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button className="p-4 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <div className="font-medium">Auto-Assign Trackers</div>
                      <div className="text-xs text-gray-600">Automatically assign available trackers</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
                      <div className="font-medium">Send Notifications</div>
                      <div className="text-xs text-gray-600">Notify trackers of assignments</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors">
                      <div className="font-medium">Check Equipment</div>
                      <div className="text-xs text-gray-600">Verify tracker device status</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors">
                      <div className="font-medium">Generate Report</div>
                      <div className="text-xs text-gray-600">Create planning summary</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Planning Network */}
            {selectedMatchId && (
              <>
                {loadingPlanning ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <div className="text-lg font-semibold">Loading planning data...</div>
                        <div className="text-sm text-gray-600">Analyzing assignments and tracker status</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <MatchPlanningNetwork matchId={selectedMatchId} />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <MatchTrackingMatrix />
        </TabsContent>

        <TabsContent value="events" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <EventAssignments />
        </TabsContent>

        <TabsContent value="battery" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <TrackerBatteryMonitor />
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
