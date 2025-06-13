import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Clock, Trophy, Target, Play, TrendingUp, Zap, Activity, Users, Settings } from 'lucide-react';
// Mock components for demo
const Link = ({ to, children, ...props }) => (
  <a href={to} {...props} onClick={(e) => { e.preventDefault(); console.log(`Navigate to: ${to}`); }}>
    {children}
  </a>
);

const useAuth = () => ({ userRole: 'admin' }); // Demo with admin role
const TrackerNotifications = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <p className="text-blue-800 text-sm font-medium">📢 New match assignments available</p>
  </div>
);

const Dashboard = () => {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-400/5 dark:to-purple-400/5"></div>
        <div className="relative container mx-auto px-6 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Welcome to your football analytics command center
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-8 space-y-8">
        {/* Show notifications for trackers */}
        {userRole === 'tracker' && (
          <div className="animate-in slide-in-from-top duration-500">
            <TrackerNotifications />
          </div>
        )}

        {/* Quick Actions Grid - Modern Card Design */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(userRole === 'admin' || userRole === 'tracker') && (
            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-600 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 group-hover:from-green-300/30 group-hover:to-emerald-400/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">New Match</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Play className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-green-100">
                  Start tracking a new football match with real-time analytics
                </CardDescription>
                <Button asChild className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <Link to="/match">Start Match</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager') && (
            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-cyan-600 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 group-hover:from-blue-300/30 group-hover:to-cyan-400/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Match History</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-blue-100">
                  Browse previous matches and detailed performance data
                </CardDescription>
                <Button asChild className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <Link to="/matches">View Matches</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') && (
            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-violet-600 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-violet-500/20 group-hover:from-purple-300/30 group-hover:to-violet-400/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Analytics</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-purple-100">
                  Deep dive into performance metrics and trends
                </CardDescription>
                <Button asChild className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <Link to="/statistics">View Analytics</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Additional Quick Action - Team Management */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-orange-500 to-red-600 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-500/20 group-hover:from-orange-300/30 group-hover:to-red-400/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Team Hub</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-orange-100">
                  Manage players, squads, and team configurations
                </CardDescription>
                <Button asChild className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <Link to="/teams">Manage Teams</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Role-Specific Panels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Manager Panel */}
          {userRole === 'manager' && (
            <Card className="relative overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-400/10 dark:to-pink-400/10"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Manager Dashboard
                </CardTitle>
                <CardDescription className="text-base">
                  Advanced match management and comprehensive performance analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0">
                    <Link to="/matches">Manage Matches</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-purple-200 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/20">
                    <Link to="/statistics">View Analytics</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Panel */}
          {userRole === 'admin' && (
            <Card className="relative overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-800/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 dark:from-orange-400/10 dark:to-red-400/10"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Admin Control Center
                </CardTitle>
                <CardDescription className="text-base">
                  Full system control with user management and advanced settings
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0">
                    <Link to="/admin">Admin Panel</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-orange-200 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-900/20">
                    <Link to="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity - Enhanced Design */}
        <Card className="relative overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 dark:from-slate-400/10 dark:to-gray-400/10"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-center py-12 space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-700 dark:to-gray-800 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">No recent activity</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 max-w-md mx-auto">
                  {userRole === 'tracker' && "Join a match to start tracking and see real-time updates here"}
                  {(userRole === 'admin' || userRole === 'manager') && "Create a new match to see live activity and match statistics"}
                  {(userRole === 'user' || userRole === 'teacher') && "Activity will appear here once matches are started and tracked"}
                </p>
              </div>
              <div className="pt-4">
                <Button variant="outline" className="bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 backdrop-blur-sm border-slate-200 dark:border-slate-600">
                  <Zap className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;