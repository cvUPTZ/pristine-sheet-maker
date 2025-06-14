
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
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex items-center justify-center ${isMobile ? 'px-2' : 'px-2 sm:px-4'}`}>
        <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className={`text-center ${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
            <p className={`font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent ${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>Match ID is missing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50`}>
      <div className={`container mx-auto max-w-7xl ${isMobile ? 'p-1' : 'p-1 sm:p-2 lg:p-4'}`}>
        <div className={`${isMobile ? 'mb-2' : 'mb-3 sm:mb-4'}`}>
          <h1 className={`font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent ${isMobile ? 'text-base' : 'text-lg sm:text-xl lg:text-2xl'}`}>
            {isMobile ? 'Match Planning' : 'Match Planning Visualization'}
          </h1>
          <p className={`text-slate-600 mt-0.5 sm:mt-1 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'}`}>
            {isMobile ? 'Network view of trackers and relationships' : 'Network view of trackers, players, event types, and their relationships'}
          </p>
        </div>

        <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-2 sm:p-4">
            <MatchPlanningNetwork 
              matchId={matchId}
              width={isMobile ? 350 : 800}
              height={isMobile ? 400 : 600}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchPlanningPage;
