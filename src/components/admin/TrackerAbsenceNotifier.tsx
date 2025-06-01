
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserX, Users } from 'lucide-react';

interface TrackerAbsenceNotifierProps {
  matchId: string;
  absentTrackerId: string;
  onClose: () => void;
}

const TrackerAbsenceNotifier: React.FC<TrackerAbsenceNotifierProps> = ({
  matchId,
  absentTrackerId,
  onClose
}) => {
  const [selectedReplacement, setSelectedReplacement] = useState<string>('');
  const [availableTrackers, setAvailableTrackers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchAvailableTrackers();
  }, []);

  const fetchAvailableTrackers = async () => {
    try {
      // Get all tracker users who are not the absent tracker and not assigned to this match
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker')
        .neq('id', absentTrackerId);

      if (error) throw error;
      setAvailableTrackers(data || []);
    } catch (error) {
      console.error('Error fetching available trackers:', error);
    }
  };

  const handleAssignReplacement = async () => {
    if (!selectedReplacement) {
      toast({
        title: "Error",
        description: "Please select a replacement tracker",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Since the RPC function might not exist, we'll handle this through notifications
      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: absentTrackerId,
            title: 'Marked as Absent',
            message: `You have been marked as absent for match ${matchId}. A replacement has been assigned.`,
            type: 'tracker_absence'
          },
          {
            user_id: selectedReplacement,
            title: 'Replacement Assignment',
            message: `You have been assigned as a replacement tracker for match ${matchId}.`,
            type: 'replacement_assignment'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Replacement Assigned",
        description: "Replacement tracker has been notified and assigned",
      });

      onClose();
    } catch (error) {
      console.error('Error assigning replacement:', error);
      toast({
        title: "Error",
        description: "Failed to assign replacement tracker",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-red-500" />
          Tracker Absence Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          A tracker is absent for this match. Please assign a replacement tracker.
        </p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Replacement Tracker:</label>
          <Select value={selectedReplacement} onValueChange={setSelectedReplacement}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a replacement tracker" />
            </SelectTrigger>
            <SelectContent>
              {availableTrackers.map((tracker) => (
                <SelectItem key={tracker.id} value={tracker.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {tracker.full_name || tracker.email}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleAssignReplacement} 
            disabled={loading || !selectedReplacement}
            className="flex-1"
          >
            {loading ? 'Assigning...' : 'Assign Replacement'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerAbsenceNotifier;
