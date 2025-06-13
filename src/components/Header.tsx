
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield, User, Activity } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80 supports-[backdrop-filter]:bg-background/60">
      <div className="modern-container">
        <div className="flex justify-between items-center py-3">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <Link to="/" className="font-bold text-lg sm:text-xl text-gradient-primary truncate">
                {isMobile ? "Analytics" : "Football Analytics"}
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* User info */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-medium text-foreground truncate max-w-32">
                  {user.email}
                </span>
                {userRole && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Admin Panel Button */}
            {userRole === 'admin' && (
              <Button 
                variant="outline" 
                size={isMobile ? "sm" : "default"}
                asChild
                className="modern-btn-secondary border-primary/20 hover:border-primary/30"
              >
                <Link to="/admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  {!isMobile && <span>Admin Panel</span>}
                  {isMobile && <span className="text-xs">Admin</span>}
                </Link>
              </Button>
            )}
            
            {/* Logout Button */}
            <Button 
              onClick={signOut} 
              variant="ghost" 
              size={isMobile ? "sm" : "default"}
              className="modern-btn hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!isMobile && <span>Logout</span>}
              {isMobile && <span className="text-xs">Out</span>}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
