
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Shield, User, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null;

  return (
    <header className="bg-background border-b p-2 sm:p-4 flex justify-between items-center">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link to="/" className="font-bold text-sm sm:text-xl truncate">
          {isMobile ? "Analytics" : "Football Analytics"}
        </Link>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
        {/* User info - hide email on mobile */}
        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
          <User size={14} className="mr-1 flex-shrink-0" />
          {!isMobile && <span className="mr-2 hidden sm:inline truncate max-w-32">{user.email}</span>}
          {userRole && (
            <Badge variant="secondary" className="text-xs font-medium ml-1 sm:ml-0">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </div>
        
        {/* Admin Panel Button */}
        {userRole === 'admin' && (
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "default"}
            asChild
            className="flex-shrink-0 px-2 sm:px-4"
          >
            <Link to="/admin" className="flex items-center gap-1 sm:gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              {!isMobile && <span className="hidden sm:inline">Admin Panel</span>}
              {isMobile && <span className="text-xs">Admin</span>}
            </Link>
          </Button>
        )}
        
        {/* Logout Button */}
        <Button 
          onClick={signOut} 
          variant="outline" 
          size={isMobile ? "sm" : "default"}
          className="flex items-center gap-1 sm:gap-2 flex-shrink-0 px-2 sm:px-4"
        >
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          {!isMobile && <span className="hidden sm:inline">Logout</span>}
          {isMobile && <span className="text-xs">Out</span>}
        </Button>
      </div>
    </header>
  );
};

export default Header;
