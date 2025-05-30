
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Shield, User, Home } from 'lucide-react';

const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogoClick = () => {
    // Redirect based on user role
    if (userRole === 'tracker') {
      navigate('/dashboard');
    } else if (userRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-background border-b p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button 
          onClick={handleLogoClick}
          className="font-bold text-xl hover:text-primary transition-colors"
        >
          Football Analytics
        </button>
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
        
        {/* Role-specific navigation */}
        {userRole === 'tracker' && (
          <Button variant="ghost" asChild>
            <Link to="/dashboard">
              <Home className="mr-2" size={18} />
              Dashboard
            </Link>
          </Button>
        )}
        
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
