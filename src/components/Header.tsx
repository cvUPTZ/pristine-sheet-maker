import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Adjust path if needed
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Adjust path if needed
import { Badge } from '@/components/ui/badge'; // Adjust path if needed
import {
  LogOut,
  UserCircle,
  Shield,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Menu, // For potential mobile menu trigger
} from 'lucide-react';

const Header = ()_rad => {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();

  // Helper to get initials for Avatar fallback
  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Helper to capitalize the role for display
  const capitalizeRole = (role: string | null | undefined) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (!user) {
    // Optionally, you could show a simplified header with just the logo and login/signup buttons
    // For now, we'll return null if no user is logged in, as per previous behavior.
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Logo/Brand and Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            {/* <YourLogoComponent className="h-6 w-6" /> Replace with your actual logo */}
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">
              Analytics Platform
            </span>
          </Link>
          {/* Desktop Navigation Links (Example) */}
          <nav className="hidden md:flex gap-4">
            <Button variant="link" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="link" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/matches">Matches</Link>
            </Button>
             {userRole === 'admin' && (
              <Button variant="link" asChild className="text-muted-foreground hover:text-foreground font-semibold text-primary">
                <Link to="/admin">
                  Admin Panel
                </Link>
              </Button>
            )}
          </nav>
        </div>

        {/* Right Section: User Menu */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 h-auto"
              >
                <Avatar className="h-8 w-8">
                  {/* Assuming user.user_metadata.avatar_url might exist for actual image */}
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {user.email}
                  </span>
                  {userRole && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {capitalizeRole(userRole)}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline-block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {userRole && (
                     <Badge variant="outline" className="mt-1 w-fit">
                        {capitalizeRole(userRole)}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              {userRole === 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Trigger (Example - needs implementation for drawer/menu) */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
