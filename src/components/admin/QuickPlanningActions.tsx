import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Zap, Users, Bell, CheckCircle, FileText, Settings, UserCheck } from 'lucide-react';

interface QuickPlanningActionsProps {
  matchId: string;
  onActionComplete?: () => void;
}

const QuickPlanningActions: React.FC<QuickPlanningActionsProps> = ({
  matchId,
  onActionComplete
}) => {
  const [loading, setLoading] = useState<string>('');

  const autoAssignTrackers = async () => {
    setLoading('auto-assign');
    try {
      // Get match players
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('home_team_players, away_team_players')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Safely handle the JSON data with proper type checking
      let homeTeamPlayers: any[] = [];
      let awayTeamPlayers: any[] = [];
      
      if (match.home_team_players && typeof match.home_team_players === 'object' && Array.isArray(match.home_team_players)) {
        homeTeamPlayers = match.home_team_players;
      }
      
      if (match.away_team_players && typeof match.away_team_players === 'object' && Array.isArray(match.away_team_players)) {
        awayTeamPlayers = match.away_team_players;
      }
      
      const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];

      // Get available trackers
      const { data: trackers, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      // Get existing assignments
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('tracker_user_id, player_id')
        .eq('match_id', matchId);

      if (assignmentsError) throw assignmentsError;

      const assignedPlayerIds = new Set(existingAssignments?.map(a => a.player_id).filter(Boolean) || []);
      const assignedTrackerIds = new Set(existingAssignments?.map(a => a.tracker_user_id) || []);

      const unassignedPlayers = allPlayers.filter((player: any) => !assignedPlayerIds.has(player.id));
      const availableTrackers = trackers?.filter(tracker => !assignedTrackerIds.has(tracker.id)) || [];

      if (unassignedPlayers.length === 0) {
        toast.info('All players already have tracker assignments');
        return;
      }

      if (availableTrackers.length === 0) {
        toast.error('No available trackers for assignment');
        return;
      }

      // Create assignments
      const newAssignments = unassignedPlayers.slice(0, availableTrackers.length).map((player: any, index: number) => ({
        match_id: matchId,
        tracker_user_id: availableTrackers[index].id,
        player_id: player.id,
        player_team_id: player.team || 'home',
        assigned_event_types: ['pass', 'shot', 'cross', 'dribble', 'tackle']
      }));

      const { error: insertError } = await supabase
        .from('match_tracker_assignments')
        .insert(newAssignments);

      if (insertError) throw insertError;

      // Send notifications individually
      for (let i = 0; i < newAssignments.length; i++) {
        const assignment = newAssignments[i];
        const tracker = availableTrackers[i];
        
        if (tracker.id) {
          await supabase.from('notifications').insert({
            user_id: tracker.id,
            match_id: matchId,
            type: 'auto_assignment',
            title: 'Auto-Assignment Complete',
            message: `You have been automatically assigned to track player #${assignment.player_id} for match ${matchId}.`,
            notification_data: {
              player_id: assignment.player_id,
              event_types: assignment.assigned_event_types
            }
          });
        }
      }

      toast.success(`Successfully assigned ${newAssignments.length} trackers`);
      onActionComplete?.();
    } catch (error) {
      console.error('Error auto-assigning trackers:', error);
      toast.error('Failed to auto-assign trackers');
    } finally {
      setLoading('');
    }
  };

  const assignReplacements = async () => {
    setLoading('assign-replacements');
    try {
      // Get current assignments using raw SQL to include replacement info
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (assignmentsError) throw assignmentsError;

      // Filter assignments that don't have replacements and have valid data
      const assignmentsWithoutReplacements = assignments?.filter(a => 
        a.id && a.tracker_user_id && !(a as any).replacement_tracker_id
      ) || [];

      // Get available trackers
      const { data: trackers, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      const assignedTrackerIds = new Set(assignments?.map(a => a.tracker_user_id).filter(Boolean) || []);
      const availableTrackers = trackers?.filter(tracker => !assignedTrackerIds.has(tracker.id)) || [];

      if (assignmentsWithoutReplacements.length === 0) {
        toast.info('No assignments need replacement trackers');
        return;
      }

      if (availableTrackers.length === 0) {
        toast.error('No available trackers for replacement assignment');
        return;
      }

      // Assign replacements using direct SQL update
      let assignmentCount = 0;
      for (let i = 0; i < Math.min(assignmentsWithoutReplacements.length, availableTrackers.length); i++) {
        const assignment = assignmentsWithoutReplacements[i];
        const replacement = availableTrackers[i];

        if (assignment.id && replacement.id) {
          // Use direct SQL update with type assertion to bypass TypeScript checking
          const { error } = await supabase
            .from('match_tracker_assignments')
            .update({ replacement_tracker_id: replacement.id } as any)
            .eq('id', assignment.id);

          if (!error) {
            assignmentCount++;
            
            // Notify replacement tracker
            await supabase.from('notifications').insert({
              user_id: replacement.id,
              match_id: matchId,
              type: 'replacement_assignment',
              title: 'Backup Tracker Assignment',
              message: `You have been assigned as a backup tracker for match ${matchId}.`,
              notification_data: {
                primary_tracker_id: assignment.tracker_user_id
              }
            });
          }
        }
      }

      toast.success(`Assigned ${assignmentCount} replacement trackers`);
      onActionComplete?.();
    } catch (error) {
      console.error('Error assigning replacements:', error);
      toast.error('Failed to assign replacement trackers');
    } finally {
      setLoading('');
    }
  };

  const assignEventTypes = async () => {
    setLoading('assign-events');
    try {
      const { data: assignments, error } = await supabase
        .from('match_tracker_assignments')
        .select('id, assigned_event_types')
        .eq('match_id', matchId);

      if (error) throw error;

      const eventTypeGroups = [
        ['pass', 'shot', 'cross'],
        ['dribble', 'tackle', 'interception'],
        ['corner', 'freeKick', 'throwIn'],
        ['clearance', 'save', 'goalKick']
      ];

      const updates = assignments?.map((assignment, index) => ({
        id: assignment.id,
        assigned_event_types: eventTypeGroups[index % eventTypeGroups.length]
      })) || [];

      for (const update of updates) {
        await supabase
          .from('match_tracker_assignments')
          .update({ assigned_event_types: update.assigned_event_types })
          .eq('id', update.id);
      }

      toast.success('Event types assigned successfully');
      onActionComplete?.();
    } catch (error) {
      console.error('Error assigning event types:', error);
      toast.error('Failed to assign event types');
    } finally {
      setLoading('');
    }
  };

  const notifyAllTrackers = async () => {
    setLoading('notify');
    try {
      const { data: assignments, error } = await supabase
        .from('match_tracker_assignments_view')
        .select('tracker_user_id, tracker_email')
        .eq('match_id', matchId);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        toast.info('No trackers to notify');
        return;
      }

      // Send notifications individually to avoid array type issues
      let notificationCount = 0;
      for (const assignment of assignments) {
        if (assignment.tracker_user_id) {
          await supabase.from('notifications').insert({
            user_id: assignment.tracker_user_id,
            match_id: matchId,
            type: 'match_notification',
            title: 'Match Assignment Notification',
            message: `This is a notification about your assignment for match ${matchId}. Please ensure you are ready for the match.`,
            notification_data: {
              notification_type: 'general_reminder'
            }
          });
          notificationCount++;
        }
      }

      toast.success(`Notifications sent to ${notificationCount} trackers`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    } finally {
      setLoading('');
    }
  };

  const generateReport = async () => {
    setLoading('report');
    try {
      // This would generate a planning summary report
      toast.info('Report generation feature coming soon');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading('');
    }
  };

  const checkEquipment = async () => {
    setLoading('equipment');
    try {
      // This would check tracker device status
      toast.info('Equipment check feature coming soon');
    } catch (error) {
      console.error('Error checking equipment:', error);
      toast.error('Failed to check equipment');
    } finally {
      setLoading('');
    }
  };

  const actions = [
    {
      id: 'auto-assign',
      title: 'Auto-Assign Trackers',
      description: 'Automatically assign available trackers to unassigned players',
      icon: Users,
      onClick: autoAssignTrackers,
      color: 'blue'
    },
    {
      id: 'assign-replacements',
      title: 'Assign Replacements',
      description: 'Assign backup trackers to all primary assignments',
      icon: UserCheck,
      onClick: assignReplacements,
      color: 'green'
    },
    {
      id: 'assign-events',
      title: 'Assign Event Types',
      description: 'Automatically distribute event types among trackers',
      icon: Settings,
      onClick: assignEventTypes,
      color: 'purple'
    },
    {
      id: 'notify',
      title: 'Send Notifications',
      description: 'Notify all assigned trackers about their assignments',
      icon: Bell,
      onClick: notifyAllTrackers,
      color: 'yellow'
    },
    {
      id: 'equipment',
      title: 'Check Equipment',
      description: 'Verify tracker device status and connectivity',
      icon: CheckCircle,
      onClick: checkEquipment,
      color: 'indigo'
    },
    {
      id: 'report',
      title: 'Generate Report',
      description: 'Create comprehensive planning summary',
      icon: FileText,
      onClick: generateReport,
      color: 'gray'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Planning Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const isLoading = loading === action.id;
            
            return (
              <Button
                key={action.id}
                variant="outline"
                className={`p-4 h-auto text-left justify-start hover:bg-${action.color}-50 hover:border-${action.color}-300 transition-colors`}
                onClick={action.onClick}
                disabled={isLoading}
              >
                <div className="flex items-start gap-3 w-full">
                  <Icon className={`h-5 w-5 text-${action.color}-600 mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{action.description}</div>
                    {isLoading && (
                      <div className="text-xs text-blue-600 mt-1">Processing...</div>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickPlanningActions;
