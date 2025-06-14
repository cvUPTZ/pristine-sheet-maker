
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Clock, Trophy, Target, Play, TrendingUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import TrackerNotifications from '@/components/TrackerNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardChart from '@/components/dashboard/DashboardChart';
import DashboardMetricsGrid from '@/components/dashboard/DashboardMetricsGrid';

const fetchMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching matches:', error);
    throw new Error(error.message);
  }

  // DashboardChart expects homeTeam.name and awayTeam.name
  return data.map(match => ({
    ...match,
    homeTeam: { name: match.home_team_name || 'Home' },
    awayTeam: { name: match.away_team_name || 'Away' },
  }));
};

const Dashboard = () => {
  const { userRole } = useAuth();

  const { data: matches, isLoading: isLoadingMatches, isError: isErrorMatches } = useQuery({
    queryKey: ['dashboardMatches'],
    queryFn: fetchMatches,
    enabled: userRole === 'admin' || userRole === 'manager' || userRole === 'teacher',
  });

  const cardStyle = "bg-white/60 backdrop-blur-lg border-slate-200/80 shadow-lg hover:shadow-xl rounded-2xl transition-all transform hover:-translate-y-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-lg text-slate-600 mt-2">
            Welcome back, here's your football analytics overview.
          </p>
        </div>

        {userRole === 'tracker' && (
          <TrackerNotifications />
        )}

        {(userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Recent Performance</h2>
            {isLoadingMatches && (
              <div className="flex justify-center items-center h-64 rounded-2xl bg-white/50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
            {isErrorMatches && (
              <Card className="bg-red-50/60 border-red-200/80 backdrop-blur-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-red-700">Error Loading Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600">Could not load match statistics. Please try again later.</p>
                </CardContent>
              </Card>
            )}
            {matches && (
              <div className="grid gap-6 lg:grid-cols-5">
                <Card className={`${cardStyle} lg:col-span-3`}>
                  <CardHeader>
                    <CardTitle>Recent Matches Stats</CardTitle>
                    <CardDescription>Goals and passes from recent matches.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DashboardChart matches={matches} />
                  </CardContent>
                </Card>
                <div className="lg:col-span-2">
                  <DashboardMetricsGrid matches={matches} />
                </div>
              </div>
            )}
          </div>
        )}


        {/* Quick Actions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(userRole === 'admin' || userRole === 'tracker') && (
            <Card className={cardStyle}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Match</CardTitle>
                <Play className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4 text-sm">
                  Start tracking a new football match
                </p>
                <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
                  <Link to="/match">Start Match</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager') && (
            <Card className={cardStyle}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Match History</CardTitle>
                <Calendar className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4 text-sm">
                  View previous matches and statistics
                </p>
                <Button variant="outline" asChild className="w-full border-slate-300 hover:bg-slate-50 hover:border-slate-400">
                  <Link to="/matches">View Matches</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') && (
            <Card className={cardStyle}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Statistics</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4 text-sm">
                  Analyze performance metrics and trends
                </p>
                <Button variant="outline" asChild className="w-full border-slate-300 hover:bg-slate-50 hover:border-slate-400">
                  <Link to="/statistics">View Statistics</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Manager Panel Access */}
        {userRole === 'manager' && (
          <Card className="border-purple-300/80 bg-purple-100/30 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <TrendingUp className="h-5 w-5" />
                Manager Dashboard
              </CardTitle>
              <CardDescription className="text-purple-700">
                Access match management and performance analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                  <Link to="/matches">Manage Matches</Link>
                </Button>
                <Button asChild variant="outline" className="border-purple-300 hover:bg-purple-50">
                  <Link to="/statistics">View Analytics</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Panel Access */}
        {userRole === 'admin' && (
          <Card className="border-orange-300/80 bg-orange-100/30 backdrop-blur-lg rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Target className="h-5 w-5" />
                Admin Panel
              </CardTitle>
              <CardDescription className="text-orange-700">
                Manage users, matches, and system settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-md">
                <Link to="/admin">Go to Admin Panel</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Placeholder */}
        <Card className={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-500 py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-slate-700">No recent activity</p>
              <p className="text-sm mt-1">
                {userRole === 'tracker' && "Join a match to start tracking"}
                {(userRole === 'admin' || userRole === 'manager') && "Activity from new matches will appear here"}
                {(userRole === 'user' || userRole === 'teacher') && "Activity will appear here once matches are tracked"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
