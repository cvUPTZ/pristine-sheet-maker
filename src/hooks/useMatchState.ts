import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Match, Team, Player, MatchEvent, Statistics, BallTrackingPoint, TimeSegmentStatistics, EventType, PlayerStatistics } from '@/types';

interface MatchState {
  match: Match | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  teamPositions: Record<number, { x: number; y: number }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  matchEvents: MatchEvent[];
  statistics: Statistics;
  ballTrackingPoints: BallTrackingPoint[];
  timeSegments: TimeSegmentStatistics[];
  isRunning: boolean;
  elapsedTime: number;
  setupComplete: boolean;
  ballTrackingMode: boolean;
  playerStats: PlayerStatistics[];
  isPassTrackingModeActive: boolean;
  potentialPasser: Player | null;
  ballPathHistory: BallPath[];
  homeEventsCount: number;
  awayEventsCount: number;
}

// Define the BallPath interface
export interface BallPath {
  id: string; // Unique ID for the path
  passer: { id: number; teamId: string; }; // teamId here is actual team ID
  receiver: { id: number; teamId: string; };
  startCoordinates: { x: number; y: number; };
  endCoordinates: { x: number; y: number; };
  eventType: EventType; // Should be 'pass', but could be other ball-moving events
  timestamp: number;
  status?: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed'; // Mirrored from MatchEvent
  clientId?: string; // Mirrored from MatchEvent for optimistic paths
}

const initialMatchState: MatchState = {
  match: null,
  homeTeam: null,
  awayTeam: null,
  teamPositions: {},
  selectedPlayer: null,
  selectedTeam: 'home',
  matchEvents: [],
  statistics: {
    possession: { home: 50, away: 50 },
    shots: { home: { onTarget: 0, offTarget: 0, total: 0 }, away: { onTarget: 0, offTarget: 0, total: 0 } },
    passes: { home: { successful: 0, attempted: 0, total: 0 }, away: { successful: 0, attempted: 0, total: 0 } },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
    duels: { home: { won: 0, lost: 0, aerial: 0 }, away: { won: 0, lost: 0, aerial: 0 } },
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
    crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
    dribbles: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    freeKicks: { home: 0, away: 0 },
  },
  ballTrackingPoints: [],
  timeSegments: [],
  isRunning: false,
  elapsedTime: 0,
  setupComplete: false,
  ballTrackingMode: false,
  playerStats: [],
  isPassTrackingModeActive: false,
  potentialPasser: null,
  ballPathHistory: [],
  homeEventsCount: 0,
  awayEventsCount: 0,
};

interface MatchActions {
  setMatch: (match: Match) => void;
  setHomeTeam: (team: Team) => void;
  setAwayTeam: (team: Team) => void;
  setTeamPositions: (positions: Record<number, { x: number; y: number }>) => void;
  setSelectedPlayer: (player: Player | null) => void;
  setSelectedTeam: (team: 'home' | 'away') => void;
  addMatchEvent: (event: MatchEvent) => void;
  setMatchEvents: (events: MatchEvent[]) => void;
  updateStatistics: (stats: Partial<Statistics>) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  setBallTrackingPoints: (points: BallTrackingPoint[]) => void; 
  undoLastAction: () => void;
  setTimeSegments: (timeSegments: TimeSegmentStatistics[]) => void;
  activeTab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video') => void;
  setStatistics: (stats: Statistics) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  completeSetup: (homeTeam: Team, awayTeam: Team) => void;
  updateTeams: (homeTeam: Team, awayTeam: Team) => void;
  setElapsedTime: (time: number | ((prevTime: number) => number)) => void;
  toggleBallTrackingMode: () => void;
  addEvent: (type: EventType, coordinates: { x: number; y: number }) => void;
  undoLastEvent: () => void;
  trackBallMovement: (coordinates: { x: number; y: number }) => void;
  saveMatch: () => string;
  recordEvent: (
    eventType: EventType, 
    playerId: number, 
    teamIdStr: 'home' | 'away', 
    coordinates: { x: number; y: number },
    collaborativeRecordEventFn?: CollaborativeRecordEventFn,
    matchIdForCollaboration?: string,
    relatedPlayerId?: number,
    passerCoordsForBallPath?: { x: number; y: number }
  ) => void;
  calculateTimeSegments: () => TimeSegmentStatistics[];
  calculatePlayerStats: () => PlayerStatistics[];
  togglePassTrackingMode: () => void;
  setPotentialPasser: (player: Player | null) => void;
  recordPass: (
    passer: Player, 
    receiver: Player, 
    passerTeamIdStr: 'home' | 'away', 
    receiverTeamIdStr: 'home' | 'away', 
    passerCoords: {x: number, y: number}, 
    receiverCoords: {x: number, y: number},
    collaborativeRecordEventFn?: CollaborativeRecordEventFn,
    matchIdForCollaboration?: string
  ) => void;
  processEventsForLocalState: (events: MatchEvent[]) => void; 
  setBallPathHistory: (paths: BallPath[]) => void;
  processSingleRemoteEvent: (newEvent: MatchEvent) => void; 
}

