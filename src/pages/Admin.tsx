import React, { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabaseConfig'; // Ensure this path is correct
import { useAuth } from '@/context/AuthContext'; // Ensure this path is correct
import { Loader2, UserPlus, Edit, Key, Trash2, ShieldCheck, Briefcase } from 'lucide-react';
// Removed UserX as Trash2 is more common for delete
// supabase client is used for some direct table operations (assuming RLS is set up)
import { supabase } from '@/integrations/supabase/client'; // Ensure this path is correct

interface User {
  id: string;
  email: string;
  created_at: string;
  fullName?: string; // Added fullName
}

interface UserRole { // This is for the user_roles table schema, if ever fetched directly
  id: string; // PK of the user_roles table row
  user_id: string;
  role: 'admin' | 'tracker' | 'viewer';
}

export interface UserWithRole extends User { // Exporting for potential use elsewhere
  role: 'admin' | 'tracker' | 'viewer' | null;
  assigned_event_types: string[];
}

export const EVENT_TYPES = [
  "Attack", "Pass (P)", "Shot (S)", "Goal (G)", "Assist",
  "Defense", "Tackle (T)", "Interception (I)",
  "Corner (C)", "Free Kick", "Goal Kick", "Throw-in", "Penalty",
  "Foul (F)", "Offside", "Yellow Card", "Red Card",
  "Substitution"
];

const Admin = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For dialog submissions

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'tracker' | 'viewer'>('viewer');
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isAssignEventsDialogOpen, setIsAssignEventsDialogOpen] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [editingUserForEvents, setEditingUserForEvents] = useState<UserWithRole | null>(null);
  const [selectedEventTypesForUser, setSelectedEventTypesForUser] = useState<Set<string>>(new Set());

  const [selectedTab, setSelectedTab] = useState<string>('users');
  const { toast } = useToast();
  const { session, user: currentUser } = useAuth(); // Assuming useAuth provides the current user object

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-all-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY, // Supabase Edge Functions require apikey
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch users: ${response.statusText}`);
      }
      
      if (result.usersWithRolesAndAssignments) {
        setUsers(result.usersWithRolesAndAssignments);
      } else {
        console.error('Fetched data structure mismatch:', result);
        throw new Error('Invalid data structure received from the server.');
      }

    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error Fetching Users',
        description: error.message || 'Could not load users. Please try again.',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]); // Added SUPABASE_URL, SUPABASE_ANON_KEY if they can change, but typically they don't

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'viewer');
    setIsRoleDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    if (user.id === currentUser?.id) {
      toast({
        title: 'Action Denied',
        description: 'You cannot delete your own account from the admin panel.',
        variant: 'warning',
      });
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openPasswordDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  };

  const openAssignEventsDialog = (user: UserWithRole) => {
    setEditingUserForEvents(user);
    // Use the already fetched assignments if available, otherwise fetch fresh (though fetchUsers should provide them)
    setSelectedEventTypesForUser(new Set(user.assigned_event_types || []));
    setIsAssignEventsDialogOpen(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id && selectedRole !== 'admin') {
      toast({
        title: 'Action Denied',
        description: 'You cannot change your own role to a non-admin status.',
        variant: 'warning',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // This uses direct Supabase REST API with user's token.
      // Assumes RLS on `user_roles` table allows admins to perform this.
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: selectedUser.id, role: selectedRole }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Role updated for ${selectedUser.email}.`,
      });
      
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: selectedRole } : u
      ));
      setIsRoleDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error Updating Role',
        description: error.message || 'Failed to update user role.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createNewUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName, 
          role: selectedRole 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to create user: ${response.statusText}`);
      }

      toast({
        title: 'User Created',
        description: `${newUserEmail} created as ${selectedRole}. User ID: ${result.userId}`,
      });

      fetchUsers(); // Refresh user list
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setSelectedRole('viewer'); 
      setIsNewUserDialogOpen(false);

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error Creating User',
        description: error.message || 'Failed to create user.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({ title: "Missing Information", description: "Please select a user and enter a new password.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication token not found.");
      }
      const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update password.');
      
      toast({
        title: 'Password Updated',
        description: `Password updated for ${selectedUser.email}.`,
      });
      
      setNewPassword('');
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error Updating Password',
        description: error.message || 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    // Redundant check as openDeleteDialog already handles this, but good for safety.
    if (selectedUser.id === currentUser?.id) {
      toast({ title: 'Action Denied', description: 'Cannot delete your own account.', variant: 'warning' });
      setIsDeleteDialogOpen(false);
      return;
    }
    setIsSubmitting(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication token not found.");
      }
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST', // Or DELETE, ensure Edge Function handles it
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user.');
      
      toast({
        title: 'User Deleted',
        description: `${selectedUser.email} has been deleted.`,
      });
      
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error Deleting User',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEventTypeToggle = (eventType: string) => {
    setSelectedEventTypesForUser(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventType)) newSet.delete(eventType);
      else newSet.add(eventType);
      return newSet;
    });
  };

  const saveAssignEvents = async () => {
    if (!editingUserForEvents) return;
    setIsSubmitting(true);
    try {
      // This uses the supabase client (anon key) and assumes RLS allows admin to modify user_event_assignments.
      // 1. Get current assignments from DB for comparison (or rely on local state if consistently updated)
      const { data: currentAssignmentsData, error: fetchError } = await supabase
        .from('user_event_assignments')
        .select('event_type')
        .eq('user_id', editingUserForEvents.id);

      if (fetchError) throw fetchError;
      const currentDbAssignedTypes = new Set(currentAssignmentsData.map(item => item.event_type));

      const typesToAdd = Array.from(selectedEventTypesForUser).filter(type => !currentDbAssignedTypes.has(type));
      const typesToRemove = Array.from(currentDbAssignedTypes).filter(type => !selectedEventTypesForUser.has(type));

      if (typesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_event_assignments')
          .delete()
          .eq('user_id', editingUserForEvents.id)
          .in('event_type', typesToRemove);
        if (deleteError) throw deleteError;
      }

      if (typesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_event_assignments')
          .insert(typesToAdd.map(eventType => ({ user_id: editingUserForEvents.id, event_type: eventType })));
        if (insertError) throw insertError;
      }
      
      toast({
        title: 'Success',
        description: `Event assignments updated for ${editingUserForEvents.email}.`,
      });
      
      // Update local state accurately
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === editingUserForEvents.id 
          ? { ...user, assigned_event_types: Array.from(selectedEventTypesForUser) } 
          : user
      ));
      setIsAssignEventsDialogOpen(false);
      setEditingUserForEvents(null);

    } catch (error: any) {
      toast({
        title: 'Error Saving Assignments',
        description: error.message || 'Could not save event assignments.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8"/>
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, roles, and event assignments.</p>
          </div>
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="assignments">Assignments Info</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                setNewUserEmail(''); setNewUserPassword(''); setNewUserFullName('');
                setSelectedRole('viewer'); setIsNewUserDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus size={18} /> Add New User
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border shadow-md overflow-x-auto">
              <Table>
                <TableCaption>A list of all users in the system.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Event Types</TableHead> 
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right min-w-[320px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.fullName || 'N/A'}</TableCell>
                        <TableCell>
                          <span 
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' 
                              : user.role === 'tracker' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' 
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            }`}
                          >
                            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'No Role'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.assigned_event_types?.length > 0 
                            ? `${user.assigned_event_types.length} assigned`
                            : "None"}
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} title={`Edit ${user.email}'s role`}>
                              <Edit size={14} className="mr-1" /> Role
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openAssignEventsDialog(user)} title={`Manage event assignments for ${user.email}`}>
                              <Briefcase size={14} className="mr-1" /> Events
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openPasswordDialog(user)} title={`Set new password for ${user.email}`}>
                              <Key size={14} className="mr-1" /> Password
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => openDeleteDialog(user)} 
                              title={`Delete ${user.email}`}
                              disabled={user.id === currentUser?.id} // Disable deleting self
                            >
                              <Trash2 size={14} className="mr-1" /> Delete
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
          <div className="bg-card rounded-lg border shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Event Assignments Information</h2>
            <p className="text-muted-foreground">
              Event type assignments determine which specific events a user (typically a 'Tracker')
              is permitted to record. You can manage these assignments for each user individually
              from the "User Management" tab using the "Events" button in the actions column.
            </p>
            <p className="text-muted-foreground mt-2">
              This tab serves as an informational placeholder. Future enhancements could include
              an overview of assignments by event type or by tracker.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      {/* Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role: {selectedUser?.email}</DialogTitle>
            <DialogDescription>Select the new role for this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label htmlFor="role-select">Role</Label>
            <Select 
              value={selectedRole} 
              onValueChange={(value: 'admin' | 'tracker' | 'viewer') => setSelectedRole(value)}
              disabled={selectedUser?.id === currentUser?.id && selectedUser?.role === 'admin'} // Prevent admin demoting self
            >
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tracker">Tracker</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
             {selectedUser?.id === currentUser?.id && selectedUser?.role === 'admin' && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">You cannot change your own role from Admin.</p>
            )}
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p><strong>Admin:</strong> Full access, including user management.</p>
              <p><strong>Tracker:</strong> Can record match data for assigned event types.</p>
              <p><strong>Viewer:</strong> Can only view match data.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={updateUserRole} disabled={isSubmitting || (selectedUser?.id === currentUser?.id && selectedUser?.role === 'admin' && selectedRole !== 'admin')}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new account and assign a role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="fullName-new">Full Name</Label>
              <Input id="fullName-new" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} placeholder="e.g., Jane Doe"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-new">Email</Label>
              <Input id="email-new" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="user@example.com"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password-new">Password</Label>
              <Input id="password-new" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Min. 6 characters"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="role-new">Role</Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger id="role-new"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={createNewUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <strong>{selectedUser?.email}</strong>? 
              This will permanently remove the user and their associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={deleteUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password for {selectedUser?.email}</DialogTitle>
            <DialogDescription>Enter a new password for this user account.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-1">
            <Label htmlFor="new-password-set">New Password</Label>
            <Input id="new-password-set" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={updateUserPassword} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Event Types Dialog */}
      <Dialog open={isAssignEventsDialogOpen} onOpenChange={(isOpen) => { setIsAssignEventsDialogOpen(isOpen); if (!isOpen) setEditingUserForEvents(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Event Types for {editingUserForEvents?.email}</DialogTitle>
            <DialogDescription>Select the event types this user can track.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {EVENT_TYPES.map((eventType) => (
              <div key={eventType} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                <Checkbox
                  id={`checkbox-assign-${eventType.replace(/\s+/g, '-')}`} // Ensure unique ID
                  checked={selectedEventTypesForUser.has(eventType)}
                  onCheckedChange={() => handleEventTypeToggle(eventType)}
                />
                <Label htmlFor={`checkbox-assign-${eventType.replace(/\s+/g, '-')}`} className="font-normal cursor-pointer flex-grow">
                  {eventType}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignEventsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={saveAssignEvents} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
