"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedVoiceChat } from '@/components/voice/EnhancedVoiceChat';
import { useToast } from '@/components/ui/use-toast';
import MatchTimer from '@/components/MatchTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { PushNotificationService } from '@/services/pushNotificationService';
import useBatteryMonitor from '@/hooks/useBatteryMonitor';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';
import EnhancedPianoInput from './EnhancedPianoInput';
import { EventType } from '@/types';

interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  timer_status?: string | null;
  timer_current_value?: number | null;
  timer_last_started_at?: string | null;
}

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isRecordingEvent, setIsRecordingEvent] = useState(false);
  const isMobile = useIsMobile();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Initialize battery monitoring for this tracker
  const batteryStatus = useBatteryMonitor(trackerUserId);
  
  // Use the unified tracker connection system
  const { isConnected, broadcastStatus, cleanup } = useUnifiedTrackerConnection(matchId, trackerUserId);

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
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Failed to fetch match data: ${matchError.message}`);
        }

        setMatchData(matchData);
        console.log('TrackerInterface: Match info loaded:', matchData);

      } catch (e: any) {
        console.error('TrackerInterface: Error fetching match info:', e);
        setError(e.message || "An unexpected error occurred while fetching match information.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchInfo();

    // Set up real-time subscription for timer updates
    const channel = supabase
      .channel(`match-timer-tracker-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          console.log('TrackerInterface: Timer update received:', payload.new);
          setMatchData(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackerUserId, matchId]);

  // Optimized event recording function
  const handleRecordEvent = useCallback(async (
    eventType: EventType,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ): Promise<any | null> => {
    if (isRecordingEvent) {
      console.log("Event recording already in progress, skipping...");
      return null;
    }

    setIsRecordingEvent(true);
    console.log("TrackerInterface: handleRecordEvent called with:", { eventType, playerId, teamContext, details });

    try {
      const eventToInsert = {
        match_id: matchId,
        event_type: eventType,
        player_id: playerId || null,
        created_by: trackerUserId,
        timestamp: Math.floor(Date.now() / 1000),
        team: teamContext || null,
        coordinates: details?.coordinates || null,
        event_data: { 
          ...details, 
          recorded_via_interface: true, 
          team_context_from_input: teamContext,
          tracker_id: trackerUserId,
          recorded_at: new Date().toISOString()
        },
      };

      console.log("Inserting event via TrackerInterface:", eventToInsert);

      const { data: newEvent, error: dbError } = await supabase
        .from('match_events')
        .insert([eventToInsert])
        .select()
        .single();

      if (dbError) {
        console.error('Error recording event in TrackerInterface:', dbError);
        toast({
          title: 'Error Recording Event',
          description: 'Database error occurred. Please try again.',
          variant: 'destructive',
        });
        throw dbError;
      } else {
        toast({
          title: 'Event Recorded',
          description: `${eventType} event recorded successfully.`,
        });
        return newEvent;
      }
    } catch (error: any) {
      console.error('Error in TrackerInterface handleRecordEvent:', error);
      toast({
        title: 'Recording Failed',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRecordingEvent(false);
    }
  }, [matchId, trackerUserId, toast, isRecordingEvent]);

  // Enhanced status broadcasting with battery and network info
  useEffect(() => {
    if (!trackerUserId || !matchId || !isConnected) {
      console.log('TrackerInterface: Skipping status broadcast', { 
        trackerUserId, 
        matchId, 
        isConnected 
      });
      return;
    }
    
    const getNetworkQuality = (): 'excellent' | 'good' | 'poor' => {
      const connection = (navigator as any).connection;
      if (!connection) return 'good';
      
      if (connection.effectiveType === '4g') return 'excellent';
      if (connection.effectiveType === '3g') return 'good';
      return 'poor';
    };

    // Set up periodic activity updates every 15 seconds
    console.log('TrackerInterface: Setting up periodic status broadcasts');
    intervalRef.current = setInterval(() => {
      console.log('TrackerInterface: Periodic status broadcast');
      broadcastStatus({
        status: 'active',
        timestamp: Date.now(),
        battery_level: batteryStatus.level || undefined,
        network_quality: getNetworkQuality()
      });
    }, 15000);

    return () => {
      console.log('TrackerInterface: Cleaning up status broadcasting');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackerUserId, matchId, isConnected, broadcastStatus, batteryStatus.level]);

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

  const matchName = matchData?.name || `${matchData?.home_team_name} vs ${matchData?.away_team_name}`;

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
              {isRecordingEvent && (
                <span className="text-blue-600 font-medium">Recording...</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Timer Display */}
      {matchData && (
        <div className="mb-3 sm:mb-6">
          <MatchTimer
            dbTimerValue={matchData.timer_current_value}
            timerStatus={matchData.timer_status}
            timerLastStartedAt={matchData.timer_last_started_at}
            timerPeriod="first_half"
            timerAddedTime={0}
          />
        </div>
      )}

      {/* Voice Collaboration */}
      <div className="mb-3 sm:mb-6">
        <EnhancedVoiceChat
          matchId={matchId}
          userId={trackerUserId}
          userRole="tracker"
          userName={`Tracker ${trackerUserId}`}
        />
      </div>
      
      <div className="w-full">
        <EnhancedPianoInput
          matchId={matchId}
          onEventRecord={handleRecordEvent}
        />
      </div>
    </div>
  );
}
