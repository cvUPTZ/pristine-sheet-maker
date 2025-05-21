
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function AuthPage() {
  const { user, loading } = useAuth();
  
  // If already logged in, redirect to home
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }
  
  return <AuthForm />;
}
