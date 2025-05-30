
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import Header from './components/Header';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import Matches from './pages/Matches';
import CreateMatch from './pages/CreateMatch';
import MatchAnalysisV2 from './pages/MatchAnalysisV2';
import TrackerInterface from './pages/TrackerInterface';
import { Toaster } from "@/components/ui/toaster";
import EditMatch from '@/pages/EditMatch';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Toaster />
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={
                <RequireAuth requiredRoles={['admin']}>
                  <Admin />
                </RequireAuth>
              } />
              <Route path="/matches" element={
                <RequireAuth>
                  <Matches />
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
              <Route path="/match-analysis-v2/:matchId" element={
                <RequireAuth>
                  <MatchAnalysisV2 />
                </RequireAuth>
              } />
              <Route path="/tracker/:matchId" element={<TrackerInterface />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
