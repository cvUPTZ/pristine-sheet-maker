import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Clock, Users, Target, UserCheck } from 'lucide-react';
import TrackerAbsenceManager from './TrackerAbsenceManager';

interface Match {
  id: string;
  name: string;
  status: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string | null;
}

interface TrackerAssignment {
  id: string;
  match_id: string;
  tracker_user_id: string;
  player_id?: number | null;
  player_team_id?: 'home' | 'away';
  assigned_event_types?: string[] | null;
  tracker_name?: string;
  tracker_email?: string;
}

interface MatrixData {
  match: Match;
  generalTrackers: TrackerAssignment[];
  specializedTrackers: TrackerAssignment[];
  totalTrackers: number;
  eventsAssigned: number;
  playersAssigned: number;
  replacementsDefined: number;
}

const MatchTrackingMatrix: React.FC = () => {
  const [matrixData, setMatrixData] = useState<MatrixData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string>('all');
  const [showAbsenceManager, setShowAbsenceManager] = useState<string | null>(null);

  useEffect(() => {
    fetchMatrixData();
  }, []);

  const fetchMatrixData = async () => {
    try {
      // Fetch matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id, name, status, home_team_name, away_team_name, match_date')
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;

      // Fetch all tracker assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          match_id,
          tracker_user_id,
          player_id,
          player_team_id,
          assigned_event_types,
          profiles!tracker_user_id (
            full_name,
            email
          )
        `);

      if (assignmentsError) throw assignmentsError;

      // Process data into matrix format
      const processedData: MatrixData[] = (matches || []).map(match => {
        const matchAssignments = (assignments || []).filter(a => a.match_id === match.id);
        const generalTrackers = matchAssignments.filter(a => !a.player_id).map(a => ({
          id: a.id,
          match_id: a.match_id,
          tracker_user_id: a.tracker_user_id,
          player_id: a.player_id || undefined,
          player_team_id: a.player_team_id as 'home' | 'away' | undefined,
          assigned_event_types: a.assigned_event_types || undefined,
          tracker_name: (a.profiles as any)?.full_name || undefined,
          tracker_email: (a.profiles as any)?.email || undefined,
        }));
        
        const specializedTrackers = matchAssignments.filter(a => a.player_id).map(a => ({
          id: a.id,
          match_id: a.match_id,
          tracker_user_id: a.tracker_user_id,
          player_id: a.player_id || undefined,
          player_team_id: a.player_team_id as 'home' | 'away' | undefined,
          assigned_event_types: a.assigned_event_types || undefined,
          tracker_name: (a.profiles as any)?.full_name || undefined,
          tracker_email: (a.profiles as any)?.email || undefined,
        }));

        return {
          match: {
            ...match,
            name: match.name || `${match.home_team_name} vs ${match.away_team_name}`
          },
          generalTrackers,
          specializedTrackers,
          totalTrackers: matchAssignments.length,
          eventsAssigned: specializedTrackers.reduce((acc, t) => acc + (t.assigned_event_types?.length || 0), 0),
          playersAssigned: new Set(specializedTrackers.map(t => t.player_id)).size,
          replacementsDefined: 0
        };
      });

      setMatrixData(processedData);
    } catch (error) {
      console.error('Error fetching matrix data:', error);
      toast.error('Failed to fetch tracking matrix data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (value: number, threshold: number = 1) => {
    if (value >= threshold) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (value > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'scheduled': 'default',
      'live': 'destructive',
      'completed': 'secondary',
      'cancelled': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getCompletionPercentage = (data: MatrixData) => {
    const steps = [
      data.totalTrackers > 0,
      data.eventsAssigned > 0,
      data.playersAssigned > 0,
      data.replacementsDefined > 0
    ];
    return Math.round((steps.filter(Boolean).length / steps.length) * 100);
  };

  if (loading) {
    return <div className="p-4">Loading tracking matrix...</div>;
  }

  if (showAbsenceManager) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAbsenceManager(null)}
          >
            ← Back to Matrix
          </Button>
          <h2 className="text-lg font-semibold">
            Absence Management - Match {showAbsenceManager.slice(-4)}
          </h2>
        </div>
        <TrackerAbsenceManager matchId={showAbsenceManager} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Match Tracking Process Matrix
        </CardTitle>
        <p className="text-sm text-gray-600">
          Complete workflow overview from match creation to tracker assignment and replacement management
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matches</SelectItem>
                {matrixData.map(data => (
                  <SelectItem key={data.match.id} value={data.match.id}>
                    {data.match.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchMatrixData} variant="outline">
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      General Trackers
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="h-4 w-4" />
                      Specialized Trackers
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Events Assigned</TableHead>
                  <TableHead className="text-center">Players Assigned</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      Replacements
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Completion</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData
                  .filter(data => selectedMatch === 'all' || data.match.id === selectedMatch)
                  .map((data) => (
                    <TableRow key={data.match.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{data.match.name}</div>
                          {data.match.match_date && (
                            <div className="text-xs text-gray-500">
                              {new Date(data.match.match_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(data.match.status)}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(data.generalTrackers.length)}
                          <span>{data.generalTrackers.length}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(data.specializedTrackers.length)}
                          <span>{data.specializedTrackers.length}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(data.eventsAssigned)}
                          <span>{data.eventsAssigned}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(data.playersAssigned)}
                          <span>{data.playersAssigned}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(data.replacementsDefined)}
                          <span>{data.replacementsDefined}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${getCompletionPercentage(data)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{getCompletionPercentage(data)}%</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAbsenceManager(data.match.id)}
                          className="text-xs"
                        >
                          Manage Absence
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {matrixData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No matches found. Create a match to start tracking.
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Process Legend:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Tracking Focus</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTrackingMatrix;
