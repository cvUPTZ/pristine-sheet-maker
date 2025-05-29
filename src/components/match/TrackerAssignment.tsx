
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { TrackerUser, NotificationSettings } from '@/types/matchForm';
import { EVENT_CATEGORIES, EVENT_TYPE_LABELS, EventCategory } from '@/constants/eventTypes';
import { User, Mail, Bell, ChevronDown, ChevronRight } from 'lucide-react';

interface TrackerAssignmentProps {
  matchId?: string;
  homeTeam: Team;
  awayTeam: Team;
  isEditMode?: boolean;
}

const TrackerAssignment: React.FC<TrackerAssignmentProps> = ({
  matchId,
  homeTeam,
  awayTeam,
  isEditMode = false
}) => {
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<EventCategory, boolean>>({
    'Ball Actions': true,
    'Set Pieces': false,
    'Fouls & Cards': false,
    'Goals & Assists': false,
    'Possession': false,
    'Match Events': false
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    sendOnAssignment: true,
    sendOnMatchStart: false,
    sendOnMatchEnd: false,
    customMessage: ''
  });

  useEffect(() => {
    fetchTrackers();
    if (matchId) {
      fetchExistingAssignments();
    }
  }, [matchId]);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-tracker-users');
      
      if (error) {
        console.error('Error fetching trackers:', error);
        toast.error('Failed to load trackers');
        return;
      }

      setTrackers(data || []);
    } catch (error) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to load trackers');
    }
  };

  const fetchExistingAssignments = async () => {
    if (!matchId) return;

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      setExistingAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const toggleCategory = (category: EventCategory) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleCategoryToggle = (category: EventCategory, checked: boolean) => {
    const categoryEvents = EVENT_CATEGORIES[category].events;
    if (checked) {
      setSelectedEventTypes(prev => [...new Set([...prev, ...categoryEvents])]);
    } else {
      setSelectedEventTypes(prev => prev.filter(event => !categoryEvents.includes(event as any)));
    }
  };

  const handleEventTypeChange = (eventType: string, checked: boolean) => {
    setSelectedEventTypes(prev => 
      checked 
        ? [...prev, eventType]
        : prev.filter(type => type !== eventType)
    );
  };

  const handlePlayerChange = (playerId: string, checked: boolean) => {
    setSelectedPlayers(prev => 
      checked 
        ? [...prev, playerId]
        : prev.filter(id => id !== playerId)
    );
  };

  const getPlayerTeam = (playerId: string) => {
    const homePlayer = homeTeam.players.find(p => p.id.toString() === playerId);
    if (homePlayer) return 'home';
    return 'away';
  };

  const sendNotification = async (trackerId: string, message: string) => {
    if (!matchId) return;

    try {
      const { error } = await supabase
        .from('match_notifications')
        .insert({
          match_id: matchId,
          tracker_id: trackerId,
          message: message,
          is_read: false
        });

      if (error) {
        console.error('Error sending notification:', error);
        toast.error('Failed to send notification');
      } else {
        console.log('Notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const assignTracker = async () => {
    if (!selectedTracker || !matchId) {
      toast.error('Please select a tracker and ensure match is saved');
      return;
    }

    if (selectedEventTypes.length === 0 && selectedPlayers.length === 0) {
      toast.error('Please select at least one event type or player');
      return;
    }

    setLoading(true);
    try {
      // Save event type assignments
      for (const eventType of selectedEventTypes) {
        const { error: eventError } = await supabase
          .from('user_event_assignments')
          .upsert({
            user_id: selectedTracker,
            event_type: eventType
          });

        if (eventError) {
          console.error('Error saving event assignment:', eventError);
          toast.error(`Failed to assign ${eventType} events`);
        }
      }

      // Save player assignments
      for (const playerId of selectedPlayers) {
        const playerTeam = getPlayerTeam(playerId);
        
        const { error: playerError } = await supabase
          .from('match_tracker_assignments')
          .upsert({
            match_id: matchId,
            tracker_user_id: selectedTracker,
            player_id: parseInt(playerId),
            player_team_id: playerTeam
          });

        if (playerError) {
          console.error('Error saving player assignment:', playerError);
          toast.error(`Failed to assign player ${playerId}`);
        }
      }

      // Send notification if enabled
      if (notificationSettings.sendOnAssignment) {
        const selectedTrackerInfo = trackers.find(t => t.id === selectedTracker);
        const message = notificationSettings.customMessage || 
          `You have been assigned to track ${homeTeam.name} vs ${awayTeam.name}`;
        
        await sendNotification(selectedTracker, message);
        toast.success('Tracker assigned and notified successfully!');
      } else {
        toast.success('Tracker assigned successfully!');
      }
      
      // Reset form and refresh assignments
      setSelectedTracker('');
      setSelectedEventTypes([]);
      setSelectedPlayers([]);
      fetchExistingAssignments();
    } catch (error) {
      console.error('Error assigning tracker:', error);
      toast.error('Failed to assign tracker');
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error removing assignment:', error);
        toast.error('Failed to remove assignment');
        return;
      }

      toast.success('Assignment removed successfully');
      fetchExistingAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const allPlayers = [...homeTeam.players, ...awayTeam.players];

  const isCategorySelected = (category: EventCategory) => {
    const categoryEvents = EVENT_CATEGORIES[category].events;
    return categoryEvents.every(event => selectedEventTypes.includes(event));
  };

  const isCategoryPartiallySelected = (category: EventCategory) => {
    const categoryEvents = EVENT_CATEGORIES[category].events;
    return categoryEvents.some(event => selectedEventTypes.includes(event)) && !isCategorySelected(category);
  };

  return (
    <div className="space-y-6">
      {/* Tracker Selection Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trackers.map((tracker) => (
              <div
                key={tracker.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTracker === tracker.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTracker(tracker.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{tracker.full_name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {tracker.email}
                    </p>
                  </div>
                  {selectedTracker === tracker.id && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {trackers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No trackers available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Details */}
      {selectedTracker && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Event Categories & Types</Label>
              <div className="space-y-2">
                {Object.entries(EVENT_CATEGORIES).map(([category, config]) => (
                  <div key={category} className="border rounded-lg">
                    <Collapsible
                      open={expandedCategories[category as EventCategory]}
                      onOpenChange={() => toggleCategory(category as EventCategory)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={isCategorySelected(category as EventCategory)}
                              ref={(ref) => {
                                if (ref) {
                                  ref.indeterminate = isCategoryPartiallySelected(category as EventCategory);
                                }
                              }}
                              onCheckedChange={(checked) => 
                                handleCategoryToggle(category as EventCategory, checked as boolean)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="text-left">
                              <div className="font-medium text-sm">{category}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </div>
                          {expandedCategories[category as EventCategory] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            {config.events.map((eventType) => (
                              <div key={eventType} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${category}-${eventType}`}
                                  checked={selectedEventTypes.includes(eventType)}
                                  onCheckedChange={(checked) => 
                                    handleEventTypeChange(eventType, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`${category}-${eventType}`} className="text-sm">
                                  {EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS] || eventType}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Assign Players</Label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Home Team: {homeTeam.name}</div>
                {homeTeam.players.map((player) => (
                  <div key={`home-${player.id}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`home-${player.id}`}
                      checked={selectedPlayers.includes(player.id.toString())}
                      onCheckedChange={(checked) => 
                        handlePlayerChange(player.id.toString(), checked as boolean)
                      }
                    />
                    <Label htmlFor={`home-${player.id}`} className="text-sm">
                      #{player.number} {player.name}
                    </Label>
                  </div>
                ))}
                
                <div className="text-xs font-medium text-gray-500 mb-2 mt-4">Away Team: {awayTeam.name}</div>
                {awayTeam.players.map((player) => (
                  <div key={`away-${player.id}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`away-${player.id}`}
                      checked={selectedPlayers.includes(player.id.toString())}
                      onCheckedChange={(checked) => 
                        handlePlayerChange(player.id.toString(), checked as boolean)
                      }
                    />
                    <Label htmlFor={`away-${player.id}`} className="text-sm">
                      #{player.number} {player.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {selectedTracker && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendOnAssignment"
                checked={notificationSettings.sendOnAssignment}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, sendOnAssignment: checked as boolean }))
                }
              />
              <Label htmlFor="sendOnAssignment" className="text-sm">
                Send notification when tracker is assigned
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendOnMatchStart"
                checked={notificationSettings.sendOnMatchStart}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, sendOnMatchStart: checked as boolean }))
                }
              />
              <Label htmlFor="sendOnMatchStart" className="text-sm">
                Send notification when match starts
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendOnMatchEnd"
                checked={notificationSettings.sendOnMatchEnd}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, sendOnMatchEnd: checked as boolean }))
                }
              />
              <Label htmlFor="sendOnMatchEnd" className="text-sm">
                Send notification when match ends
              </Label>
            </div>

            {notificationSettings.sendOnAssignment && (
              <div>
                <Label htmlFor="customMessage" className="text-sm font-medium mb-1 block">
                  Custom Message (Optional)
                </Label>
                <Textarea
                  id="customMessage"
                  placeholder="Enter a custom message for the tracker..."
                  value={notificationSettings.customMessage}
                  onChange={(e) => 
                    setNotificationSettings(prev => ({ ...prev, customMessage: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Button */}
      {selectedTracker && (
        <Button 
          onClick={assignTracker} 
          disabled={loading || !selectedTracker || !matchId}
          className="w-full"
          size="lg"
        >
          {loading ? 'Assigning...' : 'Assign Tracker & Send Notification'}
        </Button>
      )}

      {!matchId && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-amber-600">
              Save the match first to enable tracker assignments
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      {existingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingAssignments.map((assignment) => {
                const tracker = trackers.find(t => t.id === assignment.tracker_user_id);
                const player = allPlayers.find(p => p.id === assignment.player_id);
                
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tracker?.full_name || 'Unknown Tracker'}</p>
                        {player && (
                          <p className="text-xs text-gray-600">
                            → #{player.number} {player.name} ({assignment.player_team_id})
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeAssignment(assignment.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackerAssignment;
