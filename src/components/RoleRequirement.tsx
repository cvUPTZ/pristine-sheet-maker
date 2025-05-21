
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface RoleRequirementProps {
  children: ReactNode;
  requiredRole: "admin" | "tracker" | "any";
  fallback?: ReactNode;
}

export default function RoleRequirement({ 
  children, 
  requiredRole,
  fallback
}: RoleRequirementProps) {
  const { isAdmin, isTracker, user, loading } = useAuth();
  
  // Still loading auth state
  if (loading) {
    return null;
  }
  
  // Not authenticated
  if (!user) {
    return fallback || (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Authentication required</AlertTitle>
        <AlertDescription>
          Please sign in to access this feature.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Check role requirements
  const hasRequiredRole = 
    requiredRole === "admin" ? isAdmin :
    requiredRole === "tracker" ? isTracker :
    true; // "any" role
  
  if (!hasRequiredRole) {
    return fallback || (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have the required permissions to access this feature.
        </AlertDescription>
      </Alert>
    );
  }
  
  // User has the required role
  return <>{children}</>;
}
