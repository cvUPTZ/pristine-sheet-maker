
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Shield,
  Crosshair,
  Users,
  Timer,
  Award
} from 'lucide-react';
import { Statistics } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveMetricsGridProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const InteractiveMetricsGrid: React.FC<InteractiveMetricsGridProps> = ({
  statistics,
  homeTeamName,
  awayTeamName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'offensive' | 'defensive' | 'possession' | 'discipline'>('offensive');
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const categories = {
    offensive: {
      title: 'Offensive Metrics',
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      metrics: [
        {
          key: 'shots',
          label: 'Total Shots',
          home: statistics.home?.shots || 0,
          away: statistics.away?.shots || 0,
          icon: Crosshair,
          format: 'number'
        },
        {
          key: 'shotsOnTarget',
          label: 'Shots on Target',
          home: statistics.home?.shotsOnTarget || 0,
          away: statistics.away?.shotsOnTarget || 0,
          icon: Target,
          format: 'number'
        },
        {
          key: 'goals',
          label: 'Goals',
          home: statistics.home?.goals || 0,
          away: statistics.away?.goals || 0,
          icon: Award,
          format: 'number'
        },
        {
          key: 'crosses',
          label: 'Crosses',
          home: statistics.home?.crosses || 0,
          away: statistics.away?.crosses || 0,
          icon: Activity,
          format: 'number'
        },
        {
          key: 'offensivePasses',
          label: 'Offensive Passes',
          home: statistics.home?.offensivePasses || 0,
          away: statistics.away?.offensivePasses || 0,
          icon: TrendingUp,
          format: 'number'
        },
      ]
    },
    defensive: {
      title: 'Defensive Metrics',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      metrics: [
        {
          key: 'ballsRecovered',
          label: 'Balls Recovered',
          home: statistics.home?.ballsRecovered || 0,
          away: statistics.away?.ballsRecovered || 0,
          icon: Shield,
          format: 'number'
        },
        {
          key: 'duelsWon',
          label: 'Duels Won',
          home: statistics.home?.duelsWon || 0,
          away: statistics.away?.duelsWon || 0,
          icon: Users,
          format: 'number'
        },
        {
          key: 'tackles',
          label: 'Tackles',
          home: statistics.home?.tackles || 0,
          away: statistics.away?.tackles || 0,
          icon: Activity,
          format: 'number'
        },
        {
          key: 'interceptions',
          label: 'Interceptions',
          home: statistics.home?.interceptions || 0,
          away: statistics.away?.interceptions || 0,
          icon: Zap,
          format: 'number'
        },
        {
          key: 'clearances',
          label: 'Clearances',
          home: statistics.home?.clearances || 0,
          away: statistics.away?.clearances || 0,
          icon: TrendingUp,
          format: 'number'
        },
      ]
    },
    possession: {
      title: 'Possession Metrics',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      metrics: [
        {
          key: 'possession',
          label: 'Ball Possession',
          home: statistics.home?.possessionPercentage || 0,
          away: statistics.away?.possessionPercentage || 0,
          icon: Timer,
          format: 'percentage'
        },
        {
          key: 'passAccuracy',
          label: 'Pass Accuracy',
          home: statistics.home?.passesAttempted ? 
            Math.round((statistics.home.passesCompleted / statistics.home.passesAttempted) * 100) : 0,
          away: statistics.away?.passesAttempted ? 
            Math.round((statistics.away.passesCompleted / statistics.away.passesAttempted) * 100) : 0,
          icon: Target,
          format: 'percentage'
        },
        {
          key: 'ballsPlayed',
          label: 'Balls Played',
          home: statistics.home?.ballsPlayed || 0,
          away: statistics.away?.ballsPlayed || 0,
          icon: Activity,
          format: 'number'
        },
        {
          key: 'contacts',
          label: 'Ball Contacts',
          home: statistics.home?.contacts || 0,
          away: statistics.away?.contacts || 0,
          icon: Users,
          format: 'number'
        },
      ]
    },
    discipline: {
      title: 'Discipline & Flow',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      metrics: [
        {
          key: 'foulsCommitted',
          label: 'Fouls Committed',
          home: statistics.home?.foulsCommitted || 0,
          away: statistics.away?.foulsCommitted || 0,
          icon: TrendingDown,
          format: 'number'
        },
        {
          key: 'yellowCards',
          label: 'Yellow Cards',
          home: statistics.home?.yellowCards || 0,
          away: statistics.away?.yellowCards || 0,
          icon: Award,
          format: 'number'
        },
        {
          key: 'corners',
          label: 'Corner Kicks',
          home: statistics.home?.corners || 0,
          away: statistics.away?.corners || 0,
          icon: Activity,
          format: 'number'
        },
        {
          key: 'offsides',
          label: 'Offsides',
          home: statistics.home?.offsides || 0,
          away: statistics.away?.offsides || 0,
          icon: TrendingDown,
          format: 'number'
        },
      ]
    }
  };

  const currentCategory = categories[selectedCategory];

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categories).map(([key, category]) => {
          const IconComponent = category.icon;
          return (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              onClick={() => setSelectedCategory(key as any)}
              className="flex items-center gap-2"
            >
              <IconComponent className="h-4 w-4" />
              {category.title}
            </Button>
          );
        })}
      </div>

      {/* Metrics Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {currentCategory.metrics.map((metric) => {
            const IconComponent = metric.icon;
            const homeValue = metric.home;
            const awayValue = metric.away;
            const total = homeValue + awayValue;
            const homePercentage = total > 0 ? (homeValue / total) * 100 : 50;
            const isHovered = hoveredMetric === metric.key;

            return (
              <motion.div
                key={metric.key}
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`${currentCategory.bgColor} ${currentCategory.borderColor} cursor-pointer transition-all duration-300 ${
                    isHovered ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'
                  }`}
                  onMouseEnter={() => setHoveredMetric(metric.key)}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-sm font-medium ${currentCategory.color} flex items-center gap-2`}>
                      <IconComponent className="h-4 w-4" />
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Values */}
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {metric.format === 'percentage' ? `${homeValue}%` : homeValue}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {homeTeamName}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {metric.format === 'percentage' ? `${awayValue}%` : awayValue}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {awayTeamName}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={homePercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{homePercentage.toFixed(1)}%</span>
                        <span>{(100 - homePercentage).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Trend Indicator */}
                    <div className="flex justify-center">
                      {homeValue > awayValue ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          {homeTeamName} leads
                        </div>
                      ) : homeValue < awayValue ? (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <TrendingDown className="h-3 w-3" />
                          {awayTeamName} leads
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Even
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default InteractiveMetricsGrid;
