"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TrackerPianoInput from '@/components/TrackerPianoInput';
import VoiceCollaboration from '@/components/match/VoiceCollaboration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { PushNotificationService } from '@/services/pushNotificationService';
import useBatteryMonitor from '@/hooks/useBatteryMonitor';
import { useTrackerStatus } from '@/hooks/useTrackerStatus';

interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchName, setMatchName] = useState<string>('');
  const isMobile = useIsMobile();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize battery monitoring for this tracker
  const batteryStatus = useBatteryMonitor(trackerUserId);
  
  // Use the enhanced tracker status hook
  const { broadcastStatus, broadcastStatusImmediate, isConnected, cleanup } = useTrackerStatus(matchId, trackerUserId);

  console.log('TrackerInterface: Render state', { 
    isConnected,
    trackerUserId,
    matchId,
    batteryLevel: batteryStatus.level,
    loading,
    error
  });

  useEffect(() => {
    // Initialize push notifications
    PushNotificationService.initialize();
  }, []);

  useEffect(() => {
    if (!trackerUserId || !matchId) {
      setLoading(false);
      setError("Tracker user ID or Match ID is missing.");
      return;
    }

    async function fetchMatchInfo() {
      setLoading(true);
      setError(null);

      try {
        console.log('TrackerInterface: Fetching match info for:', matchId);
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('name, home_team_name, away_team_name')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Failed to fetch match data: ${matchError.message}`);
        }

        const name = matchData.name || `${matchData.home_team_name} vs ${matchData.away_team_name}`;
        setMatchName(name);
        console.log('TrackerInterface: Match info loaded:', name);

      } catch (e: any) {
        console.error('TrackerInterface: Error fetching match info:', e);
        setError(e.message || "An unexpected error occurred while fetching match information.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchInfo();
  }, [trackerUserId, matchId]);

  // Enhanced status broadcasting with battery and network info
  useEffect(() => {
    if (!trackerUserId || !matchId) {
      console.log('TrackerInterface: Skipping status broadcast - missing IDs', { trackerUserId, matchId });
      return;
    }

    if (!isConnected) {
      console.log('TrackerInterface: Skipping status broadcast - not connected');
      return;
    }
    
    const getNetworkQuality = (): 'excellent' | 'good' | 'poor' => {
      // Simple network quality estimation based on connection type
      const connection = (navigator as any).connection;
      if (!connection) return 'good';
      
      if (connection.effectiveType === '4g') return 'excellent';
      if (connection.effectiveType === '3g') return 'good';
      return 'poor';
    };

    // Enhanced status broadcast function
    const broadcastEnhancedStatus = () => {
      console.log('TrackerInterface: Broadcasting enhanced status', {
        batteryLevel: batteryStatus.level,
        networkQuality: getNetworkQuality()
      });
      
      broadcastStatusImmediate({
        status: 'active',
        timestamp: Date.now(),
        battery_level: batteryStatus.level || undefined,
        network_quality: getNetworkQuality()
      });
    };

    // Initial broadcast when connected (immediate, no throttling)
    console.log('TrackerInterface: Broadcasting initial status immediately');
    broadcastEnhancedStatus();

    // Set up periodic activity updates every 20 seconds
    intervalRef.current = setInterval(() => {
      console.log('TrackerInterface: Periodic status broadcast');
      broadcastStatus({
        status: 'active',
        timestamp: Date.now(),
        battery_level: batteryStatus.level || undefined,
        network_quality: getNetworkQuality()
      });
    }, 20000);

    return () => {
      console.log('TrackerInterface: Cleaning up status broadcasting');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackerUserId, matchId, isConnected, broadcastStatus, broadcastStatusImmediate, batteryStatus.level]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('TrackerInterface: Component unmounting, cleaning up');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cleanup();
    };
  }, [cleanup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8 min-h-[200px]">
        <div className="text-center">
          <div className="text-sm sm:text-base">Loading tracker interface...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-red-600 text-sm sm:text-base">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 sm:p-2 lg:p-4 max-w-6xl">
      <Card className="mb-3 sm:mb-6">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">
            Match Tracking Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-1 sm:space-y-2">
            <p className="text-sm sm:text-base lg:text-lg font-medium truncate">
              {matchName}
            </p>
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>Tracker: {trackerUserId}</span>
              <span>Match: {matchId}</span>
              <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                Status: {isConnected ? 'Connected' : 'Connecting...'}
              </span>
              {batteryStatus.level !== null && (
                <span className={`font-medium ${batteryStatus.level <= 20 ? 'text-red-600' : 'text-green-600'}`}>
                  Battery: {batteryStatus.level}% {batteryStatus.charging ? '⚡' : '🔋'}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Collaboration */}
      <div className="mb-3 sm:mb-6">
        <VoiceCollaboration
          matchId={matchId}
          userId={trackerUserId}
        />
      </div>
      
      <div className="w-full">
        <TrackerPianoInput matchId={matchId} />
      </div>
    </div>
  );
}
