
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AuthMenu from "@/components/navigation/AuthMenu";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Calendar, Home, PenTool, Tv } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: "admin" | "tracker" | "any";
}

export default function MainNavigation() {
  const { isAdmin, isTracker, user } = useAuth();
  
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

  return (
    <div className="border-b bg-background">
      <div className="flex h-14 items-center px-4">
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          {navItems.map((item) => {
            // Check if the user has the required role
            const shouldDisplay = !item.requiredRole || 
              (user && (
                item.requiredRole === "admin" ? isAdmin :
                item.requiredRole === "tracker" ? isTracker :
                true // "any" role
              ));
              
            if (!shouldDisplay) return null;
            
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
              >
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    "text-muted-foreground"
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
          <AuthMenu />
        </div>
      </div>
    </div>
  );
}
