import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserProfile } from "@/types/auth";
import type { TrackerAssignment as TrackerAssignmentType } from "@/types/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Trash2 } from "lucide-react";
import { 
  getAllTrackerAssignments,
  createTrackerAssignment,
  deleteTrackerAssignment
} from "@/supabase/functions";

// Map event categories
const EVENT_CATEGORIES = [
  { id: "attack", name: "Attack Actions", events: ["pass", "shot", "goal", "assist"] },
  { id: "defense", name: "Defense Actions", events: ["tackle", "interception"] },
  { id: "set_pieces", name: "Set Pieces", events: ["corner", "free-kick", "goal-kick", "throw-in", "penalty"] },
  { id: "violations", name: "Violations", events: ["foul", "offside", "yellowCard", "redCard"] },
  { id: "other", name: "Other Actions", events: ["substitution"] },
];

export default function TrackerAssignment() {
  const [trackers, setTrackers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<TrackerAssignmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [selectedTracker, setSelectedTracker] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchTrackers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'tracker');
          
        if (error) throw error;
        
        setTrackers(data as UserProfile[]);
        
        // Fetch existing assignments
        const assignmentsData = await getAllTrackerAssignments();
        setAssignments(assignmentsData);
      } catch (error) {
        console.error("Error fetching trackers:", error);
        toast({
          title: "Error",
          description: "Failed to load trackers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrackers();
  }, [isAdmin, toast]);

  const handleAssignCategory = async () => {
    if (!selectedTracker || !selectedCategory || !user) return;
    
    try {
      setSaving(true);
      
      // Check if assignment already exists
      const existingAssignment = assignments.find(a => 
        a.tracker_id === selectedTracker && a.event_category === selectedCategory
      );
      
      if (existingAssignment) {
        toast({
          title: "Assignment exists",
          description: "This tracker already has this category assigned.",
        });
        return;
      }
      
      // Insert the new assignment
      const data = await createTrackerAssignment(selectedTracker, selectedCategory, user.id);
      
      if (data && data.length > 0) {
        const newAssignment = data[0];
        setAssignments([...assignments, newAssignment]);
        
        toast({
          title: "Success",
          description: "Tracker assignment created successfully.",
        });
      }
      
      // Reset selection
      setSelectedCategory("");
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      setSaving(true);
      
      await deleteTrackerAssignment(assignmentId);
      
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      
      toast({
        title: "Success",
        description: "Assignment removed successfully.",
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTrackerAssignments = (trackerId: string) => {
    return assignments.filter(a => a.tracker_id === trackerId);
  };
  
  const getCategoryName = (categoryId: string) => {
    const category = EVENT_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tracker Assignments</CardTitle>
        <CardDescription>
          Assign specific event categories to trackers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Create Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tracker" />
                  </SelectTrigger>
                  <SelectContent>
                    {trackers.map(tracker => (
                      <SelectItem key={tracker.id} value={tracker.id}>
                        {tracker.full_name || tracker.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleAssignCategory} 
                  disabled={!selectedTracker || !selectedCategory || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Assign Category
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Current Assignments</h3>
              <div className="space-y-4">
                {trackers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trackers found.</p>
                ) : (
                  trackers.map(tracker => {
                    const trackerAssignments = getTrackerAssignments(tracker.id);
                    return (
                      <div key={tracker.id} className="rounded-lg border p-4">
                        <h4 className="font-medium">{tracker.full_name || tracker.email}</h4>
                        {trackerAssignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground mt-2">No categories assigned</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {trackerAssignments.map(assignment => (
                              <div key={assignment.id} className="flex items-center bg-secondary rounded-full pl-3 pr-1 py-1">
                                <span className="text-xs mr-2">{getCategoryName(assignment.event_category)}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 hover:bg-destructive/20" 
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
