
import React from 'react';
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
}

interface MatchAnalysisSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  menuItems: MenuItem[];
}

const MatchAnalysisSidebar: React.FC<MatchAnalysisSidebarProps> = ({ activeView, setActiveView, menuItems }) => {
  return (
    <Sidebar collapsible="icon" className="border-r bg-gray-100/50 dark:bg-zinc-900/50">
      <SidebarHeader>
        {/* You can add a header here, e.g., a logo or project name */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Match Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.value)}
                    isActive={activeView === item.value}
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
