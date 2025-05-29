import React from 'react';
// Potentially import types for props if you pass data, e.g., Statistics from '@/types'

interface StatisticsTabPlaceholderProps {
  // Example: Pass statistics data if available and to be shown
  // statisticsData: Statistics | null; 
}

const StatisticsTabPlaceholder: React.FC<StatisticsTabPlaceholderProps> = (props) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">Statistics View</h3>
      <p className="text-sm text-muted-foreground">
        This area will display detailed match statistics. (Requires 'statistics' permission).
      </p>
      {/* TODO: Display actual statistics data if props.statisticsData is provided */}
    </div>
  );
};
export default StatisticsTabPlaceholder;
