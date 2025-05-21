
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardMetricsGridProps {
  matches: any[];
}

const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({ matches }) => {
  // Calculate advanced metrics
  const calculateMetrics = () => {
    if (!matches.length) return { passAccuracy: 0, possessionAvg: 0, shotAccuracy: 0, foulsPerMatch: 0 };
    
    const totalPasses = matches.reduce((sum, match) => {
      return sum + 
        (match.statistics?.passes?.home?.attempted || 0) + 
        (match.statistics?.passes?.away?.attempted || 0);
    }, 0);
    
    const successfulPasses = matches.reduce((sum, match) => {
      return sum + 
        (match.statistics?.passes?.home?.successful || 0) + 
        (match.statistics?.passes?.away?.successful || 0);
    }, 0);
    
    const totalShots = matches.reduce((sum, match) => {
      const homeShots = (match.statistics?.shots?.home?.onTarget || 0) + (match.statistics?.shots?.home?.offTarget || 0);
      const awayShots = (match.statistics?.shots?.away?.onTarget || 0) + (match.statistics?.shots?.away?.offTarget || 0);
      return sum + homeShots + awayShots;
    }, 0);
    
    const shotsOnTarget = matches.reduce((sum, match) => {
      return sum + 
        (match.statistics?.shots?.home?.onTarget || 0) + 
        (match.statistics?.shots?.away?.onTarget || 0);
    }, 0);
    
    const totalFouls = matches.reduce((sum, match) => {
      return sum + 
        (match.statistics?.ballsLost?.home || 0) + 
        (match.statistics?.ballsLost?.away || 0);
    }, 0);
    
    const possessionSum = matches.reduce((sum, match) => {
      // Using home possession as reference
      return sum + (match.statistics?.possession?.home || 50);
    }, 0);
    
    return {
      passAccuracy: totalPasses ? Math.round((successfulPasses / totalPasses) * 100) : 0,
      shotAccuracy: totalShots ? Math.round((shotsOnTarget / totalShots) * 100) : 0,
      possessionAvg: matches.length ? Math.round(possessionSum / matches.length) : 50,
      foulsPerMatch: matches.length ? Math.round(totalFouls / matches.length) : 0
    };
  };
  
  const metrics = calculateMetrics();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-sm text-muted-foreground">Pass Accuracy</div>
            <div className="text-2xl font-bold mt-1">{metrics.passAccuracy}%</div>
          </div>
          
          <div className="border rounded-md p-4 text-center">
            <div className="text-sm text-muted-foreground">Shot Accuracy</div>
            <div className="text-2xl font-bold mt-1">{metrics.shotAccuracy}%</div>
          </div>
          
          <div className="border rounded-md p-4 text-center">
            <div className="text-sm text-muted-foreground">Avg. Possession</div>
            <div className="text-2xl font-bold mt-1">{metrics.possessionAvg}%</div>
          </div>
          
          <div className="border rounded-md p-4 text-center">
            <div className="text-sm text-muted-foreground">Fouls/Match</div>
            <div className="text-2xl font-bold mt-1">{metrics.foulsPerMatch}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMetricsGrid;
