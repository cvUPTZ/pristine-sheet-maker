
import { supabase } from "@/integrations/supabase/client";
import { TrackerAssignment, UserProfile } from "@/types/auth";

/**
 * Functions to handle tracker assignments
 */

export async function getTrackerAssignments(userId: string) {
  const { data, error } = await supabase
    .from('tracker_assignments')
    .select('*')
    .eq('tracker_id', userId);
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function getAllTrackerAssignments() {
  const { data, error } = await supabase
    .from('tracker_assignments')
    .select('*');
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function createTrackerAssignment(trackerId: string, eventCategory: string, createdBy: string) {
  const { data, error } = await supabase
    .from('tracker_assignments')
    .insert({
      tracker_id: trackerId,
      event_category: eventCategory,
      created_by: createdBy
    })
    .select();
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function deleteTrackerAssignment(assignmentId: string) {
  const { error } = await supabase
    .from('tracker_assignments')
    .delete()
    .eq('id', assignmentId);
  
  if (error) {
    throw error;
  }
  
  return true;
}

/**
 * User Management Functions
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw error;
  }
  
  return data as UserProfile[];
}

export async function updateUserRole(userId: string, role: 'admin' | 'tracker' | 'user' | 'teacher') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select();
  
  if (error) {
    throw error;
  }
  
  return data as UserProfile[];
}

/**
 * System Settings Functions
 */
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Mocking system settings functions since the table doesn't exist yet
// To properly implement this, you would need to create a system_settings table first

export async function getSystemSettings() {
  // Return a mock empty array for now
  return [] as SystemSetting[];
}

export async function updateSystemSetting(id: string, value: string) {
  // Mock implementation
  console.log(`Would update setting ${id} with value ${value}`);
  return [] as SystemSetting[];
}
