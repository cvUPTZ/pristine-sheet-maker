// Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';

const Header = () => {
  const { user, signOut, userRole } = useAuth();

  // DEBUGGING: Log user and userRole
  console.log('[Header] User:', user);
  console.log('[Header] userRole:', userRole); // <-- ADD THIS

  if (!user) {
    return null;
  }

  const capitalize = (s: string | null | undefined) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <header className="bg-background border-b p-4 flex justify-between items-center">
      {/* ... rest of your component */}
      <div className="flex items-center text-sm text-muted-foreground">
        <User size={16} className="mr-1 flex-shrink-0" />
        <span className="mr-2 truncate" title={user.email || ''}>
          {user.email}
        </span>
        {userRole && ( // This condition needs userRole to be truthy
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
            {capitalize(userRole)}
          </span>
        )}
      </div>
      {/* ... rest of your component */}
    </header>
  );
};

export default Header;
