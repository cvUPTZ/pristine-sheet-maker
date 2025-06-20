
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';

// Import pages
import LandingPage from '@/pages/LandingPage';
import BusinessPresentation from '@/pages/BusinessPresentation';
import Index from '@/pages/Index';
import MatchAnalysisV2 from '@/pages/MatchAnalysisV2';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import ProfileListPage from '@/pages/Admin/ProfileListPage';
import Settings from '@/pages/Settings';
import VideoAnalysis from '@/pages/VideoAnalysis';
import DirectVideoAnalyzer from '@/pages/DirectVideoAnalyzer';
import Statistics from '@/pages/Statistics';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import TrackerInterface from '@/pages/TrackerInterface';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/business-presentation" element={<BusinessPresentation />} />
            <Route path="/profile" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/profiles" element={<ProfileListPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/video-analysis" element={<VideoAnalysis />} />
            <Route path="/direct-analyzer" element={<DirectVideoAnalyzer />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/tracker" element={<TrackerInterface />} />
            <Route path="/match/:matchId" element={<MatchAnalysisV2 />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
