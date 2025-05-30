import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { EVENT_TYPE_CATEGORIES } from '@/constants/eventTypes';

interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
}

interface PlayerAssignment {
  player_id: number;
  player_team_id: 'home' | 'away';
}

interface EventTypeCategory {
  key: string;
  label: string;
  color: string;
  events: Array<{ key: string; label: string }>;
}

interface TrackerAssignmentProps {
  matchId: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
}

const TrackerAssignment: React.FC<TrackerAssignmentProps> = ({
  matchId,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  const [trackerUsers, setTrackerUsers] = useState<TrackerUser[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerAssignment[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrackerUsers();
  }, []);

  const fetchTrackerUsers = async () => {
    try {
      // Use user_profiles_with_role view to get tracker users
      const { data, error } = await supabase
        .from('user_profiles_with_role')
        .select('id, email, full_name')
        .eq('role', 'tracker')
        .order('full_name');

      if (error) throw error;

      const typedUsers: TrackerUser[] = (data || [])
        .filter(user => user.id) // Filter out null IDs
        .map(user => ({
          id: user.id!,
          email: user.email || 'No email',
          full_name: user.full_name || 'No name',
        }));

      setTrackerUsers(typedUsers);
    } catch (error: any) {
      console.error('Error fetching tracker users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tracker users",
        variant: "destructive",
      });
    }
  };

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(key => key !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const handleEventTypeChange = (eventTypeKey: string, checked: boolean) => {
    if (checked) {
      setSelectedEventTypes(prev => [...prev, eventTypeKey]);
    } else {
      setSelectedEventTypes(prev => prev.filter(key => key !== eventTypeKey));
    }
  };

  const handleCategoryToggle = (category: EventTypeCategory, checked: boolean) => {
    const categoryEventKeys = category.events.map(event => event.key);
    
    if (checked) {
      setSelectedEventTypes(prev => [...new Set([...prev, ...categoryEventKeys])]);
    } else {
      setSelectedEventTypes(prev => prev.filter(key => !categoryEventKeys.includes(key)));
    }
  };

  const getCategoryState = (category: EventTypeCategory) => {
    const categoryEventKeys = category.events.map(event => event.key);
    const selectedCount = categoryEventKeys.filter(key => selectedEventTypes.includes(key)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === categoryEventKeys.length) return 'all';
    return 'some';
  };

  const handlePlayerToggle = (playerId: number, teamId: 'home' | 'away', checked: boolean) => {
    if (checked) {
      setSelectedPlayers(prev => [...prev, { player_id: playerId, player_team_id: teamId }]);
    } else {
      setSelectedPlayers(prev => prev.filter(p => !(p.player_id === playerId && p.player_team_id === teamId)));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTracker || selectedEventTypes.length === 0 || selectedPlayers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a tracker, event types, and at least one player",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const assignments = selectedPlayers.map(player => ({
        match_id: matchId,
        tracker_user_id: selectedTracker,
        player_id: player.player_id,
        player_team_id: player.player_team_id,
        assigned_event_types: selectedEventTypes
      }));

      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert(assignments);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tracker assignments created successfully",
      });

      // Reset form
      setSelectedTracker('');
      setSelectedEventTypes([]);
      setSelectedPlayers([]);
    } catch (error: any) {
      console.error('Error creating assignments:', error);
      toast({
        title: "Error",
        description: "Failed to create assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Tracker
          </CardTitle>
          <CardDescription>
            Assign specific event types and players to tracker users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tracker Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Tracker</label>
            <div className="grid gap-2">
              {trackerUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tracker-${user.id}`}
                    checked={selectedTracker === user.id}
                    onCheckedChange={(checked) => {
                      setSelectedTracker(checked ? user.id : '');
                    }}
                  />
                  <label
                    htmlFor={`tracker-${user.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {user.full_name} ({user.email})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Event Type Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <label className="text-sm font-medium">Event Types by Category</label>
            </div>
            
            <div className="space-y-3">
              {EVENT_TYPE_CATEGORIES.map((category) => {
                const categoryState = getCategoryState(category);
                const isOpen = openCategories.includes(category.key);
                
                return (
                  <motion.div
                    key={category.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg overflow-hidden"
                  >
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category.key)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={categoryState === 'all'}
                                ref={(el) => {
                                  if (el && categoryState === 'some') {
                                    (el as any).indeterminate = true;
                                  }
                                }}
                                onCheckedChange={(checked) => handleCategoryToggle(category, !!checked)}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            </div>
                            <div className="text-left">
                              <h4 className="font-medium">{category.label}</h4>
                              <p className="text-sm text-muted-foreground">
                                {category.events.length} event types
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {category.events.filter(e => selectedEventTypes.includes(e.key)).length}/{category.events.length}
                            </Badge>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <AnimatePresence>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-muted/20"
                          >
                            <div className="p-4 grid grid-cols-2 gap-3">
                              {category.events.map((eventType) => (
                                <div key={eventType.key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`event-${eventType.key}`}
                                    checked={selectedEventTypes.includes(eventType.key)}
                                    onCheckedChange={(checked) => handleEventTypeChange(eventType.key, !!checked)}
                                  />
                                  <label
                                    htmlFor={`event-${eventType.key}`}
                                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {eventType.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </CollapsibleContent>
                    </Collapsible>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Player Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Players</label>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Home Team */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-700">Home Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {homeTeamPlayers.map((player) => (
                    <div key={`home-${player.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`home-player-${player.id}`}
                        checked={selectedPlayers.some(p => p.player_id === player.id && p.player_team_id === 'home')}
                        onCheckedChange={(checked) => handlePlayerToggle(player.id, 'home', !!checked)}
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
                  <CardTitle className="text-base text-red-700">Away Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {awayTeamPlayers.map((player) => (
                    <div key={`away-${player.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`away-player-${player.id}`}
                        checked={selectedPlayers.some(p => p.player_id === player.id && p.player_team_id === 'away')}
                        onCheckedChange={(checked) => handlePlayerToggle(player.id, 'away', !!checked)}
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

          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedTracker || selectedEventTypes.length === 0 || selectedPlayers.length === 0}
            className="w-full"
          >
            {loading ? "Creating Assignments..." : "Create Assignment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerAssignment;
