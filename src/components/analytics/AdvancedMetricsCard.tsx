
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricData {
  label: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'percentage' | 'time' | 'decimal';
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

interface AdvancedMetricsCardProps {
  title: string;
  metrics: MetricData[];
  className?: string;
}

const AdvancedMetricsCard: React.FC<AdvancedMetricsCardProps> = ({ 
  title, 
  metrics, 
  className = "" 
}) => {
  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`;
      case 'decimal':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const calculateTrendPercentage = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="text-2xl font-bold">
                {formatValue(metric.value, metric.format)}
              </div>
              {metric.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(metric.trend)}
              {metric.previousValue && typeof metric.value === 'number' && (
                <div className="text-sm">
                  {calculateTrendPercentage(metric.value, metric.previousValue)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdvancedMetricsCard;
