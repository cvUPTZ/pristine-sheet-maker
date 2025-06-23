
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { usePermissionChecker } from '@/hooks/usePermissionChecker';
import { 
  Menu, 
  X, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Shield,
  Users,
  BarChart3,
  Calendar,
  Video,
  Play
} from 'lucide-react';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { hasPermission } = usePermissionChecker();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        closeMobileMenu();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">FT</span>
              </div>
              <span className="font-semibold text-gray-900">Football Tracker</span>
            </Link>
            
            {user && (
              <nav className="hidden md:ml-8 md:flex md:space-x-6">
                <Link
                  to="/"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                {hasPermission('canViewMatches') && (
                  <Link
                    to="/matches"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Matches
                  </Link>
                )}

                {hasPermission('canTrackMatches') && (
                  <Link
                    to="/video-tracker"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Video Tracker
                  </Link>
                )}
                
                {hasPermission('canViewStatistics') && (
                  <Link
                    to="/statistics"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Statistics
                  </Link>
                )}
                
                {hasPermission('canViewAnalytics') && (
                  <Link
                    to="/analytics"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Analytics
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center ml-auto">
            {user ? (
              <div className="relative">
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={toggleMobileMenu}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || `https://avatar.vercel.sh/${user.email}`} alt={user.email || "User Avatar"} />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
                </Button>
                
                {/* Mobile Menu */}
                <div ref={mobileMenuRef} className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none ${isMobileMenuOpen ? '' : 'hidden'}`} style={{zIndex: 50}}>
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center" role="menuitem">
                      <User className="mr-2 h-4 w-4" />
                      {user.email}
                    </span>
                    
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                      role="menuitem"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                    
                    {hasPermission('canManageUsers') && (
                      <>
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                          role="menuitem"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Link>
                        <Link
                          to="/admin/video-setup"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                          role="menuitem"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Video Setup
                        </Link>
                      </>
                    )}
                    
                    <button
                      onClick={signOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                      role="menuitem"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="outline">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation Button */}
          <div className="flex md:hidden">
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={toggleMobileMenu}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} ref={mobileMenuRef}>
        <div className="bg-white py-2 px-4 shadow-md rounded-md mt-2">
          {user ? (
            <nav className="flex flex-col space-y-2">
              <Link
                to="/"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              
              {hasPermission('canViewMatches') && (
                <Link
                  to="/matches"
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  Matches
                </Link>
              )}

              {hasPermission('canTrackMatches') && (
                <Link
                  to="/video-tracker"
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <Play className="w-4 h-4" />
                  Video Tracker
                </Link>
              )}
              
              {hasPermission('canViewStatistics') && (
                <Link
                  to="/statistics"
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  Statistics
                </Link>
              )}
              
              {hasPermission('canViewAnalytics') && (
                <Link
                  to="/analytics"
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  Analytics
                </Link>
              )}
              
              <Link
                to="/settings"
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              >
                Settings
              </Link>
              
              {hasPermission('canManageUsers') && (
                <Link
                  to="/admin"
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  Admin
                </Link>
              )}
              
              <button
                onClick={logout}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              >
                Logout
              </button>
            </nav>
          ) : (
            <Link to="/auth" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
