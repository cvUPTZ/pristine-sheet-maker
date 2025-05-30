import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Matches from './pages/Matches';
import MatchDetails from './pages/MatchDetails';
import CreateMatch from './pages/CreateMatch';
import MatchAnalysisV2 from './pages/MatchAnalysisV2';
import Tracker from './pages/Tracker';
import { Toaster } from "@/components/ui/toaster"
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
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              } />
              <Route path="/admin" element={
                <RequireAuth roles={['admin']}>
                  <Admin />
                </RequireAuth>
              } />
              <Route path="/matches" element={
                <RequireAuth>
                  <Matches />
                </RequireAuth>
              } />
              <Route path="/match/:matchId" element={
                <RequireAuth>
                  <MatchDetails />
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
              <Route path="/tracker/:matchId" element={<Tracker />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
