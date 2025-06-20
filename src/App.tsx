import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';

// Import pages
import LandingPage from '@/pages/LandingPage';
import BusinessPresentation from '@/pages/BusinessPresentation';
import Index from '@/pages/Index';
import Match from '@/pages/Match';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import AdminProfiles from '@/pages/AdminProfiles';
import Settings from '@/pages/Settings';
import VideoAnalyzer from '@/pages/VideoAnalyzer';
import DirectAnalyzer from '@/pages/DirectAnalyzer';
import Statistics from '@/pages/Statistics';
import Analytics from '@/pages/Analytics';
import Tracker from '@/pages/Tracker';
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/profiles" element={<AdminProfiles />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/video-analysis" element={<VideoAnalyzer />} />
            <Route path="/direct-analyzer" element={<DirectAnalyzer />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/match/:matchId" element={<Match />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
