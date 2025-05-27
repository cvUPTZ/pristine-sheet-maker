
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
import Admin from "./pages/Admin";
import TrackerInterface from "./pages/TrackerInterface";
import Header from "./components/Header";
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ToastAction } from "@/components/ui/toast";

const queryClient = new QueryClient();

interface MatchPayload {
  id: string;
  name?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  status?: string | null;
  [key: string]: any;
}

const AppContent = () => {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (session && user && user.app_metadata?.role === 'tracker') {
      const channel = supabase
        .channel('match-live-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
          },
          (payload) => {
            const oldMatch = payload.old as MatchPayload | null;
            const newMatch = payload.new as MatchPayload;

            if (newMatch?.status === 'live' && oldMatch?.status !== 'live') {
              const matchId = newMatch.id;
              const matchName = newMatch.name || `${newMatch.home_team_name || 'Home'} vs ${newMatch.away_team_name || 'Away'}`;

              if (location.pathname === `/match/${matchId}`) {
                return;
              }

              toast({
                title: 'Match Live!',
                description: `Match "${matchName}" has started.`,
                action: (
                  <ToastAction altText="Go to Match" onClick={() => navigate(`/match/${matchId}`)}>
                    Go to Match
                  </ToastAction>
                ),
                duration: 10000,
              });
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // console.log('Subscribed to match live notifications for tracker.'); // Removed
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Match live notification channel error:', status, err);
          }
        });

      return () => {
        supabase.removeChannel(channel).then(status => {
          // console.log('Unsubscribed from match live notifications. Status:', status); // Removed
        });
      };
    }
  }, [session, user, toast, navigate, location]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/match" element={<RequireAuth requiredRoles={['admin', 'tracker']}><Index /></RequireAuth>} />
        <Route path="/match/:matchId" element={<RequireAuth requiredRoles={['admin', 'tracker']}><MatchAnalysis /></RequireAuth>} />
        <Route path="/tracker" element={<RequireAuth requiredRoles={['tracker']}><TrackerInterface /></RequireAuth>} />
        <Route path="/matches" element={<RequireAuth><Matches /></RequireAuth>} />
        <Route path="/statistics" element={<RequireAuth><Statistics /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth requiredRoles={['admin']}><Admin /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
