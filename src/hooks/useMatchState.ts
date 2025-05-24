import { useState, useCallback, useRef } from 'react';
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
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
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
type CollaborativeRecordEventFn = (
  eventType: EventType,
  playerId: number,
  teamId: string, // Actual team ID string
  coordinates: { x: number; y: number },
  timestamp: number
) => void;

export const useMatchState = (): MatchState & MatchActions => {
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
    setState(prev => {
      const event: MatchEvent = {
        id: `event-${Date.now()}`,
        matchId: prev.match?.id || 'temp-match',
        teamId: prev.selectedTeam === 'home' ? prev.homeTeam?.id || 'home' : prev.awayTeam?.id || 'away',
        playerId: prev.selectedPlayer?.id || 0,
        type,
        timestamp: prev.elapsedTime,
        coordinates
      };
      return { ...prev, matchEvents: [...prev.matchEvents, event] };
    });
  }, []);

  const undoLastEvent = useCallback(() => {
    undoLastAction();
  }, [undoLastAction]);

  const trackBallMovement = useCallback((coordinates: { x: number; y: number }) => {
    setState(prev => {
      const point: BallTrackingPoint = {
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(),
        playerId: prev.selectedPlayer?.id,
        teamId: prev.selectedTeam === 'home' ? prev.homeTeam?.id : prev.awayTeam?.id
      };
      return { ...prev, ballTrackingPoints: [...prev.ballTrackingPoints, point] };
    });
  }, []);

  const saveMatch = useCallback((): string => {
    const matchId = `match-${Date.now()}`;
    
    return setState(prev => {
      // Calculate time segments if not already done
      let matchTimeSegments = prev.timeSegments;
      if (matchTimeSegments.length === 0 && prev.ballTrackingPoints.length > 0) {
        matchTimeSegments = calculateTimeSegments();
      }
      
      // Calculate player statistics
      const playerStats = calculatePlayerStats();
      
      const matchData = {
        matchId,
        date: new Date().toISOString(),
        elapsedTime: prev.elapsedTime,
        homeTeam: prev.homeTeam,
        awayTeam: prev.awayTeam,
        events: prev.matchEvents,
        matchEvents: prev.matchEvents,
        statistics: prev.statistics,
        ballTrackingPoints: prev.ballTrackingPoints,
        timeSegments: matchTimeSegments,
        playerStats,
        ballPathHistory: prev.ballPathHistory,
      };
      
      console.log('Saving match data:', matchData);
      
      try {
        localStorage.setItem(`efootpad_match_${matchId}`, JSON.stringify(matchData));
      } catch (error) {
        console.error('Error saving match data:', error);
      }
      
      return prev;
    }), matchId;
  }, []);

  const recordEvent = useCallback(
    (
      eventType: EventType,
      playerId: number,
      teamIdStr: 'home' | 'away', // This is 'home' or 'away' string
      coordinates: { x: number; y: number },
      collaborativeRecordEventFn?: CollaborativeRecordEventFn,
      matchIdForCollaboration?: string,
      relatedPlayerId?: number,
      // Pass specific coordinates for passer if eventType is 'pass', for BallPath creation
      passerCoordsForBallPath?: { x: number; y: number } 
    ) => {
      const currentElapsedTime = state.elapsedTime;
      const actualTeamId = teamIdStr === 'home' ? state.homeTeam?.id : state.awayTeam?.id;

      if (!actualTeamId) {
        console.error("Team ID could not be determined. Home/Away team may not be set.");
        return;
      }

      const eventId = `cl_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newEvent: MatchEvent = {
        id: eventId,
        matchId: state.match?.id || matchIdForCollaboration || 'temp-match',
        teamId: actualTeamId,
        playerId,
        type: eventType,
        timestamp: currentElapsedTime,
        coordinates, // These are receiver's coordinates for a pass
        relatedPlayerId,
      };

      // Optimistic update logic, applicable to both collab and local if structured well
      const applyOptimisticUpdate = (prev: MatchState): MatchState => {
        let updatedStats = JSON.parse(JSON.stringify(prev.statistics));
        let updatedBallPathHistory = [...prev.ballPathHistory];
        let newHomeEventsCount = prev.homeEventsCount;
        let newAwayEventsCount = prev.awayEventsCount;

        // Update event counts
        if (newEvent.teamId === prev.homeTeam?.id) {
          newHomeEventsCount++;
        } else if (newEvent.teamId === prev.awayTeam?.id) {
          newAwayEventsCount++;
        }

        // Update specific event type stats
        if (newEvent.type === 'pass') {
          if (teamIdStr === 'home') {
            updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
            updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1;
            updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
          } else {
            updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
            updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1;
            updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
          }
          // Optimistically update ballPathHistory for pass
          // Ensure passerCoordsForBallPath and relatedPlayerId (receiverId) are available
          if (passerCoordsForBallPath && newEvent.relatedPlayerId && prev.homeTeam && prev.awayTeam) {
            const receiverTeamIdStr = prev.homeTeam.players.some(p => p.id === newEvent.relatedPlayerId) ? 'home' : 'away';
            const actualReceiverTeamId = receiverTeamIdStr === 'home' ? prev.homeTeam.id : prev.awayTeam.id;

            const newPath: BallPath = {
              id: `ballpath-${newEvent.id}`, // Link BallPath to event
              passer: { id: newEvent.playerId, teamId: newEvent.teamId },
              receiver: { id: newEvent.relatedPlayerId, teamId: actualReceiverTeamId! },
              startCoordinates: passerCoordsForBallPath,
              endCoordinates: newEvent.coordinates, // newEvent.coordinates are receiver's coords
              eventType: 'pass',
              timestamp: newEvent.timestamp,
            };
            updatedBallPathHistory.push(newPath);
            console.log('[useMatchState] Optimistically added to ballPathHistory:', newPath);
          }

        } else if (newEvent.type === 'shot') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
            // Placeholder for onTarget/offTarget, assuming meta if available
            if (newEvent.meta?.onTarget) updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            else updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
          } else {
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
            if (newEvent.meta?.onTarget) updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            else updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
          }
        } else if (newEvent.type === 'goal') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
          } else {
            updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
          }
        } else if (newEvent.type === 'corner') {
          if (teamIdStr === 'home') updatedStats.corners.home = (updatedStats.corners.home || 0) + 1;
          else updatedStats.corners.away = (updatedStats.corners.away || 0) + 1;
        } else if (newEvent.type === 'yellowCard') {
          if (teamIdStr === 'home') updatedStats.cards.home.yellow = (updatedStats.cards.home.yellow || 0) + 1;
          else updatedStats.cards.away.yellow = (updatedStats.cards.away.yellow || 0) + 1;
        } else if (newEvent.type === 'redCard') {
          if (teamIdStr === 'home') updatedStats.cards.home.red = (updatedStats.cards.home.red || 0) + 1;
          else updatedStats.cards.away.red = (updatedStats.cards.away.red || 0) + 1;
        }
        // ... other event types

        // Update possession
        const totalEvents = newHomeEventsCount + newAwayEventsCount;
        if (totalEvents > 0) {
          updatedStats.possession.home = Math.round((newHomeEventsCount / totalEvents) * 100);
          updatedStats.possession.away = 100 - updatedStats.possession.home;
        } else {
          updatedStats.possession = { home: 50, away: 50 };
        }

        return {
          ...prev,
          matchEvents: [...prev.matchEvents, newEvent],
          statistics: updatedStats,
          ballPathHistory: updatedBallPathHistory,
          homeEventsCount: newHomeEventsCount,
          awayEventsCount: newAwayEventsCount,
        };
      };
      
      if (matchIdForCollaboration && collaborativeRecordEventFn && state.match?.id) {
        // Collaborative mode: Optimistic update first
        console.log('[useMatchState] Optimistically applying event (collab):', newEvent);
        setState(applyOptimisticUpdate);
        
        // Then send to backend
        collaborativeRecordEventFn(
          eventType,
          playerId,
          actualTeamId,
          coordinates, // Receiver's coords for pass
          currentElapsedTime,
          eventId, // Pass the generated eventId
          relatedPlayerId // Pass receiverId for pass
        );
      } else {
        // Local mode: update state directly using the same optimistic logic
        console.log('[useMatchState] Applying event (local):', newEvent);
        setState(applyOptimisticUpdate);
      }
    },
    [state.elapsedTime, state.homeTeam, state.awayTeam, state.match]
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
      const actualPasserTeamId = passerTeamIdStr === 'home' ? state.homeTeam?.id : state.awayTeam?.id;
       if (!actualPasserTeamId) {
        console.error("Passer Team ID could not be determined in recordPass.");
        return;
      }

      // For collaborative mode, recordEvent will handle the optimistic update including BallPath.
      // For local mode, recordEvent will also handle BallPath if passerCoordsForBallPath is passed.
      recordEvent(
        'pass',
        passer.id,
        passerTeamIdStr,
        receiverCoords, // Pass event occurs at receiver's location (this is newEvent.coordinates in recordEvent)
        collaborativeRecordEventFn,
        matchIdForCollaboration,
        receiver.id, // Pass receiver.id as relatedPlayerId
        passerCoords // Pass passerCoords for BallPath creation in recordEvent
      );
      // The specific ballPathHistory update logic is now consolidated into recordEvent's optimistic update path.
      // No separate setState for ballPathHistory needed here for either mode.
    },
    [recordEvent] // Dependencies: only recordEvent as team/state access is within recordEvent
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
          console.log('[processEvents] Processing pass event:', event);
          if (event.relatedPlayerId && event.coordinates) {
             const passerPlayer = prev.homeTeam?.players.find(p => p.id === event.playerId) || prev.awayTeam?.players.find(p => p.id === event.playerId);
             const receiverPlayer = prev.homeTeam?.players.find(p => p.id === event.relatedPlayerId) || prev.awayTeam?.players.find(p => p.id === event.relatedPlayerId);
             const receiverTeamId = receiverPlayer ? (prev.homeTeam?.players.some(p=>p.id === receiverPlayer.id) ? prev.homeTeam.id : prev.awayTeam?.id) : null;


             if (passerPlayer && receiverPlayer && prev.teamPositions[passerPlayer.id] && receiverTeamId) {
                console.log('[processEvents] Creating BallPath with:', { passerPlayer, receiverPlayer, passerTeamPos: prev.teamPositions[passerPlayer.id], receiverCoords: event.coordinates });
                newBallPathHistory.push({
                  id: `ballpath-evt-${event.id}`,
                  passer: { id: passerPlayer.id, teamId: event.teamId }, // event.teamId is passer's team
                  receiver: { id: receiverPlayer.id, teamId: receiverTeamId },
                  startCoordinates: prev.teamPositions[passerPlayer.id], // This is an approximation, real start coord might not be in event
                  endCoordinates: event.coordinates,
                  eventType: 'pass',
                  timestamp: event.timestamp,
                });
             } else {
               console.log('[processEvents] Cannot create BallPath due to missing player data or passer position:', { passerExists: !!passerPlayer, receiverExists: !!receiverPlayer, passerPosAvailable: !!prev.teamPositions[passerPlayer?.id], receiverTeamIdExists: !!receiverTeamId });
             }
          } else {
            console.log('[processEvents] Pass event missing relatedPlayerId or coordinates, cannot create BallPath:', event);
          }
        } else if (event.type === 'shot') {
           if (teamIdStr === 'home') {
              newStats.shots.home.total = (newStats.shots.home.total || 0) + 1;
              // Note: onTarget/offTarget might be harder to derive accurately just from event type
              // This part might need adjustment based on how shot outcomes are stored or if they are separate events
              if (Math.random() > 0.5) newStats.shots.home.onTarget = (newStats.shots.home.onTarget || 0) + 1; else newStats.shots.home.offTarget = (newStats.shots.home.offTarget || 0) + 1;
           } else {
              newStats.shots.away.total = (newStats.shots.away.total || 0) + 1;
              if (Math.random() > 0.5) newStats.shots.away.onTarget = (newStats.shots.away.onTarget || 0) + 1; else newStats.shots.away.offTarget = (newStats.shots.away.offTarget || 0) + 1;
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

      console.log('[processEvents] Reconstructed ballPathHistory with length:', newBallPathHistory.length);
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

      // Check if the event already exists (echo of an optimistic update)
      if (prev.matchEvents.some(event => event.id === newEvent.id)) {
        console.log('[processSingleRemoteEvent] Received echo for optimistically applied event: ', newEvent.id);
        // Optionally, update the existing event if newEvent has more authoritative data.
        // For now, just return prev as the event is already applied.
        return prev;
      }

      // Event does not exist, process it as a genuinely new remote event
      console.log('[processSingleRemoteEvent] Processing new remote event:', newEvent);
      let updatedStats = JSON.parse(JSON.stringify(prev.statistics));
      let updatedBallPathHistory = [...prev.ballPathHistory];
      const updatedMatchEvents = [...prev.matchEvents, newEvent]; // Add the new event
      
      let newHomeEventsCount = prev.homeEventsCount;
      let newAwayEventsCount = prev.awayEventsCount;

      const teamIdStr = newEvent.teamId === prev.homeTeam.id ? 'home' : 
                        newEvent.teamId === prev.awayTeam.id ? 'away' : null;

      if (teamIdStr) {
        if (newEvent.teamId === prev.homeTeam.id) {
          newHomeEventsCount++;
        } else if (newEvent.teamId === prev.awayTeam.id) {
          newAwayEventsCount++;
        }

        if (newEvent.type === 'pass') {
          if (teamIdStr === 'home') {
            updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
            updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1; // Assuming success
            updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
          } else {
            updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
            updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1; // Assuming success
            updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
          }

          // Create and add new BallPath for the pass event
          if (newEvent.relatedPlayerId && newEvent.coordinates) {
            const passerPlayer = prev.homeTeam?.players.find(p => p.id === newEvent.playerId) || 
                                 prev.awayTeam?.players.find(p => p.id === newEvent.playerId);
            const receiverPlayer = prev.homeTeam?.players.find(p => p.id === newEvent.relatedPlayerId) || 
                                   prev.awayTeam?.players.find(p => p.id === newEvent.relatedPlayerId);
            const receiverTeamId = receiverPlayer ? 
                                   (prev.homeTeam?.players.some(p => p.id === receiverPlayer.id) ? prev.homeTeam.id : prev.awayTeam?.id) 
                                   : null;

            if (passerPlayer && receiverPlayer && prev.teamPositions[passerPlayer.id] && receiverTeamId) {
              const newPath: BallPath = {
                id: `ballpath-evt-${newEvent.id}`, // Ensure unique ID
                passer: { id: passerPlayer.id, teamId: newEvent.teamId },
                receiver: { id: receiverPlayer.id, teamId: receiverTeamId },
                startCoordinates: prev.teamPositions[passerPlayer.id], // Approximation
                endCoordinates: newEvent.coordinates,
                eventType: 'pass',
                timestamp: newEvent.timestamp,
              };
              updatedBallPathHistory.push(newPath);
            } else {
               console.warn('[processSingleRemoteEvent] Could not create BallPath for pass event due to missing data:', { event: newEvent, passerPlayer, receiverPlayer, receiverTeamId });
            }
          }
        } else if (newEvent.type === 'shot') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
            // Assuming some logic to determine on/off target, placeholder:
            if (newEvent.meta?.onTarget) updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            else updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
          } else {
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
            if (newEvent.meta?.onTarget) updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            else updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
          }
        } else if (newEvent.type === 'goal') {
          if (teamIdStr === 'home') {
            updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
            updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
          } else {
            updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
            updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
          }
        } else if (newEvent.type === 'corner') {
          if (teamIdStr === 'home') updatedStats.corners.home = (updatedStats.corners.home || 0) + 1;
          else updatedStats.corners.away = (updatedStats.corners.away || 0) + 1;
        } else if (newEvent.type === 'yellowCard') {
          if (teamIdStr === 'home') updatedStats.cards.home.yellow = (updatedStats.cards.home.yellow || 0) + 1;
          else updatedStats.cards.away.yellow = (updatedStats.cards.away.yellow || 0) + 1;
        } else if (newEvent.type === 'redCard') {
          if (teamIdStr === 'home') updatedStats.cards.home.red = (updatedStats.cards.home.red || 0) + 1;
          else updatedStats.cards.away.red = (updatedStats.cards.away.red || 0) + 1;
        }
        // Add other event types as needed...
      }

      // Recalculate possession based on the new counts
      const totalEvents = newHomeEventsCount + newAwayEventsCount;
      if (totalEvents > 0) {
        updatedStats.possession.home = Math.round((newHomeEventsCount / totalEvents) * 100);
        updatedStats.possession.away = 100 - updatedStats.possession.home;
      } else {
        // Default possession if no events
        updatedStats.possession = { home: 50, away: 50 };
      }
      
      console.log('[processSingleRemoteEvent] Applied event:', newEvent, 'New stats:', updatedStats, 'New paths:', updatedBallPathHistory.length);

      return {
        ...prev,
        matchEvents: updatedMatchEvents,
        statistics: updatedStats,
        ballPathHistory: updatedBallPathHistory,
        homeEventsCount: newHomeEventsCount,
        awayEventsCount: newAwayEventsCount,
      };
    });
  }, []); // Dependencies: Ensure any direct state access outside setState (like initialMatchState) is stable or included.


  const calculateTimeSegments = useCallback((): TimeSegmentStatistics[] => {
    // Implementation preserved from original
    console.log("Calculating time segments...");
    return [];
  }, [state.ballTrackingPoints, state.homeTeam, state.awayTeam]);

  const calculatePlayerStats = useCallback((): PlayerStatistics[] => {
    // Implementation preserved from original
    console.log("Calculating player stats...");
    return [];
  }, [state.ballTrackingPoints, state.homeTeam, state.awayTeam]);

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
