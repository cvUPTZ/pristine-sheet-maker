import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';
import { Loader2, UserPlus, Edit, Key, Trash2, ShieldCheck, Briefcase, ArrowLeft, ListChecks, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Interfaces
interface User {
  id: string;
  email: string;
  created_at: string;
  fullName?: string;
}

export interface UserWithRole extends User {
  role: 'admin' | 'tracker' | 'viewer' | null;
  assigned_event_types: string[];
}

interface EventTypeAssignmentSummary {
  eventType: string;
  assignedUsers: Array<{ id: string; email: string; fullName?: string }>;
}

// Constants
export const EVENT_TYPES = [
  "Attack", "Pass (P)", "Shot (S)", "Goal (G)", "Assist",
  "Defense", "Tackle (T)", "Interception (I)",
  "Corner (C)", "Free Kick", "Goal Kick", "Throw-in", "Penalty",
  "Foul (F)", "Offside", "Yellow Card", "Red Card",
  "Substitution"
];

const Admin = () => {
  // State Variables
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Hooks
  const { toast } = useToast();
  const { session, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Data Fetching
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication token not found. Please log in.");
      }
      const { data, error: functionError } = await supabase.functions.invoke('get-all-users');

      if (functionError) {
        console.error('Function invocation error (get-all-users):', functionError);
        throw new Error(functionError.message || 'Failed to invoke get-all-users function.');
      }

      if (data && data.usersWithRolesAndAssignments) {
        setUsers(data.usersWithRolesAndAssignments);
      } else if (data && data.error) {
        console.error('Error payload from get-all-users function:', data.error);
        throw new Error(data.error || 'The get-all-users function returned an error payload.');
      } else {
        console.error('Fetched data structure mismatch from get-all-users function:', data);
        throw new Error('Invalid data structure received from the get-all-users function. Expected { usersWithRolesAndAssignments: [...] }.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error Fetching Users',
        description: error.message || 'Could not load users. Please try again.',
        variant: 'destructive',
      });
      setUsers([]); // Reset users on error to avoid displaying stale/incorrect data
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [fetchUsers, session]);

  // Memoized Data for Assignments Overview
  const eventAssignmentsSummary = useMemo<EventTypeAssignmentSummary[]>(() => {
    if (isLoading || !users || users.length === 0) return []; // Don't compute if loading or no users

    return EVENT_TYPES.map(eventType => {
      const assignedUsersToEvent = users
        .filter(user => user.role === 'tracker' && user.assigned_event_types.includes(eventType))
        .map(user => ({ id: user.id, email: user.email, fullName: user.fullName }));
      return {
        eventType,
        assignedUsers: assignedUsersToEvent,
      };
    });
  }, [users, isLoading]); // Add isLoading to dependencies

  // Dialog Management Functions
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
    if (user.role !== 'tracker') {
        toast({
            title: "Assignments Info",
            description: "Event types can only be assigned to users with the 'Tracker' role.",
            variant: "default"
        });
        return;
    }
    setEditingUserForEvents(user);
    setSelectedEventTypesForUser(new Set(user.assigned_event_types || []));
    setIsAssignEventsDialogOpen(true);
  };

  // Core Logic Functions (CRUD Operations)
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
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke('update-user-role', {
        body: {
          userIdToUpdate: selectedUser.id,
          newRole: selectedRole
        },
      });
      if (functionError) throw new Error(functionError.message || 'Failed to invoke update-user-role function.');
      if (functionResponse && functionResponse.error) throw new Error(functionResponse.details || functionResponse.error || 'Update-user-role function returned an error.');

      toast({
        title: 'Success',
        description: functionResponse.message || `Role updated for ${selectedUser.email}.`,
      });
      // If role changed from tracker, clear local assigned_event_types for that user
      const updatedAssignedEventTypes = selectedRole === 'tracker' ? selectedUser.assigned_event_types : [];
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: selectedRole, assigned_event_types: updatedAssignedEventTypes } : u
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
    if (newUserPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
          role: selectedRole
        },
      });
      if (functionError) throw new Error(functionError.message || 'Failed to invoke create-user function.');
      if (data && data.error) throw new Error(data.error || 'Create-user function returned an error.');
      toast({
        title: 'User Created',
        description: `${data.message || `${newUserEmail} created as ${selectedRole}.`} User ID: ${data.userId}`,
      });
      fetchUsers(); // Re-fetch users to include the new one
      setNewUserEmail(''); setNewUserPassword(''); setNewUserFullName('');
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
    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('update-user-password', {
        body: { userId: selectedUser.id, newPassword },
      });
      if (functionError) throw new Error(functionError.message || 'Failed to invoke update-user-password.');
      if (data && data.error) throw new Error(data.error || 'Update-user-password function returned an error.');
      toast({
        title: 'Password Updated',
        description: data.message || `Password updated for ${selectedUser.email}.`,
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
    if (selectedUser.id === currentUser?.id) {
      // This check is already in openDeleteDialog, but good for belt-and-suspenders
      toast({ title: 'Action Denied', description: 'Cannot delete your own account.', variant: 'warning' });
      setIsDeleteDialogOpen(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.id },
      });
      if (functionError) throw new Error(functionError.message || 'Failed to invoke delete-user.');
      if (data && data.error) throw new Error(data.error || 'Delete-user function returned an error.');
      toast({
        title: 'User Deleted',
        description: data.message || `${selectedUser.email} has been deleted.`,
      });
      setUsers(users.filter(u => u.id !== selectedUser.id)); // Update local state
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
      // Fetch current assignments from DB to calculate diff
      const { data: currentAssignmentsData, error: fetchError } = await supabase
        .from('user_event_assignments')
        .select('event_type')
        .eq('user_id', editingUserForEvents.id);
      if (fetchError) throw fetchError;

      const currentDbAssignedTypes = new Set(currentAssignmentsData.map(item => item.event_type));
      const typesToAdd = Array.from(selectedEventTypesForUser).filter(type => !currentDbAssignedTypes.has(type));
      const typesToRemove = Array.from(currentDbAssignedTypes).filter(type => !selectedEventTypesForUser.has(type));

      // Perform deletions
      if (typesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_event_assignments')
          .delete()
          .eq('user_id', editingUserForEvents.id)
          .in('event_type', typesToRemove);
        if (deleteError) throw deleteError;
      }
      // Perform insertions
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
      // Update local state for the user
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === editingUserForEvents.id
          ? { ...user, assigned_event_types: Array.from(selectedEventTypesForUser) }
          : user
      ));
      setIsAssignEventsDialogOpen(false);
      setEditingUserForEvents(null);
    } catch (error: any) {
      console.error('Error saving event assignments:', error);
      toast({
        title: 'Error Saving Assignments',
        description: error.message || 'Could not save event assignments.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // JSX Rendering
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
           <Button variant="outline" size="icon" onClick={() => navigate('/')} title="Back to Home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8"/>
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, roles, event assignments, and system logs.</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation and Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="mb-6"> {/* Wrapper for TabsList for potential styling */}
            <TabsList>
              <TabsTrigger value="users"><UserPlus size={16} className="mr-2"/>User Management</TabsTrigger>
              <TabsTrigger value="assignments"><ListChecks size={16} className="mr-2"/>Assignments Overview</TabsTrigger>
              <TabsTrigger value="audit"><History size={16} className="mr-2"/>Audit Logs</TabsTrigger>
            </TabsList>
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setNewUserEmail(''); setNewUserPassword(''); setNewUserFullName('');
                setSelectedRole('viewer'); setIsNewUserDialogOpen(true);
              }}
              className="flex items-center gap-2"
              disabled={isSubmitting}
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
            <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
              <Table>
                <TableCaption>A list of all users. Event assignments are only applicable to 'Tracker' roles.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Events Assigned</TableHead>
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
                          <Badge
                            variant={user.role === 'admin' ? 'destructive' : user.role === 'tracker' ? 'default' : 'outline'}
                            className={`px-2 py-1 text-xs font-semibold ${
                                user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
                                : user.role === 'tracker' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            }`}
                          >
                            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'No Role'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === 'tracker'
                            ? user.assigned_event_types?.length > 0
                              ? `${user.assigned_event_types.length} assigned`
                              : "None"
                            : <span className="text-xs text-muted-foreground italic">N/A for role</span>}
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} title={`Edit ${user.email}'s role`} disabled={isSubmitting}>
                              <Edit size={14} className="mr-1" /> Role
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAssignEventsDialog(user)}
                                title={`Manage event assignments for ${user.email}`}
                                disabled={user.role !== 'tracker' || isSubmitting}
                            >
                                <Briefcase size={14} className="mr-1" /> Events
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openPasswordDialog(user)} title={`Set new password for ${user.email}`} disabled={isSubmitting}>
                              <Key size={14} className="mr-1" /> Password
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(user)}
                              title={`Delete ${user.email}`}
                              disabled={user.id === currentUser?.id || isSubmitting}
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

        {/* Assignments Overview Tab */}
        <TabsContent value="assignments">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks />Event Type Assignments Overview</CardTitle>
              <CardDescription>
                This view shows which 'Tracker' users are assigned to each event type.
                Manage individual assignments via the 'Events' button in the User Management tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? ( // Show loading spinner while users (and thus summary) are loading
                 <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Loading assignment data...</p>
                 </div>
              ) : eventAssignmentsSummary.length > 0 ? (
                <div className="space-y-6">
                  {eventAssignmentsSummary.map(({ eventType, assignedUsers }) => (
                    <div key={eventType} className="p-4 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                      <h3 className="text-lg font-semibold mb-3">{eventType}</h3>
                      {assignedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {assignedUsers.map(user => (
                            <Badge key={user.id} variant="secondary" className="text-sm px-2 py-1">
                              {user.fullName || user.email}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No trackers currently assigned to this event type.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-center text-muted-foreground py-6">No assignment data to display. Ensure users have the 'Tracker' role and are assigned event types.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab (Placeholder) */}
        <TabsContent value="audit">
           <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History />Audit Logs</CardTitle>
              <CardDescription>
                Track significant actions performed within the admin panel and system.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10">
                <History size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                    The Audit Log feature is planned for future implementation.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    This section will display a record of actions such as user creation,
                    role changes, password resets, and other critical administrative tasks.
                </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role: {selectedUser?.email}</DialogTitle>
            <DialogDescription>Select the new role. If changing from 'Tracker', existing event assignments become inactive.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label htmlFor="role-select">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'admin' | 'tracker' | 'viewer') => setSelectedRole(value)}
              disabled={selectedUser?.id === currentUser?.id && selectedUser?.role === 'admin'}
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
            <Button
              onClick={updateUserRole}
              disabled={isSubmitting || (selectedUser?.id === currentUser?.id && selectedUser?.role === 'admin' && selectedRole !== 'admin')}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
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
              <Input id="fullName-new" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} placeholder="e.g., Jane Doe" autoComplete="name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-new">Email</Label>
              <Input id="email-new" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="user@example.com" autoComplete="email"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password-new">Password</Label>
              <Input id="password-new" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password"/>
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
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create User
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
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete User
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
            <Input id="new-password-set" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={updateUserPassword} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Event Types Dialog */}
      <Dialog open={isAssignEventsDialogOpen} onOpenChange={(isOpen) => { setIsAssignEventsDialogOpen(isOpen); if (!isOpen) setEditingUserForEvents(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Event Types for {editingUserForEvents?.email}</DialogTitle>
            <DialogDescription>Select the event types this user can track. (Only for 'Tracker' role)</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto"> {/* Added max-h and overflow */}
            {EVENT_TYPES.map((eventType) => (
              <div key={eventType} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                <Checkbox
                  id={`checkbox-assign-${eventType.replace(/[\s()]/g, '-')}`}
                  checked={selectedEventTypesForUser.has(eventType)}
                  onCheckedChange={() => handleEventTypeToggle(eventType)}
                  disabled={isSubmitting}
                />
                <Label htmlFor={`checkbox-assign-${eventType.replace(/[\s()]/g, '-')}`} className="font-normal cursor-pointer flex-grow">
                  {eventType}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignEventsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={saveAssignEvents} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
