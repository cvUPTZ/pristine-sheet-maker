
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { RequireAuth } from '@/components/RequireAuth';

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
import CreateMatch from '@/pages/CreateMatch';
import Matches from '@/pages/Matches';
import MatchAnalysis from '@/pages/MatchAnalysis';
import MatchPlanningPage from '@/pages/MatchPlanningPage';
import MatchTimerPage from '@/pages/MatchTimerPage';
import NewVoiceChatPage from '@/pages/NewVoiceChatPage';

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/business-presentation" element={<BusinessPresentation />} />
            
            {/* Protected routes */}
            <Route path="/profile" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            
            <Route path="/dashboard" element={
              <RequireAuth>
                <Index />
              </RequireAuth>
            } />
            
            <Route path="/matches" element={
              <RequireAuth requiredPermissions={['canViewMatches']}>
                <Matches />
              </RequireAuth>
            } />
            
            <Route path="/create-match" element={
              <RequireAuth requiredPermissions={['canCreateMatches']}>
                <CreateMatch />
              </RequireAuth>
            } />
            
            <Route path="/match" element={
              <RequireAuth requiredPermissions={['canCreateMatches']}>
                <CreateMatch />
              </RequireAuth>
            } />
            
            <Route path="/match/:matchId" element={
              <RequireAuth requiredPermissions={['canViewMatches']}>
                <MatchAnalysisV2 />
              </RequireAuth>
            } />
            
            <Route path="/match-analysis/:matchId" element={
              <RequireAuth requiredPermissions={['canViewMatches']}>
                <MatchAnalysis />
              </RequireAuth>
            } />
            
            <Route path="/match-planning" element={
              <RequireAuth requiredPermissions={['canCreateMatches']}>
                <MatchPlanningPage />
              </RequireAuth>
            } />
            
            <Route path="/match-timer" element={
              <RequireAuth requiredPermissions={['canTrackMatches']}>
                <MatchTimerPage />
              </RequireAuth>
            } />
            
            <Route path="/tracker" element={
              <RequireAuth requiredPermissions={['canTrackMatches']}>
                <TrackerInterface />
              </RequireAuth>
            } />
            
            <Route path="/statistics" element={
              <RequireAuth requiredPermissions={['canViewStatistics']}>
                <Statistics />
              </RequireAuth>
            } />
            
            <Route path="/analytics" element={
              <RequireAuth requiredPermissions={['canViewAnalytics']}>
                <AnalyticsDashboard />
              </RequireAuth>
            } />
            
            <Route path="/video-analysis" element={
              <RequireAuth requiredPermissions={['canAnalyzeVideos']}>
                <VideoAnalysis />
              </RequireAuth>
            } />
            
            <Route path="/direct-analyzer" element={
              <RequireAuth requiredPermissions={['canAnalyzeVideos']}>
                <DirectVideoAnalyzer />
              </RequireAuth>
            } />
            
            <Route path="/voice-chat" element={
              <RequireAuth>
                <NewVoiceChatPage />
              </RequireAuth>
            } />
            
            <Route path="/settings" element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <RequireAuth requiredRoles={['admin']}>
                <Admin />
              </RequireAuth>
            } />
            
            <Route path="/admin/profiles" element={
              <RequireAuth requiredRoles={['admin']}>
                <ProfileListPage />
              </RequireAuth>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
