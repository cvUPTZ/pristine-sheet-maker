
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import CreateMatchForm from '@/components/CreateMatchForm';
import TrackerAssignment from '@/components/match/TrackerAssignment';
import { ArrowLeft, ListTodo, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { toast } = useToast();

  const handleMatchSubmit = (submittedMatch: any) => {
    if (submittedMatch?.id) {
      if (matchId) {
        toast({
          title: 'Match Updated',
          description: 'The match details have been saved successfully.',
        });
        // Stay on page to allow further edits
      } else {
        // After creation, navigate to the edit page for the new match
        navigate(`/match/${submittedMatch.id}`);
        toast({
          title: 'Match Created',
          description: 'You can now assign trackers to the match.',
        });
      }
    } else {
      // Fallback navigation
      if (matchId) {
        navigate(`/match/${matchId}`);
      } else {
        navigate('/admin');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {matchId ? 'Edit Match' : 'Create New Match'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {matchId ? 'Update match details and manage tracker assignments.' : 'Complete match details to enable tracker assignment.'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="match-details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-200/70 p-1 rounded-xl">
            <TabsTrigger 
              value="match-details"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 flex items-center gap-2 py-2.5"
            >
              <ListTodo className="h-5 w-5" />
              Match Details
            </TabsTrigger>
            <TabsTrigger 
              value="tracker-assignment"
              disabled={!matchId}
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 flex items-center gap-2 py-2.5"
            >
              <Users className="h-5 w-5" />
              Tracker Assignment
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="match-details" className="mt-6">
            <Card className="shadow-lg border-gray-200 bg-white">
              <CardContent className="p-6 sm:p-8">
                <CreateMatchForm matchId={matchId} onMatchSubmit={handleMatchSubmit} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tracker-assignment" className="mt-6">
            {matchId ? (
              <Card className="shadow-lg border-gray-200 bg-white">
                <CardContent className="p-6 sm:p-8">
                  <TrackerAssignment
                    matchId={matchId}
                    homeTeamPlayers={[]}
                    awayTeamPlayers={[]}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-gray-200 bg-white">
                <CardContent className="text-center py-16 px-6 text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700">Assign Trackers</h3>
                  <p className="mt-1">You must save the match details before you can assign trackers.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateMatch;
