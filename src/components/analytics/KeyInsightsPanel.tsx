
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield, Zap } from 'lucide-react';
import { Statistics, BallTrackingPoint } from '@/types';

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'attack' | 'defense' | 'possession' | 'efficiency';
  title: string;
  description: string;
  value?: string;
  icon: React.ReactNode;
}

interface KeyInsightsPanelProps {
  statistics: Statistics;
  ballTrackingPoints: BallTrackingPoint[];
  homeTeamName: string;
  awayTeamName: string;
}

const KeyInsightsPanel: React.FC<KeyInsightsPanelProps> = ({
  statistics,
  ballTrackingPoints,
  homeTeamName,
  awayTeamName
}) => {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Possession insights
    const possessionDiff = Math.abs(statistics.possession.home - statistics.possession.away);
    if (possessionDiff > 20) {
      const dominantTeam = statistics.possession.home > statistics.possession.away ? homeTeamName : awayTeamName;
      insights.push({
        id: 'possession-dominance',
        type: 'positive',
        category: 'possession',
        title: 'Possession Dominance',
        description: `${dominantTeam} controls ${Math.max(statistics.possession.home, statistics.possession.away).toFixed(1)}% of possession`,
        value: `+${possessionDiff.toFixed(1)}%`,
        icon: <Target className="h-4 w-4" />
      });
    }

    // Shot efficiency insights
    const homeShots = statistics.shots.home.onTarget + statistics.shots.home.offTarget;
    const awayShots = statistics.shots.away.onTarget + statistics.shots.away.offTarget;
    const homeAccuracy = homeShots > 0 ? (statistics.shots.home.onTarget / homeShots) * 100 : 0;
    const awayAccuracy = awayShots > 0 ? (statistics.shots.away.onTarget / awayShots) * 100 : 0;

    if (homeAccuracy > 60 || awayAccuracy > 60) {
      const efficientTeam = homeAccuracy > awayAccuracy ? homeTeamName : awayTeamName;
      const accuracy = Math.max(homeAccuracy, awayAccuracy);
      insights.push({
        id: 'shot-efficiency',
        type: 'positive',
        category: 'attack',
        title: 'Clinical Finishing',
        description: `${efficientTeam} showing excellent shot accuracy`,
        value: `${accuracy.toFixed(1)}%`,
        icon: <Zap className="h-4 w-4" />
      });
    }

    // Pass completion insights
    const homePassAccuracy = statistics.passes.home.attempted > 0 
      ? (statistics.passes.home.successful / statistics.passes.home.attempted) * 100 
      : 0;
    const awayPassAccuracy = statistics.passes.away.attempted > 0 
      ? (statistics.passes.away.successful / statistics.passes.away.attempted) * 100 
      : 0;

    if (homePassAccuracy < 70 || awayPassAccuracy < 70) {
      const strugglingTeam = homePassAccuracy < awayPassAccuracy ? homeTeamName : awayTeamName;
      const accuracy = Math.min(homePassAccuracy, awayPassAccuracy);
      insights.push({
        id: 'pass-struggles',
        type: 'warning',
        category: 'efficiency',
        title: 'Passing Struggles',
        description: `${strugglingTeam} having difficulty with pass completion`,
        value: `${accuracy.toFixed(1)}%`,
        icon: <AlertTriangle className="h-4 w-4" />
      });
    }

    // Defensive insights
    const homeFoulsPerBallLost = statistics.ballsLost.home > 0 
      ? statistics.fouls.home / statistics.ballsLost.home 
      : 0;
    const awayFoulsPerBallLost = statistics.ballsLost.away > 0 
      ? statistics.fouls.away / statistics.ballsLost.away 
      : 0;

    if (homeFoulsPerBallLost > 0.8 || awayFoulsPerBallLost > 0.8) {
      const aggressiveTeam = homeFoulsPerBallLost > awayFoulsPerBallLost ? homeTeamName : awayTeamName;
      insights.push({
        id: 'aggressive-defense',
        type: 'negative',
        category: 'defense',
        title: 'Aggressive Defense',
        description: `${aggressiveTeam} showing high foul-to-tackle ratio`,
        icon: <Shield className="h-4 w-4" />
      });
    }

    // Ball tracking insights
    if (ballTrackingPoints.length > 100) {
      const recentPoints = ballTrackingPoints.slice(-50);
      const homeTeamPoints = recentPoints.filter(p => p.team === 'home').length;
      const awayTeamPoints = recentPoints.filter(p => p.team === 'away').length;
      
      if (homeTeamPoints > awayTeamPoints * 1.5 || awayTeamPoints > homeTeamPoints * 1.5) {
        const dominantTeam = homeTeamPoints > awayTeamPoints ? homeTeamName : awayTeamName;
        insights.push({
          id: 'recent-momentum',
          type: 'positive',
          category: 'possession',
          title: 'Recent Momentum',
          description: `${dominantTeam} gaining momentum in recent play`,
          icon: <TrendingUp className="h-4 w-4" />
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'attack':
        return 'bg-orange-100 text-orange-800';
      case 'defense':
        return 'bg-blue-100 text-blue-800';
      case 'possession':
        return 'bg-purple-100 text-purple-800';
      case 'efficiency':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Key Match Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No significant insights available yet.</p>
            <p className="text-sm">More data needed for analysis.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {insight.icon}
                    <h4 className="font-medium">{insight.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {insight.value && (
                      <span className="text-sm font-bold">{insight.value}</span>
                    )}
                    <Badge 
                      variant="outline" 
                      className={getCategoryBadgeColor(insight.category)}
                    >
                      {insight.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KeyInsightsPanel;
