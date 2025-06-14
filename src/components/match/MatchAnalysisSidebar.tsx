
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from '@/components/ui/sidebar';

interface MenuItem {
  value: string;
  label: string;
  icon: React.ElementType;
  path?: string;
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

  return (
    <Sidebar collapsible="icon" className="border-r !bg-transparent text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&q=80')` }} />
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 flex h-full flex-col">
        <SidebarHeader>
          {/* You can add a header here, e.g., a logo or project name */}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="!text-gray-300">{groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {menuItems.map((item) => (
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
        </SidebarContent>
      </div>
    </Sidebar>
  );
};

export default MatchAnalysisSidebar;
