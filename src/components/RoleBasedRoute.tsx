
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface RoleBasedRouteProps {
  requiredRole: "admin" | "tracker" | "authenticated";
}

export default function RoleBasedRoute({ requiredRole }: RoleBasedRouteProps) {
  const { user, isAdmin, isTracker, loading } = useAuth();

  // Still loading auth state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role requirements
  const hasRequiredRole =
    requiredRole === "admin" ? isAdmin :
    requiredRole === "tracker" ? isTracker :
    true; // "authenticated" role only requires that the user is logged in

  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // User has the required role, render the child routes
  return <Outlet />;
}
