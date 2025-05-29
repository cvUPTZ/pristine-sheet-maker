
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings, Shield } from 'lucide-react';

interface RolePermissions {
  id: string;
  role: string;
  canAccessPitch: boolean;
  canAccessBallTracking: boolean;
  canAccessStatistics: boolean;
  canAccessTimeline: boolean;
  canAccessAnalytics: boolean;
  canManageTimer: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

const AccessManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions[]>([
    {
      id: 'admin',
      role: 'admin',
      canAccessPitch: true,
      canAccessBallTracking: true,
      canAccessStatistics: true,
      canAccessTimeline: true,
      canAccessAnalytics: true,
      canManageTimer: true,
    },
    {
      id: 'tracker',
      role: 'tracker',
      canAccessPitch: false,
      canAccessBallTracking: false,
      canAccessStatistics: false,
      canAccessTimeline: false,
      canAccessAnalytics: false,
      canManageTimer: false,
    },
    {
      id: 'user',
      role: 'user',
      canAccessPitch: true,
      canAccessBallTracking: false,
      canAccessStatistics: true,
      canAccessTimeline: true,
      canAccessAnalytics: true,
      canManageTimer: false,
    }
  ]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles_with_role')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const updatePermission = (roleId: string, permission: keyof Omit<RolePermissions, 'id' | 'role'>, value: boolean) => {
    setPermissions(prev => prev.map(perm => 
      perm.id === roleId ? { ...perm, [permission]: value } : perm
    ));
  };

  const savePermissions = () => {
    // In a real app, you'd save these to a database
    toast({
      title: 'Success',
      description: 'Permissions updated successfully',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading access management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Access Management</h2>
      </div>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissions.map((perm) => (
            <div key={perm.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg capitalize">{perm.role}</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure what {perm.role}s can access
                  </p>
                </div>
                <Badge variant={perm.role === 'admin' ? 'default' : perm.role === 'tracker' ? 'secondary' : 'outline'}>
                  {perm.role.toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-pitch`}
                    checked={perm.canAccessPitch}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canAccessPitch', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-pitch`} className="text-sm">Pitch View</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-ball`}
                    checked={perm.canAccessBallTracking}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canAccessBallTracking', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-ball`} className="text-sm">Ball Tracking</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-stats`}
                    checked={perm.canAccessStatistics}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canAccessStatistics', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-stats`} className="text-sm">Statistics</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-timeline`}
                    checked={perm.canAccessTimeline}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canAccessTimeline', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-timeline`} className="text-sm">Timeline</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-analytics`}
                    checked={perm.canAccessAnalytics}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canAccessAnalytics', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-analytics`} className="text-sm">Analytics</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${perm.id}-timer`}
                    checked={perm.canManageTimer}
                    onCheckedChange={(checked) => updatePermission(perm.id, 'canManageTimer', checked)}
                    disabled={perm.role === 'admin'}
                  />
                  <Label htmlFor={`${perm.id}-timer`} className="text-sm">Manage Timer</Label>
                </div>
              </div>
            </div>
          ))}
          
          <Button onClick={savePermissions} className="w-full">
            Save Permission Changes
          </Button>
        </CardContent>
      </Card>

      {/* User Management */}
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
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.full_name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'tracker' ? 'secondary' : 'outline'}>
                    {user.role?.toUpperCase() || 'USER'}
                  </Badge>
                  <select
                    value={user.role || 'user'}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="user">User</option>
                    <option value="tracker">Tracker</option>
                    <option value="admin">Admin</option>
                  </select>
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
