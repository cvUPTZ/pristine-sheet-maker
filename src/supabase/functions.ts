
import { supabase } from "@/integrations/supabase/client";
import { TrackerAssignment } from "@/types/auth";

/**
 * Functions to handle tracker assignments
 */

export async function getTrackerAssignments(userId: string) {
  const { data, error } = await supabase.rpc('get_tracker_assignments', { user_id: userId });
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function getAllTrackerAssignments() {
  const { data, error } = await supabase.rpc('get_all_tracker_assignments');
  
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
  });
  
  if (error) {
    throw error;
  }
  
  return data as TrackerAssignment[];
}

export async function deleteTrackerAssignment(assignmentId: string) {
  const { error } = await supabase.rpc('delete_tracker_assignment', {
    p_assignment_id: assignmentId
  });
  
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
  
  return data;
}

export async function updateUserRole(userId: string, role: 'admin' | 'tracker' | 'user') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select();
  
  if (error) {
    throw error;
  }
  
  return data;
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

export async function getSystemSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');
  
  if (error) {
    console.error('Error fetching system settings:', error);
    return [];
  }
  
  return data as SystemSetting[];
}

export async function updateSystemSetting(id: string, value: string) {
  const { data, error } = await supabase
    .from('system_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (error) {
    throw error;
  }
  
  return data as SystemSetting[];
}
