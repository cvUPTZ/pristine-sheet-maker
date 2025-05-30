import React from 'react';
// Potentially import types for props, e.g., MatchEvent from '@/types'

interface TimelineTabPlaceholderProps {
  // Example: Pass events data if available
  // events: MatchEvent[];
}

const TimelineTabPlaceholder: React.FC<TimelineTabPlaceholderProps> = (props) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">Match Timeline</h3>
      <p className="text-sm text-muted-foreground">
        This area will display a chronological timeline of match events. (Requires 'timeline' permission).
      </p>
      {/* TODO: Display actual timeline based on props.events */}
    </div>
  );
};
export default TimelineTabPlaceholder;
