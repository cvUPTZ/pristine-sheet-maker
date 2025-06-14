import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import AccessManagement from '@/components/admin/AccessManagement';
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
import VoiceCollaborationManager from '@/components/admin/VoiceCollaborationManager';
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  ChevronDown,
  Trophy,
  Mic,
  ClipboardList,
  Replace,
  LayoutGrid,
  Target,
  Battery,
  Beaker,
  User,
  KeyRound,
  FileText,
  ArrowLeft
} from 'lucide-react';
import MockDataGenerator from '@/components/admin/MockDataGenerator';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';

interface Match {
  id: string;
  name?: string | null;
  home_team_name: string;
  away_team_name: string;
  match_date?: string | null;
  status: string;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('users');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [planningData, setPlanningData] = useState<any>(null);
  const [isAbsenceMonitorOpen, setIsAbsenceMonitorOpen] = useState(true);

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

  const menuItems = [
    { value: 'users', label: 'Users', icon: Users },
    { value: 'matches', label: 'Matches', icon: Trophy },
    { value: 'voice', label: 'Voice', icon: Mic },
    { value: 'planning', label: 'Planning', icon: ClipboardList },
    { value: 'replacement', label: 'Replacement', icon: Replace },
    { value: 'matrix', label: 'Matrix', icon: LayoutGrid },
    { value: 'events', label: 'Events', icon: Target },
    { value: 'battery', label: 'Battery', icon: Battery },
    { value: 'mock-data', label: 'Mock Data', icon: Beaker },
    { value: 'players', label: 'Players', icon: User },
    { value: 'access', label: 'Access', icon: KeyRound },
    { value: 'audit', label: 'Audit', icon: FileText },
  ];

  const CurrentViewComponent = () => {
    switch(activeView) {
      case 'users':
        return <div className="space-y-4"><UserManagement /></div>;
      case 'matches':
        return <div className="space-y-4"><MatchManagement /></div>;
      case 'voice':
        return (
          <div className="space-y-4">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Voice Collaboration Management</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Manage real-time voice communication and collaboration features for match operations
              </p>
            </div>
            <div className="w-full">
              <VoiceCollaborationManager />
            </div>
          </div>
        );
      case 'planning':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Enhanced Match Selection Header */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-xl">
                  📋 Comprehensive Match Planning Center
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                  Complete planning, assignment management, readiness tracking, and absence monitoring for match operations
                </p>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-xs sm:text-sm lg:text-base">Loading matches...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 lg:py-12 text-gray-500">
                    <div className="text-2xl sm:text-3xl lg:text-4xl mb-4">📋</div>
                    <p className="text-sm sm:text-base lg:text-lg font-medium">No matches available</p>
                    <p className="text-xs sm:text-sm">Create a match first to start planning</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">Select Match for Planning</label>
                      <select
                        value={selectedMatchId || ''}
                        onChange={(e) => setSelectedMatchId(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm lg:text-base"
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-800">Assigned</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900">{getAssignmentStats().assigned}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-yellow-800">Unassigned</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-900">{getAssignmentStats().unassigned}</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-800">Active</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900">{getTrackerStats().active}</p>
                      </div>
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-800">Total</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{getAssignmentStats().total}</p>
                      </div>
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8 text-gray-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Collapsible Tracker Absence Management */}
            {selectedMatchId && (
              <Collapsible open={isAbsenceMonitorOpen} onOpenChange={setIsAbsenceMonitorOpen}>
                <Card className="border-l-4 border-l-orange-500">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-orange-50/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Tracker Absence Monitor
                        </div>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <ChevronDown 
                            className={`h-5 w-5 text-orange-600 transition-transform duration-200 ${
                              isAbsenceMonitorOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Real-time monitoring and automatic replacement for absent trackers
                      </p>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <TrackerAbsenceManager matchId={selectedMatchId} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
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
        );
      case 'replacement':
        return (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-xl">
                  🔄 Tracker Replacement Management
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                  Manage backup tracker assignments and replacement procedures for match operations
                </p>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                {loading ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-xs sm:text-sm lg:text-base">Loading matches...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 lg:py-12 text-gray-500">
                    <div className="text-2xl sm:text-3xl lg:text-4xl mb-4">👥</div>
                    <p className="text-sm sm:text-base lg:text-lg font-medium">No matches available</p>
                    <p className="text-xs sm:text-sm">Create a match first to manage tracker replacements</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">Select Match for Replacement Management</label>
                      <select
                        value={selectedMatchId || ''}
                        onChange={(e) => setSelectedMatchId(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm lg:text-base"
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
          </div>
        );
      case 'matrix':
        return (
          <div className="space-y-4">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Match Tracking Matrix</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Comprehensive view of all tracking assignments and coverage across matches
              </p>
            </div>
            <MatchTrackingMatrix />
          </div>
        );
      case 'events':
        return (
          <div className="space-y-4">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Event Assignments</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Manage event tracking assignments and specialized tracker roles for different event types
              </p>
            </div>
            <div className="w-full">
              <EventAssignments matchId={selectedMatchId || undefined} />
            </div>
          </div>
        );
      case 'battery':
        return <div className="space-y-4"><TrackerBatteryMonitor /></div>;
      case 'mock-data':
        return <div className="space-y-4"><MockDataGenerator /></div>;
      case 'players':
        return <div className="space-y-4"><PlayerAssignments /></div>;
      case 'access':
        return <div className="space-y-4"><AccessManagement /></div>;
      case 'audit':
        return <div className="space-y-4"><AuditLogs /></div>;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <MatchAnalysisSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          menuItems={menuItems}
          groupLabel="Admin Tools"
        />
        <SidebarInset>
          <div className="container mx-auto p-2 sm:p-4 lg:p-6 max-w-full">
            <div className="flex items-center gap-4 mb-3 sm:mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft />
              </Button>
              <SidebarTrigger />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage users, matches, and system settings</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 min-h-[500px] sm:min-h-[600px] p-3 sm:p-4 lg:p-6">
              <CurrentViewComponent />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
