
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrackerAssignment } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventType } from "@/types";
import { Loader2 } from "lucide-react";

interface TrackerViewProps {
  onCategorySelect?: (category: string, events: EventType[]) => void;
}

export default function TrackerView({ onCategorySelect }: TrackerViewProps) {
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();

  // Map event categories
  const EVENT_CATEGORIES = [
    { id: "attack", name: "Attack Actions", events: ["pass", "shot", "goal", "assist"] as EventType[] },
    { id: "defense", name: "Defense Actions", events: ["tackle", "interception"] as EventType[] },
    { id: "set_pieces", name: "Set Pieces", events: ["corner", "free-kick", "goal-kick", "throw-in", "penalty"] as EventType[] },
    { id: "violations", name: "Violations", events: ["foul", "offside", "yellowCard", "redCard"] as EventType[] },
    { id: "other", name: "Other Actions", events: ["substitution"] as EventType[] },
  ];

  useEffect(() => {
    if (!user) return;
    
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        
        // Use raw SQL query for tables not reflected in TypeScript types yet
        const { data, error } = await supabase
          .from('tracker_assignments')
          .select('*')
          .eq('tracker_id', user.id);
          
        if (error) throw error;
        
        // Cast the data to our type
        setAssignments(data as unknown as TrackerAssignment[]);
        
        // Set the first category as selected if available
        if (data.length > 0 && onCategorySelect) {
          const firstCategory = data[0].event_category;
          setSelectedCategory(firstCategory);
          
          const categoryEvents = EVENT_CATEGORIES.find(c => c.id === firstCategory)?.events || [];
          onCategorySelect(firstCategory, categoryEvents);
        }
      } catch (error) {
        console.error("Error fetching tracker assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
  }, [user, onCategorySelect]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    if (onCategorySelect) {
      const categoryEvents = EVENT_CATEGORIES.find(c => c.id === categoryId)?.events || [];
      onCategorySelect(categoryId, categoryEvents);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">No Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            You don't have any tracking assignments yet.
            Please contact an administrator to get assigned to event categories.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Tracking Assignments</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {assignments.map(assignment => {
          const category = EVENT_CATEGORIES.find(c => c.id === assignment.event_category);
          return (
            <Card 
              key={assignment.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === assignment.event_category ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleCategoryClick(assignment.event_category)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{category?.name || assignment.event_category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {category?.events.map(event => (
                    <li key={event}>{event}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
