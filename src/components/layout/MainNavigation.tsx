
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AuthMenu from "@/components/navigation/AuthMenu";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, 
  Calendar, 
  Home, 
  PenTool, 
  Tv, 
  Users, 
  Settings, 
  Activity 
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: "admin" | "tracker" | "any";
  adminOnly?: boolean;
}

export default function MainNavigation() {
  const { isAdmin, isTracker, user } = useAuth();
  const location = useLocation();
  
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Match Recording",
      href: "/match",
      icon: <PenTool className="h-4 w-4" />,
      requiredRole: "any",
    },
    {
      title: "Matches",
      href: "/matches",
      icon: <Calendar className="h-4 w-4" />,
      requiredRole: "any",
    },
    {
      title: "Statistics",
      href: "/statistics",
      icon: <BarChart className="h-4 w-4" />,
      requiredRole: "any",
    },
    {
      title: "Analysis",
      href: "/analysis",
      icon: <Tv className="h-4 w-4" />,
      requiredRole: "any",
    },
  ];
  
  const adminItems: NavItem[] = [
    {
      title: "User Management",
      href: "/admin/users",
      icon: <Users className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      title: "System Settings",
      href: "/admin/settings",
      icon: <Settings className="h-4 w-4" />,
      adminOnly: true,
    },
    {
      title: "Tracker Assignment",
      href: "/admin/trackers",
      icon: <Activity className="h-4 w-4" />,
      adminOnly: true,
    },
  ];

  // Check if we're in the admin section
  const isAdminSection = location.pathname.startsWith('/admin');
  
  // Display the appropriate nav items based on the section
  const displayItems = isAdminSection ? adminItems : navItems;

  return (
    <div className="border-b bg-background">
      <div className="flex h-14 items-center px-4">
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          {displayItems.map((item) => {
            // Check if the user has the required role
            const shouldDisplay = 
              (item.adminOnly && isAdmin) || 
              (!item.adminOnly && (!item.requiredRole || 
                (user && (
                  item.requiredRole === "admin" ? isAdmin :
                  item.requiredRole === "tracker" ? isTracker :
                  true // "any" role
                ))
              ));
              
            if (!shouldDisplay) return null;
            
            // Check if this link is active
            const isActive = item.href === location.pathname;
            
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
              >
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {item.icon}
                  <span className="ml-2">{item.title}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          {isAdmin && !isAdminSection && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/users">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Link>
            </Button>
          )}
          {isAdminSection && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Main App
              </Link>
            </Button>
          )}
          <AuthMenu />
        </div>
      </div>
    </div>
  );
}
