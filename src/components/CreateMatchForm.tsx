import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Minus, Users, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Player, MatchFormData, User, TrackerAssignmentDetails } from '@/types';
import { EVENT_TYPE_CATEGORIES } from '@/constants/eventTypes';
import FormationSelector from '@/components/FormationSelector';

interface CreateMatchFormProps {
  onMatchCreated?: (newMatch: any) => void;
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  const [currentStep, setCurrentStep] = useState('details');
  const [loading, setLoading] = useState(false);
  const [trackers, setTrackers] = useState<User[]>([]);
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [assignmentDetails, setAssignmentDetails] = useState<TrackerAssignmentDetails>({
    eventCategories: [],
    specificEvents: [],
    assignedPlayers: { home: [], away: [] },
    notificationSettings: {
      trackerAssigned: true,
      matchStarts: false,
      matchEnds: false
    }
  });

  const [formData, setFormData] = useState<MatchFormData>({
    name: '',
    description: '',
    homeTeamName: '',
    awayTeamName: '',
    venue: '',
    competition: '',
    matchDate: '',
    homeTeamFormation: '4-4-2',
    awayTeamFormation: '4-3-3',
    homeTeamPlayers: [],
    awayTeamPlayers: []
  });

  useEffect(() => {
    fetchTrackers();
    initializeDefaultPlayers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('role', 'tracker');

      if (error) throw error;
      
      // Filter out null values and ensure proper typing
      const validTrackers = (data || [])
        .filter(tracker => tracker.email && tracker.full_name)
        .map(tracker => ({
          id: tracker.id,
          email: tracker.email!,
          full_name: tracker.full_name!,
          role: tracker.role as 'admin' | 'user' | 'tracker' | 'teacher'
        }));
      
      setTrackers(validTrackers);
    } catch (error) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to fetch trackers');
    }
  };

  const initializeDefaultPlayers = () => {
    const createDefaultPlayers = (teamPrefix: string): Player[] => 
      Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        name: `${teamPrefix} Player ${i + 1}`,
        player_name: `${teamPrefix} Player ${i + 1}`,
        position: i === 0 ? 'GK' : i <= 4 ? 'DEF' : i <= 8 ? 'MID' : 'FWD',
        number: i + 1,
        jersey_number: i + 1
      }));

    setFormData(prev => ({
      ...prev,
      homeTeamPlayers: createDefaultPlayers('Home'),
      awayTeamPlayers: createDefaultPlayers('Away')
    }));
  };

  const updatePlayer = (team: 'home' | 'away', index: number, field: keyof Player, value: string | number) => {
    const playersKey = team === 'home' ? 'homeTeamPlayers' : 'awayTeamPlayers';
    const players = [...(formData[playersKey] || [])];
    
    if (players[index]) {
      players[index] = { ...players[index], [field]: value };
      if (field === 'name') {
        players[index].player_name = value as string;
      }
      if (field === 'number') {
        players[index].jersey_number = value as number;
      }
      
      setFormData(prev => ({ ...prev, [playersKey]: players }));
    }
  };

  const addPlayer = (team: 'home' | 'away') => {
    const playersKey = team === 'home' ? 'homeTeamPlayers' : 'awayTeamPlayers';
    const players = formData[playersKey] || [];
    const newId = players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1;
    const teamName = team === 'home' ? formData.homeTeamName || 'Home' : formData.awayTeamName || 'Away';
    
    const newPlayer: Player = {
      id: newId,
      name: `${teamName} Player ${newId}`,
      player_name: `${teamName} Player ${newId}`,
      number: newId,
      jersey_number: newId,
      position: 'MID'
    };

    setFormData(prev => ({
      ...prev,
      [playersKey]: [...players, newPlayer]
    }));
  };

  const removePlayer = (team: 'home' | 'away', index: number) => {
    const playersKey = team === 'home' ? 'homeTeamPlayers' : 'awayTeamPlayers';
    const players = formData[playersKey] || [];
    
    setFormData(prev => ({
      ...prev,
      [playersKey]: players.filter((_, i) => i !== index)
    }));
  };

  const handleTrackerToggle = (trackerId: string) => {
    setSelectedTrackers(prev => 
      prev.includes(trackerId) 
        ? prev.filter(id => id !== trackerId)
        : [...prev, trackerId]
    );
  };

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(key => key !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const handleCategoryToggle = (categoryKey: string, checked: boolean) => {
    const category = EVENT_TYPE_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) return;

    const categoryEventKeys = category.events.map(event => event.key);
    
    if (checked) {
      setAssignmentDetails(prev => ({
        ...prev,
        eventCategories: [...prev.eventCategories, categoryKey],
        specificEvents: [...new Set([...prev.specificEvents, ...categoryEventKeys])]
      }));
    } else {
      setAssignmentDetails(prev => ({
        ...prev,
        eventCategories: prev.eventCategories.filter(key => key !== categoryKey),
        specificEvents: prev.specificEvents.filter(key => !categoryEventKeys.includes(key))
      }));
    }
  };

  const handleEventTypeChange = (eventKey: string, checked: boolean) => {
    setAssignmentDetails(prev => ({
      ...prev,
      specificEvents: checked 
        ? [...prev.specificEvents, eventKey]
        : prev.specificEvents.filter(key => key !== eventKey)
    }));
  };

  const handlePlayerToggle = (team: 'home' | 'away', playerId: number, checked: boolean) => {
    setAssignmentDetails(prev => ({
      ...prev,
      assignedPlayers: {
        ...prev.assignedPlayers,
        [team]: checked 
          ? [...prev.assignedPlayers[team], playerId]
          : prev.assignedPlayers[team].filter(id => id !== playerId)
      }
    }));
  };

  const handleNotificationSettingChange = (setting: keyof typeof assignmentDetails.notificationSettings, value: boolean) => {
    setAssignmentDetails(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [setting]: value
      }
    }));
  };

  const sendNotificationToTrackers = async (matchId: string) => {
    if (selectedTrackers.length === 0) return;

    try {
      const notifications = selectedTrackers.map(trackerId => ({
        user_id: trackerId,
        match_id: matchId,
        title: 'New Match Assignment',
        message: `You have been assigned to track the match: ${formData.name}`,
        type: 'match_assignment'
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
      
      toast.success(`Notifications sent to ${selectedTrackers.length} tracker(s)`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications to trackers');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.homeTeamName || !formData.awayTeamName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const matchData = {
        name: formData.name,
        description: formData.description,
        home_team_name: formData.homeTeamName,
        away_team_name: formData.awayTeamName,
        home_team_formation: formData.homeTeamFormation,
        away_team_formation: formData.awayTeamFormation,
        home_team_players: JSON.stringify(formData.homeTeamPlayers || []),
        away_team_players: JSON.stringify(formData.awayTeamPlayers || []),
        venue: formData.venue,
        competition: formData.competition,
        match_date: formData.matchDate,
        status: 'scheduled'
      };

      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (error) throw error;

      // Send notifications to selected trackers
      await sendNotificationToTrackers(data.id);

      toast.success('Match created successfully!');
      
      if (onMatchCreated) {
        onMatchCreated(data);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        homeTeamName: '',
        awayTeamName: '',
        venue: '',
        competition: '',
        matchDate: '',
        homeTeamFormation: '4-4-2',
        awayTeamFormation: '4-3-3',
        homeTeamPlayers: [],
        awayTeamPlayers: []
      });
      setSelectedTrackers([]);
      setAssignmentDetails({
        eventCategories: [],
        specificEvents: [],
        assignedPlayers: { home: [], away: [] },
        notificationSettings: {
          trackerAssigned: true,
          matchStarts: false,
          matchEnds: false
        }
      });
      setCurrentStep('details');

    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerForm = (team: 'home' | 'away') => {
    const players = team === 'home' ? formData.homeTeamPlayers : formData.awayTeamPlayers;
    const teamName = team === 'home' ? formData.homeTeamName : formData.awayTeamName;
    const colorClass = team === 'home' ? 'border-l-green-500' : 'border-l-red-500';

    return (
      <Card className={`border-l-4 ${colorClass}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {teamName || `${team === 'home' ? 'Home' : 'Away'} Team`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {(players || []).map((player, index) => (
              <div key={player.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 border rounded-lg">
                <Input
                  type="number"
                  value={player.number}
                  onChange={(e) => updatePlayer(team, index, 'number', parseInt(e.target.value) || 0)}
                  placeholder="№"
                  className="w-full"
                />
                <Input
                  value={player.name}
                  onChange={(e) => updatePlayer(team, index, 'name', e.target.value)}
                  placeholder="Player Name"
                  className="sm:col-span-2"
                />
                <div className="flex gap-2">
                  <Select 
                    value={player.position} 
                    onValueChange={(value) => updatePlayer(team, index, 'position', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GK">GK</SelectItem>
                      <SelectItem value="DEF">DEF</SelectItem>
                      <SelectItem value="MID">MID</SelectItem>
                      <SelectItem value="FWD">FWD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(team, index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={() => addPlayer(team)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={currentStep} onValueChange={setCurrentStep}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Match Details</TabsTrigger>
            <TabsTrigger value="teams">Team Setup</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="trackers">Trackers</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Match Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter match name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="competition">Competition</Label>
                <Input
                  id="competition"
                  value={formData.competition || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, competition: e.target.value }))}
                  placeholder="Enter competition name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Enter venue"
                />
              </div>
              
              <div>
                <Label htmlFor="matchDate">Match Date</Label>
                <Input
                  id="matchDate"
                  type="datetime-local"
                  value={formData.matchDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, matchDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter match description (optional)"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="homeTeam">Home Team *</Label>
                <Input
                  id="homeTeam"
                  value={formData.homeTeamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, homeTeamName: e.target.value }))}
                  placeholder="Enter home team name"
                  required
                />
                <div className="mt-3">
                  <FormationSelector
                    value={formData.homeTeamFormation as any}
                    onChange={(formation) => setFormData(prev => ({ ...prev, homeTeamFormation: formation }))}
                    label="Home Team Formation"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="awayTeam">Away Team *</Label>
                <Input
                  id="awayTeam"
                  value={formData.awayTeamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, awayTeamName: e.target.value }))}
                  placeholder="Enter away team name"
                  required
                />
                <div className="mt-3">
                  <FormationSelector
                    value={formData.awayTeamFormation as any}
                    onChange={(formation) => setFormData(prev => ({ ...prev, awayTeamFormation: formation }))}
                    label="Away Team Formation"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderPlayerForm('home')}
              {renderPlayerForm('away')}
            </div>
          </TabsContent>

          <TabsContent value="trackers" className="space-y-6 mt-6">
            <div className="space-y-6">
              {/* Tracker Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Trackers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trackers.map((tracker) => (
                      <div key={tracker.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={tracker.id}
                          checked={selectedTrackers.includes(tracker.id)}
                          onCheckedChange={() => handleTrackerToggle(tracker.id)}
                        />
                        <div className="flex-1">
                          <label htmlFor={tracker.id} className="text-sm font-medium cursor-pointer">
                            {tracker.full_name}
                          </label>
                          <p className="text-xs text-gray-500">{tracker.email}</p>
                        </div>
                        <Badge variant="secondary">{tracker.role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Event Categories & Types */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Event Categories & Types</h3>
                    
                    {EVENT_TYPE_CATEGORIES.map((category) => {
                      const isOpen = openCategories.includes(category.key);
                      const isSelected = assignmentDetails.eventCategories.includes(category.key);
                      
                      return (
                        <div key={category.key} className="border rounded-lg">
                          <Collapsible
                            open={isOpen}
                            onOpenChange={() => toggleCategory(category.key)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleCategoryToggle(category.key, !!checked)}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  />
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <div className="text-left">
                                    <h4 className="font-medium">{category.label}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Events related to ball movement and possession
                                    </p>
                                  </div>
                                </div>
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="border-t bg-muted/20 p-4 grid grid-cols-2 gap-3">
                                {category.events.map((event) => (
                                  <div key={event.key} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`event-${event.key}`}
                                      checked={assignmentDetails.specificEvents.includes(event.key)}
                                      onCheckedChange={(checked) => handleEventTypeChange(event.key, !!checked)}
                                    />
                                    <label
                                      htmlFor={`event-${event.key}`}
                                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {event.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* Assign Players */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Assign Players</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Home Team */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Home Team:</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(formData.homeTeamPlayers || []).map((player) => (
                            <div key={`home-${player.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`home-player-${player.id}`}
                                checked={assignmentDetails.assignedPlayers.home.includes(player.id)}
                                onCheckedChange={(checked) => handlePlayerToggle('home', player.id, !!checked)}
                              />
                              <label
                                htmlFor={`home-player-${player.id}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                #{player.jersey_number} {player.player_name}
                              </label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Away Team */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Away Team:</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(formData.awayTeamPlayers || []).map((player) => (
                            <div key={`away-${player.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`away-player-${player.id}`}
                                checked={assignmentDetails.assignedPlayers.away.includes(player.id)}
                                onCheckedChange={(checked) => handlePlayerToggle('away', player.id, !!checked)}
                              />
                              <label
                                htmlFor={`away-player-${player.id}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                #{player.jersey_number} {player.player_name}
                              </label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <h3 className="font-semibold">Notification Settings</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notify-assigned"
                          checked={assignmentDetails.notificationSettings.trackerAssigned}
                          onCheckedChange={(checked) => handleNotificationSettingChange('trackerAssigned', !!checked)}
                        />
                        <label htmlFor="notify-assigned" className="text-sm">
                          Send notification when tracker is assigned
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notify-starts"
                          checked={assignmentDetails.notificationSettings.matchStarts}
                          onCheckedChange={(checked) => handleNotificationSettingChange('matchStarts', !!checked)}
                        />
                        <label htmlFor="notify-starts" className="text-sm">
                          Send notification when match starts
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notify-ends"
                          checked={assignmentDetails.notificationSettings.matchEnds}
                          onCheckedChange={(checked) => handleNotificationSettingChange('matchEnds', !!checked)}
                        />
                        <label htmlFor="notify-ends" className="text-sm">
                          Send notification when match ends
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedTrackers.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {selectedTrackers.length} tracker(s) will be notified with the specified assignment details.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              const steps = ['details', 'teams', 'players', 'trackers'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1]);
              }
            }}
            disabled={currentStep === 'details'}
          >
            Previous
          </Button>

          {currentStep !== 'trackers' ? (
            <Button
              onClick={() => {
                const steps = ['details', 'teams', 'players', 'trackers'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex < steps.length - 1) {
                  setCurrentStep(steps[currentIndex + 1]);
                }
              }}
            >
              Next: {currentStep === 'details' ? 'Teams' : currentStep === 'teams' ? 'Players' : 'Trackers'}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating Match...' : 'Create Match'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateMatchForm;
