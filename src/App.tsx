
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import MatchAnalysis from "./pages/MatchAnalysis";
import Matches from "./pages/Matches";
import Statistics from "./pages/Statistics";
import Analysis from "./pages/Analysis";
import ProfilePage from "./pages/ProfilePage";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import RoleBasedRoute from "./components/RoleBasedRoute";
import UserManagement from "./components/admin/UserManagement";
import SystemSettings from "./components/admin/SystemSettings";
import TrackerAssignment from "./components/admin/TrackerAssignment";
import DashboardLayout from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              
              {/* Protected routes */}
              <Route element={<RoleBasedRoute requiredRole="authenticated" />}>
                <Route path="/match" element={<Index />} />
                <Route path="/match/:matchId" element={<MatchAnalysis />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              
              {/* Admin routes */}
              <Route element={<RoleBasedRoute requiredRole="admin" />}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/settings" element={<SystemSettings />} />
                <Route path="/admin/trackers" element={<TrackerAssignment />} />
              </Route>
            </Route>
            
            {/* Public routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
