
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TrackerAssignment from "@/components/admin/TrackerAssignment";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // If not an admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
      
      <Tabs defaultValue="trackers">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 lg:max-w-md">
          <TabsTrigger value="trackers">Tracker Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trackers" className="mt-6">
          <TrackerAssignment />
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all users in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management functionality to be implemented.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System settings functionality to be implemented.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
