import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserX, UserPlus, AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface TrackerAssignment {
  id: string;
  tracker_user_id: string;
  assigned_player_id: number | null;
  assigned_event_types: string[] | null;
  replacement_tracker_id: string | null;
  tracker?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  replacement_tracker?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

interface AvailableTracker {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_available: boolean;
}

interface TrackerReplacementManagerProps {
  matchId: string;
  onReplacementUpdate?: () => void;
}

const TrackerReplacementManager: React.FC<TrackerReplacementManagerProps> = ({
  matchId,
  onReplacementUpdate
}) => {
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [availableTrackers, setAvailableTrackers] = useState<AvailableTracker[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingReplacement, setProcessingReplacement] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs_replacement' | 'has_replacement'>('all');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (matchId) {
      fetchAssignments();
      fetchAvailableTrackers();
    }
  }, [matchId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          tracker_user_id,
          assigned_player_id,
          assigned_event_types,
          replacement_tracker_id,
          tracker:profiles!tracker_user_id (
            id,
            full_name,
            email,
            role
          ),
          replacement_tracker:profiles!replacement_tracker_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const transformedAssignments: TrackerAssignment[] = (data || []).map(assignment => ({
        id: assignment.id,
        tracker_user_id: assignment.tracker_user_id,
        assigned_player_id: assignment.assigned_player_id,
        assigned_event_types: assignment.assigned_event_types,
        replacement_tracker_id: assignment.replacement_tracker_id,
        tracker: assignment.tracker ? {
          id: assignment.tracker.id,
          full_name: assignment.tracker.full_name || '',
          email: assignment.tracker.email || '',
          role: assignment.tracker.role || 'tracker'
        } : undefined,
        replacement_tracker: assignment.replacement_tracker ? {
          id: assignment.replacement_tracker.id,
          full_name: assignment.replacement_tracker.full_name || '',
          email: assignment.replacement_tracker.email || '',
          role: assignment.replacement_tracker.role || 'tracker'
        } : undefined
      }));
      
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load tracker assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'tracker')
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      const trackersWithAvailability = (data || []).map(tracker => {
        const trackerObj: AvailableTracker = {
          id: tracker.id || '',
          full_name: tracker.full_name || '',
          email: tracker.email || '',
          role: tracker.role || 'tracker',
          is_available: true
        };
        
        trackerObj.is_available = !assignments.some(a => 
          a.tracker_user_id === tracker.id || a.replacement_tracker_id === tracker.id
        );
        
        return trackerObj;
      });
      
      setAvailableTrackers(trackersWithAvailability);
    } catch (error) {
      console.error('Error fetching available trackers:', error);
      toast.error('Failed to load available trackers');
    }
  };

  const assignReplacementTracker = async (assignmentId: string, replacementTrackerId: string) => {
    setProcessingReplacement(assignmentId);
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .update({ replacement_tracker_id: replacementTrackerId })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Replacement tracker assigned successfully');
      await fetchAssignments();
      await fetchAvailableTrackers();
      onReplacementUpdate?.();
    } catch (error) {
      console.error('Error assigning replacement tracker:', error);
      toast.error('Failed to assign replacement tracker');
    } finally {
      setProcessingReplacement(null);
    }
  };

  const removeReplacementTracker = async (assignmentId: string) => {
    setProcessingReplacement(assignmentId);
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .update({ replacement_tracker_id: null })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Replacement tracker removed successfully');
      await fetchAssignments();
      await fetchAvailableTrackers();
      onReplacementUpdate?.();
    } catch (error) {
      console.error('Error removing replacement tracker:', error);
      toast.error('Failed to remove replacement tracker');
    } finally {
      setProcessingReplacement(null);
    }
  };

  const getFilteredAssignments = () => {
    switch (filterStatus) {
      case 'needs_replacement':
        return assignments.filter(a => !a.replacement_tracker_id);
      case 'has_replacement':
        return assignments.filter(a => !!a.replacement_tracker_id);
      default:
        return assignments;
    }
  };

  const getAssignmentTypeDisplay = (assignment: TrackerAssignment) => {
    if (assignment.assigned_player_id) {
      return `Player ID: ${assignment.assigned_player_id}`;
    }
    if (assignment.assigned_event_types && assignment.assigned_event_types.length > 0) {
      return `Events: ${assignment.assigned_event_types.join(', ').replace(/_/g, ' ')}`;
    }
    return 'General Assignment';
  };

  const getReplacementStatus = () => {
    const total = assignments.length;
    const withReplacement = assignments.filter(a => a.replacement_tracker_id).length;
    const needsReplacement = total - withReplacement;
    
    return { total, withReplacement, needsReplacement };
  };

  const { total, withReplacement, needsReplacement } = getReplacementStatus();

  return (
    <div className={`space-y-3 sm:space-y-4 lg:space-y-6`}>
      {/* Stats Overview */}
      <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                  Total Assignments
                </p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                  {total}
                </p>
              </div>
              <Users className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-blue-500`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                  {isMobile ? 'With Backup' : 'With Replacement'}
                </p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                  {withReplacement}
                </p>
              </div>
              <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-green-500`} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 border-l-red-500 ${isMobile ? 'col-span-2' : ''}`}>
          <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>
                  {isMobile ? 'Need Backup' : 'Need Replacement'}
                </p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-red-600`}>
                  {needsReplacement}
                </p>
              </div>
              <AlertTriangle className={`${isMobile ? 'h-4 w-4' : 'h-8 w-8'} text-red-500`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for critical assignments */}
      {needsReplacement > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className={isMobile ? 'text-xs' : 'text-sm'}>
            <strong>{needsReplacement}</strong> assignments still need replacement trackers. 
            {isMobile ? ' Assign backups to ensure coverage.' : ' Consider assigning backup trackers to ensure match coverage continuity.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Filter and Controls */}
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg sm:text-xl'}`}>
            <UserPlus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
            Replacement Management
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'} pt-0`}>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-4'} items-start sm:items-center justify-between`}>
            <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2`}>
                Filter Assignments
              </label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className={`${isMobile ? 'h-8 text-xs' : ''} max-w-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                  <SelectItem value="has_replacement">Has Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={fetchAssignments} 
              disabled={loading}
              size={isMobile ? "sm" : "default"}
              className={isMobile ? 'h-8 px-3 text-xs w-full' : ''}
            >
              <RefreshCw className={`${loading ? 'animate-spin' : ''} ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Refresh' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment List */}
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
          <CardTitle className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>
            Tracker Assignments ({getFilteredAssignments().length})
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'} pt-0`}>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                Loading assignments...
              </p>
            </div>
          ) : getFilteredAssignments().length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserX className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4`} />
              <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-medium`}>
                No assignments found
              </p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>
                {filterStatus === 'needs_replacement' 
                  ? 'All assignments have replacement trackers assigned'
                  : filterStatus === 'has_replacement'
                  ? 'No assignments have replacement trackers yet'
                  : 'No tracker assignments configured for this match'
                }
              </p>
            </div>
          ) : (
            <div className={`space-y-2 sm:space-y-3 ${isMobile ? 'max-h-96' : 'max-h-[600px]'} overflow-y-auto`}>
              {getFilteredAssignments().map((assignment) => (
                <div
                  key={assignment.id}
                  className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} border rounded-lg hover:bg-gray-50 transition-colors`}
                >
                  <div className={`space-y-2 sm:space-y-3`}>
                    {/* Primary Assignment Info */}
                    <div className={`flex items-start justify-between ${isMobile ? 'gap-2' : 'gap-4'}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>
                          <span className="text-blue-600">Primary:</span> {' '}
                          {assignment.tracker?.full_name || assignment.tracker?.email || 'Unknown Tracker'}
                        </div>
                        <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-1`}>
                          {getAssignmentTypeDisplay(assignment)}
                        </div>
                      </div>
                      
                      <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                        {assignment.replacement_tracker_id ? (
                          <Badge className={`bg-green-100 text-green-800 ${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>
                            <CheckCircle className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                            {isMobile ? 'Has Backup' : 'Has Replacement'}
                          </Badge>
                        ) : (
                          <Badge className={`bg-red-100 text-red-800 ${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>
                            <Clock className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                            {isMobile ? 'Needs Backup' : 'Needs Replacement'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Replacement Tracker Section */}
                    {assignment.replacement_tracker_id && assignment.replacement_tracker ? (
                      <div className={`${isMobile ? 'p-2' : 'p-3'} bg-green-50 rounded border border-green-200`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-green-800`}>
                              <span className="text-green-600">Replacement:</span> {' '}
                              {assignment.replacement_tracker.full_name || assignment.replacement_tracker.email}
                            </div>
                          </div>
                          <Button
                            onClick={() => removeReplacementTracker(assignment.id)}
                            disabled={processingReplacement === assignment.id}
                            variant="outline"
                            size={isMobile ? "sm" : "sm"}
                            className={`text-red-600 hover:text-red-700 ${isMobile ? 'h-6 px-2 text-[10px]' : ''}`}
                          >
                            {processingReplacement === assignment.id ? (
                              <RefreshCw className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} animate-spin`} />
                            ) : (
                              <>
                                <UserX className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                                {isMobile ? 'Remove' : 'Remove'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${isMobile ? 'p-2' : 'p-3'} bg-yellow-50 rounded border border-yellow-200`}>
                        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-4'} items-start`}>
                          <div className="flex-1 min-w-0">
                            <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-2`}>
                              Assign Replacement Tracker
                            </label>
                            <Select 
                              onValueChange={(value) => assignReplacementTracker(assignment.id, value)}
                              disabled={processingReplacement === assignment.id}
                            >
                              <SelectTrigger className={`${isMobile ? 'h-8 text-xs' : ''} max-w-xs`}>
                                <SelectValue placeholder={isMobile ? "Select backup..." : "Select replacement tracker..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTrackers
                                  .filter(tracker => 
                                    tracker.id !== assignment.tracker_user_id &&
                                    !assignments.some(a => 
                                      a.tracker_user_id === tracker.id || 
                                      a.replacement_tracker_id === tracker.id
                                    )
                                  )
                                  .map((tracker) => (
                                    <SelectItem key={tracker.id} value={tracker.id}>
                                      <span className={isMobile ? 'text-xs' : 'text-sm'}>
                                        {tracker.full_name || tracker.email}
                                      </span>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {processingReplacement === assignment.id && (
                            <div className="flex items-center gap-2">
                              <RefreshCw className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-spin text-blue-500`} />
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-600`}>
                                {isMobile ? 'Assigning...' : 'Assigning replacement...'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerReplacementManager;
