
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
          email: `mock.tracker${i}@simulation.com`,
          full_name: `Mock Tracker ${i}`,
          role: 'tracker',
          created_at: new Date().toISOString()
        };
        mockTrackers.push(trackerData);
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(mockTrackers, { onConflict: 'email' });

      if (error) throw error;

      toast.success(`Generated ${trackerCount} mock trackers successfully!`);
    } catch (error) {
      console.error('Error generating mock trackers:', error);
      toast.error('Failed to generate mock trackers');
    } finally {
      setLoading(false);
    }
  };

  const generateMockPlayerAssignments = async () => {
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

      // Generate mock assignments
      const assignments = [];
      const playersPerTeam = Math.floor(parseInt(playerCount) / 2);

      for (let i = 1; i <= playersPerTeam; i++) {
        // Home team assignments
        assignments.push({
          match_id: selectedMatchId,
          tracker_user_id: trackers[i % trackers.length].id,
          player_team_id: 'home',
          player_id: i,
          assigned_event_types: ['pass', 'shot', 'tackle']
        });

        // Away team assignments
        assignments.push({
          match_id: selectedMatchId,
          tracker_user_id: trackers[(i + playersPerTeam) % trackers.length].id,
          player_team_id: 'away',
          player_id: i,
          assigned_event_types: ['pass', 'shot', 'tackle']
        });
      }

      const { error } = await supabase
        .from('match_tracker_assignments')
        .upsert(assignments, { onConflict: 'match_id,player_id,player_team_id' });

      if (error) throw error;

      toast.success(`Generated ${assignments.length} mock player assignments!`);
    } catch (error) {
      console.error('Error generating mock assignments:', error);
      toast.error('Failed to generate mock assignments');
    } finally {
      setLoading(false);
    }
  };

  const generateMockReplacements = async () => {
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
        .eq('match_id', selectedMatchId)
        .limit(3); // Simulate 3 replacements

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        toast.error('No assignments found. Generate mock assignments first.');
        return;
      }

      // Get available replacement trackers
      const { data: replacementTrackers, error: replacementError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'tracker')
        .neq('id', assignments[0]?.tracker_user_id)
        .limit(3);

      if (replacementError) throw replacementError;

      if (!replacementTrackers || replacementTrackers.length === 0) {
        toast.error('No replacement trackers available');
        return;
      }

      // Update assignments with replacement trackers
      const updates = assignments.slice(0, Math.min(assignments.length, replacementTrackers.length)).map((assignment, index) => ({
        id: assignment.id,
        replacement_tracker_id: replacementTrackers[index].id
      }));

      const { error } = await supabase
        .from('match_tracker_assignments')
        .upsert(updates);

      if (error) throw error;

      toast.success(`Generated ${updates.length} mock replacement assignments!`);
    } catch (error) {
      console.error('Error generating mock replacements:', error);
      toast.error('Failed to generate mock replacements');
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
            Mock Data Generator
          </CardTitle>
          <p className="text-sm text-gray-600">
            Generate mock trackers, players, and replacement scenarios for testing match planning functionality
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
              <Label htmlFor="player-count">Number of Players to Assign</Label>
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
              onClick={generateMockPlayerAssignments}
              disabled={loading || !selectedMatchId}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <UserPlus className="h-4 w-4" />
              Assign Players
            </Button>

            <Button
              onClick={generateMockReplacements}
              disabled={loading || !selectedMatchId}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Mock Replacements
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

          {/* Quick Actions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Simulation Setup</CardTitle>
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
                    await generateMockPlayerAssignments();
                    setTimeout(async () => {
                      await generateMockReplacements();
                    }, 1000);
                  }, 1000);
                }}
                disabled={loading || !selectedMatchId}
                className="w-full"
              >
                🚀 Generate Complete Mock Scenario
              </Button>
              <p className="text-xs text-gray-600 mt-2">
                This will generate trackers, assign them to players, and create replacement scenarios
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockDataGenerator;
