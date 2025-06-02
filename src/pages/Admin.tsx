
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
import TrackerReplacementManager from '@/components/admin/TrackerReplacementManager';
import QuickPlanningActions from '@/components/admin/QuickPlanningActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Users, CheckCircle2 } from 'lucide-react';

interface Match {
  id: string;
  name?: string | null;
  home_team_name: string;
  away_team_name: string;
  match_date?: string | null;
  status: string;
}

const Admin: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [planningData, setPlanningData] = useState<any>(null);
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        return;
      }

      setMatches(data || []);
      if (data && data.length > 0 && !selectedMatchId) {
        setSelectedMatchId(data[0].id);
      }
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanningData = async () => {
    if (!selectedMatchId) return;
    
    setLoadingPlanning(true);
    try {
      // Fetch planning data using the correct table name
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', selectedMatchId);

      if (error) {
        console.error('Error fetching planning data:', error);
        return;
      }

      setPlanningData(data);
    } catch (error) {
      console.error('Error in fetchPlanningData:', error);
    } finally {
      setLoadingPlanning(false);
    }
  };

  const getAssignmentStats = () => {
    if (!planningData) return { assigned: 0, unassigned: 0, total: 0 };
    
    const assigned = planningData.filter((item: any) => item.tracker_user_id).length;
    const total = planningData.length;
    const unassigned = total - assigned;
    
    return { assigned, unassigned, total };
  };

  const getTrackerStats = () => {
    if (!planningData) return { active: 0, inactive: 0, total: 0 };
    
    // This is a placeholder - adjust based on your actual tracker status logic
    const active = planningData.filter((item: any) => item.tracker_user_id).length;
    const total = planningData.length;
    const inactive = total - active;
    
    return { active, inactive, total };
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 max-w-7xl">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6">Admin Panel</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-4 h-auto' : 'grid-cols-11 h-10'} gap-1 sm:gap-0`}>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Users
          </TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5">
            Matches
          </TabsTrigger>
          <TabsTrigger value="planning" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5 bg-blue-100 border-blue-300">
            📋 Match Planning
          </TabsTrigger>
          <TabsTrigger value="replacement" className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-1.5 bg-purple-100 border-purple-300">
            {isMobile ? '🔄 Replace' : '🔄 Tracker Replacement'}
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
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-lg font-medium">No matches available</p>
                    <p className="text-sm">Create a match first to start planning</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Match for Planning</label>
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Planning Overview Cards */}
            {selectedMatchId && planningData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Assigned</p>
                        <p className="text-2xl font-bold text-green-900">{getAssignmentStats().assigned}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Unassigned</p>
                        <p className="text-2xl font-bold text-yellow-900">{getAssignmentStats().unassigned}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Active Trackers</p>
                        <p className="text-2xl font-bold text-blue-900">{getTrackerStats().active}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{getAssignmentStats().total}</p>
                      </div>
                      <Users className="h-8 w-8 text-gray-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tracker Absence Management */}
            {selectedMatchId && (
              <TrackerAbsenceManager matchId={selectedMatchId} />
            )}

            {/* Quick Actions - Now Functional */}
            {selectedMatchId && planningData && (
              <QuickPlanningActions 
                matchId={selectedMatchId} 
                onActionComplete={fetchPlanningData}
              />
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

        <TabsContent value="replacement" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                🔄 Tracker Replacement Management
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage backup tracker assignments and replacement procedures for match operations
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  Loading matches...
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-lg font-medium">No matches available</p>
                  <p className="text-sm">Create a match first to manage tracker replacements</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Match for Replacement Management</label>
                    <select
                      value={selectedMatchId || ''}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="w-full max-w-md p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  
                  {selectedMatchId && (
                    <TrackerReplacementManager 
                      matchId={selectedMatchId} 
                      onReplacementUpdate={fetchPlanningData}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
