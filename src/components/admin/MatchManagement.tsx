
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Play, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateMatchForm from '@/components/CreateMatchForm';

interface Match {
  id: string;
  name: string | null;
  description: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string | null;
  home_team_score: number | null;
  away_team_score: number | null;
  competition: string | null;
  venue: string | null;
  created_at: string;
}

interface EditMatchData {
  name: string;
  description: string;
  home_team_name: string;
  away_team_name: string;
  competition: string;
  venue: string;
  status: string;
}

const MatchManagement: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editFormData, setEditFormData] = useState<EditMatchData>({
    name: '',
    description: '',
    home_team_name: '',
    away_team_name: '',
    competition: '',
    venue: '',
    status: 'scheduled'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (newMatch: any) => {
    await fetchMatches();
    setShowCreateDialog(false);
    toast.success('Match created successfully');
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setEditFormData({
      name: match.name || '',
      description: match.description || '',
      home_team_name: match.home_team_name,
      away_team_name: match.away_team_name,
      competition: match.competition || '',
      venue: match.venue || '',
      status: match.status
    });
    setShowEditDialog(true);
  };

  const handleUpdateMatch = async () => {
    if (!editingMatch) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          name: editFormData.name,
          description: editFormData.description,
          home_team_name: editFormData.home_team_name,
          away_team_name: editFormData.away_team_name,
          competition: editFormData.competition,
          venue: editFormData.venue,
          status: editFormData.status
        })
        .eq('id', editingMatch.id);

      if (error) throw error;

      await fetchMatches();
      setShowEditDialog(false);
      setEditingMatch(null);
      toast.success('Match updated successfully');
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      await fetchMatches();
      toast.success('Match deleted successfully');
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId);

      if (error) throw error;

      await fetchMatches();
      toast.success(`Match status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating match status:', error);
      toast.error('Failed to update match status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading matches...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg sm:text-xl">Match Management</CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Match
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Match</DialogTitle>
              </DialogHeader>
              <CreateMatchForm onMatchCreated={handleCreateMatch} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-4">
          {matches.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No matches found</p>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {match.name || 'Unnamed Match'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {match.home_team_name} vs {match.away_team_name}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:gap-4 mt-2 gap-1">
                      <p className="text-xs text-gray-500">
                        Competition: {match.competition || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Venue: {match.venue || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusColor(match.status)}>
                        {match.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {match.home_team_score ?? 0} - {match.away_team_score ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {match.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(match.id, 'live')}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    {match.status === 'live' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(match.id, 'completed')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        End
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditMatch(match)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMatch(match.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Match Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Match Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter match name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-home">Home Team</Label>
                  <Input
                    id="edit-home"
                    value={editFormData.home_team_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, home_team_name: e.target.value }))}
                    placeholder="Enter home team name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-away">Away Team</Label>
                  <Input
                    id="edit-away"
                    value={editFormData.away_team_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, away_team_name: e.target.value }))}
                    placeholder="Enter away team name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-competition">Competition</Label>
                  <Input
                    id="edit-competition"
                    value={editFormData.competition}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, competition: e.target.value }))}
                    placeholder="Enter competition name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-venue">Venue</Label>
                  <Input
                    id="edit-venue"
                    value={editFormData.venue}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Enter venue"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editFormData.status} onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter match description (optional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateMatch}>
                  Update Match
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MatchManagement;
