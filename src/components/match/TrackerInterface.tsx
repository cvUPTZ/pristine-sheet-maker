
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchName, setMatchName] = useState<string>('');

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
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('name, home_team_name, away_team_name')
          .eq('id', matchId)
          .single();

        if (matchError) {
          console.error('Error fetching match data:', matchError);
          throw new Error(`Failed to fetch match data: ${matchError.message}`);
        }

        setMatchName(matchData.name || `${matchData.home_team_name} vs ${matchData.away_team_name}`);

      } catch (e: any) {
        console.error("Error fetching match info:", e);
        setError(e.message || "An unexpected error occurred while fetching match information.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchInfo();
  }, [trackerUserId, matchId]);

  if (loading) {
    return <div className="p-4">Loading tracker interface...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Match Tracking Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-medium">{matchName}</p>
            <p className="text-sm text-gray-600">Tracker: {trackerUserId}</p>
            <p className="text-sm text-gray-600">Match: {matchId}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Tracker input interface will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
