
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    homeTeamFormation: '4-4-2',
    awayTeamFormation: '4-3-3',
    matchDate: '',
    location: '',
    competition: '',
    status: 'draft',
    matchType: 'regular',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.homeTeamName || !formData.awayTeamName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data: matchData, error } = await supabase
        .from('matches')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            home_team_name: formData.homeTeamName,
            away_team_name: formData.awayTeamName,
            home_team_formation: formData.homeTeamFormation,
            away_team_formation: formData.awayTeamFormation,
            status: formData.status,
            match_date: formData.matchDate || null,
            location: formData.location,
            competition: formData.competition,
            match_type: formData.matchType,
            notes: formData.notes,
            home_team_players: JSON.stringify([]),
            away_team_players: JSON.stringify([]),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Match created successfully');
      navigate('/admin');
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match: ' + error.message);
    }
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

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Details</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <form onSubmit={onSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Match Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter match name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Match description (optional)"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="homeTeam">Home Team *</Label>
                      <Input
                        id="homeTeam"
                        value={formData.homeTeamName}
                        onChange={(e) => handleInputChange('homeTeamName', e.target.value)}
                        placeholder="Home team name"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="awayTeam">Away Team *</Label>
                      <Input
                        id="awayTeam"
                        value={formData.awayTeamName}
                        onChange={(e) => handleInputChange('awayTeamName', e.target.value)}
                        placeholder="Away team name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="homeFormation">Home Formation</Label>
                      <Select value={formData.homeTeamFormation} onValueChange={(value) => handleInputChange('homeTeamFormation', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4-4-2">4-4-2</SelectItem>
                          <SelectItem value="4-3-3">4-3-3</SelectItem>
                          <SelectItem value="3-5-2">3-5-2</SelectItem>
                          <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                          <SelectItem value="5-3-2">5-3-2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="awayFormation">Away Formation</Label>
                      <Select value={formData.awayTeamFormation} onValueChange={(value) => handleInputChange('awayTeamFormation', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4-4-2">4-4-2</SelectItem>
                          <SelectItem value="4-3-3">4-3-3</SelectItem>
                          <SelectItem value="3-5-2">3-5-2</SelectItem>
                          <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                          <SelectItem value="5-3-2">5-3-2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/admin')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>
          
          <TabsContent value="advanced">
            <form onSubmit={onSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="matchDate">Match Date</Label>
                      <Input
                        id="matchDate"
                        type="datetime-local"
                        value={formData.matchDate}
                        onChange={(e) => handleInputChange('matchDate', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Match location"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="competition">Competition</Label>
                      <Input
                        id="competition"
                        value={formData.competition}
                        onChange={(e) => handleInputChange('competition', e.target.value)}
                        placeholder="Competition name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="matchType">Match Type</Label>
                      <Select value={formData.matchType} onValueChange={(value) => handleInputChange('matchType', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                          <SelectItem value="playoff">Playoff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Additional notes about the match"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/admin')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateMatch;
