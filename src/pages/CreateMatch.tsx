
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import CreateMatchForm from '@/components/CreateMatchForm';
import TrackerAssignment from '@/components/match/TrackerAssignment';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, ListTodo, Users, LayoutDashboard, Play, Calendar, BarChart3, TrendingUp, Target } from 'lucide-react';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { toast } = useToast();
  const { userRole } = useAuth();

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

  const menuItems = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' }
  ];

  if (userRole === 'admin' || userRole === 'tracker') {
    menuItems.push({ value: 'new-match', label: 'New Match', icon: Play, path: '/match' });
  }
  if (userRole === 'admin' || userRole === 'manager') {
    menuItems.push({ value: 'match-history', label: 'Match History', icon: Calendar, path: '/matches' });
  }
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'teacher') {
    menuItems.push({ value: 'statistics', label: 'Statistics', icon: BarChart3, path: '/statistics' });
  }
  if (userRole === 'admin' || userRole === 'manager') {
    menuItems.push({ value: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' });
  }
  if (userRole === 'admin') {
    menuItems.push({ value: 'admin', label: 'Admin Panel', icon: Target, path: '/admin' });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex w-full">
        <MatchAnalysisSidebar menuItems={menuItems} groupLabel="Navigation" />
        <SidebarInset>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back</span>
                </Button>
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {matchId ? 'Edit Match' : 'Create New Match'}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {matchId ? 'Update match details and manage tracker assignments.' : 'Complete match details to enable tracker assignment.'}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="match-details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger 
                    value="match-details"
                    className="flex items-center gap-2"
                  >
                    <ListTodo className="h-4 w-4" />
                    Match Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tracker-assignment"
                    disabled={!matchId}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Tracker Assignment
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="match-details" className="mt-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl">
                    <CardContent className="p-6 sm:p-8">
                      <CreateMatchForm matchId={matchId} onMatchSubmit={handleMatchSubmit} />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="tracker-assignment" className="mt-6">
                  {matchId ? (
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl">
                      <CardContent className="p-6 sm:p-8">
                        <TrackerAssignment
                          matchId={matchId}
                          homeTeamPlayers={[]}
                          awayTeamPlayers={[]}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl">
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CreateMatch;
