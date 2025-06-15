import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateUserDialog from './CreateUserDialog';

type UserRole = 'admin' | 'tracker' | 'teacher' | 'user' | 'manager' | 'special';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch users directly from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .order('email');

      if (error) throw error;

      const typedUsers: UserProfile[] = (data || [])
        .filter(user => user.id) // Filter out null IDs
        .map(user => ({
          id: user.id!,
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
      // Update the role in the profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (profilesError) {
        console.error('Error updating user role in profiles:', profilesError);
        throw new Error(`Failed to update user role in profiles: ${profilesError.message}`);
      }

      // Check if user exists in user_roles table
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if user doesn't exist
        console.error('Error checking user_roles:', checkError);
      }

      // Update or insert in user_roles table
      let userRolesError;
      if (existingRole) {
        // User exists, update the role
        const { error } = await supabase
          .from('user_roles')
          .update({ 
            role: newRole as any,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        userRolesError = error;
      } else {
        // User doesn't exist, insert new record
        const { error } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: userId, 
            role: newRole as any,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        userRolesError = error;
      }

      if (userRolesError) {
        console.error('Error updating user role in user_roles:', userRolesError);
        console.warn('Profile updated but user_roles table update failed');
        toast.error('Role updated in profiles but failed to sync with user_roles table');
      } else {
        console.log('Successfully updated role in both profiles and user_roles tables');
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

  const handleUserCreated = () => {
    setShowCreateUser(false);
    fetchUsers(); // Refresh the user list
    toast.success('User created successfully');
  };

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              User Management
            </CardTitle>
            <Button 
              onClick={() => setShowCreateUser(true)}
              className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create User
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
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="tracker">Tracker</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="special" className="text-blue-700 font-bold">Special</SelectItem>
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

      <CreateUserDialog 
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onUserCreated={handleUserCreated}
      />
    </>
  );
};

export default UserManagement;
