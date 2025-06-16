
import { useMemo } from 'react';
import { LayoutDashboard, Play, Calendar, BarChart3, TrendingUp, Target } from 'lucide-react';
import { usePermissionChecker } from './usePermissionChecker';
import { type RolePermissions } from './useUserPermissions';

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
        permission: 'canViewDashboard'
      }
    ];
  
    if (hasPermission('canViewMatches')) {
      items.push({ 
        value: 'new-match', 
        label: 'New Match', 
        icon: Play, 
        path: '/match',
        permission: 'canViewMatches'
      });
    }
    
    if (hasManagerAccess()) {
      items.push({ 
        value: 'match-history', 
        label: 'Match History', 
        icon: Calendar, 
        path: '/matches',
        permission: 'canViewMatches'
      });
    }
    
    if (hasPermission('canViewStatistics')) {
      items.push({ 
        value: 'statistics', 
        label: 'Statistics', 
        icon: BarChart3, 
        path: '/statistics',
        permission: 'canViewStatistics'
      });
    }
    
    if (hasPermission('canViewAnalytics')) {
      items.push({ 
        value: 'analytics', 
        label: 'Analytics', 
        icon: TrendingUp, 
        path: '/analytics',
        permission: 'canViewAnalytics'
      });
    }
    
    if (isAdmin()) {
      items.push({ 
        value: 'admin', 
        label: 'Admin Panel', 
        icon: Target, 
        path: '/admin',
        permission: 'canAccessAdmin'
      });
    }

    return items;
  }, [hasPermission, isAdmin, hasManagerAccess]);

  return menuItems;
};