// Define the type for the collaborative recordEvent function
// This signature should match how it's called and what the backend expects
type CollaborativeRecordEventFn = (
  eventType: EventType,
  playerId: number,
  teamId: string, // Actual team ID string
  coordinates: { x: number; y: number },
  timestamp: number,
  eventId?: string, // For optimistic event tracking, can be clientId
  relatedPlayerId?: number
) => void;

export const useMatchState = (): MatchState & MatchActions => {
  const { user: authUser } = useAuth(); // Get the authenticated user
  const [state, setState] = useState<MatchState>(initialMatchState);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>('pitch');

  // Use a ref to track intervals
  const timerRef = useRef<number>();

  const setMatch = useCallback((match: Match) => {
    setState(prev => ({ ...prev, match }));
  }, []);

  const setHomeTeam = useCallback((team: Team) => {
    setState(prev => ({ ...prev, homeTeam: team }));
  }, []);

  const setAwayTeam = useCallback((team: Team) => {
    setState(prev => ({ ...prev, awayTeam: team }));
  }, []);

  const setTeamPositions = useCallback((positions: Record<number, { x: number; y: number }>) => {
    setState(prev => ({ ...prev, teamPositions: positions }));
  }, []);

  const setSelectedPlayer = useCallback((player: Player | null) => {
    setState(prev => ({ ...prev, selectedPlayer: player }));
  }, []);

  const setSelectedTeam = useCallback((team: 'home' | 'away') => {
    setState(prev => ({ ...prev, selectedTeam: team }));
  }, []);

  const addMatchEvent = useCallback((event: MatchEvent) => {
    setState(prev => ({ ...prev, matchEvents: [...prev.matchEvents, event] }));
  }, []);
  
  const setMatchEvents = useCallback((events: MatchEvent[]) => {
    setState(prev => {
      if (!prev.homeTeam || !prev.awayTeam) {
        console.warn("setMatchEvents: Home or Away team not set. Cannot accurately calculate event counts for possession.");
        return { ...prev, matchEvents: events };
      }
      let newHomeEventsCount = 0;
      let newAwayEventsCount = 0;
      events.forEach(event => {
        if (event.teamId === prev.homeTeam!.id) {
          newHomeEventsCount++;
        } else if (event.teamId === prev.awayTeam!.id) {
          newAwayEventsCount++;
        }
      });

      const newTotalEvents = newHomeEventsCount + newAwayEventsCount;
      const newPossessionHome = newTotalEvents > 0 ? Math.round((newHomeEventsCount / newTotalEvents) * 100) : 50;
      const newPossessionAway = newTotalEvents > 0 ? 100 - newPossessionHome : 50;

      return {
        ...prev,
        matchEvents: events,
        homeEventsCount: newHomeEventsCount,
        awayEventsCount: newAwayEventsCount,
        statistics: {
          ...prev.statistics,
          possession: {
            home: newPossessionHome,
            away: newPossessionAway,
          },
        },
      };
    });
  }, []);

  const updateStatistics = useCallback((stats: Partial<Statistics>) => {
    setState(prev => ({
      ...prev,
      statistics: { ...prev.statistics, ...stats }
    }));
  }, []);

  const addBallTrackingPoint = useCallback((point: BallTrackingPoint) => {
    setState(prev => ({ ...prev, ballTrackingPoints: [...prev.ballTrackingPoints, point] }));
  }, []);

  const setBallTrackingPoints = useCallback((points: BallTrackingPoint[]) => {
    setState(prev => ({ ...prev, ballTrackingPoints: points }));
  }, []);

  const undoLastAction = useCallback(() => {
    setState(prev => ({
      ...prev,
      matchEvents: prev.matchEvents.slice(0, -1),
      ballTrackingPoints: prev.ballTrackingPoints.slice(0, -1),
      // Note: Undoing ballPathHistory and recalculating stats would be more complex here.
      // This is a simplified undo.
    }));
  }, []);

  const setTimeSegments = useCallback((timeSegments: TimeSegmentStatistics[]) => {
    setState(prev => ({ ...prev, timeSegments }));
  }, []);

  const setStatistics = useCallback((newStats: Statistics) => {
    console.log("Setting new statistics:", newStats);
    setState(prev => ({
      ...prev,
      statistics: newStats
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const resetTimer = useCallback(() => {
    setState(prev => ({ ...prev, elapsedTime: 0, isRunning: false }));
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const setElapsedTime = useCallback((time: number | ((prevTime: number) => number)) => {
    setState(prev => {
      if (typeof time === 'function') {
        const newTime = time(prev.elapsedTime);
        return { ...prev, elapsedTime: newTime };
      }
      return { ...prev, elapsedTime: time };
    });
  }, []);

  const completeSetup = useCallback((homeTeam: Team, awayTeam: Team) => {
    setState(prev => ({ 
      ...prev, 
      homeTeam, 
      awayTeam, 
      setupComplete: true 
    }));
  }, []);

  const updateTeams = useCallback((homeTeam: Team, awayTeam: Team) => {
    setState(prev => ({ ...prev, homeTeam, awayTeam }));
  }, []);

  const toggleBallTrackingMode = useCallback(() => {
    setState(prev => ({ ...prev, ballTrackingMode: !prev.ballTrackingMode }));
  }, []);

  const togglePassTrackingMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPassTrackingModeActive: !prev.isPassTrackingModeActive,
      potentialPasser: !prev.isPassTrackingModeActive ? prev.potentialPasser : null, // Clear passer when deactivating
    }));
  }, []);

  const setPotentialPasser = useCallback((player: Player | null) => {
    setState(prev => ({ ...prev, potentialPasser: player }));
  }, []);

  const setBallPathHistory = useCallback((paths: BallPath[]) => {
    setState(prev => ({ ...prev, ballPathHistory: paths }));
  }, []);

  const addEvent = useCallback((type: EventType, coordinates: { x: number; y: number }) => {
    // This is a simplified local event adder, consider using recordEvent for consistency
    setState(prev => {
      const event: MatchEvent = {
        id: `event-${Date.now()}`,
        matchId: prev.match?.id || 'temp-match',
        teamId: prev.selectedTeam === 'home' ? prev.homeTeam?.id || 'home' : prev.awayTeam?.id || 'away',
        playerId: prev.selectedPlayer?.id || 0,
        type,
        timestamp: prev.elapsedTime,
        coordinates,
        status: 'confirmed'
      };
      // For full consistency, this should also update stats and ballPathHistory like recordEvent does.
      return { ...prev, matchEvents: [...prev.matchEvents, event] };
    });
  }, []);

  const undoLastEvent = useCallback(() => {
    undoLastAction(); // This is a simplified undo, doesn't fully revert stats/ballPathHistory
  }, [undoLastAction]);

  const trackBallMovement = useCallback((coordinates: { x: number; y: number }) => {
    setState(prev => {
      const point: BallTrackingPoint = {
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(), // Consider using prev.elapsedTime for consistency
        playerId: prev.selectedPlayer?.id,
        teamId: prev.selectedTeam === 'home' ? prev.homeTeam?.id : prev.awayTeam?.id
      };
      return { ...prev, ballTrackingPoints: [...prev.ballTrackingPoints, point] };
    });
  }, []);
  
  const saveMatch = useCallback((): string => {
    const matchId = state.match?.id || `match-${Date.now()}`; // Use existing matchId if available
    
    // Calculate time segments if not already done
    let matchTimeSegments = state.timeSegments;
    if (matchTimeSegments.length === 0 && state.ballTrackingPoints.length > 0) {
      matchTimeSegments = calculateTimeSegments(); // `this` context is not available, so call directly
    }
    
    // Calculate player statistics
    const playerStats = calculatePlayerStats(); // `this` context is not available
    
    const matchData = {
      matchId,
      date: new Date().toISOString(), // Or state.match.date if available
      elapsedTime: state.elapsedTime,
      homeTeam: state.homeTeam,
      awayTeam: state.awayTeam,
      matchEvents: state.matchEvents, // events seems redundant with matchEvents
      statistics: state.statistics,
      ballTrackingPoints: state.ballTrackingPoints,
      timeSegments: matchTimeSegments,
      playerStats,
      ballPathHistory: state.ballPathHistory,
    };
    
    console.log('Saving match data:', matchData);
    
    try {
      localStorage.setItem(`efootpad_match_${matchId}`, JSON.stringify(matchData));
    } catch (error) {
      console.error('Error saving match data:', error);
    }
    
    return matchId;
  }, [state]); // Add all state dependencies used


  const recordEvent = useCallback(
    (
      eventType: EventType,
      playerId: number,
      teamIdStr: 'home' | 'away', // This is 'home' or 'away' string
      coordinates: { x: number; y: number }, // For pass, these are receiver's coords
      collaborativeRecordEventFn?: CollaborativeRecordEventFn,
      matchIdForCollaboration?: string,
      relatedPlayerId?: number, // For pass, this is receiver's ID
      passerCoordsForBallPath?: { x: number; y: number } // For pass, these are passer's coords
    ) => {
      const currentElapsedTime = state.elapsedTime;
      const actualTeamId = teamIdStr === 'home' ? state.homeTeam?.id : state.awayTeam?.id;

      if (!actualTeamId) {
        console.error("Team ID could not be determined. Home/Away team may not be set.");
        return;
      }

      const applyEventToState = (prev: MatchState, eventToApply: MatchEvent): MatchState => {
        let updatedStats = JSON.parse(JSON.stringify(prev.statistics)); // Deep copy for modification
        let updatedBallPathHistory = [...prev.ballPathHistory];
        let newHomeEventsCount = prev.homeEventsCount;
        let newAwayEventsCount = prev.awayEventsCount;

        // Determine event's team ('home' or 'away') for stat updates
        const eventTeamStr = eventToApply.teamId === prev.homeTeam?.id ? 'home' : 
                             eventToApply.teamId === prev.awayTeam?.id ? 'away' : null;

        if (eventTeamStr) { // Proceed only if team is identifiable
            if (eventToApply.teamId === prev.homeTeam?.id) {
              newHomeEventsCount++;
            } else if (eventToApply.teamId === prev.awayTeam?.id) {
              newAwayEventsCount++;
            }

            if (eventToApply.type === 'pass') {
              if (eventTeamStr === 'home') {
                updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
                updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1; // Assuming recorded pass is successful
                updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
              } else {
                updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
                updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1;
                updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
              }
              if (passerCoordsForBallPath && eventToApply.relatedPlayerId && prev.homeTeam && prev.awayTeam) {
                const receiverTeam = prev.homeTeam.players.some(p => p.id === eventToApply.relatedPlayerId) ? prev.homeTeam :
                                     prev.awayTeam.players.some(p => p.id === eventToApply.relatedPlayerId) ? prev.awayTeam : null;
                const actualReceiverTeamId = receiverTeam?.id;

                if (actualReceiverTeamId) {
                    const newPath: BallPath = {
                      id: `ballpath-${eventToApply.id}`,
                      passer: { id: eventToApply.playerId, teamId: eventToApply.teamId },
                      receiver: { id: eventToApply.relatedPlayerId, teamId: actualReceiverTeamId },
                      startCoordinates: passerCoordsForBallPath,
                      endCoordinates: eventToApply.coordinates,
                      eventType: 'pass',
                      timestamp: eventToApply.timestamp,
                      status: eventToApply.status === 'pending_confirmation' ? 'optimistic' : 'confirmed',
                      clientId: eventToApply.clientId,
                    };
                    updatedBallPathHistory.push(newPath);
                }
              }
            } else if (eventToApply.type === 'shot') {
              if (eventTeamStr === 'home') {
                updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
                if (eventToApply.meta?.onTarget) updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
                else updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
              } else {
                updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
                if (eventToApply.meta?.onTarget) updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
                else updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
              }
            } else if (eventToApply.type === 'goal') {
              if (eventTeamStr === 'home') {
                updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
                updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
              } else {
                updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
                updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
              }
            } else if (eventToApply.type === 'corner') {
              if (eventTeamStr === 'home') updatedStats.corners.home = (updatedStats.corners.home || 0) + 1;
              else updatedStats.corners.away = (updatedStats.corners.away || 0) + 1;
            } else if (eventToApply.type === 'yellowCard') {
              if (eventTeamStr === 'home') updatedStats.cards.home.yellow = (updatedStats.cards.home.yellow || 0) + 1;
              else updatedStats.cards.away.yellow = (updatedStats.cards.away.yellow || 0) + 1;
            } else if (eventToApply.type === 'redCard') {
              if (eventTeamStr === 'home') updatedStats.cards.home.red = (updatedStats.cards.home.red || 0) + 1;
              else updatedStats.cards.away.red = (updatedStats.cards.away.red || 0) + 1;
            }
            // ... other event types

            const totalEvents = newHomeEventsCount + newAwayEventsCount;
            if (totalEvents > 0) {
              updatedStats.possession.home = Math.round((newHomeEventsCount / totalEvents) * 100);
              updatedStats.possession.away = 100 - updatedStats.possession.home;
            } else {
              updatedStats.possession = { home: 50, away: 50 };
            }
        }

        return {
          ...prev,
          matchEvents: [...prev.matchEvents, eventToApply],
          statistics: updatedStats,
          ballPathHistory: updatedBallPathHistory,
          homeEventsCount: newHomeEventsCount,
          awayEventsCount: newAwayEventsCount,
        };
      };
      
      if (matchIdForCollaboration && collaborativeRecordEventFn && state.match?.id) {
        // Collaborative mode
        const clientId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const optimisticEvent: MatchEvent = {
          id: clientId, 
          matchId: state.match.id, // Use the actual match ID from state
          teamId: actualTeamId,
          playerId,
          type: eventType,
          timestamp: currentElapsedTime,
          coordinates,
          relatedPlayerId,
          user_id: authUser?.id, // TEST_NOTE: Manual DB check recommended: Verify 'user_id' is correctly populated in the 'match_events' table after events are logged.
          status: 'pending_confirmation',
          clientId: clientId,
          optimisticCreationTime: Date.now(),
        };

        console.log('[useMatchState] Optimistically applying event (collab):', optimisticEvent);
        console.log('Event Recorded with user_id:', JSON.stringify(optimisticEvent, null, 2));
        setState(prev => applyEventToState(prev, optimisticEvent));

        collaborativeRecordEventFn(
          eventType,
          playerId,
          actualTeamId,
          coordinates,
          currentElapsedTime,
          clientId, // Send clientId as the event's temporary ID
          relatedPlayerId
        );
      } else {
        // Local mode or no collaborative function
        const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const confirmedEvent: MatchEvent = {
          id: eventId,
          matchId: state.match?.id || 'temp-match', // Fallback if match not fully set up
          teamId: actualTeamId,
          playerId,
          type: eventType,
          timestamp: currentElapsedTime,
          coordinates,
          relatedPlayerId,
          user_id: authUser?.id, // TEST_NOTE: Manual DB check recommended: Verify 'user_id' is correctly populated in the 'match_events' table after events are logged.
          status: 'confirmed', 
        };
        
        console.log('[useMatchState] Applying event (local):', confirmedEvent);
        console.log('Event Recorded with user_id:', JSON.stringify(confirmedEvent, null, 2));
        setState(prev => applyEventToState(prev, confirmedEvent));
      }
    },
    [state.elapsedTime, state.homeTeam, state.awayTeam, state.match] // Dependencies
  );

  const recordPass = useCallback(
    (
      passer: Player,
      receiver: Player,
      passerTeamIdStr: 'home' | 'away',
      receiverTeamIdStr: 'home' | 'away', // Though receiver's team isn't strictly needed for the pass event itself
      passerCoords: { x: number; y: number },
      receiverCoords: { x: number; y: number },
      collaborativeRecordEventFn?: CollaborativeRecordEventFn,
      matchIdForCollaboration?: string
    ) => {
      recordEvent(
        'pass',
        passer.id,
        passerTeamIdStr, // Team of the player performing the action (passer)
        receiverCoords, // Coordinates where the pass is received (event location)
        collaborativeRecordEventFn,
        matchIdForCollaboration,
        receiver.id,    // relatedPlayerId is the receiver
        passerCoords    // passerCoordsForBallPath for BallPath start
      );
    },
    [recordEvent] // Only depends on the merged recordEvent
  );

  const processEventsForLocalState = useCallback((events: MatchEvent[]) => {
    setState(prev => {
      if (!prev.homeTeam || !prev.awayTeam) {
        console.error("Cannot process events: Home or Away team not set.");
        return prev;
      }

      // 1. Reset/Initialize relevant state
      const newStats = JSON.parse(JSON.stringify(initialMatchState.statistics)); // Deep copy
      const newBallPathHistory: BallPath[] = [];
      let currentHomeEventsCount = 0;
      let currentAwayEventsCount = 0;

      // 2. Process events to rebuild statistics and ballPathHistory
      events.forEach(event => {
        // Increment event counts
        if (event.teamId === prev.homeTeam!.id) {
          currentHomeEventsCount++;
        } else if (event.teamId === prev.awayTeam!.id) {
          currentAwayEventsCount++;
        }

        const teamIdStr = event.teamId === prev.homeTeam?.id ? 'home' : 
                          event.teamId === prev.awayTeam?.id ? 'away' : null;

        if (!teamIdStr) return; // Skip event if team cannot be determined

        // Update stats (similar logic to recordEvent, but applied to newStats)
        if (event.type === 'pass') {
          if (teamIdStr === 'home') {
            newStats.passes.home.attempted = (newStats.passes.home.attempted || 0) + 1;
            newStats.passes.home.successful = (newStats.passes.home.successful || 0) + 1; // Assuming all recorded passes are successful
            newStats.passes.home.total = (newStats.passes.home.total || 0) + 1;
          } else {
            newStats.passes.away.attempted = (newStats.passes.away.attempted || 0) + 1;
            newStats.passes.away.successful = (newStats.passes.away.successful || 0) + 1;
            newStats.passes.away.total = (newStats.passes.away.total || 0) + 1;
          }
          // Reconstruct BallPath if relatedPlayerId (receiver) exists
          if (event.relatedPlayerId && event.coordinates) { // Check for coordinates too
             const passerPlayer = prev.homeTeam?.players.find(p => p.id === event.playerId) || prev.awayTeam?.players.find(p => p.id === event.playerId);
             const receiverPlayer = prev.homeTeam?.players.find(p => p.id === event.relatedPlayerId) || prev.awayTeam?.players.find(p => p.id === event.relatedPlayerId);
             const receiverTeamId = receiverPlayer ? (prev.homeTeam?.players.some(p=>p.id === receiverPlayer.id) ? prev.homeTeam.id : prev.awayTeam?.id) : null;

             // Use event.meta.startCoordinates if available from server, otherwise approximate with teamPositions
             const startCoords = event.meta?.startCoordinates || prev.teamPositions[passerPlayer?.id || -1] || {x:0,y:0};

             if (passerPlayer && receiverPlayer && receiverTeamId) {
                newBallPathHistory.push({
                  id: `ballpath-evt-${event.id}`,
                  passer: { id: passerPlayer.id, teamId: event.teamId }, // event.teamId is passer's team
                  receiver: { id: receiverPlayer.id, teamId: receiverTeamId },
                  startCoordinates: startCoords, 
                  endCoordinates: event.coordinates,
                  eventType: 'pass',
                  timestamp: event.timestamp,
                  status: event.status === 'pending_confirmation' ? 'optimistic' : 'confirmed',
                  clientId: event.clientId,
                });
             }
          }
        } else if (event.type === 'shot') {
           if (teamIdStr === 'home') {
              newStats.shots.home.total = (newStats.shots.home.total || 0) + 1;
              if (event.meta?.onTarget) newStats.shots.home.onTarget = (newStats.shots.home.onTarget || 0) + 1;
              else newStats.shots.home.offTarget = (newStats.shots.home.offTarget || 0) + 1;
           } else {
              newStats.shots.away.total = (newStats.shots.away.total || 0) + 1;
              if (event.meta?.onTarget) newStats.shots.away.onTarget = (newStats.shots.away.onTarget || 0) + 1;
              else newStats.shots.away.offTarget = (newStats.shots.away.offTarget || 0) + 1;
           }
        } else if (event.type === 'goal') {
           if (teamIdStr === 'home') {
              newStats.shots.home.onTarget = (newStats.shots.home.onTarget || 0) + 1; // Goals are on target
              newStats.shots.home.total = (newStats.shots.home.total || 0) + 1;
           } else {
              newStats.shots.away.onTarget = (newStats.shots.away.onTarget || 0) + 1;
              newStats.shots.away.total = (newStats.shots.away.total || 0) + 1;
           }
        } else if (event.type === 'corner') {
           if (teamIdStr === 'home') newStats.corners.home = (newStats.corners.home || 0) + 1; else newStats.corners.away = (newStats.corners.away || 0) + 1;
        } else if (event.type === 'yellowCard') {
           if (teamIdStr === 'home') newStats.cards.home.yellow = (newStats.cards.home.yellow || 0) + 1; else newStats.cards.away.yellow = (newStats.cards.away.yellow || 0) + 1;
        } else if (event.type === 'redCard') {
           if (teamIdStr === 'home') newStats.cards.home.red = (newStats.cards.home.red || 0) + 1; else newStats.cards.away.red = (newStats.cards.away.red || 0) + 1;
        }
        // ... other event types and their stat updates
      });
      
      // Update possession from the processed events
      const totalProcEvents = currentHomeEventsCount + currentAwayEventsCount;
      if (totalProcEvents > 0) {
        newStats.possession.home = Math.round((currentHomeEventsCount / totalProcEvents) * 100);
        newStats.possession.away = 100 - newStats.possession.home;
      } else {
        newStats.possession = { home: 50, away: 50 }; // Default if no events
      }

      return {
        ...prev,
        matchEvents: events, // Set the new source of truth for events
        statistics: newStats,
        ballPathHistory: newBallPathHistory,
        homeEventsCount: currentHomeEventsCount,
        awayEventsCount: currentAwayEventsCount,
      };
    });
  }, []);

  const processSingleRemoteEvent = useCallback((newEvent: MatchEvent) => {
    setState(prev => {
      if (!prev.homeTeam || !prev.awayTeam) {
        console.warn("[processSingleRemoteEvent] Home or Away team not set. Skipping event processing.", newEvent);
        return prev;
      }

      // Check if the event already exists by ID or clientId (if it's a confirmation of an optimistic event)
      const existingEventIndex = prev.matchEvents.findIndex(event => event.id === newEvent.id || (event.clientId && event.clientId === newEvent.clientId));

      if (existingEventIndex !== -1) {
        console.log('[processSingleRemoteEvent] Received confirmation/update for existing event: ', newEvent.id);
        // Update the existing event, especially its status and potentially other server-authoritative data
        const updatedMatchEvents = [...prev.matchEvents];
        updatedMatchEvents[existingEventIndex] = { 
            ...updatedMatchEvents[existingEventIndex], // keep optimistic data if not overwritten
            ...newEvent, // server data takes precedence
            status: 'confirmed' // ensure status is confirmed
        }; 
        
        // Potentially re-calculate stats if newEvent significantly changes things,
        // or rely on a full `processEventsForLocalState` call if many such updates happen.
        // For a single event, a full recalc might be overkill.
        // For now, just update the event in the list. Full reconciliation might be better handled by `processEventsForLocalState`.
        return { ...prev, matchEvents: updatedMatchEvents };
      }

      // Event does not exist, process it as a genuinely new remote event by applying it
      console.log('[processSingleRemoteEvent] Processing new remote event by adding it:', newEvent);
      // Use the same logic as recordEvent's applyEventToState, but with the incoming newEvent
      // Need to ensure newEvent has `status: 'confirmed'` if not already set by server
      const eventToAdd = { ...newEvent, status: newEvent.status || 'confirmed' } as MatchEvent;
      
      // Re-use applyEventToState logic - this requires applyEventToState to be defined outside recordEvent or passed
      // For simplicity here, we replicate parts of the logic. A better refactor would make applyEventToState reusable.
      let updatedStats = JSON.parse(JSON.stringify(prev.statistics));
      let updatedBallPathHistory = [...prev.ballPathHistory];
      const updatedMatchEventsList = [...prev.matchEvents, eventToAdd];
      
      let newHomeEventsCount = prev.homeEventsCount;
      let newAwayEventsCount = prev.awayEventsCount;

      const teamIdStr = eventToAdd.teamId === prev.homeTeam.id ? 'home' : 
                        eventToAdd.teamId === prev.awayTeam.id ? 'away' : null;

      if (teamIdStr) {
        if (eventToAdd.teamId === prev.homeTeam.id) {
          newHomeEventsCount++;
        } else if (eventToAdd.teamId === prev.awayTeam.id) {
          newAwayEventsCount++;
        }

        if (eventToAdd.type === 'pass') {
          if (teamIdStr === 'home') {
            updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
            updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1;
            updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
          } else {
            updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
            updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1;
            updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
          }
          if (eventToAdd.relatedPlayerId && eventToAdd.coordinates) {
            const passerPlayer = prev.homeTeam?.players.find(p => p.id === eventToAdd.playerId) || prev.awayTeam?.players.find(p => p.id === eventToAdd.playerId);
            const receiverPlayer = prev.homeTeam?.players.find(p => p.id === eventToAdd.relatedPlayerId) || prev.awayTeam?.players.find(p => p.id === eventToAdd.relatedPlayerId);
            const receiverTeamId = receiverPlayer ? (prev.homeTeam?.players.some(p => p.id === receiverPlayer.id) ? prev.homeTeam.id : prev.awayTeam.id) : null;
            const startCoords = eventToAdd.meta?.startCoordinates || prev.teamPositions[passerPlayer?.id || -1] || {x:0,y:0};

            if (passerPlayer && receiverPlayer && receiverTeamId) {
              updatedBallPathHistory.push({
                id: `ballpath-evt-${eventToAdd.id}`,
                passer: { id: passerPlayer.id, teamId: eventToAdd.teamId },
                receiver: { id: receiverPlayer.id, teamId: receiverTeamId },
                startCoordinates: startCoords,
                endCoordinates: eventToAdd.coordinates,
                eventType: 'pass',
                timestamp: eventToAdd.timestamp,
                status: 'confirmed', // Remote events are confirmed
              });
            }
          }
        } // ... other event types similar to processEventsForLocalState / recordEvent ...
         else if (eventToAdd.type === 'shot') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
            if (eventToAdd.meta?.onTarget) updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            else updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
          } else {
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
            if (eventToAdd.meta?.onTarget) updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            else updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
          }
        } else if (eventToAdd.type === 'goal') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
          } else {
            updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
          }
        } // etc.
      }

      const totalEvents = newHomeEventsCount + newAwayEventsCount;
      if (totalEvents > 0) {
        updatedStats.possession.home = Math.round((newHomeEventsCount / totalEvents) * 100);
        updatedStats.possession.away = 100 - updatedStats.possession.home;
      } else {
        updatedStats.possession = { home: 50, away: 50 };
      }
      
      return {
        ...prev,
        matchEvents: updatedMatchEventsList,
        statistics: updatedStats,
        ballPathHistory: updatedBallPathHistory,
        homeEventsCount: newHomeEventsCount,
        awayEventsCount: newAwayEventsCount,
      };
    });
  }, []);

  const calculateTimeSegments = useCallback((): TimeSegmentStatistics[] => {
    // Basic implementation - can be expanded
    console.log("Calculating time segments (basic)...");
    if (!state.homeTeam || !state.awayTeam || state.ballTrackingPoints.length < 2) {
      return [];
    }
    // This is a placeholder. A real implementation would involve more complex logic.
    const segments: TimeSegmentStatistics[] = [];
    // Example: create one segment for the whole match for now
    const currentTime = state.elapsedTime; // Or derive from ballTrackingPoints timestamps
    const newSegment: TimeSegmentStatistics = {
      id: `segment-${Date.now()}`,
      timeSegment: `${Math.floor(currentTime / 60000)}:${Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')}`,
      possession: { home: 50, away: 50 },
      ballsPlayed: { home: 0, away: 0 },
      ballsGiven: { home: 0, away: 0 },
      ballsRecovered: { home: 0, away: 0 },
      recoveryTime: { home: 0, away: 0 },
      contacts: { home: 0, away: 0 },
      cumulativePossession: { home: 50, away: 50 },
      cumulativeBallsPlayed: { home: 0, away: 0 },
      cumulativeBallsGiven: { home: 0, away: 0 },
      cumulativeBallsRecovered: { home: 0, away: 0 },
      cumulativeRecoveryTime: { home: 0, away: 0 },
      cumulativeContacts: { home: 0, away: 0 },
      possessionDifference: { home: 0, away: 0 },
      ballsPlayedDifference: { home: 0, away: 0 },
      ballsGivenDifference: { home: 0, away: 0 },
      ballsRecoveredDifference: { home: 0, away: 0 }
    };
    segments.push(newSegment);
    return segments;
  }, [state.ballTrackingPoints, state.homeTeam, state.awayTeam, state.elapsedTime, state.statistics.possession]);

  const calculatePlayerStats = useCallback((): PlayerStatistics[] => {
    // Basic implementation - can be expanded
    console.log("Calculating player stats (basic)...");
    if (!state.homeTeam || !state.awayTeam) return [];

    const allPlayers = [...(state.homeTeam.players || []), ...(state.awayTeam.players || [])];
    const playerStats: PlayerStatistics[] = [];

    allPlayers.forEach(player => {
      const eventsForPlayer = state.matchEvents.filter(e => e.playerId === player.id);
      const passes = eventsForPlayer.filter(e => e.type === 'pass').length;
      const shots = eventsForPlayer.filter(e => e.type === 'shot').length;
      const goals = eventsForPlayer.filter(e => e.type === 'goal').length;
      
      playerStats.push({
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId || (state.homeTeam?.players.some(p => p.id === player.id) ? state.homeTeam.id : state.awayTeam?.id),
        team: player.team || (state.homeTeam?.players.some(p => p.id === player.id) ? state.homeTeam.name : state.awayTeam?.name),
        player: player,
        ballsPlayed: 0,
        ballsLost: 0,
        ballsRecovered: 0,
        passesCompleted: 0,
        passesAttempted: 0,
        possessionTime: 0,
        contacts: 0,
        lossRatio: 0,
        goals: 0,
        assists: 0,
        passes: 0,
        shots: 0,
        fouls: 0
      });
    });
    return playerStats;
  }, [state.matchEvents, state.homeTeam, state.awayTeam]);

  return {
    ...state,
    setMatch,
    setHomeTeam,
    setAwayTeam,
    setTeamPositions,
    setSelectedPlayer,
    setSelectedTeam,
    addMatchEvent,
    setMatchEvents,
    updateStatistics,
    addBallTrackingPoint,
    setBallTrackingPoints,
    undoLastAction,
    setTimeSegments,
    activeTab,
    setActiveTab,
    setStatistics,
    toggleTimer,
    resetTimer,
    completeSetup,
    updateTeams,
    setElapsedTime,
    toggleBallTrackingMode,
    addEvent,
    undoLastEvent,
    trackBallMovement,
    saveMatch,
    recordEvent,
    calculateTimeSegments,
    calculatePlayerStats,
    togglePassTrackingMode,
    setPotentialPasser,
    recordPass,
    processEventsForLocalState,
    setBallPathHistory,
    processSingleRemoteEvent
  };
};
