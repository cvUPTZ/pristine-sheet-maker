import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Clock, Trophy, Target, Play, TrendingUp, Zap, Activity, Users, Settings } from 'lucide-react';

// Mock auth hook
const useAuth = () => ({ userRole: 'admin' });

const TrackerNotifications = () => (
  <div className="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
    <p className="text-sage-700 text-sm font-medium">📢 New match assignments available</p>
  </div>
);

const Dashboard = () => {
  const { userRole } = useAuth();

  // Handle navigation
  const handleNavigation = (path) => {
    console.log(`Navigating to: ${path}`);
    // In a real app, you would use your router here
    // For example: navigate(path) or window.location.href = path
    alert(`Would navigate to: ${path}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-sage-50 to-blue-50/30">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sage-600/5 to-stone-600/5"></div>
        <div className="relative container mx-auto px-6 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-stone-800 to-sage-700 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-stone-600 text-lg">
                Welcome to your football analytics command center
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sage-400 to-stone-500 flex items-center justify-center">
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

        {/* Quick Actions Grid - Calm Color Design */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(userRole === 'admin' || userRole === 'tracker') && (
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-sage-400 to-sage-500 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-sage-300/20 to-sage-400/20 group-hover:from-sage-200/30 group-hover:to-sage-300/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">New Match</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Play className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-sage-50">
                  Start tracking a new football match with real-time analytics
                </CardDescription>
                <Button 
                  onClick={() => handleNavigation('/match')}
                  className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                >
                  Start Match
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager') && (
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-slate-400 to-slate-500 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-300/20 to-slate-400/20 group-hover:from-slate-200/30 group-hover:to-slate-300/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Match History</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-slate-50">
                  Browse previous matches and detailed performance data
                </CardDescription>
                <Button 
                  onClick={() => handleNavigation('/matches')}
                  className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                >
                  View Matches
                </Button>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') && (
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-stone-400 to-stone-500 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-stone-300/20 to-stone-400/20 group-hover:from-stone-200/30 group-hover:to-stone-300/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Analytics</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-stone-50">
                  Deep dive into performance metrics and trends
                </CardDescription>
                <Button 
                  onClick={() => handleNavigation('/statistics')}
                  className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Team Management */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-400 to-blue-500 text-white transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/20 to-blue-400/20 group-hover:from-blue-200/30 group-hover:to-blue-300/30 transition-all duration-300"></div>
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Team Hub</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <CardDescription className="text-blue-50">
                  Manage players, squads, and team configurations
                </CardDescription>
                <Button 
                  onClick={() => handleNavigation('/teams')}
                  className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                >
                  Manage Teams
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Role-Specific Panels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Manager Panel */}
          {userRole === 'manager' && (
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-stone-500/5 to-sage-500/5"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-400 to-sage-400"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-stone-400 to-sage-500 flex items-center justify-center">
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
                  <Button 
                    onClick={() => handleNavigation('/matches')}
                    className="bg-gradient-to-r from-stone-400 to-sage-500 hover:from-stone-500 hover:to-sage-600 text-white border-0"
                  >
                    Manage Matches
                  </Button>
                  <Button 
                    onClick={() => handleNavigation('/statistics')}
                    variant="outline" 
                    className="border-stone-200 hover:bg-stone-50"
                  >
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Panel */}
          {userRole === 'admin' && (
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-stone-500/5"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-stone-400"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-400 to-stone-500 flex items-center justify-center">
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
                  <Button 
                    onClick={() => handleNavigation('/admin')}
                    className="bg-gradient-to-r from-slate-400 to-stone-500 hover:from-slate-500 hover:to-stone-600 text-white border-0"
                  >
                    Admin Panel
                  </Button>
                  <Button 
                    onClick={() => handleNavigation('/settings')}
                    variant="outline" 
                    className="border-slate-200 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity - Enhanced Design */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-stone-500/5 to-slate-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-stone-400 to-slate-500 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-center py-12 space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-stone-100 to-slate-200 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-stone-400" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-stone-600">No recent activity</p>
                <p className="text-sm text-stone-500 max-w-md mx-auto">
                  {userRole === 'tracker' && "Join a match to start tracking and see real-time updates here"}
                  {(userRole === 'admin' || userRole === 'manager') && "Create a new match to see live activity and match statistics"}
                  {(userRole === 'user' || userRole === 'teacher') && "Activity will appear here once matches are started and tracked"}
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={() => handleNavigation('/get-started')}
                  variant="outline" 
                  className="bg-white/70 hover:bg-white/90 backdrop-blur-sm border-stone-200"
                >
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