
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import MatchPlanningNetwork from '@/components/match/MatchPlanningNetwork';
import { useIsMobile } from '@/hooks/use-mobile';

const MatchPlanningPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const isMobile = useIsMobile();

  if (!matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-4 sm:p-6">
            <p className="text-base sm:text-lg font-semibold">Match ID is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 sm:p-2 lg:p-4 max-w-7xl">
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Match Planning Visualization</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Network view of trackers, players, event types, and their relationships
        </p>
      </div>

      <MatchPlanningNetwork 
        matchId={matchId}
        width={isMobile ? 350 : 800}
        height={isMobile ? 400 : 600}
      />
    </div>
  );
};

export default MatchPlanningPage;
