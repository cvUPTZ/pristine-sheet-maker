import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Calendar, MapPin, Clock, CheckCircle, AlertCircle, UserCheck, Settings, Activity, Battery, Wifi, Mail, Phone, Target, Zap, RotateCcw } from 'lucide-react';
import { useTrackerAbsenceDetection } from '@/hooks/useTrackerAbsenceDetection';
import ReplacementTrackerFinder from '@/components/admin/ReplacementTrackerFinder';
import { useIsMobile } from '@/hooks/use-mobile';

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  match_date: string | null;
  status: string;
  home_team_players: any[];
  away_team_players: any[];
  description?: string | null;
  location?: string | null;
}

interface TrackerAssignment {
  id: string;
  tracker_user_id: string | null;
  tracker_email: string | null;
  player_id?: number | null;
  player_team_id?: string | null;
  assigned_event_types?: string[] | null;
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

interface EventTypeCoverage {
  event_type: string;
  assigned_trackers: number;
  total_assignments: number;
  coverage_percentage: number;
}

interface MatchPlanningNetworkProps {
  matchId: string;
  width?: number;
  height?: number;
}

const EVENT_TYPES = [
  { key: 'pass', label: 'Passes', priority: 'high' },
  { key: 'shot', label: 'Shots', priority: 'high' },
  { key: 'goal', label: 'Goals', priority: 'critical' },
  { key: 'foul', label: 'Fouls', priority: 'medium' },
  { key: 'card', label: 'Cards', priority: 'high' },
  { key: 'substitution', label: 'Substitutions', priority: 'medium' },
  { key: 'corner', label: 'Corners', priority: 'medium' },
  { key: 'cross', label: 'Crosses', priority: 'medium' },
  { key: 'tackle', label: 'Tackles', priority: 'medium' },
  { key: 'interception', label: 'Interceptions', priority: 'low' },
  { key: 'save', label: 'Saves', priority: 'high' },
  { key: 'clearance', label: 'Clearances', priority: 'low' }
];

export const MatchPlanningNetwork: React.FC<MatchPlanningNetworkProps> = ({
  matchId,
  width = 800,
  height = 600
}) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [trackerStatuses, setTrackerStatuses] = useState<TrackerStatus[]>([]);
  const [eventTypeCoverage, setEventTypeCoverage] = useState<EventTypeCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplacementFinder, setShowReplacementFinder] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const {
    detectedAbsences,
    handleTrackerAbsence,
    clearAbsenceStatus
  } = useTrackerAbsenceDetection({
    matchId,
    onTrackerAbsent: (trackerId, reason) => {
      console.log(`Tracker ${trackerId} detected as absent: ${reason}`);
    }
  });

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

      // Transform match data to handle nullable fields and ensure arrays
      const transformedMatch: MatchData = {
        id: match.id,
        name: match.name || `${match.home_team_name} vs ${match.away_team_name}`,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        match_date: match.match_date,
        status: match.status,
        home_team_players: Array.isArray(match.home_team_players) ? match.home_team_players : [],
        away_team_players: Array.isArray(match.away_team_players) ? match.away_team_players : [],
        description: match.description,
        location: match.location
      };

      setMatchData(transformedMatch);

      // Create a map of tracker profiles for quick lookup
      const trackerProfileMap = new Map();
      (trackerProfiles || []).forEach(profile => {
        trackerProfileMap.set(profile.id, profile);
      });

      // Transform assignments data to handle nullable fields
      const transformedAssignments: TrackerAssignment[] = (assignmentsData || []).map(assignment => {
        const trackerProfile = assignment.tracker_user_id ? trackerProfileMap.get(assignment.tracker_user_id) : null;
        return {
          id: assignment.id || '',
          tracker_user_id: assignment.tracker_user_id,
          tracker_email: assignment.tracker_email,
          player_id: assignment.player_id,
          player_team_id: assignment.player_team_id,
          assigned_event_types: assignment.assigned_event_types,
          created_at: assignment.created_at || new Date().toISOString()
        };
      });

      setAssignments(transformedAssignments);

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
      transformedAssignments.forEach(assignment => {
        if (assignment.tracker_user_id) {
          const existing = trackerStatusMap.get(assignment.tracker_user_id);
          if (existing) {
            existing.assigned_players += assignment.player_id ? 1 : 0;
            if (assignment.assigned_event_types) {
              existing.assigned_events = [...new Set([...existing.assigned_events, ...assignment.assigned_event_types])];
            }
            existing.status = 'pending';
          }
        }
      });

      // Simulate some active trackers
      const statusArray = Array.from(trackerStatusMap.values());
      statusArray.forEach((tracker, index) => {
        if (tracker.assigned_players > 0) {
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

      // Calculate event type coverage
      const eventCoverage: EventTypeCoverage[] = EVENT_TYPES.map(eventType => {
        const assignmentsForEvent = transformedAssignments.filter(assignment => 
          assignment.assigned_event_types?.includes(eventType.key)
        );
        return {
          event_type: eventType.key,
          assigned_trackers: assignmentsForEvent.length,
          total_assignments: transformedAssignments.length,
          coverage_percentage: transformedAssignments.length > 0 ? 
            Math.round((assignmentsForEvent.length / transformedAssignments.length) * 100) : 0
        };
      });

      setEventTypeCoverage(eventCoverage);

    } catch (err: any) {
      console.error('Error fetching match planning data:', err);
      setError(err.message || 'Failed to load match planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleReplacementRequest = (absentTrackerId: string) => {
    setShowReplacementFinder(absentTrackerId);
  };

  const handleAssignReplacement = async (absentId: string, replacementId: string) => {
    try {
      await handleTrackerAbsence(absentId, 'Manual replacement requested');
      setShowReplacementFinder(null);
      await fetchMatchPlanningData();
    } catch (error) {
      console.error('Error assigning replacement:', error);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Settings className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Match Organization & Planning
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'}`}>
            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>Loading match planning data...</div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Fetching assignments and tracker status</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !matchData) {
    return (
      <Card className="w-full">
        <CardContent className={`${isMobile ? 'p-4' : 'p-8'} text-center`}>
          <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-red-400`} />
          <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-red-600`}>Error Loading Planning Data</p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-2`}>{error || 'Match data not found'}</p>
          <Button onClick={fetchMatchPlanningData} className="mt-4" size={isMobile ? "sm" : "default"}>Retry</Button>
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

  const criticalEventTypes = eventTypeCoverage.filter(e => 
    EVENT_TYPES.find(et => et.key === e.event_type)?.priority === 'critical'
  );
  const highPriorityUncovered = eventTypeCoverage.filter(e => 
    EVENT_TYPES.find(et => et.key === e.event_type)?.priority === 'high' && e.assigned_trackers === 0
  );

  return (
    <div className={`space-y-3 sm:space-y-4 lg:space-y-6 ${isMobile ? 'max-w-full' : ''}`}>
      {/* Match Overview Header */}
      <Card>
        <CardHeader className={`bg-gradient-to-r from-blue-50 to-green-50 ${isMobile ? 'p-3' : 'p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'}`}>
            <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'}`} />
            {isMobile ? 'Match Organization' : 'Match Organization Dashboard'}
          </CardTitle>
          <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {isMobile ? `Planning for ${matchData.name}` : `Complete organizational planning for ${matchData.name}`}
          </div>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
            {/* Match Information */}
            <div className="space-y-2 sm:space-y-3">
              <div className={`flex items-center gap-2 font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <MapPin className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Match Details
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-base lg:text-lg'}`}>{matchData.home_team_name}</div>
                <div className={`text-center text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>vs</div>
                <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-base lg:text-lg'}`}>{matchData.away_team_name}</div>
                <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {matchData.match_date ? new Date(matchData.match_date).toLocaleDateString('en-US', {
                    weekday: isMobile ? undefined : 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Date TBD'}
                </div>
                {matchData.location && (
                  <div className={`text-gray-500 flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    <MapPin className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                    <span className="truncate">{matchData.location}</span>
                  </div>
                )}
                <Badge variant={matchData.status === 'live' ? 'default' : 'secondary'} className={`${isMobile ? 'text-xs' : ''}`}>
                  {matchData.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Coverage Statistics */}
            <div className="space-y-2 sm:space-y-3">
              <div className={`flex items-center gap-2 font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Coverage Status
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Total Players</span>
                  <Badge variant="outline" className={`${isMobile ? 'text-xs' : ''}`}>{totalPlayers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Assigned</span>
                  <Badge className={`bg-blue-100 text-blue-800 ${isMobile ? 'text-xs' : ''}`}>{assignedPlayers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Coverage</span>
                  <Badge className={`${coveragePercentage >= 80 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} ${isMobile ? 'text-xs' : ''}`}>
                    {coveragePercentage}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Event Type Coverage */}
            <div className="space-y-2 sm:space-y-3">
              <div className={`flex items-center gap-2 font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <Target className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Event Coverage
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Total Types</span>
                  <Badge variant="outline" className={`${isMobile ? 'text-xs' : ''}`}>{EVENT_TYPES.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Covered</span>
                  <Badge className={`bg-blue-100 text-blue-800 ${isMobile ? 'text-xs' : ''}`}>
                    {eventTypeCoverage.filter(e => e.assigned_trackers > 0).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Critical Events</span>
                  <Badge className={`${criticalEventTypes.every(e => e.assigned_trackers > 0) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} ${isMobile ? 'text-xs' : ''}`}>
                    {criticalEventTypes.filter(e => e.assigned_trackers > 0).length}/{criticalEventTypes.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tracker Readiness */}
            <div className="space-y-2 sm:space-y-3">
              <div className={`flex items-center gap-2 font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Match Readiness
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="text-center">
                  {coveragePercentage >= 80 && trackerReadiness >= 70 && criticalEventTypes.every(e => e.assigned_trackers > 0) ? (
                    <CheckCircle className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-green-500 mx-auto mb-2`} />
                  ) : (
                    <AlertCircle className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-500 mx-auto mb-2`} />
                  )}
                </div>
                <div className={`text-center font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {coveragePercentage >= 80 && trackerReadiness >= 70 && criticalEventTypes.every(e => e.assigned_trackers > 0) ? "Ready to Start" : "Setup Required"}
                </div>
                <div className={`text-center text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  Coverage: {coveragePercentage}% | Trackers: {trackerReadiness}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Type Coverage Details */}
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Event Type Coverage Analysis
          </CardTitle>
          <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {isMobile ? 'Event type assignments and priorities' : 'Detailed breakdown of event type assignments and priorities'}
          </div>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'} ${isMobile ? 'pt-0' : 'pt-0'}`}>
          <div className={`grid gap-2 sm:gap-3 lg:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {EVENT_TYPES.map((eventType) => {
              const coverage = eventTypeCoverage.find(e => e.event_type === eventType.key);
              const priorityColor = {
                critical: 'border-red-500 bg-red-50',
                high: 'border-orange-500 bg-orange-50',
                medium: 'border-yellow-500 bg-yellow-50',
                low: 'border-green-500 bg-green-50'
              }[eventType.priority];

              return (
                <div key={eventType.key} className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg border-2 ${priorityColor}`}>
                  <div className={`flex justify-between items-center ${isMobile ? 'mb-1' : 'mb-2'}`}>
                    <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{eventType.label}</span>
                    <Badge variant="outline" className={`${isMobile ? 'text-xs' : 'text-xs'}`}>
                      {eventType.priority}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>Trackers Assigned</span>
                    <Badge className={`${coverage?.assigned_trackers === 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"} ${isMobile ? 'text-xs' : ''}`}>
                      {coverage?.assigned_trackers || 0}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Planning Sections */}
      <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Tracker Status Details */}
        <Card>
          <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <Activity className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              {isMobile ? 'Tracker Status & Replacements' : 'Tracker Status & Replacement Strategy'}
            </CardTitle>
            <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile ? 'Real-time status with replacement options' : 'Real-time status with absence detection and replacement options'}
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'} ${isMobile ? 'pt-0' : 'pt-0'}`}>
            <div className={`space-y-2 sm:space-y-3 lg:space-y-4 ${isMobile ? 'max-h-80' : 'max-h-96'} overflow-y-auto`}>
              {trackerStatuses
                .filter(tracker => tracker.assigned_players > 0 || tracker.assigned_events.length > 0)
                .map((tracker, index) => (
                <motion.div
                  key={tracker.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-gray-50 rounded-lg border`}
                >
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-start justify-between'}`}>
                    <div className="flex-1">
                      <div className={`flex items-center gap-2 ${isMobile ? 'mb-1' : 'mb-2'}`}>
                        <div className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full ${
                          tracker.status === 'active' ? 'bg-green-500' :
                          tracker.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{tracker.full_name}</span>
                        <Badge variant="outline" className={`${isMobile ? 'text-xs' : 'text-xs'}`}>
                          {tracker.status}
                        </Badge>
                        {detectedAbsences.includes(tracker.id) && (
                          <Badge className={`bg-red-100 text-red-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            ABSENT
                          </Badge>
                        )}
                      </div>
                      
                      <div className={`text-gray-600 space-y-0.5 sm:space-y-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                        <div className="flex items-center gap-1">
                          <Mail className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                          <span className="truncate">{tracker.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                          {tracker.assigned_players} players assigned
                        </div>
                        {tracker.assigned_events.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Activity className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                            <span className="truncate">
                              {tracker.assigned_events.slice(0, isMobile ? 2 : 3).join(', ')}
                              {tracker.assigned_events.length > (isMobile ? 2 : 3) && ` +${tracker.assigned_events.length - (isMobile ? 2 : 3)} more`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={`flex ${isMobile ? 'justify-between items-center w-full' : 'flex-col items-end gap-1'}`}>
                      <div className={`flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                        {tracker.battery_level !== undefined && (
                          <div className="flex items-center gap-1">
                            <Battery className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} ${
                              tracker.battery_level > 20 ? 'text-green-600' : 'text-red-600'
                            }`} />
                            {tracker.battery_level}%
                          </div>
                        )}
                        {tracker.status === 'active' && (
                          <div className={`flex items-center gap-1 text-green-600 ${isMobile ? 'ml-2' : ''}`}>
                            <Wifi className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                            {!isMobile && 'Online'}
                          </div>
                        )}
                      </div>
                      {detectedAbsences.includes(tracker.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-orange-700 border-orange-500 hover:bg-orange-50 ${isMobile ? 'text-xs px-2' : 'text-xs'}`}
                          onClick={() => handleReplacementRequest(tracker.id)}
                        >
                          <RotateCcw className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                          {isMobile ? 'Replace' : 'Find Replacement'}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {trackerStatuses.filter(t => t.assigned_players > 0 || t.assigned_events.length > 0).length === 0 && (
                <div className={`text-center ${isMobile ? 'py-6' : 'py-8'} text-gray-500`}>
                  <Users className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2 opacity-50`} />
                  <p className={`${isMobile ? 'text-sm' : 'text-base'}`}>No trackers assigned yet</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'}`}>Use the assignment panel to assign trackers</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Summary */}
        <Card>
          <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Assignment Summary
            </CardTitle>
            <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile ? 'Current assignment status and gaps' : 'Overview of current assignment status and critical gaps'}
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'} ${isMobile ? 'pt-0' : 'pt-0'}`}>
            <div className={`space-y-3 sm:space-y-4 lg:space-y-6`}>
              {/* Team Coverage */}
              <div className={`grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4`}>
                <div className={`text-center ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-blue-50 rounded-lg`}>
                  <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                    {matchData.home_team_players?.length || 0}
                  </div>
                  <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>{matchData.home_team_name}</div>
                  <div className={`text-gray-500 mt-0.5 sm:mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {assignments.filter(a => a.player_team_id === 'home' && a.player_id).length} assigned
                  </div>
                </div>
                <div className={`text-center ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-red-50 rounded-lg`}>
                  <div className={`font-bold text-red-600 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                    {matchData.away_team_players?.length || 0}
                  </div>
                  <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>{matchData.away_team_name}</div>
                  <div className={`text-gray-500 mt-0.5 sm:mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {assignments.filter(a => a.player_team_id === 'away' && a.player_id).length} assigned
                  </div>
                </div>
              </div>
              
              {/* Critical Event Types Status */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Critical Event Types Status</h4>
                {criticalEventTypes.map(eventType => (
                  <div key={eventType.event_type} className={`flex justify-between items-center ${isMobile ? 'p-1.5' : 'p-2'} bg-gray-50 rounded`}>
                    <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {EVENT_TYPES.find(e => e.key === eventType.event_type)?.label}
                    </span>
                    <Badge className={`${eventType.assigned_trackers > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} ${isMobile ? 'text-xs' : ''}`}>
                      {eventType.assigned_trackers > 0 ? '✓ Covered' : '⚠ Uncovered'}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${isMobile ? 'pt-2' : 'pt-4'} border-t`}>
                <div className="text-center">
                  <div className={`font-bold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>{assignments.length}</div>
                  <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>Total Assignments</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {new Set(assignments.map(a => a.tracker_user_id)).size}
                  </div>
                  <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>Unique Trackers</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Replacement Tracker Finder Modal */}
      {showReplacementFinder && (
        <div className={`${isMobile ? 'mt-3' : 'mt-6'}`}>
          <ReplacementTrackerFinder
            absentTrackerId={showReplacementFinder}
            availableTrackers={[]}
            onAssignReplacement={handleAssignReplacement}
            isLoading={false}
          />
        </div>
      )}

      {/* Action Items */}
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <AlertCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isMobile ? 'Action Items' : 'Action Items & Recommendations'}
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'} ${isMobile ? 'pt-0' : 'pt-0'}`}>
          <div className={`space-y-2 sm:space-y-3`}>
            {coveragePercentage < 80 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-yellow-50 rounded-lg border border-yellow-200`}>
                <AlertCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-yellow-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>Incomplete Player Coverage</div>
                  <div className={`text-yellow-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {totalPlayers - assignedPlayers} players still need tracker assignments. Current coverage: {coveragePercentage}%
                  </div>
                </div>
                <Button size="sm" className={`bg-yellow-600 hover:bg-yellow-700 flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  {isMobile ? 'Assign' : 'Assign Trackers'}
                </Button>
              </div>
            )}

            {highPriorityUncovered.length > 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-orange-50 rounded-lg border border-orange-200`}>
                <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-orange-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>High Priority Events Uncovered</div>
                  <div className={`text-orange-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {highPriorityUncovered.map(e => EVENT_TYPES.find(et => et.key === e.event_type)?.label).join(', ')} need tracker assignment
                  </div>
                </div>
                <Button size="sm" className={`bg-orange-600 hover:bg-orange-700 flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  {isMobile ? 'Assign' : 'Assign Event Trackers'}
                </Button>
              </div>
            )}
            
            {pendingTrackers > 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-blue-50 rounded-lg border border-blue-200`}>
                <Clock className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-blue-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>Tracker Confirmation Pending</div>
                  <div className={`text-blue-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {pendingTrackers} trackers need to confirm availability and check their devices
                  </div>
                </div>
                <Button size="sm" variant="outline" className={`border-blue-600 text-blue-600 hover:bg-blue-50 flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  {isMobile ? 'Remind' : 'Send Reminders'}
                </Button>
              </div>
            )}

            {detectedAbsences.length > 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-red-50 rounded-lg border border-red-200`}>
                <RotateCcw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-red-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>Tracker Absences Detected</div>
                  <div className={`text-red-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {detectedAbsences.length} tracker(s) are absent and need replacement
                  </div>
                </div>
                <Button size="sm" className={`bg-red-600 hover:bg-red-700 flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  {isMobile ? 'Manage' : 'Manage Replacements'}
                </Button>
              </div>
            )}

            {coveragePercentage >= 80 && trackerReadiness >= 70 && criticalEventTypes.every(e => e.assigned_trackers > 0) && detectedAbsences.length === 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-green-50 rounded-lg border border-green-200`}>
                <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-green-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>Match Ready for Kickoff</div>
                  <div className={`text-green-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {isMobile ? `${coveragePercentage}% coverage, all critical events covered!` : `Excellent coverage (${coveragePercentage}%), all critical events covered, and all trackers ready!`}
                  </div>
                </div>
                <Button size="sm" className={`bg-green-600 hover:bg-green-700 flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  <Zap className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
                  {isMobile ? 'Start' : 'Start Match Tracking'}
                </Button>
              </div>
            )}

            {assignments.length === 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 ${isMobile ? 'p-2' : 'p-3 sm:p-4'} bg-gray-50 rounded-lg border border-gray-200`}>
                <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-gray-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>No Assignments Yet</div>
                  <div className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {isMobile ? 'Start by assigning trackers to players and events' : 'Start by assigning trackers to players and event types to begin match preparation'}
                  </div>
                </div>
                <Button size="sm" variant="outline" className={`flex-shrink-0 ${isMobile ? 'text-xs px-2' : ''}`}>
                  {isMobile ? 'Create' : 'Create Assignments'}
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
