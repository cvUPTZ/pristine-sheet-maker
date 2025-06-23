import React from 'react';
import VideoMatchSetup from '@/components/admin/VideoMatchSetup'; // Component created in Step 1
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

const VideoSetupPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center space-x-3">
            <Video className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Video Match Setup</CardTitle>
              <CardDescription>
                Configure YouTube videos for matches, assign trackers, and manage notifications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/*
            The VideoMatchSetup component will need to be enhanced to:
            1. Fetch actual matches and trackers.
            2. Call services (e.g., YouTubeService, NotificationService) to save data and send notifications.
            3. Handle loading and error states.
            These enhancements will be part of implementing its internal logic,
            connecting it to the backend services and database (Step 4 & further refinement).
          */}
          <VideoMatchSetup />
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoSetupPage;
