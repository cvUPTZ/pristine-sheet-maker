
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Users, BarChart3, Settings } from 'lucide-react';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Football Match Tracker
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional football match analysis and real-time event tracking system
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <PlayCircle className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <CardTitle className="text-lg">Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Real-time match event tracking with multiple trackers</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <CardTitle className="text-lg">Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage teams, players, and formations efficiently</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-2" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Comprehensive match statistics and visualizations</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Settings className="h-12 w-12 mx-auto text-orange-600 mb-2" />
              <CardTitle className="text-lg">Admin Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Complete administrative control and user management</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/matches">
              <Button variant="outline">View Matches</Button>
            </Link>
            <Link to="/statistics">
              <Button variant="outline">Statistics</Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline">Admin Panel</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
