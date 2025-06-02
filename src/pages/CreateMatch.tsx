
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateMatchForm from '@/components/CreateMatchForm';
import TrackerAssignment from '@/components/match/TrackerAssignment';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();

  const handleMatchSubmit = (submittedMatch: any) => {
    // Navigate back to admin page or match details page after successful creation/update
    if (matchId) {
      navigate(`/match/${matchId}`);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(matchId ? `/match/${matchId}` : '/admin')}
            className="mb-4"
          >
            {matchId ? '← Back to Match Details' : '← Back to Admin'}
          </Button>
          <h1 className="text-3xl font-bold">{matchId ? 'Edit Match' : 'Create New Match'}</h1>
        </div>

        <Tabs defaultValue="match-details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="match-details">Match Details</TabsTrigger>
            <TabsTrigger value="tracker-assignment">Tracker Assignment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="match-details" className="mt-6">
            <CreateMatchForm matchId={matchId} onMatchSubmit={handleMatchSubmit} />
          </TabsContent>
          
          <TabsContent value="tracker-assignment" className="mt-6">
            {matchId && (
              <TrackerAssignment
                matchId={matchId}
                homeTeamPlayers={[]}
                awayTeamPlayers={[]}
              />
            )}
            {!matchId && (
              <div className="text-center py-8 text-gray-500">
                <p>Save the match details first to assign trackers</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateMatch;
