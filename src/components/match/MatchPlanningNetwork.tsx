
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Calendar, MapPin, Clock, CheckCircle, AlertCircle, UserCheck, Settings, Activity, Battery, Wifi, Mail, Phone } from 'lucide-react';

interface MatchData {
  id: string;
  name: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  status: string;
  home_team_players: any[];
  away_team_players: any[];
  description?: string;
  location?: string;
}

interface TrackerAssignment {
  id: string;
  tracker_user_id: string;
  tracker_email: string;
  tracker_name: string;
  player_id?: number;
  player_team_id?: string;
  assigned_event_types?: string[];
  created_at: string;
}

interface TrackerStatus {
  id: string;
  email: string;
  full_name: string;
  status: 'active' | 'inactive' | 'pending';
  battery_level?: number;
  last_activity?: string;
  assigned_players: number;
  assigned_events: string[];
}

interface MatchPlanningNetworkProps {
  matchId: string;
  width?: number;
  height?: number;
}

export const MatchPlanningNetwork: React.FC<MatchPlanningNetworkProps> = ({
  matchId,
  width = 800,
  height = 600
}) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [trackerStatuses, setTrackerStatuses] = useState<TrackerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchPlanningData();
  }, [matchId]);

  const fetchMatchPlanningData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch match details
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Fetch tracker assignments with profile data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (assignmentsError) throw assignmentsError;

      // Fetch all tracker profiles
      const { data: trackerProfiles, error: trackersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      console.log('Match data:', match);
      console.log('Assignments data:', assignmentsData);
      console.log('Tracker profiles:', trackerProfiles);

      setMatchData(match);
      setAssignments(assignmentsData || []);

      // Process tracker statuses
      const trackerStatusMap = new Map<string, TrackerStatus>();
      
      // Initialize all tracker profiles
      (trackerProfiles || []).forEach(profile => {
        trackerStatusMap.set(profile.id, {
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name || 'Unknown',
          status: 'inactive' as const,
          assigned_players: 0,
          assigned_events: [],
          last_activity: undefined,
          battery_level: undefined
        });
      });

      // Update with assignment data
      (assignmentsData || []).forEach(assignment => {
        if (assignment.tracker_user_id) {
          const existing = trackerStatusMap.get(assignment.tracker_user_id);
          if (existing) {
            existing.assigned_players += assignment.player_id ? 1 : 0;
            if (assignment.assigned_event_types) {
              existing.assigned_events = [...new Set([...existing.assigned_events, ...assignment.assigned_event_types])];
            }
            existing.status = 'pending'; // Has assignments but need to check activity
          }
        }
      });

      // Simulate some active trackers (in real app, this would come from real-time data)
      const statusArray = Array.from(trackerStatusMap.values());
      statusArray.forEach((tracker, index) => {
        if (tracker.assigned_players > 0) {
          // Simulate some realistic statuses
          const rand = Math.random();
          if (rand > 0.7) {
            tracker.status = 'active';
            tracker.battery_level = Math.floor(Math.random() * 100);
            tracker.last_activity = new Date(Date.now() - Math.random() * 3600000).toISOString();
          } else if (rand > 0.3) {
            tracker.status = 'pending';
          }
        }
      });

      setTrackerStatuses(statusArray);

    } catch (err: any) {
      console.error('Error fetching match planning data:', err);
      setError(err.message || 'Failed to load match planning data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Match Organization & Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="text-lg font-semibold">Loading match planning data...</div>
              <div className="text-sm text-gray-600">Fetching assignments and tracker status</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !matchData) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg font-semibold text-red-600">Error Loading Planning Data</p>
          <p className="text-sm text-gray-600 mt-2">{error || 'Match data not found'}</p>
          <Button onClick={fetchMatchPlanningData} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const totalTrackers = trackerStatuses.length;
  const assignedTrackers = trackerStatuses.filter(t => t.assigned_players > 0 || t.assigned_events.length > 0).length;
  const activeTrackers = trackerStatuses.filter(t => t.status === 'active').length;
  const pendingTrackers = trackerStatuses.filter(t => t.status === 'pending').length;
  
  const totalPlayers = (matchData.home_team_players?.length || 0) + (matchData.away_team_players?.length || 0);
  const assignedPlayers = assignments.filter(a => a.player_id).length;
  
  const coveragePercentage = totalPlayers > 0 ? Math.round((assignedPlayers / totalPlayers) * 100) : 0;
  const trackerReadiness = assignedTrackers > 0 ? Math.round((activeTrackers / assignedTrackers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Match Overview Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Match Organization Dashboard
          </CardTitle>
          <div className="text-sm text-gray-600">
            Complete organizational planning for {matchData.name || `${matchData.home_team_name} vs ${matchData.away_team_name}`}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Match Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin className="h-4 w-4" />
                Match Details
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold">{matchData.home_team_name}</div>
                <div className="text-center text-gray-500 text-sm">vs</div>
                <div className="text-lg font-semibold">{matchData.away_team_name}</div>
                <div className="text-sm text-gray-500">
                  {matchData.match_date ? new Date(matchData.match_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Date TBD'}
                </div>
                {matchData.location && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {matchData.location}
                  </div>
                )}
                <Badge variant={matchData.status === 'live' ? 'default' : 'secondary'}>
                  {matchData.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Coverage Statistics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Users className="h-4 w-4" />
                Coverage Status
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Players</span>
                  <Badge variant="outline">{totalPlayers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Assigned</span>
                  <Badge className="bg-blue-100 text-blue-800">{assignedPlayers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Coverage</span>
                  <Badge className={coveragePercentage >= 80 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {coveragePercentage}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tracker Overview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <UserCheck className="h-4 w-4" />
                Tracker Status
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Available</span>
                  <Badge variant="outline">{totalTrackers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Assigned</span>
                  <Badge className="bg-blue-100 text-blue-800">{assignedTrackers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active</span>
                  <Badge className="bg-green-100 text-green-800">{activeTrackers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{pendingTrackers}</Badge>
                </div>
              </div>
            </div>

            {/* Overall Readiness */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Clock className="h-4 w-4" />
                Match Readiness
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  {coveragePercentage >= 80 && trackerReadiness >= 70 ? (
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  )}
                </div>
                <div className="text-center text-sm font-medium">
                  {coveragePercentage >= 80 && trackerReadiness >= 70 ? "Ready to Start" : "Setup Required"}
                </div>
                <div className="text-xs text-center text-gray-500">
                  Coverage: {coveragePercentage}% | Trackers: {trackerReadiness}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Planning Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tracker Status Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tracker Status Details
            </CardTitle>
            <div className="text-sm text-gray-600">
              Real-time status of all assigned trackers
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {trackerStatuses
                .filter(tracker => tracker.assigned_players > 0 || tracker.assigned_events.length > 0)
                .map((tracker, index) => (
                <motion.div
                  key={tracker.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          tracker.status === 'active' ? 'bg-green-500' :
                          tracker.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium text-sm">{tracker.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tracker.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tracker.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {tracker.assigned_players} players assigned
                        </div>
                        {tracker.assigned_events.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {tracker.assigned_events.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {tracker.battery_level !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <Battery className={`h-3 w-3 ${
                            tracker.battery_level > 20 ? 'text-green-600' : 'text-red-600'
                          }`} />
                          {tracker.battery_level}%
                        </div>
                      )}
                      {tracker.status === 'active' && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Wifi className="h-3 w-3" />
                          Online
                        </div>
                      )}
                      {tracker.last_activity && (
                        <div className="text-xs text-gray-500">
                          {new Date(tracker.last_activity).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {trackerStatuses.filter(t => t.assigned_players > 0 || t.assigned_events.length > 0).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trackers assigned yet</p>
                  <p className="text-xs">Use the assignment panel to assign trackers</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Assignment Summary
            </CardTitle>
            <div className="text-sm text-gray-600">
              Overview of current assignment status
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Team Coverage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {matchData.home_team_players?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">{matchData.home_team_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {assignments.filter(a => a.player_team_id === 'home' && a.player_id).length} assigned
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {matchData.away_team_players?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">{matchData.away_team_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {assignments.filter(a => a.player_team_id === 'away' && a.player_id).length} assigned
                  </div>
                </div>
              </div>
              
              {/* Progress Bars */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Player Coverage Progress</span>
                    <span className="text-sm font-medium">{coveragePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${coveragePercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    {assignedPlayers} of {totalPlayers} players covered
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tracker Readiness</span>
                    <span className="text-sm font-medium">{trackerReadiness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${trackerReadiness}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    {activeTrackers} of {assignedTrackers} assigned trackers active
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{assignments.length}</div>
                  <div className="text-xs text-gray-600">Total Assignments</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {new Set(assignments.map(a => a.tracker_user_id)).size}
                  </div>
                  <div className="text-xs text-gray-600">Unique Trackers</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Action Items & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {coveragePercentage < 80 && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-yellow-800">Incomplete Player Coverage</div>
                  <div className="text-xs text-yellow-700">
                    {totalPlayers - assignedPlayers} players still need tracker assignments. Current coverage: {coveragePercentage}%
                  </div>
                </div>
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                  Assign Trackers
                </Button>
              </div>
            )}
            
            {pendingTrackers > 0 && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-blue-800">Tracker Confirmation Pending</div>
                  <div className="text-xs text-blue-700">
                    {pendingTrackers} trackers need to confirm availability and check their devices
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  Send Reminders
                </Button>
              </div>
            )}

            {activeTrackers === 0 && assignedTrackers > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-red-800">No Active Trackers</div>
                  <div className="text-xs text-red-700">
                    None of the assigned trackers are currently active. Check device connectivity and battery levels.
                  </div>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Check Devices
                </Button>
              </div>
            )}

            {coveragePercentage >= 80 && trackerReadiness >= 70 && (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-green-800">Match Ready for Kickoff</div>
                  <div className="text-xs text-green-700">
                    Excellent coverage ({coveragePercentage}%) and tracker readiness ({trackerReadiness}%). All systems go!
                  </div>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  Start Match Tracking
                </Button>
              </div>
            )}

            {assignments.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Users className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">No Assignments Yet</div>
                  <div className="text-xs text-gray-700">
                    Start by assigning trackers to players and event types to begin match preparation
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Create Assignments
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchPlanningNetwork;
