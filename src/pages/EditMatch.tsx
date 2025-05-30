
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';

const EditMatch: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const handleMatchUpdated = (updatedMatch: any) => {
    // Navigate back to admin page after successful update
    navigate('/admin');
  };

  if (!matchId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin')}
              className="mb-4"
            >
              ← Back to Admin
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-red-600">Match Not Found</h1>
              <p className="text-gray-600 mt-2">The match ID is missing or invalid.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            ← Back to Admin
          </Button>
        </div>

        <CreateMatchForm 
          onMatchUpdated={handleMatchUpdated}
          matchId={matchId}
          isEditMode={true}
        />
      </div>
    </div>
  );
};

export default EditMatch;
