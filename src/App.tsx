import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import MatchAnalysisV2 from "./pages/MatchAnalysisV2";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Matches from "./pages/Matches";
import Statistics from "./pages/Statistics";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import CreateMatch from "./pages/CreateMatch";
import ProfileListPage from './pages/Admin/ProfileListPage';
import TrackerInterface from "./pages/TrackerInterface";
import LandingPage from "./pages/LandingPage";
import MatchTimerPage from "./pages/MatchTimerPage";
import VideoAnalysis from "./pages/VideoAnalysis";
import Settings from "./pages/Settings";
import NewVoiceChatPage from '@/pages/NewVoiceChatPage'; // Adjust path as needed
import Header from "./components/Header";
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ToastAction } from "@/components/ui/toast";
import { useNetworkStatus } from './hooks/useNetworkStatus'; // Adjusted path

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    console.log(`App component: Network is currently ${isOnline ? 'Online' : 'Offline'}`);
  }, [isOnline]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('Service Worker: Registered successfully with scope:', registration.scope);
        } catch (error) {
          console.error('Service Worker: Registration failed:', error);
        }
      };
      
      // Register after the window has loaded to avoid contention for resources
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
        return () => window.removeEventListener('load', registerServiceWorker);
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (user && user.app_metadata?.role === 'tracker') {
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
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Match live notification channel error:', status, err);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast, navigate, location]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/match" element={<RequireAuth requiredRoles={['admin', 'tracker']}><Index /></RequireAuth>} />
        <Route path="/match/:matchId" element={<RequireAuth requiredRoles={['admin', 'tracker']}><MatchAnalysisV2 /></RequireAuth>} /> 
        <Route path="/match/:matchId/analytics" element={<RequireAuth requiredRoles={['admin', 'manager']}><AnalyticsDashboard /></RequireAuth>} />
        <Route path="/match/:matchId/edit" element={<RequireAuth requiredRoles={['admin']}><CreateMatch /></RequireAuth>} />
        <Route path="/match/:matchId/timer" element={<RequireAuth requiredRoles={['admin']}><MatchTimerPage /></RequireAuth>} />
        <Route path="/video-analysis" element={<RequireAuth requiredRoles={['admin', 'manager']}><VideoAnalysis /></RequireAuth>} />
        <Route path="/tracker" element={<RequireAuth requiredRoles={['tracker']}><TrackerInterface /></RequireAuth>} />
        <Route path="/tracker-interface" element={<RequireAuth requiredRoles={['tracker']}><TrackerInterface /></RequireAuth>} />
        <Route path="/matches" element={<RequireAuth requiredRoles={['admin', 'manager']}><Matches /></RequireAuth>} />
        <Route path="/statistics" element={<RequireAuth requiredRoles={['admin', 'manager']}><Statistics /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth requiredRoles={['admin', 'manager']}><AnalyticsDashboard /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth requiredRoles={['admin']}><Admin /></RequireAuth>} />
        <Route path="/create-match" element={<RequireAuth requiredRoles={['admin']}><CreateMatch /></RequireAuth>} />
        <Route 
          path="/admin/profiles" 
          element={
            <RequireAuth requiredRoles={['admin']}>
              <ProfileListPage />
            </RequireAuth>
          } 
        />
        <Route path="/match/:matchId/voice-chat" element={<NewVoiceChatPage />} />
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
