
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Clock, Trophy, Target, Play, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import TrackerNotifications from '@/components/TrackerNotifications';

const Dashboard = () => {
  const { userRole } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your football analytics dashboard
          </p>
        </div>
      </div>

      {/* Show notifications for trackers */}
      {userRole === 'tracker' && (
        <TrackerNotifications />
      )}

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(userRole === 'admin' || userRole === 'tracker') && (
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
                <Link to="/match">Start Match</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {(userRole === 'admin' || userRole === 'manager') && (
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
        )}

        {(userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') && (
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
        )}
      </div>

      {/* Manager Panel Access */}
      {userRole === 'manager' && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <TrendingUp className="h-5 w-5" />
              Manager Dashboard
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Access match management and performance analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button asChild variant="secondary">
                <Link to="/matches">Manage Matches</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/statistics">View Analytics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
              {userRole === 'tracker' && "Join a match to start tracking"}
              {(userRole === 'admin' || userRole === 'manager') && "Create a new match to see activity here"}
              {(userRole === 'user' || userRole === 'teacher') && "Activity will appear here once matches are started"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
