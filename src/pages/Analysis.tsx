
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RoleRequirement from "@/components/RoleRequirement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart, Tv } from "lucide-react";

export default function Analysis() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Match Analysis</h1>
            <p className="text-muted-foreground">Review and analyze match data</p>
          </div>
        </div>

        <RoleRequirement requiredRole="any">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:max-w-2xl">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span>Performance</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                <span>Trends</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Tv className="h-4 w-4" />
                <span>Video Analysis</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Analysis Overview</CardTitle>
                  <CardDescription>
                    Comprehensive view of match statistics and key performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <PieChart className="h-16 w-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">Analysis Dashboard</h3>
                    <p className="text-muted-foreground max-w-md">
                      This feature is under development. Soon you'll be able to view detailed match analysis and statistics here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>
                    Detailed performance metrics for players and teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <BarChart className="h-16 w-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">Performance Dashboard</h3>
                    <p className="text-muted-foreground max-w-md">
                      This feature is under development. Soon you'll be able to view detailed performance metrics here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Statistical Trends</CardTitle>
                  <CardDescription>
                    Long-term trend analysis and pattern recognition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <LineChart className="h-16 w-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">Trends Dashboard</h3>
                    <p className="text-muted-foreground max-w-md">
                      This feature is under development. Soon you'll be able to view statistical trends and patterns here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Video Analysis</CardTitle>
                  <CardDescription>
                    Review match footage with advanced analytical tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <Tv className="h-16 w-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">Video Analysis Tools</h3>
                    <p className="text-muted-foreground max-w-md">
                      This feature is under development. Soon you'll be able to analyze match videos here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </RoleRequirement>
      </div>
    </DashboardLayout>
  );
}
