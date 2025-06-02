import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserPlus, RefreshCw, Zap } from 'lucide-react';

const MockDataGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [trackerCount, setTrackerCount] = useState('5');
  const [playerCount, setPlayerCount] = useState('22');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matches, setMatches] = useState<any[]>([]);

  React.useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, match_date')
        .order('match_date', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    }
  };

  const generateMockTrackers = async () => {
    setLoading(true);
    try {
      const mockTrackers = [];
      for (let i = 1; i <= parseInt(trackerCount); i++) {
        const trackerData = {
          id: crypto.randomUUID(),
          email: `mock.tracker${i}@simulation.com`,
          full_name: `Mock Tracker ${i}`,
          role: 'tracker',
          created_at: new Date().toISOString()
        };
        mockTrackers.push(trackerData);
      }

      const { error } = await supabase
        .from('profiles')
        .insert(mockTrackers);

      if (error) throw error;

      toast.success(`Generated ${trackerCount} mock trackers successfully!`);
    } catch (error) {
      console.error('Error generating mock trackers:', error);
      toast.error('Failed to generate mock trackers');
    } finally {
      setLoading(false);
    }
  };

  const generateRealisticPlayerAssignments = async () => {
    if (!selectedMatchId) {
      toast.error('Please select a match first');
      return;
    }

    setLoading(true);
    try {
      // Get available trackers
      const { data: trackers, error: trackersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'tracker')
        .limit(parseInt(trackerCount));

      if (trackersError) throw trackersError;

      if (!trackers || trackers.length === 0) {
        toast.error('No trackers available. Generate mock trackers first.');
        return;
      }

      // Define possible event types
      const eventTypes = ['pass', 'shot', 'tackle', 'cross', 'dribble', 'interception', 'clearance', 'corner', 'throw_in', 'foul'];
      
      const assignments = [];
      const playersPerTeam = Math.floor(parseInt(playerCount) / 2);
      let trackerIndex = 0;

      // Create realistic assignments for each player
      for (let playerId = 1; playerId <= playersPerTeam * 2; playerId++) {
        const isHomeTeam = playerId <= playersPerTeam;
        const teamId = isHomeTeam ? 'home' : 'away';
        const currentTracker = trackers[trackerIndex % trackers.length];

        // Simulate different scenarios:
        // Best case: Single tracker for single event type for one player
        // Worst case: Single tracker for multiple event types for multiple players
        
        let assignedEventTypes: string[];
        const scenario = Math.random();
        
        if (scenario < 0.3) {
          // Best case: Single event type
          assignedEventTypes = [eventTypes[Math.floor(Math.random() * eventTypes.length)]];
        } else if (scenario < 0.7) {
          // Medium case: 2-3 event types
          assignedEventTypes = eventTypes.slice(0, 2 + Math.floor(Math.random() * 2));
        } else {
          // Worst case: Multiple event types
          assignedEventTypes = eventTypes.slice(0, 3 + Math.floor(Math.random() * 4));
        }

        assignments.push({
          match_id: selectedMatchId,
          tracker_user_id: currentTracker.id,
          player_team_id: teamId,
          player_id: playerId,
          assigned_event_types: assignedEventTypes
        });

        // In worst case scenarios, assign the same tracker to multiple players
        if (scenario > 0.7 && Math.random() > 0.5 && playerId < playersPerTeam * 2) {
          // Assign same tracker to next player too (worst case)
          const nextPlayerId = playerId + 1;
          const nextIsHomeTeam = nextPlayerId <= playersPerTeam;
          const nextTeamId = nextIsHomeTeam ? 'home' : 'away';
          
          assignments.push({
            match_id: selectedMatchId,
            tracker_user_id: currentTracker.id,
            player_team_id: nextTeamId,
            player_id: nextPlayerId,
            assigned_event_types: assignedEventTypes
          });
          
          playerId++; // Skip next iteration since we handled it
        }

        trackerIndex++;
      }

      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert(assignments);

      if (error) throw error;

      toast.success(`Generated ${assignments.length} realistic player assignments with varied complexity!`);
    } catch (error) {
      console.error('Error generating realistic assignments:', error);
      toast.error('Failed to generate realistic assignments');
    } finally {
      setLoading(false);
    }
  };

  const generateReplacementTrackers = async () => {
    if (!selectedMatchId) {
      toast.error('Please select a match first');
      return;
    }

    setLoading(true);
    try {
      // Get existing assignments for the match
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('id, tracker_user_id')
        .eq('match_id', selectedMatchId);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        toast.error('No assignments found. Generate assignments first.');
        return;
      }

      // Get all available trackers (including those not assigned to this match)
      const { data: allTrackers, error: trackersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      if (!allTrackers || allTrackers.length === 0) {
        toast.error('No trackers available');
        return;
      }

      // Get assigned tracker IDs for this match
      const assignedTrackerIds = new Set(assignments.map(a => a.tracker_user_id));
      
      // Find available replacement trackers
      const availableReplacements = allTrackers.filter(t => !assignedTrackerIds.has(t.id));

      if (availableReplacements.length === 0) {
        toast.error('No available replacement trackers');
        return;
      }

      // Assign at least one replacement for each tracker
      const uniqueTrackers = [...new Set(assignments.map(a => a.tracker_user_id))];
      let replacementCount = 0;

      for (const trackerId of uniqueTrackers) {
        // Find an assignment for this tracker
        const trackerAssignment = assignments.find(a => a.tracker_user_id === trackerId);
        if (!trackerAssignment) continue;

        // Assign a replacement tracker using direct database update
        const replacementTracker = availableReplacements[replacementCount % availableReplacements.length];
        
        const { error } = await supabase
          .from('match_tracker_assignments')
          .update({ tracker_user_id: replacementTracker.id })
          .eq('id', trackerAssignment.id);

        if (error) throw error;

        replacementCount++;
      }

      toast.success(`Assigned replacement trackers for ${uniqueTrackers.length} primary trackers!`);
    } catch (error) {
      console.error('Error generating replacements:', error);
      toast.error('Failed to generate replacement assignments');
    } finally {
      setLoading(false);
    }
  };

  const clearMockData = async () => {
    setLoading(true);
    try {
      // Delete mock tracker assignments
      if (selectedMatchId) {
        await supabase
          .from('match_tracker_assignments')
          .delete()
          .eq('match_id', selectedMatchId);
      }

      // Delete mock tracker profiles
      await supabase
        .from('profiles')
        .delete()
        .like('email', 'mock.tracker%@simulation.com');

      toast.success('Mock data cleared successfully!');
    } catch (error) {
      console.error('Error clearing mock data:', error);
      toast.error('Failed to clear mock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Realistic Match Simulation Generator
          </CardTitle>
          <p className="text-sm text-gray-600">
            Generate realistic tracker scenarios: Best case (single event type per player) to worst case (multiple event types across multiple players) with guaranteed replacement coverage
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Selection */}
          <div className="space-y-2">
            <Label htmlFor="match-select">Select Match for Mock Data</Label>
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                    {match.match_date && ` - ${new Date(match.match_date).toLocaleDateString()}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tracker-count">Number of Mock Trackers</Label>
              <Input
                id="tracker-count"
                type="number"
                value={trackerCount}
                onChange={(e) => setTrackerCount(e.target.value)}
                min="1"
                max="20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-count">Number of Players</Label>
              <Input
                id="player-count"
                type="number"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                min="2"
                max="44"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={generateMockTrackers}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Generate Trackers
            </Button>

            <Button
              onClick={generateRealisticPlayerAssignments}
              disabled={loading || !selectedMatchId}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <UserPlus className="h-4 w-4" />
              Create Realistic Assignments
            </Button>

            <Button
              onClick={generateReplacementTrackers}
              disabled={loading || !selectedMatchId}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Assign Replacements
            </Button>

            <Button
              onClick={clearMockData}
              disabled={loading}
              className="flex items-center gap-2"
              variant="destructive"
            >
              Clear Mock Data
            </Button>
          </div>

          {/* Scenario Explanation */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Simulation Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-medium">Best Case (30%):</span>
                <span>Single tracker → Single event type → Single player</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 font-medium">Medium Case (40%):</span>
                <span>Single tracker → 2-3 event types → Single player</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium">Worst Case (30%):</span>
                <span>Single tracker → Multiple event types → Multiple players</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-medium">Replacement:</span>
                <span>Every tracker gets at least one backup assigned</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Complete Simulation</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={async () => {
                  if (!selectedMatchId) {
                    toast.error('Please select a match first');
                    return;
                  }
                  await generateMockTrackers();
                  setTimeout(async () => {
                    await generateRealisticPlayerAssignments();
                    setTimeout(async () => {
                      await generateReplacementTrackers();
                    }, 1500);
                  }, 1500);
                }}
                disabled={loading || !selectedMatchId}
                className="w-full"
              >
                🚀 Generate Complete Realistic Scenario
              </Button>
              <p className="text-xs text-gray-600 mt-2">
                This will generate trackers, create realistic assignments (best/worst case scenarios), and assign replacement trackers
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockDataGenerator;
