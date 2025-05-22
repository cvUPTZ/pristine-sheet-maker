
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import MatchAnalysis from "./pages/MatchAnalysis";
import Matches from "./pages/Matches";
import Statistics from "./pages/Statistics";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            
            <Route path="/match" element={
              <RequireAuth>
                <Index />
              </RequireAuth>
            } />
            
            <Route path="/match/:matchId" element={
              <RequireAuth>
                <MatchAnalysis />
              </RequireAuth>
            } />
            
            <Route path="/matches" element={
              <RequireAuth>
                <Matches />
              </RequireAuth>
            } />
            
            <Route path="/statistics" element={
              <RequireAuth>
                <Statistics />
              </RequireAuth>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
