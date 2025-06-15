
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useUserPermissions, RolePermissions } from '@/hooks/useUserPermissions';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield, Loader2 } from 'lucide-react';

interface MenuItem {
  value: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  permission?: keyof RolePermissions;
}

interface MatchAnalysisSidebarProps {
  activeView?: string;
  setActiveView?: (view: string) => void;
  menuItems: MenuItem[];
  groupLabel?: string;
}

const MatchAnalysisSidebar: React.FC<MatchAnalysisSidebarProps> = ({ activeView, setActiveView, menuItems, groupLabel = "Tools" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, userRole } = useAuth();
  const { permissions, isLoading: permissionsLoading } = useUserPermissions();

  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (setActiveView) {
      setActiveView(item.value);
    }
  };

  const isItemActive = (item: MenuItem) => {
    if (item.path) {
      // Exact match for root, startsWith for others
      if (item.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.path);
    }
    return activeView === item.value;
  };

  const filteredMenuItems = React.useMemo(() => {
    console.log('[MatchAnalysisSidebar] Recalculating filtered menu items...');
    console.log('[MatchAnalysisSidebar] Permissions loading:', permissionsLoading);
    console.log('[MatchAnalysisSidebar] Permissions object:', permissions);

    if (permissionsLoading || !permissions) {
      console.log('[MatchAnalysisSidebar] Permissions not ready, returning empty menu.');
      return [];
    }
    const filtered = menuItems.filter(item => {
      // If no permission is required, show the item.
      if (!item.permission) {
        return true;
      }
      // If permission is required, check if the user has it.
      const hasPermission = permissions[item.permission];
      // console.log(`[MatchAnalysisSidebar] Checking permission for "${item.label}": required: ${item.permission}, has: ${hasPermission}`);
      return hasPermission;
    });

    console.log('[MatchAnalysisSidebar] All menu items:', menuItems.map(i => ({label: i.label, permission: i.permission})));
    console.log('[MatchAnalysisSidebar] Final filtered menu items:', filtered.map(i => i.label));
    return filtered;

  }, [menuItems, permissions, permissionsLoading]);

  if (!user) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" className="border-r !bg-transparent text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&q=80')` }} />
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 flex h-full flex-col">
        <SidebarHeader className="p-2">
          <Link to="/" className="font-bold text-xl truncate bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-data-[state=collapsed]:hidden">
            Analytics
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {permissionsLoading ? (
            <div className="flex justify-center items-center h-full p-4">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          ) : (
            <SidebarGroup>
              <SidebarGroupLabel className="!text-gray-300">{groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {filteredMenuItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item)}
                        isActive={isItemActive(item)}
                        tooltip={item.label}
                        className="h-10 justify-start group-data-[state=collapsed]:justify-center !bg-transparent text-white hover:!bg-white/10 data-[active=true]:!bg-white/20"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="mt-auto border-t border-white/10 bg-black/10 p-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {userRole === 'admin' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Admin Panel"
                      className="h-10 justify-start group-data-[state=collapsed]:justify-center !bg-transparent text-white hover:!bg-white/10"
                    >
                      <Link to="/admin">
                        <Shield className="h-5 w-5 shrink-0" />
                        <span className="group-data-[state=collapsed]:hidden">Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={signOut}
                    tooltip="Logout"
                    className="h-10 justify-start group-data-[state=collapsed]:justify-center !bg-transparent text-white hover:!bg-white/10"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="group-data-[state=collapsed]:hidden">Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="border-t border-white/10 my-2 group-data-[state=collapsed]:hidden" />
          <div className="flex items-center gap-3 p-2 text-sm text-gray-300 group-data-[state=collapsed]:hidden">
              <User size={24} className="shrink-0 rounded-full bg-white/10 p-1" />
              <div className="truncate flex-1">
                <div className="font-semibold truncate" title={user.email || ''}>{user.email}</div>
                {userRole && (
                  <Badge variant="secondary" className="text-xs font-medium bg-white/10 text-white border-transparent mt-1">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

export default MatchAnalysisSidebar;
