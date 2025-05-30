
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User is not logged in, redirect to auth page
        navigate('/auth');
      } else if (userRole) {
        // User is logged in, redirect based on role
        switch (userRole) {
          case 'tracker':
            navigate('/dashboard');
            break;
          case 'admin':
            navigate('/admin');
            break;
          case 'viewer':
            navigate('/matches');
            break;
          default:
            navigate('/dashboard');
            break;
        }
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show loading while determining where to redirect
  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Loading...</span>
      </div>
    );
  }

  // This should not be reached since we redirect non-authenticated users
  return null;
};

export default Index;
