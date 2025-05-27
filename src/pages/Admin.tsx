
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';
import { ArrowLeft, CalendarIcon, Plus, Trash2, Edit, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [matchDate, setMatchDate] = useState<Date>();
  const [status, setStatus] = useState<'draft' | 'published' | 'live' | 'completed' | 'archived'>('draft');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Redirect if user is not admin
  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [userRole, navigate, toast]);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  const createMatch = async () => {
    if (!homeTeamName.trim() || !awayTeamName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both team names",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([
          {
            home_team_name: homeTeamName.trim(),
            away_team_name: awayTeamName.trim(),
            match_date: matchDate?.toISOString(),
            status,
            description: description.trim(),
            created_by: user?.id,
            home_team_players: [],
            away_team_players: [],
            match_statistics: {},
            ball_tracking_data: []
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match created successfully",
      });

      // Reset form
      setHomeTeamName('');
      setAwayTeamName('');
      setMatchDate(undefined);
      setStatus('draft');
      setDescription('');

      // Refresh matches list
      fetchMatches();

      // Navigate to the new match
      if (data) {
        navigate(`/match/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create match",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match deleted successfully",
      });

      fetchMatches();
    } catch (error: any) {
      console.error('Error deleting match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete match",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'destructive';
      case 'completed':
        return 'default';
      case 'published':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (userRole !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Match Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeTeam">Home Team</Label>
                  <Input
                    id="homeTeam"
                    value={homeTeamName}
                    onChange={(e) => setHomeTeamName(e.target.value)}
                    placeholder="Enter home team name"
                  />
                </div>
                <div>
                  <Label htmlFor="awayTeam">Away Team</Label>
                  <Input
                    id="awayTeam"
                    value={awayTeamName}
                    onChange={(e) => setAwayTeamName(e.target.value)}
                    placeholder="Enter away team name"
                  />
                </div>
              </div>

              <div>
                <Label>Match Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !matchDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {matchDate ? format(matchDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={matchDate}
                      onSelect={setMatchDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Match description"
                />
              </div>

              <Button 
                onClick={createMatch} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Match'}
              </Button>
            </CardContent>
          </Card>

          {/* Matches List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMatches ? (
                <div className="text-center py-4">Loading matches...</div>
              ) : matches.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No matches created yet
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.slice(0, 10).map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {match.home_team_name} vs {match.away_team_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {match.match_date ? format(new Date(match.match_date), 'PPp') : 'No date set'}
                        </div>
                        <Badge variant={getStatusColor(match.status)} className="mt-1">
                          {getStatusText(match.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/match/${match.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMatch(match.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
