
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
    <Card className="bg-white/60 backdrop-blur-lg border-slate-200/80 shadow-lg hover:shadow-xl rounded-2xl transition-all h-full">
      <CardHeader>
        <CardTitle>Overall Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50/50 rounded-lg p-4 text-center transition-all hover:bg-slate-100/70">
            <div className="text-sm text-slate-600">Pass Accuracy</div>
            <div className="text-2xl font-bold mt-1 text-blue-700">{metrics.passAccuracy}%</div>
          </div>
          
          <div className="bg-slate-50/50 rounded-lg p-4 text-center transition-all hover:bg-slate-100/70">
            <div className="text-sm text-slate-600">Shot Accuracy</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">{metrics.shotAccuracy}%</div>
          </div>
          
          <div className="bg-slate-50/50 rounded-lg p-4 text-center transition-all hover:bg-slate-100/70">
            <div className="text-sm text-slate-600">Avg. Possession</div>
            <div className="text-2xl font-bold mt-1 text-purple-700">{metrics.possessionAvg}%</div>
          </div>
          
          <div className="bg-slate-50/50 rounded-lg p-4 text-center transition-all hover:bg-slate-100/70">
            <div className="text-sm text-slate-600">Fouls/Match</div>
            <div className="text-2xl font-bold mt-1 text-red-700">{metrics.foulsPerMatch}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMetricsGrid;
