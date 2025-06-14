import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password, fullName);
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('Google auth error:', error);
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Google auth exception:', error);
      toast({
        title: "Authentication failed",
        description: "Failed to authenticate with Google",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&q=80')` }} />
      <div className="absolute inset-0 bg-black/60" />
      <Card className="w-full max-w-md z-10 bg-card/90 backdrop-blur-sm border-border/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Football Analytics</CardTitle>
          <CardDescription className="text-center text-card-foreground/80">
            Sign in to track matches in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              {/* Google Sign In Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleAuth}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FcGoogle className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-border/50" />
                <span className="flex-shrink mx-4 text-xs uppercase text-card-foreground/80">
                  Or continue with email
                </span>
                <div className="flex-grow border-t border-border/50" />
              </div>
            </div>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-card-foreground/80">
          {activeTab === 'login' ? (
            <p>Don't have an account? <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('signup')}>Sign up</Button></p>
          ) : (
            <p>Already have an account? <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('login')}>Log in</Button></p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
