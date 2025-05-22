
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Shield } from 'lucide-react';

const Header = () => {
  const { user, signOut, userRole } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-background border-b p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link to="/" className="font-bold text-xl">Football Analytics</Link>
      </div>
      <div className="flex items-center gap-4">
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
