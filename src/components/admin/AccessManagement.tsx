
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface RolePermissions {
  canAccessPitch: boolean;
  canAccessPiano: boolean;
  canAccessStatistics: boolean;
  canAccessTimeline: boolean;
  canAccessAnalytics: boolean;
  canAccessBallTracking: boolean;
  canManageEvents: boolean;
  canEditFormations: boolean;
}

const defaultPermissions: Record<string, RolePermissions> = {
  admin: {
    canAccessPitch: true,
    canAccessPiano: true,
    canAccessStatistics: true,
    canAccessTimeline: true,
    canAccessAnalytics: true,
    canAccessBallTracking: true,
    canManageEvents: true,
    canEditFormations: true,
  },
  tracker: {
    canAccessPitch: false,
    canAccessPiano: true,
    canAccessStatistics: false,
    canAccessTimeline: false,
    canAccessAnalytics: false,
    canAccessBallTracking: false,
    canManageEvents: false,
    canEditFormations: false,
  },
  viewer: {
    canAccessPitch: true,
    canAccessPiano: false,
    canAccessStatistics: true,
    canAccessTimeline: true,
    canAccessAnalytics: true,
    canAccessBallTracking: false,
    canManageEvents: false,
    canEditFormations: false,
  },
};

const AccessManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rolePermissions, setRolePermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type safe mapping to ensure all required fields are present
      const typedUsers: UserProfile[] = (data || []).map(user => ({
        id: user.id || '',
        email: user.email || '',
        full_name: user.full_name || '',
        role: user.role || 'viewer'
      })).filter(user => user.id); // Filter out any users without valid IDs

      setUsers(typedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      toast.success('User role updated successfully');
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const updateRolePermission = (role: string, permission: keyof RolePermissions, value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: value
      }
    }));
    toast.success(`${role} permissions updated`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading access management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'tracker' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                  <Select value={user.role} onValueChange={(value) => updateUserRole(user.id, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="tracker">Tracker</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(rolePermissions).map(([role, permissions]) => (
              <div key={role} className="space-y-4">
                <h3 className="text-lg font-semibold capitalize">{role} Permissions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(permissions).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Switch
                        id={`${role}-${permission}`}
                        checked={enabled}
                        onCheckedChange={(value) => updateRolePermission(role, permission as keyof RolePermissions, value)}
                      />
                      <Label htmlFor={`${role}-${permission}`} className="text-sm">
                        {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Access Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['admin', 'tracker', 'viewer'].map((role) => (
              <div key={role} className="space-y-2">
                <h4 className="font-medium capitalize">{role}</h4>
                <div className="space-y-1">
                  {Object.entries(rolePermissions[role]).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center gap-2 text-sm">
                      {enabled ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={enabled ? 'text-green-700' : 'text-gray-500'}>
                        {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessManagement;
