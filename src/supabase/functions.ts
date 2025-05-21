
import { supabase } from "@/integrations/supabase/client";
import { SystemSetting, TrackerAssignment, UserProfile } from "@/types/auth";

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

// Mock data for system settings since the table doesn't exist yet
const mockSystemSettings: SystemSetting[] = [
  {
    id: '1',
    key: 'app_name',
    value: 'Sports Analytics Platform',
    description: 'The name of the application',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    key: 'enable_public_registration',
    value: 'true',
    description: 'Allow public user registration',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mocking system settings functions since the table doesn't exist yet
export async function getSystemSettings() {
  // Return mock data instead of querying non-existent table
  return mockSystemSettings;
}

export async function updateSystemSetting(id: string, value: string) {
  // Mock update - in a real implementation, this would update the database
  const updated = mockSystemSettings.map(setting => 
    setting.id === id ? { ...setting, value, updated_at: new Date().toISOString() } : setting
  );
  
  return updated.filter(setting => setting.id === id) as SystemSetting[];
}
