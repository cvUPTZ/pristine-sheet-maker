
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();

  const handleMatchCreated = (newMatch: any) => {
    // Navigate back to admin page after successful creation
    navigate('/admin');
  };

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
          <h1 className="text-3xl font-bold">Create New Match</h1>
        </div>

        <CreateMatchForm onMatchCreated={handleMatchCreated} />
      </div>
    </div>
  );
};

export default CreateMatch;
