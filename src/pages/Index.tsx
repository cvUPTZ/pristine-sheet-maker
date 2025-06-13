
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CreateMatchForm from '@/components/CreateMatchForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, Users, Trophy, Activity, ArrowRight, Sparkles } from 'lucide-react';

interface Match {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string | null;
  created_at: string | null;
}

const Index = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchMatches = useCallback(async () => {
    setLoading(true); // Ensure loading is true at the start of fetch
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to fetch matches",
          variant: "destructive",
        });
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]); // Added toast as it's used inside

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]); // Now correctly depends on fetchMatches

  const handleMatchCreated = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);
    setShowCreateForm(false);
    navigate(`/match/${newMatch.id}`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'live': 
        return { 
          color: 'bg-gradient-to-r from-red-500 to-red-600', 
          icon: Activity,
          pulse: true 
        };
      case 'completed': 
        return { 
          color: 'bg-gradient-to-r from-emerald-500 to-emerald-600', 
          icon: Trophy,
          pulse: false 
        };
      case 'scheduled': 
        return { 
          color: 'bg-gradient-to-r from-amber-500 to-orange-500', 
          icon: Calendar,
          pulse: false 
        };
      default: 
        return { 
          color: 'bg-gradient-to-r from-slate-400 to-slate-500', 
          icon: Calendar,
          pulse: false 
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-600 font-medium">Loading your matches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/50 rounded-full text-blue-700 text-sm font-medium border border-blue-200/50">
            <Sparkles className="w-4 h-4" />
            Professional Football Analytics
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
            Football Matches
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Track, analyze, and manage your football matches with advanced analytics and real-time insights
          </p>
        </div>

        {/* Quick Actions */}
        {(userRole === 'admin' || userRole === 'tracker') && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Match
            </Button>
          </div>
        )}

        {/* Create Match Form */}
        {showCreateForm && (userRole === 'admin' || userRole === 'tracker') && (
          <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-2xl text-slate-800 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                Create New Match
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CreateMatchForm onMatchSubmit={handleMatchCreated} />
            </CardContent>
          </Card>
        )}

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const statusConfig = getStatusConfig(match.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={match.id} 
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 transform hover:-translate-y-1"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-800 transition-colors line-clamp-2">
                      {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                    </CardTitle>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                      <StatusIcon className="w-3 h-3" />
                      {match.status}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-slate-600">
                      <Users className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="font-medium text-sm">
                        {match.home_team_name} vs {match.away_team_name}
                      </span>
                    </div>
                    {match.match_date && (
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="text-sm">
                          {new Date(match.match_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => navigate(`/match/${match.id}`)}
                    className="w-full mt-6 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold py-3 group-hover:shadow-lg transition-all duration-300"
                  >
                    View Match Details
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {matches.length === 0 && (
          <Card className="max-w-md mx-auto text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No matches yet</h3>
              <p className="text-slate-600 mb-6">
                Create your first match to start tracking and analyzing football games with professional insights.
              </p>
              {(userRole === 'admin' || userRole === 'tracker') && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Match
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
