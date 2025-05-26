
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import MatchRecording from "./pages/Index";
import Auth from "./pages/Auth";
import Statistics from "./pages/Statistics";
import MatchAnalysis from "./pages/MatchAnalysis";
import Matches from "./pages/Matches";
import Admin from "./pages/Admin";
import TrackerInterface from "./pages/TrackerInterface";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Header />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              } />
              <Route path="/new-match" element={
                <RequireAuth>
                  <MatchRecording />
                </RequireAuth>
              } />
              <Route path="/matches" element={
                <RequireAuth>
                  <Matches />
                </RequireAuth>
              } />
              <Route path="/match/:matchId" element={
                <RequireAuth>
                  <MatchAnalysis />
                </RequireAuth>
              } />
              <Route path="/tracker/:matchId" element={
                <RequireAuth>
                  <TrackerInterface />
                </RequireAuth>
              } />
              <Route path="/statistics" element={
                <RequireAuth>
                  <Statistics />
                </RequireAuth>
              } />
              <Route path="/admin" element={
                <RequireAuth>
                  <Admin />
                </RequireAuth>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
