
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartLineIcon, LayoutDashboard, Settings, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DashboardMetricsGrid from '@/components/dashboard/DashboardMetricsGrid';
import DashboardChart from '@/components/dashboard/DashboardChart';
import RecentMatchesList from '@/components/dashboard/RecentMatchesList';
import { useEffect, useState } from 'react';

interface SavedMatch {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  date: string;
  statistics: any;
}

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const [recentMatches, setRecentMatches] = useState<SavedMatch[]>([]);

  useEffect(() => {
    // Load saved matches from localStorage
    const loadSavedMatches = () => {
      const matches: SavedMatch[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('efootpad_match_')) {
          try {
            const matchData = JSON.parse(localStorage.getItem(key) || '{}');
            matches.push({
              id: matchData.matchId,
              homeTeam: matchData.homeTeam,
              awayTeam: matchData.awayTeam,
              date: new Date(matchData.date).toLocaleString(),
              statistics: matchData.statistics
            });
          } catch (error) {
            console.error('Error parsing match data:', error);
          }
        }
      }
      return matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    setRecentMatches(loadSavedMatches());
  }, []);

  const totalMatchesPlayed = recentMatches.length;
  const totalGoalsScored = recentMatches.reduce((total, match) => {
    return total + 
      (match.statistics?.shots?.home?.onTarget || 0) + 
      (match.statistics?.shots?.away?.onTarget || 0);
  }, 0);
  
  const totalPassesCompleted = recentMatches.reduce((total, match) => {
    return total + 
      (match.statistics?.passes?.home?.successful || 0) + 
      (match.statistics?.passes?.away?.successful || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent">
            EFOOTPAD DASHBOARD
          </h1>
          <p className="text-center text-muted-foreground mt-2">
            Football Match Analysis & Statistics
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-football-home" />
                Matches Played
              </CardTitle>
              <CardDescription>Total tracked matches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{totalMatchesPlayed}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-football-away" />
                Goals Scored
              </CardTitle>
              <CardDescription>Total across all matches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{totalGoalsScored}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartLineIcon className="h-5 w-5 text-green-600" />
                Passes Completed
              </CardTitle>
              <CardDescription>Total successful passes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{totalPassesCompleted}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartLineIcon className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
                <CardDescription>Analysis of recent matches</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardChart matches={recentMatches} />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>Last {Math.min(5, recentMatches.length)} matches</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentMatchesList matches={recentMatches.slice(0, 5)} />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/matches">View All Matches</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardMetricsGrid matches={recentMatches} />
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button className="h-24 flex-col" asChild>
                  <Link to="/match">
                    <span className="text-lg mb-1">New Match</span>
                    <span className="text-xs text-muted-foreground">Track a new game</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-24 flex-col" asChild>
                  <Link to="/statistics">
                    <span className="text-lg mb-1">Statistics</span>
                    <span className="text-xs text-muted-foreground">Detailed analytics</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
