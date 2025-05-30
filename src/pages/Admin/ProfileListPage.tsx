import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext'; // To ensure user is logged in, though function call handles auth
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'; // Assuming Shadcn UI table components are available
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For error display
import { Terminal } from 'lucide-react'; // For Alert icon

// Define the structure of a profile object, matching the Edge Function's output
interface Profile {
  id: string;
  email: string;
  role: string | null;
  fullName: string | null;
}

const ProfileListPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Optional: can be used to gate access or show user-specific info

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) {
        // Although the Edge Function will perform its own auth check,
        // we can prevent the call if the user isn't even logged in on the client.
        // However, for an admin page, routing should ideally protect this page entirely.
        setLoading(false);
        // setError("Please log in to view this page."); // Or rely on router to redirect
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-all-user-profiles');

        if (invokeError) {
          console.error('Error invoking get-all-user-profiles function:', invokeError);
          throw new Error(`Function invocation failed: ${invokeError.message} (Details: ${invokeError.details || 'N/A'})`);
        }
        
        // The Edge Function might return an error object within its data if it handles errors that way
        // e.g. { error: "some error message" }
        if (data && data.error) {
            console.error('Error from get-all-user-profiles function:', data.error);
            throw new Error(`Error fetching profiles: ${data.error.message || data.error}`);
        }

        if (!Array.isArray(data)) {
            console.error('Invalid data format received:', data);
            throw new Error('Invalid data format received from server.');
        }

        setProfiles(data as Profile[]);
      } catch (e: any) {
        console.error('Failed to fetch profiles:', e);
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user]); // Re-run if user changes, e.g., after login/logout

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">User Profiles</h1>
        <p>Loading profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">User Profiles</h1>
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">User Profiles</h1>
      {profiles.length === 0 ? (
        <p>No user profiles found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>{profile.fullName || 'N/A'}</TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>{profile.role || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ProfileListPage;
