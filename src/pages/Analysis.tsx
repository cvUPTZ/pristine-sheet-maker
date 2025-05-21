
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RoleRequirement from "@/components/RoleRequirement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart, Tv, Users } from "lucide-react";
import TrackerView from "@/components/TrackerView";
import { EventType } from "@/types";
import { useState } from "react";
import TrackerCollaboration from "@/components/TrackerCollaboration";

export default function Analysis() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<EventType[]>([]);

  const handleCategorySelect = (category: string, events: EventType[]) => {
    setSelectedCategory(category);
    setAvailableEvents(events);
  };

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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:max-w-3xl">
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
              <TabsTrigger value="collaboration" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Collaboration</span>
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

            <TabsContent value="collaboration" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tracker Assignments</CardTitle>
                    <CardDescription>
                      Select an event category to track during matches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RoleRequirement requiredRole="tracker">
                      <TrackerView onCategorySelect={handleCategorySelect} />
                    </RoleRequirement>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Live Collaboration</CardTitle>
                    <CardDescription>
                      Track events in real-time with other team members
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RoleRequirement requiredRole="tracker">
                      <div className="space-y-4">
                        {selectedCategory ? (
                          <div>
                            <h4 className="font-medium mb-2">Available Events for {selectedCategory}</h4>
                            <div className="flex flex-wrap gap-2">
                              {availableEvents.map(event => (
                                <div key={event} className="px-3 py-1 bg-muted rounded-full text-sm">
                                  {event}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Select a category from the tracker assignments to see available events.
                          </p>
                        )}
                        
                        <TrackerCollaboration 
                          currentCategory={selectedCategory || undefined} 
                        />
                      </div>
                    </RoleRequirement>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </RoleRequirement>
      </div>
    </DashboardLayout>
  );
}
