import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react'; // Corrected Shield import if it was from lucide-react

const Header = () => {
  const { user, signOut, userRole } = useAuth();

  // If there's no user, don't render the header (or parts of it)
  // This guard clause is good practice.
  if (!user) {
    return null;
  }

  // Helper to capitalize the first letter of a string (for display purposes)
  const capitalize = (s: string | null | undefined) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <header className="bg-background border-b p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link to="/" className="font-bold text-xl">
          Football Analytics
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {/* User information section */}
        <div className="flex items-center text-sm text-muted-foreground">
          <User size={16} className="mr-1 flex-shrink-0" /> {/* Icon for user */}
          <span className="mr-2 truncate" title={user.email || ''}>
            {user.email} {/* User's email */}
          </span>
          {/* Display user role if available */}
          {userRole && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
              {capitalize(userRole)} {/* Role, capitalized for better display */}
            </span>
          )}
        </div>

        {/* Admin Panel Link (conditional) */}
        {userRole === 'admin' && (
          <Button variant="ghost" asChild size="sm"> {/* Added size="sm" for consistency with other buttons if desired */}
            <Link to="/admin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" /> {/* Consistent icon sizing */}
              Admin Panel
            </Link>
          </Button>
        )}

        {/* Sign Out Button */}
        <Button onClick={signOut} variant="outline" size="sm"> {/* Added size="sm" for consistency */}
          <LogOut className="mr-2 h-4 w-4" /> {/* Consistent icon sizing */}
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Header;
