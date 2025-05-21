
import { useAuth } from "@/hooks/useAuth";
import RoleRequirement from "@/components/RoleRequirement";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, PenTool } from "lucide-react";

export default function Dashboard() {
  const { user, isAdmin, isTracker } = useAuth();

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Football Tracking Dashboard</h1>
      
      {/* Welcome section */}
      <div className="bg-card border rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">
          {user ? `Welcome, ${user.email}` : "Welcome to the Football Tracking System"}
        </h2>
        <p className="text-muted-foreground mb-4">
          {user 
            ? "Access your tracking tools and assignments below."
            : "Please sign in to access your personalized dashboard."}
        </p>
        
        {!user && (
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        )}
      </div>
      
      {/* Admin Quick Actions */}
      <RoleRequirement requiredRole="admin">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Admin Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" size="lg" className="justify-start h-auto py-4" asChild>
              <Link to="/admin">
                <div>
                  <h3 className="font-medium text-left">Tracker Management</h3>
                  <p className="text-muted-foreground text-xs text-left mt-1">
                    Assign roles and responsibilities to trackers
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </RoleRequirement>
      
      {/* Tracker Quick Actions */}
      <RoleRequirement requiredRole="tracker">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <PenTool className="mr-2 h-5 w-5" />
            Tracker Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" size="lg" className="justify-start h-auto py-4" asChild>
              <Link to="/match">
                <div>
                  <h3 className="font-medium text-left">Match Recording</h3>
                  <p className="text-muted-foreground text-xs text-left mt-1">
                    Start tracking events in a new match
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </RoleRequirement>
    </div>
  );
}
