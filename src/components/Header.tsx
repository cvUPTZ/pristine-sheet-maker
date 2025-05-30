
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Shield, User } from 'lucide-react';

const Header = () => {
  const { user, signOut, userRole } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-background border-b p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link to="/" className="font-bold text-xl">Football Analytics</Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <User size={16} className="mr-1" />
          <span className="mr-2">{user.email}</span>
          {userRole && (
            <Badge variant="secondary" className="text-xs font-medium">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </div>
        {userRole === 'admin' && (
          <Button variant="ghost" asChild>
            <Link to="/admin">
              <Shield className="mr-2" size={18} />
              Admin Panel
            </Link>
          </Button>
        )}
        <Button onClick={signOut} variant="outline" className="flex items-center gap-2">
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Header;
