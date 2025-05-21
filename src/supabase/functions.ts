
import { supabase } from "@/integrations/supabase/client";
import { TrackerAssignment } from "@/types/auth";

/**
 * Functions to handle tracker assignments
 */

export async function getTrackerAssignments(userId: string) {
  const { data, error } = await supabase.rpc('get_tracker_assignments', { user_id: userId } as any);
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function getAllTrackerAssignments() {
  const { data, error } = await supabase.rpc('get_all_tracker_assignments', {} as any);
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function createTrackerAssignment(trackerId: string, eventCategory: string, createdBy: string) {
  const { data, error } = await supabase.rpc('create_tracker_assignment', {
    p_tracker_id: trackerId,
    p_event_category: eventCategory,
    p_created_by: createdBy
  } as any);
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function deleteTrackerAssignment(assignmentId: string) {
  const { error } = await supabase.rpc('delete_tracker_assignment', {
    p_assignment_id: assignmentId
  } as any);
  
  if (error) {
    throw error;
  }
  
  return true;
}
