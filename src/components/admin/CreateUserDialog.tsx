// src/components/CreateUserDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; // Adjust path if needed
import { supabase } from '@/integrations/supabase/client'; // Adjust path to your supabase client
import { Button } from '@/components/ui/button'; // Adjust path if needed
import { Input } from '@/components/ui/input'; // Adjust path if needed
import { Label } from '@/components/ui/label'; // Adjust path if needed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Adjust path if needed
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void; // Callback after successful user creation
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onUserCreated,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '', // Default role
  });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog is closed or reopened
  useEffect(() => {
    if (open) {
      handleReset();
    }
  }, [open]);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleReset = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: '',
    });
    setLoading(false); // Reset loading state as well
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Please fill in all required fields (Full Name, Email, Password).');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address.');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const testFunctionConnectivity = async () => {
    setLoading(true);
    toast.info("Testing Edge Function connectivity...");
    try {
      console.log('Testing function connectivity...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Session error during test:', sessionError);
        toast.error('Could not get session for testing. Please log in.');
        setLoading(false);
        return;
      }
      console.log('Session acquired for testing.');

      // Use environment variables or hardcoded values since supabaseUrl is protected
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/create-user`;
      console.log(`Testing OPTIONS request to: ${functionUrl}`);

      // Test OPTIONS request
      const optionsResponse = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '', // Use env variable
        },
      });

      console.log('OPTIONS response status:', optionsResponse.status);
      console.log('OPTIONS response headers:');
      optionsResponse.headers.forEach((value, key) => console.log(`${key}: ${value}`));

      if (!optionsResponse.ok) {
        toast.error(`OPTIONS request failed: ${optionsResponse.status}. Check console & function CORS settings.`);
        setLoading(false);
        return;
      }
      console.log('OPTIONS request successful.');
      toast.success('OPTIONS request successful. Basic connectivity and CORS seem OK.');

    } catch (error) {
      console.error('Direct fetch test failed:', error);
      if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
        toast.error('Test failed: Network error or CORS issue preventing OPTIONS request. Check browser console Network tab.');
      } else if (error instanceof Error) {
        toast.error(`Test failed: ${error.message}`);
      } else {
        toast.error('Test failed with an unknown error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        toast.error(sessionError?.message || 'Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Use environment variables since supabaseUrl is protected
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/create-user`;
      console.log('Calling Supabase function for user creation:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '', // Use env variable
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          role: formData.role,
        }),
      });

      console.log('Create user function response status:', response.status);
      console.log('Create user function response headers:');
      response.headers.forEach((value,key) => console.log(`${key}: ${value}`));

      const responseBody = await response.text(); // Get text first for better error diagnosis

      if (!response.ok) {
        console.error('Function returned an error. Status:', response.status, 'Body:', responseBody);
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorJson = JSON.parse(responseBody);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (parseError) {
          // If not JSON, use the raw text if it's not too long, or a generic message
          errorMessage = responseBody.length < 200 ? responseBody : errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseBody); // Now parse if response.ok
      console.log('Function success response:', result);

      if (result.error) { // Check for application-level errors in the JSON response
        throw new Error(result.error);
      }

      toast.success(result.message || 'User created successfully!');
      onUserCreated(); // Call callback
      onOpenChange(false); // Close dialog

    } catch (error) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user.';
      if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
        errorMessage = 'Network error or CORS misconfiguration. Check browser console (Network tab) and Supabase function logs.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. They will be able to log in with the provided credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                placeholder="e.g., Jane Doe"
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
                onChange={handleInputChange('email')}
                placeholder="e.g., user@example.com"
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
                onChange={handleInputChange('password')}
                placeholder="Min. 6 characters"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {/* Debug button - only in development */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="outline"
                onClick={testFunctionConnectivity}
                disabled={loading}
                className="sm:mr-auto" // Push to left on larger screens
              >
                Test Connection
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)} // Simpler close
              disabled={loading}
            >
              Cancel
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
