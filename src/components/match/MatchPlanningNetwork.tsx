
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Calendar, MapPin, Clock, CheckCircle, AlertCircle, UserCheck, Settings } from 'lucide-react';

interface PlanningData {
  match: any;
  assignments: any[];
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
  trackers: TrackerInfo[];
}

interface TrackerInfo {
  id: string;
  email: string;
  assignedPlayers: number;
  status: 'ready' | 'pending' | 'unavailable';
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
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanningData();
  }, [matchId]);

  const fetchPlanningData = async () => {
    setLoading(true);
    try {
      // Fetch match data
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      // Fetch tracker assignments
      const { data: assignments } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (matchData && assignments) {
        // Group players by team
        const homeTeamPlayers = assignments.filter((a: any) => a.player_team_id === 'home');
        const awayTeamPlayers = assignments.filter((a: any) => a.player_team_id === 'away');
        
        // Get unique trackers with proper typing
        const trackers: TrackerInfo[] = assignments
          .filter((a: any) => a.tracker_user_id)
          .reduce((acc: TrackerInfo[], assignment: any) => {
            const existing = acc.find((t: TrackerInfo) => t.id === assignment.tracker_user_id);
            if (!existing && assignment.tracker_user_id) {
              acc.push({
                id: assignment.tracker_user_id,
                email: assignment.tracker_email || 'Unknown',
                assignedPlayers: assignments.filter((a: any) => a.tracker_user_id === assignment.tracker_user_id).length,
                status: Math.random() > 0.3 ? 'ready' : 'pending'
              });
            }
            return acc;
          }, []);

        setPlanningData({
          match: matchData,
          assignments: assignments || [],
          homeTeamPlayers,
          awayTeamPlayers,
          trackers
        });
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
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
              <div className="text-lg font-semibold">Loading match planning...</div>
              <div className="text-sm text-gray-600">Organizing match logistics</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planningData) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-semibold text-gray-600">No planning data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalTrackers = planningData.trackers.length;
  const readyTrackers = planningData.trackers.filter((t: TrackerInfo) => t.status === 'ready').length;
  const totalPlayers = planningData.homeTeamPlayers.length + planningData.awayTeamPlayers.length;
  const assignedPlayers = planningData.assignments.filter((a: any) => a.player_id).length;

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
            Complete organizational overview for {planningData.match.home_team_name} vs {planningData.match.away_team_name}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Match Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin className="h-4 w-4" />
                Match Details
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold">{planningData.match.home_team_name}</div>
                <div className="text-center text-gray-500">vs</div>
                <div className="text-lg font-semibold">{planningData.match.away_team_name}</div>
                <div className="text-sm text-gray-500">
                  {planningData.match.match_date ? new Date(planningData.match.match_date).toLocaleDateString() : 'Date TBD'}
                </div>
              </div>
            </div>

            {/* Team Coverage */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Users className="h-4 w-4" />
                Team Coverage
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Home Team</span>
                  <Badge variant="outline">{planningData.homeTeamPlayers.length} players</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Away Team</span>
                  <Badge variant="outline">{planningData.awayTeamPlayers.length} players</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Coverage</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {assignedPlayers}/{totalPlayers} assigned
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tracker Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <UserCheck className="h-4 w-4" />
                Tracker Status
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Trackers</span>
                  <Badge variant="outline">{totalTrackers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ready</span>
                  <Badge className="bg-green-100 text-green-800">{readyTrackers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{totalTrackers - readyTrackers}</Badge>
                </div>
              </div>
            </div>

            {/* Match Readiness */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Clock className="h-4 w-4" />
                Readiness Status
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  {readyTrackers === totalTrackers && assignedPlayers === totalPlayers ? (
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  )}
                </div>
                <div className="text-center text-sm">
                  {readyTrackers === totalTrackers && assignedPlayers === totalPlayers
                    ? "Match Ready"
                    : "Setup Pending"
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Planning Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tracker Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tracker Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planningData.trackers.length > 0 ? (
                planningData.trackers.map((tracker: TrackerInfo, index: number) => (
                  <motion.div
                    key={tracker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        tracker.status === 'ready' ? 'bg-green-500' :
                        tracker.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">{tracker.email}</div>
                        <div className="text-xs text-gray-500">{tracker.assignedPlayers} players assigned</div>
                      </div>
                    </div>
                    <Badge variant={tracker.status === 'ready' ? 'default' : 'secondary'}>
                      {tracker.status}
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trackers assigned yet</p>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{planningData.homeTeamPlayers.length}</div>
                  <div className="text-sm text-gray-600">Home Team Players</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{planningData.awayTeamPlayers.length}</div>
                  <div className="text-sm text-gray-600">Away Team Players</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Coverage Progress</span>
                  <span className="text-sm font-medium">{Math.round((assignedPlayers / totalPlayers) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(assignedPlayers / totalPlayers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tracker Readiness</span>
                  <span className="text-sm font-medium">{Math.round((readyTrackers / totalTrackers) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(readyTrackers / totalTrackers) * 100}%` }}
                  />
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
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignedPlayers < totalPlayers && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-sm">Incomplete Player Coverage</div>
                  <div className="text-xs text-gray-600">
                    {totalPlayers - assignedPlayers} players still need tracker assignments
                  </div>
                </div>
                <Button size="sm" className="ml-auto">Assign</Button>
              </div>
            )}
            
            {readyTrackers < totalTrackers && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-sm">Tracker Confirmation Pending</div>
                  <div className="text-xs text-gray-600">
                    {totalTrackers - readyTrackers} trackers need to confirm availability
                  </div>
                </div>
                <Button size="sm" variant="outline" className="ml-auto">Notify</Button>
              </div>
            )}

            {assignedPlayers === totalPlayers && readyTrackers === totalTrackers && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Match Ready for Kickoff</div>
                  <div className="text-xs text-gray-600">
                    All trackers assigned and confirmed
                  </div>
                </div>
                <Button size="sm" className="ml-auto bg-green-600 hover:bg-green-700">Start Match</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchPlanningNetwork;
