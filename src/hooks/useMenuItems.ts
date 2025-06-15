
import { useMemo } from 'react';
import { LayoutDashboard, Play, Calendar, BarChart3, TrendingUp, Target } from 'lucide-react';
import { usePermissionChecker } from './usePermissionChecker';
import { RolePermissions } from './useUserPermissions';

interface MenuItem {
  value: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  permission?: keyof RolePermissions;
}

export const useMenuItems = () => {
  const { hasPermission, isAdmin, hasManagerAccess } = usePermissionChecker();

  const menuItems = useMemo(() => {
    const items: MenuItem[] = [
      { 
        value: 'dashboard', 
        label: 'Dashboard', 
        icon: LayoutDashboard, 
        path: '/',
        permission: 'dashboard'
      }
    ];
  
    if (hasPermission('matchManagement')) {
      items.push({ 
        value: 'new-match', 
        label: 'New Match', 
        icon: Play, 
        path: '/match',
        permission: 'matchManagement'
      });
    }
    
    if (hasManagerAccess()) {
      items.push({ 
        value: 'match-history', 
        label: 'Match History', 
        icon: Calendar, 
        path: '/matches',
        permission: 'dashboard'
      });
    }
    
    if (hasPermission('statistics')) {
      items.push({ 
        value: 'statistics', 
        label: 'Statistics', 
        icon: BarChart3, 
        path: '/statistics',
        permission: 'statistics'
      });
    }
    
    if (hasPermission('analytics')) {
      items.push({ 
        value: 'analytics', 
        label: 'Analytics', 
        icon: TrendingUp, 
        path: '/analytics',
        permission: 'analytics'
      });
    }
    
    if (isAdmin()) {
      items.push({ 
        value: 'admin', 
        label: 'Admin Panel', 
        icon: Target, 
        path: '/admin',
        permission: 'dashboard'
      });
    }

    return items;
  }, [hasPermission, isAdmin, hasManagerAccess]);

  return menuItems;
};
