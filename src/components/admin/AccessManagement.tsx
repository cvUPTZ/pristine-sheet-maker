
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Shield, Eye } from 'lucide-react';
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
  email?: string;
  role: UserRole;
  full_name?: string;
  permissions?: RolePermissions;
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions.user);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, permissions')
        .order('email');

      if (error) throw error;

      const typedUsers: UserProfile[] = (data || []).map(user => ({
        ...user,
        email: user.email || '',
        role: (user.role || 'user') as UserRole,
        full_name: user.full_name || undefined,
        permissions: user.permissions ? user.permissions as RolePermissions : defaultPermissions[user.role as UserRole] || defaultPermissions.user
      }));

      setUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          permissions: defaultPermissions[newRole]
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole, permissions: defaultPermissions[newRole] }
          : user
      ));

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const updatePermissions = async (userId: string, newPermissions: RolePermissions) => {
    try {
      // Use the database function to update permissions
      const { error } = await supabase.rpc('update_user_permissions', {
        user_id_param: userId,
        permissions_param: newPermissions
      });

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, permissions: newPermissions }
          : user
      ));

      toast.success('Permissions updated successfully');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(userId);
      setPermissions(user.permissions || defaultPermissions[user.role]);
    }
  };

  const handlePermissionChange = (permission: keyof RolePermissions, value: boolean) => {
    const newPermissions = { ...permissions, [permission]: value };
    setPermissions(newPermissions);
    
    if (selectedUser) {
      updatePermissions(selectedUser, newPermissions);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedUser === user.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleUserSelect(user.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{user.full_name || user.email}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value: UserRole) => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-32">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Access Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-4">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {getPermissionDescription(key as keyof RolePermissions)}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(key as keyof RolePermissions, checked)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a user to view and edit permissions</p>
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
