
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'tracker' | 'viewer';
}

interface UserWithRole extends User {
  role: 'admin' | 'tracker' | 'viewer' | null;
}

const Admin = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'tracker' | 'viewer'>('viewer');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get all users
      const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,created_at,full_name`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const profilesData = await usersResponse.json();
      
      // Get all user roles
      const rolesResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=user_id,role`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const rolesData = await rolesResponse.json();
      
      // Map roles to users
      const usersWithRoles = profilesData.map((user: any) => {
        const userRole = rolesData.find((role: any) => role.user_id === user.id);
        return {
          id: user.id,
          email: user.full_name, // Using full_name as we don't have email in profiles
          created_at: user.created_at,
          role: userRole ? userRole.role : null
        };
      });
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'viewer');
    setIsDialogOpen(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;
    
    try {
      if (selectedUser.role) {
        // Update existing role
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${selectedUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ role: selectedRole })
        });
      } else {
        // Insert new role
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ 
            user_id: selectedUser.id,
            role: selectedRole
          })
        });
      }
      
      toast({
        title: 'Success',
        description: `Role updated for ${selectedUser.email}`,
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, role: selectedRole } : user
      ));
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users />
          User Management
        </h1>
        <Button onClick={() => fetchUsers()}>Refresh</Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow">
          <Table>
            <TableCaption>Manage users and their permissions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span 
                        className={`px-2 py-1 text-sm rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : user.role === 'tracker' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role || 'No Role'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => openEditDialog(user)}>
                        Edit Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Select Role:
            </label>
            <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tracker">Tracker</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Admin:</strong> Full access to all features
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Tracker:</strong> Can record match data
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Viewer:</strong> Can only view match data
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
