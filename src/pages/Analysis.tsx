
import { useAuth } from "@/hooks/useAuth";
import RoleRequirement from "@/components/RoleRequirement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analysis() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Match Analysis</h1>

      <RoleRequirement requiredRole="authenticated">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Advanced analytics and performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Performance analytics content will appear here.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Comparison</CardTitle>
              <CardDescription>
                Compare team statistics and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Team comparison content will appear here.</p>
            </CardContent>
          </Card>
        </div>
      </RoleRequirement>

      {!user && (
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access match analysis tools
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
