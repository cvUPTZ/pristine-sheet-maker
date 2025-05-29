
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'admin' | 'tracker' | 'teacher' | 'user';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  created?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Use the user_profiles_with_role view to get users with their roles
      const { data, error } = await supabase
        .from('user_profiles_with_role')
        .select('id, email, role, full_name')
        .order('email');

      if (error) throw error;

      const typedUsers: UserProfile[] = (data || []).map(user => ({
        ...user,
        email: user.email || '',
        role: (user.role || 'user') as UserRole,
        full_name: user.full_name || undefined,
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
      // Update the raw_user_meta_data in auth.users using the RPC function
      const { error: functionError } = await supabase.rpc('assign_user_role', {
        _user_id: userId,
        _role: newRole
      });

      if (functionError) {
        console.error('Error calling assign_user_role function:', functionError);
        throw new Error(`Failed to update user role: ${functionError.message}`);
      }

      // Update the local state to reflect the change
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ));

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      // Delete from profiles table (this should cascade and handle cleanup)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
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
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            User Management
          </CardTitle>
          <Button className="bg-gray-900 text-white hover:bg-gray-800">
            Create New User
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-600 font-mono">
                    {user.id.substring(0, 8)}...
                  </td>
                  <td className="py-3 text-sm">
                    {user.full_name || 'No name'}
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="py-3">
                    <Select
                      value={user.role}
                      onValueChange={(value: UserRole) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="tracker">Tracker</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Delete User
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
