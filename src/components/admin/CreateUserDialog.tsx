import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}


// Add this temporary test function to your component to debug connectivity
const testFunctionConnectivity = async () => {
  try {
    console.log('Testing function connectivity...');
    
    // Get session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return;
    }

    console.log('Session found, testing function...');
    
    // Test with a simple OPTIONS request first
    const optionsResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/create-user`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('OPTIONS response status:', optionsResponse.status);
    console.log('OPTIONS response headers:', [...optionsResponse.headers.entries()]);
    
    if (optionsResponse.ok) {
      console.log('OPTIONS request successful - function endpoint exists');
      
      // Now test the actual function call
      const testData = {
        email: 'test@example.com',
        password: 'test123456',
        fullName: 'Test User',
        role: 'user'
      };
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      console.log('POST response status:', response.status);
      const responseText = await response.text();
      console.log('POST response body:', responseText);
      
    } else {
      console.error('OPTIONS request failed - function might not be deployed');
    }
    
  } catch (error) {
    console.error('Direct fetch test failed:', error);
  }
};

// Call this function in your component to test
testFunctionConnectivity();
const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onUserCreated,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Get auth token for the request
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Session error. Please log in again.');
        return;
      }

      if (!session || !session.access_token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      console.log('Calling create-user function with data:', {
        email: formData.email.toLowerCase().trim(),
        fullName: formData.fullName.trim(),
        role: formData.role,
        // Don't log password
      });

      // Call the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          role: formData.role,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        
        // Handle specific error types
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
        } else if (error.message?.includes('FunctionsFetchError')) {
          throw new Error('Server connection failed. Please try again later.');
        } else {
          throw new Error(error.message || 'Failed to create user');
        }
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('User created successfully!');
      onUserCreated();
      setFormData({ email: '', password: '', fullName: '', role: 'user' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ email: '', password: '', fullName: '', role: 'user' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. They will be able to log in immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter full name"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password (min. 6 characters)"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;