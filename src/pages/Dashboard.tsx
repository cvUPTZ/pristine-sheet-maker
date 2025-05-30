
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Clock, Trophy, Target, Play, Piano } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TrackerNotifications from '@/components/TrackerNotifications';

interface AssignedMatch {
  id: string;
  name: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string | null;
  status: string;
}

const Dashboard = () => {
  const { userRole, user } = useAuth();
  const [assignedMatches, setAssignedMatches] = useState<AssignedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'tracker' && user?.id) {
      fetchAssignedMatches();
    } else {
      setLoading(false);
    }
  }, [userRole, user?.id]);

  const fetchAssignedMatches = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          match_id,
          matches (
            id,
            name,
            home_team_name,
            away_team_name,
            match_date,
            status
          )
        `)
        .eq('tracker_user_id', user.id);

      if (error) throw error;

      const matches = data?.map(assignment => assignment.matches).filter(Boolean) || [];
      setAssignedMatches(matches as AssignedMatch[]);
    } catch (error) {
      console.error('Error fetching assigned matches:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {userRole === 'tracker' 
              ? 'Welcome to your tracker dashboard' 
              : 'Welcome to your football analytics dashboard'
            }
          </p>
        </div>
      </div>

      {/* Show notifications for trackers */}
      {userRole === 'tracker' && (
        <TrackerNotifications />
      )}

      {/* Tracker-specific dashboard */}
      {userRole === 'tracker' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Piano className="h-5 w-5" />
                Your Assigned Matches
              </CardTitle>
              <CardDescription>
                Matches you've been assigned to track
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : assignedMatches.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No matches assigned yet</p>
                  <p className="text-sm">Contact your admin to get match assignments</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignedMatches.map((match) => (
                    <Card key={match.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Date TBD'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            match.status === 'active' ? 'bg-green-100 text-green-800' :
                            match.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {match.status}
                          </span>
                          <Button asChild size="sm">
                            <Link to={`/match-analysis-v2/${match.id}`}>
                              Start Tracking
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin/General dashboard */}
      {userRole !== 'tracker' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Match</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Start tracking a new football match
              </CardDescription>
              <Button asChild className="w-full">
                <Link to="/create-match">Start Match</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Match History</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                View previous matches and statistics
              </CardDescription>
              <Button variant="outline" asChild className="w-full">
                <Link to="/matches">View Matches</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Statistics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Analyze performance metrics and trends
              </CardDescription>
              <Button variant="outline" asChild className="w-full">
                <Link to="/statistics">View Statistics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Panel Access */}
      {userRole === 'admin' && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Target className="h-5 w-5" />
              Admin Panel
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              Manage users, matches, and system settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link to="/admin">Go to Admin Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">
              {userRole === 'tracker' 
                ? 'Start tracking a match to see activity here' 
                : 'Start a new match to see activity here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
