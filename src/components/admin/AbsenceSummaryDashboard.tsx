
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface AbsenceSummaryDashboardProps {
  totalTrackers: number;
  activeTrackers: number;
  absentTrackers: number;
  averageResponseTime: number;
}

const AbsenceSummaryDashboard: React.FC<AbsenceSummaryDashboardProps> = ({
  totalTrackers,
  activeTrackers,
  absentTrackers,
  averageResponseTime
}) => {
  const getHealthStatus = () => {
    const activePercentage = (activeTrackers / totalTrackers) * 100;
    if (activePercentage >= 90) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (activePercentage >= 70) return { status: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'Needs Attention', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const healthStatus = getHealthStatus();

  const stats = [
    {
      title: 'Total Trackers',
      value: totalTrackers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Trackers',
      value: activeTrackers,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Absent Trackers',
      value: absentTrackers,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Avg Response Time',
      value: `${averageResponseTime}s`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tracker Network Health</span>
          <Badge className={`${healthStatus.color} ${healthStatus.bgColor} border-0`}>
            {healthStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              className="text-center p-4 rounded-lg border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.bgColor} mb-2`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.title}</div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenceSummaryDashboard;
