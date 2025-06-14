
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import CreateMatchForm from '@/components/CreateMatchForm';
import TrackerAssignment from '@/components/match/TrackerAssignment';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();

  const handleMatchSubmit = (submittedMatch: any) => {
    if (matchId) {
      navigate(`/match/${matchId}`);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(matchId ? `/match/${matchId}` : '/admin')}
            className="mb-4 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm"
          >
            {matchId ? '← Back to Match Details' : '← Back to Admin'}
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {matchId ? 'Edit Match' : 'Create New Match'}
          </h1>
        </div>

        <Tabs defaultValue="match-details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200">
            <TabsTrigger 
              value="match-details"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              Match Details
            </TabsTrigger>
            <TabsTrigger 
              value="tracker-assignment"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              Tracker Assignment
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="match-details" className="mt-6">
            <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <CreateMatchForm matchId={matchId} onMatchSubmit={handleMatchSubmit} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tracker-assignment" className="mt-6">
            {matchId ? (
              <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <TrackerAssignment
                    matchId={matchId}
                    homeTeamPlayers={[]}
                    awayTeamPlayers={[]}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="text-center py-8 text-slate-500">
                  <p>Save the match details first to assign trackers</p>
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
