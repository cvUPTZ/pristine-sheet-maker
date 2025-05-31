
import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';

// Lazy load components
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Admin = lazy(() => import('@/pages/Admin'));
const MatchAnalysis = lazy(() => import('@/pages/MatchAnalysis'));
const MatchAnalysisV2 = lazy(() => import('@/pages/MatchAnalysisV2'));
const CreateMatch = lazy(() => import('@/pages/CreateMatch'));
const EditMatch = lazy(() => import('@/pages/EditMatch'));
const Matches = lazy(() => import('@/pages/Matches'));
const Statistics = lazy(() => import('@/pages/Statistics'));
const TrackerInterface = lazy(() => import('@/pages/TrackerInterface'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                } />
                <Route path="/admin" element={
                  <RequireAuth>
                    <Admin />
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
                <Route path="/match/:matchId" element={
                  <RequireAuth>
                    <MatchAnalysis />
                  </RequireAuth>
                } />
                <Route path="/match-v2/:matchId" element={
                  <RequireAuth>
                    <MatchAnalysisV2 />
                  </RequireAuth>
                } />
                <Route path="/create-match" element={
                  <RequireAuth>
                    <CreateMatch />
                  </RequireAuth>
                } />
                <Route path="/edit-match/:matchId" element={
                  <RequireAuth>
                    <EditMatch />
                  </RequireAuth>
                } />
                <Route path="/tracker/:userId/:matchId" element={
                  <RequireAuth>
                    <TrackerInterface />
                  </RequireAuth>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
