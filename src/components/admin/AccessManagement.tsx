
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Shield, Eye, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'admin' | 'tracker' | 'teacher' | 'user';

interface RolePermissions {
  pitchView: boolean;
  pianoInput: boolean;
  statistics: boolean;
  timeline: boolean;
  analytics: boolean;
  ballTracking: boolean;
  liveEvents: boolean;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
  effective_permissions?: RolePermissions;
}

const defaultPermissions: Record<UserRole, RolePermissions> = {
  admin: {
    pitchView: true,
    pianoInput: true,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: true,
    liveEvents: true,
  },
  tracker: {
    pitchView: false,
    pianoInput: true,
    statistics: false,
    timeline: false,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
  },
  teacher: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: false,
    liveEvents: false,
  },
  user: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
  },
};

const AccessManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions.user);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setError(null);
      
      // Query the profiles table directly with available columns
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at, updated_at')
        .order('email');

      if (error) throw error;

      if (!data) {
        setUsers([]);
        return;
      }

      const typedUsers: UserProfile[] = data.map(user => {
        const userRole = (user.role || 'user') as UserRole;
        const roleDefaults = defaultPermissions[userRole] || defaultPermissions.user;
        
        return {
          ...user,
          role: user.role || 'user',
          effective_permissions: roleDefaults
        };
      });

      setUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please check your database setup.');
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          const newRolePermissions = defaultPermissions[newRole];
          return { 
            ...user, 
            role: newRole,
            effective_permissions: newRolePermissions
          };
        }
        return user;
      }));

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const savePermissions = async (userId: string, newPermissions: RolePermissions) => {
    setSaving(true);
    try {
      // For now, we'll just store this in local state since custom_permissions column doesn't exist
      // In a real implementation, you'd need to add this column to the database
      console.log('Would save permissions for user:', userId, newPermissions);

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              effective_permissions: newPermissions
            }
          : user
      ));

      setHasUnsavedChanges(false);
      toast.success('Permissions updated (note: custom permissions require database setup)');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const resetToRoleDefaults = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSaving(true);
    try {
      const userRole = (user.role || 'user') as UserRole;
      const roleDefaults = defaultPermissions[userRole] || defaultPermissions.user;
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { 
              ...u, 
              effective_permissions: roleDefaults
            }
          : u
      ));

      setPermissions(roleDefaults);
      setHasUnsavedChanges(false);
      toast.success('Permissions reset to role defaults');
    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast.error('Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(userId);
      const userRole = (user.role || 'user') as UserRole;
      const effectivePermissions = user.effective_permissions || defaultPermissions[userRole] || defaultPermissions.user;
      setPermissions(effectivePermissions);
      setHasUnsavedChanges(false);
    }
  };

  const handlePermissionChange = (permission: keyof RolePermissions, value: boolean) => {
    const newPermissions = { ...permissions, [permission]: value };
    setPermissions(newPermissions);
    setHasUnsavedChanges(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'tracker': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <Button onClick={fetchUsers} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedUser === user.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleUserSelect(user.id)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {user.full_name && user.full_name !== 'e' ? user.full_name : user.email || 'No name'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {user.email || 'No email'}
                    </p>
                  </div>
                  <Badge className={`${getRoleBadgeColor(user.role || 'user')} text-xs flex-shrink-0`}>
                    {user.role || 'user'}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Select
                    value={user.role || 'user'}
                    onValueChange={(value: UserRole) => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="tracker">Tracker</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Access Permissions
            {hasUnsavedChanges && (
              <Badge className="bg-orange-100 text-orange-800 text-xs ml-2">
                Unsaved Changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {selectedUser && selectedUserData ? (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <Button
                  onClick={() => savePermissions(selectedUser, permissions)}
                  disabled={!hasUnsavedChanges || saving}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </Button>
                
                <Button
                  onClick={() => resetToRoleDefaults(selectedUser)}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Role Defaults
                </Button>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">
                  {selectedUserData.full_name && selectedUserData.full_name !== 'e' 
                    ? selectedUserData.full_name 
                    : selectedUserData.email || 'Unnamed User'
                  }
                </p>
                <p className="text-gray-600">
                  Role: {selectedUserData.role || 'user'} | Using {selectedUserData.role || 'user'} role default permissions
                </p>
              </div>

              {/* Permissions List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={key} className="capitalize text-sm sm:text-base">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {getPermissionDescription(key as keyof RolePermissions)}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(key as keyof RolePermissions, checked)
                      }
                      className="flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Select a user to view and edit permissions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const getPermissionDescription = (permission: keyof RolePermissions): string => {
  const descriptions: Record<keyof RolePermissions, string> = {
    pitchView: 'Access to the pitch visualization and player tracking',
    pianoInput: 'Ability to record events using the piano input interface',
    statistics: 'View match statistics and team performance data',
    timeline: 'Access to the match events timeline',
    analytics: 'View advanced analytics and data visualizations',
    ballTracking: 'Track ball movement and positioning data',
    liveEvents: 'View real-time match events and updates',
  };
  
  return descriptions[permission] || '';
};

export default AccessManagement;
