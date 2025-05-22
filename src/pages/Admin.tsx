
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Loader2, UserPlus, UserX, Edit, Key, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface EventCategory {
  id: string;
  name: string;
}

const Admin = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'tracker' | 'viewer'>('viewer');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEventAssignDialogOpen, setIsEventAssignDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([
    { id: 'pass', name: 'Pass' },
    { id: 'shot', name: 'Shot' },
    { id: 'tackle', name: 'Tackle' },
    { id: 'foul', name: 'Foul' },
    { id: 'goal', name: 'Goal' }
  ]);
  const [selectedEventCategory, setSelectedEventCategory] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<string>('users');
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
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch profiles: ${usersResponse.statusText}`);
      }
      
      const profilesData = await usersResponse.json();
      
      // Get all user roles
      const rolesResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=user_id,role`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!rolesResponse.ok) {
        throw new Error(`Failed to fetch roles: ${rolesResponse.statusText}`);
      }
      
      const rolesData = await rolesResponse.json();
      
      // Map roles to users
      const usersWithRoles = profilesData.map((user: any) => {
        const userRole = Array.isArray(rolesData) 
          ? rolesData.find((role: any) => role.user_id === user.id) 
          : null;
        
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
    setIsRoleDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openPasswordDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  };

  const openEventAssignDialog = (user: UserWithRole) => {
    if (user.role !== 'tracker') {
      toast({
        title: 'Cannot Assign Events',
        description: 'Only trackers can be assigned to event categories.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedUser(user);
    setSelectedEventCategory('');
    setIsEventAssignDialogOpen(true);
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
      
      setIsRoleDialogOpen(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const createNewUser = async () => {
    try {
      // Create new user with Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
        user_metadata: { full_name: newUserFullName }
      });

      if (error) {
        throw error;
      }

      // Add role for the new user
      if (data.user) {
        await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session?.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ 
            user_id: data.user.id,
            role: selectedRole
          })
        });
        
        toast({
          title: 'User Created',
          description: `${newUserEmail} has been successfully created with ${selectedRole} role.`,
        });
        
        // Refresh user list
        await fetchUsers();
        
        // Reset form and close dialog
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserFullName('');
        setIsNewUserDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error Creating User',
        description: error.message || 'Failed to create user.',
        variant: 'destructive',
      });
    }
  };

  const updateUserPassword = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        selectedUser.id,
        { password: newPassword }
      );

      if (error) {
        throw error;
      }
      
      toast({
        title: 'Password Updated',
        description: `Password has been updated for ${selectedUser.email}.`,
      });
      
      setNewPassword('');
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password.',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase.auth.admin.deleteUser(selectedUser.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'User Deleted',
        description: `${selectedUser.email} has been successfully deleted.`,
      });
      
      // Update local state
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const assignEventCategory = async () => {
    if (!selectedUser || !selectedEventCategory) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tracker_assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ 
          tracker_id: selectedUser.id,
          event_category: selectedEventCategory,
          created_by: session?.user?.id
        })
      });
      
      toast({
        title: 'Event Assigned',
        description: `${selectedEventCategory} event has been assigned to ${selectedUser.email}.`,
      });
      
      setIsEventAssignDialogOpen(false);
    } catch (error: any) {
      console.error('Error assigning event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign event category.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage users and their permissions</p>
          </div>
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="assignments">Event Assignments</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserFullName('');
                setSelectedRole('viewer');
                setIsNewUserDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus size={18} />
              Add New User
            </Button>
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
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                              <Edit size={16} className="mr-1" /> Role
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openPasswordDialog(user)}>
                              <Key size={16} className="mr-1" /> Password
                            </Button>
                            {user.role === 'tracker' && (
                              <Button variant="outline" size="sm" onClick={() => openEventAssignDialog(user)}>
                                <ShieldCheck size={16} className="mr-1" /> Assign
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(user)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments">
          <div className="bg-card rounded-lg border shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Event Category Assignments</h2>
            <p className="text-muted-foreground mb-6">
              View and manage which trackers are assigned to which event categories. 
              Assignments allow trackers to record specific types of events during matches.
            </p>
            
            {/* This would be implementation for viewing assignments - simplified for now */}
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Assign event categories to trackers from the User Management tab
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
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
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specified permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={newUserFullName}
                onChange={(e) => setNewUserFullName(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              New Password:
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateUserPassword}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Event Dialog */}
      <Dialog open={isEventAssignDialogOpen} onOpenChange={setIsEventAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Event Category</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.email} to track specific event types
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Event Category:
            </label>
            <Select value={selectedEventCategory} onValueChange={setSelectedEventCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select event category" />
              </SelectTrigger>
              <SelectContent>
                {eventCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assignEventCategory}>
              Assign Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
