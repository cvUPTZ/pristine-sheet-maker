import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Users, 
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Download
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts';
import { Statistics, PlayerStatSummary } from '@/types';

interface AdvancedAnalyticsDashboardProps {
  statistics: Statistics;
  playerStats: PlayerStatSummary[];
  homeTeamName: string;
  awayTeamName: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  statistics,
  playerStats,
  homeTeamName,
  awayTeamName,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('performance');
  const [activeFilter, setActiveFilter] = useState('all');

  // Calculate key performance indicators
  const kpis = useMemo(() => {
    const homeStats = statistics.home;
    const awayStats = statistics.away;
    
    return {
      totalPossession: {
        home: homeStats?.possessionPercentage || 0,
        away: awayStats?.possessionPercentage || 0,
        trend: (homeStats?.possessionPercentage || 0) > 50 ? 'up' : 'down'
      },
      efficiency: {
        home: homeStats?.passesAttempted ? 
          Math.round((homeStats.passesCompleted / homeStats.passesAttempted) * 100) : 0,
        away: awayStats?.passesAttempted ? 
          Math.round((awayStats.passesCompleted / awayStats.passesAttempted) * 100) : 0,
        trend: 'up'
      },
      attacking: {
        home: (homeStats?.shots || 0) + (homeStats?.shotsOnTarget || 0),
        away: (awayStats?.shots || 0) + (awayStats?.shotsOnTarget || 0),
        trend: 'up'
      },
      defensive: {
        home: (homeStats?.ballsRecovered || 0) + (homeStats?.duelsWon || 0),
        away: (awayStats?.ballsRecovered || 0) + (awayStats?.duelsWon || 0),
        trend: 'up'
      }
    };
  }, [statistics]);

  // Performance trend data
  const performanceTrendData = useMemo(() => {
    return [
      { time: '0-15min', home: 85, away: 72 },
      { time: '15-30min', home: 78, away: 83 },
      { time: '30-45min', home: 92, away: 68 },
      { time: '45-60min', home: 88, away: 75 },
      { time: '60-75min', home: 76, away: 89 },
      { time: '75-90min', home: 94, away: 71 },
    ];
  }, []);

  // Player performance radar data
  const playerRadarData = useMemo(() => {
    return playerStats.slice(0, 6).map(player => ({
      player: player.playerName || `Player ${player.playerId}`,
      passing: Math.min(100, (player.passesCompleted || 0) * 2),
      shooting: Math.min(100, (player.shots || 0) * 10),
      defending: Math.min(100, (player.ballsRecovered || 0) * 5),
      possession: Math.min(100, (player.ballsPlayed || 0) * 1.5),
      team: player.team
    }));
  }, [playerStats]);

  const teamPerformanceData = useMemo(() => [
    { metric: 'Possession', home: kpis.totalPossession.home, away: kpis.totalPossession.away },
    { metric: 'Pass Accuracy', home: kpis.efficiency.home, away: kpis.efficiency.away },
    { metric: 'Shots', home: statistics.home?.shots || 0, away: statistics.away?.shots || 0 },
    { metric: 'Duels Won', home: statistics.home?.duelsWon || 0, away: statistics.away?.duelsWon || 0 },
  ], [kpis, statistics]);

