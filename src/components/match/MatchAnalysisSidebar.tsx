
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
import { Activity, Piano, Users, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MatchAnalysisSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const MatchAnalysisSidebar: React.FC<MatchAnalysisSidebarProps> = ({ activeView, setActiveView }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const menuItems = [
    ...(isAdmin ? [{
      value: 'main',
      label: 'Dashboard',
      icon: Activity,
    }] : []),
    {
      value: 'piano',
      label: 'Piano Input',
      icon: Piano,
    },
    ...(isAdmin ? [
      {
        value: 'planning',
        label: 'Planning Network',
        icon: Users,
      },
      {
        value: 'tracker',
        label: 'Assignment',
        icon: Settings,
      }
    ] : [])
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        {/* You can add a header here, e.g., a logo or project name */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Match Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.value)}
                    isActive={activeView === item.value}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
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
