import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RolePermissions } from '@/hooks/useUserPermissions'; // Adjust path if needed
import PitchView from '@/components/match/PitchView'; // Import PitchView
import { Player, EventType as GlobalEventType, MatchEvent as GlobalMatchEvent } from '@/types'; // Import necessary types
import StatisticsTabPlaceholder from './StatisticsTabPlaceholder'; // Import placeholder
import TimelineTabPlaceholder from './TimelineTabPlaceholder';   // Import placeholder
import AnalyticsTabPlaceholder from './AnalyticsTabPlaceholder'; // Import placeholder

// Placeholder Types (Ideally, import from actual locations like @/types, @/hooks/useMatchData, etc.)
// TeamPlayer is now Player from @/types
// interface TeamPlayer { 
//   id: number;
//   name: string;
//   position: string;
//   number: number;
// }

interface TeamType { // Keep this local or import if defined globally with Player type
  id: string;
  name: string;
  formation: string;
  players: Player[]; // Use imported Player type
}

interface HookMatchEvent { // Assuming this is the event type from useMatchData
  id: string;
  match_id: string;
  timestamp: number;
  event_type: string;
  // Add other fields as per actual HookMatchEvent type
  // For example, if it contains player_id, team_id, coordinates:
  player_id?: number | null;
  team_id?: 'home' | 'away' | string | null;
  coordinates?: { x: number; y: number } | null;
}

interface Statistics {
  // Define structure of Statistics object
  totalShots: number;
  possession: Record<string, number>;
  // Add other stats fields
}

interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
  events: HookMatchEvent[]; // Or specific event type for segments
}

// MatchEvent for sendCollaborationEvent is now GlobalMatchEvent from @/types
// interface MatchEvent { // For sendCollaborationEvent
//   matchId: string;
//   teamId: 'home' | 'away' | string; 
//   playerId: number;
//   type: string; // GlobalEventType
//   timestamp: number;
//   coordinates?: { x: number; y: number };
// }


// --- Component Props ---
interface MainTabContentV2Props {
  matchId: string; // Retained from original
  permissions: RolePermissions; // Retained
  homeTeam: TeamType; // Retained (uses updated TeamType with Player)
  awayTeam: TeamType; // Retained (uses updated TeamType with Player)
  events: HookMatchEvent[]; // Retained
  statistics: Statistics | null; // Retained
  setStatistics: (stats: Statistics) => void; // Retained
  playerStats: any; // Retained (define more specific type if available)
  timeSegments: TimeSegmentStatistics[]; // Retained
  sendCollaborationEvent: (eventData: Omit<GlobalMatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'>) => void; // Updated to use GlobalMatchEvent

  // Props for PitchView integration
  selectedPlayer: Player | null;
  selectedTeamId: 'home' | 'away';
  setSelectedTeamId: (teamId: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: Array<{ x: number; y: number; timestamp: number }>;
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: { x: number; y: number }) => void;
  recordEventForPitchView: (eventType: GlobalEventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({
  matchId,
  permissions,
  homeTeam,
  awayTeam,
  events,
  statistics,
  setStatistics,
  playerStats,
  timeSegments,
  sendCollaborationEvent, // This prop might be for PianoInput or other direct event recording
  
  // PitchView specific props
  selectedPlayer,
  selectedTeamId,
  setSelectedTeamId,
  handlePlayerSelect,
  ballTrackingPoints,
  handlePitchClick,
  addBallTrackingPoint,
  recordEventForPitchView, // This is the specific recorder for PitchView
}) => {
  const [activeTab, setActiveTab] = useState<string>('');

  const availableTabs = React.useMemo(() => [
    { key: 'pitch', label: 'Pitch View', hasPermission: permissions.pitchView },
    { key: 'stats', label: 'Statistics', hasPermission: permissions.statistics },
    { key: 'timeline', label: 'Timeline', hasPermission: permissions.timeline },
    { key: 'analytics', label: 'Analytics', hasPermission: permissions.analytics },
  ].filter(tab => tab.hasPermission), [permissions]);

  useEffect(() => {
    if (availableTabs.length > 0) {
      // Check if current activeTab is still valid, otherwise set to the first available
      const currentTabIsValid = availableTabs.some(tab => tab.key === activeTab);
      if (!currentTabIsValid) {
        setActiveTab(availableTabs[0].key);
      } else if (activeTab === '' && availableTabs.length > 0) { 
        // Handles initial load if activeTab is empty string but tabs are available
        setActiveTab(availableTabs[0].key);
      }
    } else {
      setActiveTab(''); // No tabs available
    }
  }, [availableTabs, activeTab]); // Rerun when availableTabs change or activeTab changes (e.g. due to external influence if any)


  if (availableTabs.length === 0) {
    return <p className="p-4 text-center text-muted-foreground">No match analysis views are available based on your current permissions.</p>;
  }
  
  // Ensure activeTab has a valid default if it's somehow still empty after useEffect
  // This is a fallback, useEffect should handle it.
  const currentActiveTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].key : '');


  return (
    <Tabs value={currentActiveTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length > 0 ? availableTabs.length : 1}, 1fr)` }}>
        {availableTabs.map(tab => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {permissions.pitchView && (
        <TabsContent value="pitch" className="mt-4 p-1">
          <PitchView
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeamId}
            setSelectedTeam={setSelectedTeamId}
            handlePlayerSelect={handlePlayerSelect}
            ballTrackingPoints={ballTrackingPoints || []} // Ensure it's an array
            handlePitchClick={handlePitchClick}
            addBallTrackingPoint={addBallTrackingPoint}
            recordEvent={recordEventForPitchView}
            events={events.map(e => ({ // Map HookMatchEvent to PitchViewEvent (if types differ)
                id: e.id,
                match_id: e.match_id,
                timestamp: e.timestamp,
                event_type: e.event_type,
                player_id: e.player_id,
                team: e.team_id, // Ensure 'team' is the correct prop name in PitchViewEvent
                coordinates: e.coordinates,
                // Map other necessary fields if PitchViewEvent expects more or different structure
            }))}
            permissions={permissions} // Pass permissions for ball tracking toggle
          />
        </TabsContent>
      )}
      {permissions.statistics && (
        <TabsContent value="stats" className="mt-4 p-1">
          <StatisticsTabPlaceholder />
          {/* Example if passing props: <StatisticsTabPlaceholder statisticsData={statistics} /> */}
        </TabsContent>
      )}
      {permissions.timeline && (
        <TabsContent value="timeline" className="mt-4 p-1">
          <TimelineTabPlaceholder />
          {/* Example if passing props: <TimelineTabPlaceholder events={events} /> */}
        </TabsContent>
      )}
      {permissions.analytics && (
        <TabsContent value="analytics" className="mt-4 p-1">
          <AnalyticsTabPlaceholder />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default MainTabContentV2;
