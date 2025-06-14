
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
    <Sidebar collapsible="icon" className="border-r bg-gray-100/50 dark:bg-zinc-900/50">
      <SidebarHeader>
        {/* You can add a header here, e.g., a logo or project name */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => handleItemClick(item)}
                    isActive={isItemActive(item)}
                    tooltip={item.label}
                    className="h-10 justify-start group-data-[state=collapsed]:justify-center"
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
    </Sidebar>
  );
};

export default MatchAnalysisSidebar;
