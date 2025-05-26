import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { BarChart3, Flag, Trophy, TrendingUp, Settings, User, LogOut, Menu, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, signOut, userRole } = useAuth();

  return (
    <header className="bg-white border-b sticky top-0 z-40 w-full">
      <div className="container max-w-7xl h-16 mx-auto flex items-center justify-between py-2">
        {/* Logo */}
        <Button variant="ghost" onClick={() => navigate('/')}>
          <span className="font-bold text-xl">
            {process.env.NEXT_PUBLIC_APP_NAME || 'App'}
          </span>
        </Button>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger className="md:hidden">
            <Button variant="ghost" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60">
            <div className="grid gap-4 py-4">
              {isAuthenticated && (
                <>
                  <Button
                    variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/')}
                    className="text-sm justify-start"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>

                  {(userRole === 'admin' || userRole === 'tracker') && (
                    <Button
                      variant={location.pathname.startsWith('/match') ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => navigate('/match')}
                      className="text-sm justify-start"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Match
                    </Button>
                  )}

                  {userRole === 'tracker' && (
                    <Button
                      variant={location.pathname === '/tracker' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => navigate('/tracker')}
                      className="text-sm justify-start"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Tracker
                    </Button>
                  )}

                  <Button
                    variant={location.pathname === '/matches' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/matches')}
                    className="text-sm justify-start"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Matches
                  </Button>

                  <Button
                    variant={location.pathname === '/statistics' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/statistics')}
                    className="text-sm justify-start"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Statistics
                  </Button>

                  {userRole === 'admin' && (
                    <Button
                      variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className="text-sm justify-start"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  )}
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center space-x-1">
          {isAuthenticated && (
            <>
              <Button
                variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/')}
                className="text-sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              
              {(userRole === 'admin' || userRole === 'tracker') && (
                <Button
                  variant={location.pathname.startsWith('/match') ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/match')}
                  className="text-sm"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Match
                </Button>
              )}

              {userRole === 'tracker' && (
                <Button
                  variant={location.pathname === '/tracker' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/tracker')}
                  className="text-sm"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Tracker
                </Button>
              )}

              <Button
                variant={location.pathname === '/matches' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/matches')}
                className="text-sm"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Matches
              </Button>

              <Button
                variant={location.pathname === '/statistics' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/statistics')}
                className="text-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Statistics
              </Button>

              {userRole === 'admin' && (
                <Button
                  variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="text-sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
            </>
          )}
        </div>

        {/* Authentication Menu */}
        <div className="flex items-center">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || 'Avatar'} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