  const chartConfig = {
    home: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    away: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  const pieChartConfig = useMemo(() => playerRadarData.reduce((acc, entry, index) => {
    acc[entry.player] = {
        label: entry.player,
        color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as any), [playerRadarData]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Advanced Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time match insights and performance analytics
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="first-half">First Half</SelectItem>
              <SelectItem value="second-half">Second Half</SelectItem>
              <SelectItem value="last-15">Last 15 min</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-950/50 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Ball Possession</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {kpis.totalPossession.home}%
                  </span>
                  {kpis.totalPossession.trend === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> : 
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  }
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-500">vs {kpis.totalPossession.away}% away</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/50 dark:to-teal-950/50 border-teal-200 dark:border-teal-800 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-1">Pass Efficiency</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                    {kpis.efficiency.home}%
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-teal-700 dark:text-teal-500">vs {kpis.efficiency.away}% away</p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <Target className="h-8 w-8 text-teal-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-950/50 border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">Attacking Actions</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    {kpis.attacking.home}
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-500">vs {kpis.attacking.away} away</p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <Zap className="h-8 w-8 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-950/50 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Defensive Actions</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {kpis.defensive.home}
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-500">vs {kpis.defensive.away} away</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Players
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Performance Comparison */}
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Team Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="home" fill="var(--color-home)" radius={4} />
                      <Bar dataKey="away" fill="var(--color-away)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Performance Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="home" 
                        stackId="1" 
                        stroke="var(--color-home)" 
                        fill="var(--color-home)"
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="away" 
                        stackId="1"
                        stroke="var(--color-away)" 
                        fill="var(--color-away)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-950/50 border-indigo-200 dark:border-indigo-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Shot Conversion</h3>
                  <div className="relative w-24 h-24 mx-auto mb-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        data={[{ value: 75 }]} 
                        innerRadius="80%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar dataKey="value" fill="hsl(var(--chart-5))" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100">75%</span>
                    </div>
                  </div>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400">Above average</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-950/50 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Defensive Solidity</h3>
                  <div className="relative w-24 h-24 mx-auto mb-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart data={[{ value: 88 }]} innerRadius="80%" outerRadius="100%" startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" fill="hsl(var(--chart-2))" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-900 dark:text-purple-100">88%</span>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Excellent</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/50 dark:to-teal-950/50 border-teal-200 dark:border-teal-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-teal-900 dark:text-teal-100 mb-2">Ball Recovery</h3>
                  <div className="relative w-24 h-24 mx-auto mb-3">
                     <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart data={[{ value: 92 }]} innerRadius="80%" outerRadius="100%" startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" fill="hsl(var(--chart-3))" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-teal-900 dark:text-teal-100">92%</span>
                    </div>
                  </div>
                  <p className="text-sm text-teal-700 dark:text-teal-400">Outstanding</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {playerStats.slice(0, 5).map((player, index) => (
                    <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={`border-transparent text-white ${player.team === 'home' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{player.playerName || `Player ${player.playerId}`}</p>
                          <p className="text-sm text-muted-foreground">{player.team === 'home' ? homeTeamName : awayTeamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{(player.ballsPlayed || 0) + (player.passesCompleted || 0)}</p>
                        <p className="text-sm text-muted-foreground">Actions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Player Performance Distribution */}
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Player Passing Contribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pieChartConfig} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={playerRadarData}
                        dataKey="passing"
                        nameKey="player"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          if (percent < 0.05) return null; // Hide small labels
                          return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {playerRadarData.map((entry) => (
                          <Cell key={`cell-${entry.player}`} fill={pieChartConfig[entry.player]?.color || "#8884d8"} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="player" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Match Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="home" 
                      stroke="var(--color-home)" 
                      strokeWidth={3}
                      dot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="away" 
                      stroke="var(--color-away)" 
                      strokeWidth={3}
                      dot={{ r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-200 dark:bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Key Insight</h3>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  {homeTeamName} is dominating possession in the midfield
                </p>
                <Progress value={75} className="h-2 [&>div]:bg-blue-500" />
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">75% control rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-teal-200 dark:bg-teal-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-teal-900 dark:text-teal-100">Opportunity</h3>
                </div>
                <p className="text-sm text-teal-800 dark:text-teal-200 mb-3">
                  High conversion rate on counter-attacks
                </p>
                <Progress value={88} className="h-2 [&>div]:bg-teal-500" />
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">88% success rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-200 dark:bg-purple-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">Alert</h3>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  Defensive pressure increasing
                </p>
                <Progress value={92} className="h-2 [&>div]:bg-purple-500" />
                <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">92% intensity</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
