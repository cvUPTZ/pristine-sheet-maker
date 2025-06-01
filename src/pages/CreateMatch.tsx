
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';
import { useIsMobile } from '@/hooks/use-mobile';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const isMobile = useIsMobile();

  const handleMatchSubmit = (submittedMatch: any) => {
    // Navigate back to admin page or match details page after successful creation/update
    if (matchId) {
      navigate(`/match/${matchId}`);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(matchId ? `/match/${matchId}` : '/admin')}
            className="mb-3 sm:mb-4 text-xs sm:text-sm"
            size={isMobile ? "sm" : "default"}
          >
            {matchId ? '← Back to Match Details' : '← Back to Admin'}
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            {matchId ? 'Edit Match' : 'Create New Match'}
          </h1>
        </div>

        <CreateMatchForm matchId={matchId} onMatchSubmit={handleMatchSubmit} />
      </div>
    </div>
  );
};

export default CreateMatch;
