import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Eye, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Import the official permission definitions from the central hook
import { RolePermissions, UserRole, DEFAULT_PERMISSIONS as defaultPermissions } from '@/hooks/useUserPermissions';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
  custom_permissions: Partial<RolePermissions> | null;
  effective_permissions?: RolePermissions;
}

const getPermissionDescription = (permission: keyof RolePermissions): string => {
  const descriptions: Record<keyof RolePermissions, string> = {
    // Match Management
    canCreateMatches: 'Allows user to create new match entries.',
    canEditMatches: 'Allows user to edit details of existing matches.',
    canDeleteMatches: 'Allows user to delete matches.',
    canViewMatches: 'Allows user to see the list of matches.',
    canTrackMatches: 'Allows user to access the live match tracking interface.',
    canManageMatchTimer: 'Allows user to control the official match timer.',
    
    // Analytics & Statistics
    canViewAnalytics: 'Grants access to advanced analytics dashboards.',
    canViewStatistics: 'Grants access to the main statistics page.',
    canExportData: 'Allows user to export match data and reports.',
    canViewReports: 'Allows user to view generated performance reports.',
    
    // Video Analysis
    canAnalyzeVideos: 'Allows user to use video analysis tools.',
    canUploadVideos: 'Allows user to upload videos for analysis.',
    canDeleteVideos: 'Allows user to delete uploaded videos.',
    canManageVideoJobs: 'Allows user to manage video processing jobs.',
    
    // User Management
    canManageUsers: 'Allows user to edit other users\' roles and permissions.',
    canViewUserProfiles: 'Allows user to view profiles of other users.',
    canAssignRoles: 'Allows user to change the role of other users.',
    canDeleteUsers: 'Allows user to delete user accounts.',
    
    // Administrative
    canAccessAdmin: 'Grants access to the main admin panel.',
    canManageSettings: 'Allows user to change system-wide settings.',
    canViewSystemLogs: 'Allows user to view system activity logs.',
    canManageDatabase: 'Grants direct database management permissions.',
    
    // Communication
    canUseVoiceChat: 'Allows user to join and use voice chat during matches.',
    canModerateChat: 'Allows user to mute or remove others from chat.',
    
    // General Access
    canViewDashboard: 'Allows user to access the main application dashboard.',
    canViewOwnProfile: 'Allows user to view their own profile page.',
    canEditOwnProfile: 'Allows user to edit their own profile details.',
  };
  
  return descriptions[permission] || 'No description available.';
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
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at, updated_at, custom_permissions')
        .order('email');

      if (error) throw error;
      if (!data) {
        setUsers([]);
        return;
      }

      const typedUsers: UserProfile[] = data.map(user => {
        const userRole = (user.role || 'user') as UserRole;
        const roleDefaults = defaultPermissions[userRole] || defaultPermissions.user;
        
        const effective_permissions = user.custom_permissions 
          ? { ...roleDefaults, ...(user.custom_permissions as Partial<RolePermissions>) }
          : roleDefaults;
        
        return {
          ...user,
          role: user.role || 'user',
          custom_permissions: (user.custom_permissions as Partial<RolePermissions>) || null,
          effective_permissions: effective_permissions
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
      // When changing role, reset custom permissions to inherit new role's defaults
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, custom_permissions: null })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          const newRolePermissions = defaultPermissions[newRole];
          return { 
            ...user, 
            role: newRole,
            custom_permissions: null,
            effective_permissions: newRolePermissions
          };
        }
        return user;
      }));
      
      if (selectedUser === userId) {
        setPermissions(defaultPermissions[newRole]);
        setHasUnsavedChanges(false);
      }

      toast.success('User role updated. Custom permissions reset to new role defaults.');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const savePermissions = async (userId: string, newPermissions: RolePermissions) => {
    setSaving(true);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const roleDefaults = defaultPermissions[(user.role || 'user') as UserRole];
      const customOverrides: Partial<RolePermissions> = {};

      // Only save permissions that differ from the role's default to keep the database clean
      (Object.keys(newPermissions) as Array<keyof RolePermissions>).forEach(key => {
        if (newPermissions[key] !== roleDefaults[key]) {
          customOverrides[key] = newPermissions[key];
        }
      });

      const payload = Object.keys(customOverrides).length > 0 ? customOverrides : null;

      const { error } = await supabase
        .from('profiles')
        .update({ custom_permissions: payload as any })
        .eq('id', userId);

      if (error) throw error;

      // Update local state to reflect the change
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, custom_permissions: payload, effective_permissions: newPermissions }
          : u
      ));

      setHasUnsavedChanges(false);
      toast.success('Custom permissions saved successfully!');
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
      // To reset, we set custom_permissions to NULL in the database
      const { error } = await supabase
        .from('profiles')
        .update({ custom_permissions: null })
        .eq('id', userId);

      if (error) throw error;
      
      const userRole = (user.role || 'user') as UserRole;
      const roleDefaults = defaultPermissions[userRole] || defaultPermissions.user;
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, custom_permissions: null, effective_permissions: roleDefaults }
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
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'tracker': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      case 'viewer': return 'bg-orange-100 text-orange-800';
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
                      {user.full_name && user.full_name.trim() !== '' ? user.full_name : user.email || 'No name'}
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
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="tracker">Tracker</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
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
                  disabled={saving || !selectedUserData.custom_permissions}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Role Defaults
                </Button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">
                  {selectedUserData.full_name && selectedUserData.full_name.trim() !== '' 
                    ? selectedUserData.full_name 
                    : selectedUserData.email || 'Unnamed User'
                  }
                </p>
                <p className="text-gray-600">
                  Role: {selectedUserData.role || 'user'} | 
                  <span className={selectedUserData.custom_permissions ? 'text-purple-600 font-semibold' : ''}>
                    {selectedUserData.custom_permissions ? ' Using Custom Permissions' : ' Using Role Defaults'}
                  </span>
                </p>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto pr-2">
                {Object.entries(permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={key} className="capitalize text-sm sm:text-base">
                        {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
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

export default AccessManagement;