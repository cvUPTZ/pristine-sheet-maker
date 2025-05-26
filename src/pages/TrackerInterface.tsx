import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Goal,
  Play,
  ShieldCheck,
  AlertTriangle,
  CornerDownLeft,
  Flag,
  Trophy,
  Users,
  CreditCard,
  Award,
  ArrowRight,
  Target
} from 'lucide-react';
// import { EventType } from '@/types'; // This was line 10 in your provided file, not '@/components/ui/stat'

interface EventAssignment {
  id: string;
  user_id: string;
  event_type: string; // This ideally should be EventType from '@/types' if it covers all these strings
  created_at: string;
}

const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  'goal': Trophy,
  'shot': Target,
  'pass': ArrowRight,
  'foul': AlertTriangle,
  'card': CreditCard,
  'corner': CornerDownLeft,
  'offside': Flag,
  'penalty': Award,
  'free-kick': Play,
  'goal-kick': Goal,
  'throw-in': Users,
  'tackle': ShieldCheck,
  'interception': ShieldCheck,
  'assist': Users,
  'yellowCard': CreditCard,
  'redCard': CreditCard,
  'substitution': Users
};

const EVENT_COLORS: Record<string, string> = {
  'goal': 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600',
  'shot': 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  'pass': 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
  'foul': 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
  'card': 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
  'corner': 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
  'offside': 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
  'penalty': 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
  'free-kick': 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
  'goal-kick': 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700',
  'throw-in': 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
  'tackle': 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700',
  'interception': 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
  'assist': 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700',
  'yellowCard': 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
  'redCard': 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
  'substitution': 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700'
};

const TrackerInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedEvents, setAssignedEvents] = useState<EventAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingEvent, setRecordingEvent] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserAssignments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserAssignments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching assignments:', error);
        toast({
          title: "Error",
          description: "Failed to load your assigned events",
          variant: "destructive",
        });
        return;
      }

      setAssignedEvents(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventRecord = async (eventType: string) => {
    setRecordingEvent(eventType);

    // Simulate event recording logic
    // In a real app, this would involve API calls, state updates, etc.
    // For example, you might call a function from useMatchState or a Supabase function
    console.log(`Recording event: ${eventType} for user ${user?.id}`);

    setTimeout(() => {
      setRecordingEvent(null);
      toast({
        title: "Event Recorded",
        description: `${formatEventName(eventType)} recorded successfully (simulated).`,
      });
    }, 800);
  };

  const formatEventName = (eventType: string) => {
    return eventType
      .replace(/([A-Z])/g, ' $1') // Add space before capitals (for camelCase)
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (assignedEvents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No Events Assigned</h2>
          <p className="text-slate-600 mb-4">
            You don't have any events assigned to track yet. Please contact your administrator.
          </p>
          <Button onClick={fetchUserAssignments} variant="outline">
            Refresh Assignments
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Event Tracker</h1>
          <p className="text-slate-600">Track your assigned match events</p>
          <Badge variant="outline" className="mt-2">
            {assignedEvents.length} Event{assignedEvents.length !== 1 ? 's' : ''} Assigned
          </Badge>
        </div>

        {/* Event Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assignedEvents.map((assignment) => {
            const IconComponent = EVENT_ICONS[assignment.event_type] || Target;
            const colorClass = EVENT_COLORS[assignment.event_type] || 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700';
            const isRecording = recordingEvent === assignment.event_type;

            return (
              <Card
                key={assignment.id}
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Button
                  onClick={() => handleEventRecord(assignment.event_type)}
                  disabled={isRecording}
                  className={`
                    w-full h-32 ${colorClass}
                    text-white font-semibold text-lg
                    border-0 rounded-lg
                    flex flex-col items-center justify-center gap-3
                    transition-all duration-300
                    ${isRecording ? 'animate-pulse' : ''}
                  `}
                >
                  <IconComponent
                    className={`h-10 w-10 transition-transform duration-300 ${
                      isRecording ? 'animate-bounce' : 'group-hover:scale-110'
                    }`}
                  />
                  <span className="text-center leading-tight">
                    {formatEventName(assignment.event_type)}
                  </span>

                  {isRecording && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                      </div>
                    </div>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats - Consider making these dynamic */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{assignedEvents.length}</div>
            <div className="text-sm text-slate-600">Assigned Events</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div> {/* Placeholder */}
            <div className="text-sm text-slate-600">Events Tracked Today</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">Active</div> {/* Placeholder */}
            <div className="text-sm text-slate-600">Status</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackerInterface;
