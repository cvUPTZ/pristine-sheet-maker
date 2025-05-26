
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Users, Calendar, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Team, Player } from '@/types';
import FormationSelector from './FormationSelector';

interface CreateMatchFormProps {
  onMatchCreated?: (matchId: string) => void;
}

interface TrackerUser {
  id: string;
  full_name: string;
  email: string;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  
  // Form state
  const [matchName, setMatchName] = useState('');
  const [description, setDescription] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [homeTeam, setHomeTeam] = useState<Partial<Team>>({
    name: '',
    formation: '4-4-2',
    players: []
  });
  const [awayTeam, setAwayTeam] = useState<Partial<Team>>({
    name: '',
    formation: '4-3-3',
    players: []
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [editingTeam, setEditingTeam] = useState<'home' | 'away' | null>(null);

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'tracker');

      if (error) throw error;
      setTrackers(data || []);
    } catch (error: any) {
      console.error('Error fetching trackers:', error);
    }
  };

  const addPlayer = (teamType: 'home' | 'away') => {
    if (!newPlayerName || !newPlayerNumber || !newPlayerPosition) {
      toast({
        title: "Error",
        description: "Please fill in all player details",
        variant: "destructive"
      });
      return;
    }

    const newPlayer: Player = {
      id: Date.now(),
      name: newPlayerName,
      number: parseInt(newPlayerNumber),
      position: newPlayerPosition
    };

    if (teamType === 'home') {
      setHomeTeam(prev => ({
        ...prev,
        players: [...(prev.players || []), newPlayer]
      }));
    } else {
      setAwayTeam(prev => ({
        ...prev,
        players: [...(prev.players || []), newPlayer]
      }));
    }

    setNewPlayerName('');
    setNewPlayerNumber('');
    setNewPlayerPosition('');
  };

  const removePlayer = (teamType: 'home' | 'away', playerId: number) => {
    if (teamType === 'home') {
      setHomeTeam(prev => ({
        ...prev,
        players: prev.players?.filter(p => p.id !== playerId) || []
      }));
    } else {
      setAwayTeam(prev => ({
        ...prev,
        players: prev.players?.filter(p => p.id !== playerId) || []
      }));
    }
  };

  const sendNotificationsToTrackers = async (matchId: string) => {
    try {
      const notifications = trackers.map(tracker => ({
        match_id: matchId,
        tracker_id: tracker.id,
        message: `New match available for tracking: ${homeTeam.name} vs ${awayTeam.name}`,
        is_read: false
      }));

      const { error } = await supabase
        .from('match_notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Notifications Sent",
        description: `Notified ${trackers.length} trackers about the new match`,
      });
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Warning",
        description: "Match created but failed to notify trackers",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!matchName || !homeTeam.name || !awayTeam.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          name: matchName,
          description,
          home_team_name: homeTeam.name,
          away_team_name: awayTeam.name,
          home_team_formation: homeTeam.formation,
          away_team_formation: awayTeam.formation,
          home_team_players: homeTeam.players || [],
          away_team_players: awayTeam.players || [],
          match_date: matchDate ? new Date(matchDate).toISOString() : null,
          status: 'published',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await sendNotificationsToTrackers(data.id);

      toast({
        title: "Match Created",
        description: "Match has been created and trackers have been notified",
      });

      // Reset form
      setMatchName('');
      setDescription('');
      setMatchDate('');
      setHomeTeam({ name: '', formation: '4-4-2', players: [] });
      setAwayTeam({ name: '', formation: '4-3-3', players: [] });
      setIsOpen(false);

      if (onMatchCreated) {
        onMatchCreated(data.id);
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: `Failed to create match: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Match
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Match Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="matchName">Match Name *</Label>
              <Input
                id="matchName"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="e.g. Championship Final"
                required
              />
            </div>
            <div>
              <Label htmlFor="matchDate">Match Date</Label>
              <Input
                id="matchDate"
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Match description..."
              rows={3}
            />
          </div>

          {/* Teams Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Home Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="homeTeamName">Team Name *</Label>
                  <Input
                    id="homeTeamName"
                    value={homeTeam.name}
                    onChange={(e) => setHomeTeam(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Home team name"
                    required
                  />
                </div>
                
                <FormationSelector
                  value={homeTeam.formation || '4-4-2'}
                  onChange={(formation) => setHomeTeam(prev => ({ ...prev, formation }))}
                  label="Formation"
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Players ({homeTeam.players?.length || 0})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTeam('home')}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Manage Players
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {homeTeam.players?.slice(0, 5).map(player => (
                      <Badge key={player.id} variant="secondary">
                        #{player.number} {player.name}
                      </Badge>
                    ))}
                    {(homeTeam.players?.length || 0) > 5 && (
                      <Badge variant="outline">+{(homeTeam.players?.length || 0) - 5} more</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Away Team */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Away Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="awayTeamName">Team Name *</Label>
                  <Input
                    id="awayTeamName"
                    value={awayTeam.name}
                    onChange={(e) => setAwayTeam(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Away team name"
                    required
                  />
                </div>
                
                <FormationSelector
                  value={awayTeam.formation || '4-3-3'}
                  onChange={(formation) => setAwayTeam(prev => ({ ...prev, formation }))}
                  label="Formation"
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Players ({awayTeam.players?.length || 0})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTeam('away')}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Manage Players
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {awayTeam.players?.slice(0, 5).map(player => (
                      <Badge key={player.id} variant="secondary">
                        #{player.number} {player.name}
                      </Badge>
                    ))}
                    {(awayTeam.players?.length || 0) > 5 && (
                      <Badge variant="outline">+{(awayTeam.players?.length || 0) - 5} more</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notification Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Tracker Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {trackers.length} trackers will be notified about this match:
              </p>
              <div className="flex flex-wrap gap-1">
                {trackers.map(tracker => (
                  <Badge key={tracker.id} variant="outline">
                    {tracker.full_name || tracker.email}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Match & Notify Trackers'}
            </Button>
          </div>
        </form>

        {/* Player Management Dialog */}
        {editingTeam && (
          <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Manage {editingTeam === 'home' ? homeTeam.name : awayTeam.name} Players
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Add Player Form */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Player name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                  <Input
                    placeholder="Number"
                    type="number"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                  />
                  <Select value={newPlayerPosition} onValueChange={setNewPlayerPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GK">Goalkeeper</SelectItem>
                      <SelectItem value="DEF">Defender</SelectItem>
                      <SelectItem value="MID">Midfielder</SelectItem>
                      <SelectItem value="FWD">Forward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addPlayer(editingTeam)} className="w-full">
                  Add Player
                </Button>

                {/* Players List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(editingTeam === 'home' ? homeTeam.players : awayTeam.players)?.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <span>#{player.number} {player.name} ({player.position})</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePlayer(editingTeam, player.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMatchForm;
