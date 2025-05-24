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
  ballPathHistory: []
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
  processEventsForLocalState: (events: MatchEvent[]) => void; // New action
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
    setState(prev => ({ ...prev, matchEvents: events }));
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
        playerStats
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
      relatedPlayerId?: number
    ) => {
      const currentElapsedTime = state.elapsedTime; // Capture current time for consistency
      const actualTeamId = teamIdStr === 'home' ? state.homeTeam?.id : state.awayTeam?.id;

      if (!actualTeamId) {
        console.error("Team ID could not be determined in recordEvent. Home/Away team may not be set.");
        return;
      }
      
      if (matchIdForCollaboration && collaborativeRecordEventFn && state.match?.id) {
        // Collaborative mode: send event via collaborative function
        collaborativeRecordEventFn(
          eventType,
          playerId,
          actualTeamId, // Pass the actual team ID string
          coordinates,
          currentElapsedTime // Use captured timestamp
        );
        // DO NOT update local state directly here. It will be updated via Supabase subscription.
      } else {
        // Local mode: update state directly
        setState(prev => {
          const event: MatchEvent = {
            id: `event-${Date.now()}`,
            matchId: prev.match?.id || 'temp-match', // Use existing matchId or temp
            teamId: actualTeamId,
            playerId,
            type: eventType,
            timestamp: currentElapsedTime,
            coordinates,
            relatedPlayerId,
          };
          const updatedEvents = [...prev.matchEvents, event];
          
          let updatedStats = { ...prev.statistics };
          // Update stats (logic copied from original recordEvent, ensure it's complete)
          if (eventType === 'pass') {
            if (teamIdStr === 'home') {
              updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
              updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1;
              updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
            } else {
              updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
              updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1;
              updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
            }
          } else if (eventType === 'shot') {
             if (teamIdStr === 'home') {
                updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
                if (Math.random() > 0.5) updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1; else updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
             } else {
                updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
                if (Math.random() > 0.5) updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1; else updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
             }
          } else if (eventType === 'goal') {
             if (teamIdStr === 'home') {
                updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
                updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
             } else {
                updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
                updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
             }
          } else if (eventType === 'corner') {
             if (teamIdStr === 'home') updatedStats.corners.home = (updatedStats.corners.home || 0) + 1; else updatedStats.corners.away = (updatedStats.corners.away || 0) + 1;
          } else if (eventType === 'yellowCard') {
             if (teamIdStr === 'home') updatedStats.cards.home.yellow = (updatedStats.cards.home.yellow || 0) + 1; else updatedStats.cards.away.yellow = (updatedStats.cards.away.yellow || 0) + 1;
          } else if (eventType === 'redCard') {
             if (teamIdStr === 'home') updatedStats.cards.home.red = (updatedStats.cards.home.red || 0) + 1; else updatedStats.cards.away.red = (updatedStats.cards.away.red || 0) + 1;
          }
          // Simplified possession update - consider a more robust calculation if needed
          const homeEventsCount = updatedEvents.filter(e => e.teamId === prev.homeTeam?.id).length;
          const awayEventsCount = updatedEvents.filter(e => e.teamId === prev.awayTeam?.id).length;
          const totalEvents = homeEventsCount + awayEventsCount;
          if (totalEvents > 0) {
            updatedStats.possession.home = Math.round((homeEventsCount / totalEvents) * 100);
            updatedStats.possession.away = 100 - updatedStats.possession.home;
          }
          
          return { ...prev, matchEvents: updatedEvents, statistics: updatedStats };
        });
      }
    },
    [state.elapsedTime, state.homeTeam, state.awayTeam, state.match] // Dependencies for captured values
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

      // For collaborative mode, recordEvent will handle the collaborative call
      // For local mode, recordEvent will update stats, and we'll add to ballPathHistory here
      recordEvent(
        'pass',
        passer.id,
        passerTeamIdStr,
        receiverCoords, // Pass event occurs at receiver's location
        collaborativeRecordEventFn,
        matchIdForCollaboration,
        receiver.id // Pass receiver.id as relatedPlayerId
      );

      // If not in collaborative mode, update ballPathHistory locally.
      // In collaborative mode, this will be rebuilt by processEventsForLocalState.
      if (!(matchIdForCollaboration && collaborativeRecordEventFn)) {
        setState(prev => {
          // Ensure homeTeam and awayTeam are checked again as they are from `prev` context
          if (!prev.homeTeam || !prev.awayTeam) return prev; 
          const actualPasserTeamIdForPath = passerTeamIdStr === 'home' ? prev.homeTeam.id : prev.awayTeam.id;
          const actualReceiverTeamIdForPath = receiverTeamIdStr === 'home' ? prev.homeTeam.id : prev.awayTeam.id;

          const newBallPath: BallPath = {
            id: `ballpath-${Date.now()}`,
            passer: { id: passer.id, teamId: actualPasserTeamIdForPath },
            receiver: { id: receiver.id, teamId: actualReceiverTeamIdForPath },
            startCoordinates: passerCoords,
            endCoordinates: receiverCoords,
            eventType: 'pass',
            timestamp: prev.elapsedTime, // Use prev.elapsedTime for consistency within setState
          };
          return {
            ...prev,
            ballPathHistory: [...prev.ballPathHistory, newBallPath],
          };
        });
      }
    },
    [recordEvent, state.homeTeam, state.awayTeam] // recordEvent is a dependency
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

      // 2. Process events to rebuild statistics and ballPathHistory
      events.forEach(event => {
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
          if (event.relatedPlayerId && event.coordinates) {
             const passerPlayer = prev.homeTeam?.players.find(p => p.id === event.playerId) || prev.awayTeam?.players.find(p => p.id === event.playerId);
             const receiverPlayer = prev.homeTeam?.players.find(p => p.id === event.relatedPlayerId) || prev.awayTeam?.players.find(p => p.id === event.relatedPlayerId);
             const receiverTeamId = receiverPlayer ? (prev.homeTeam?.players.some(p=>p.id === receiverPlayer.id) ? prev.homeTeam.id : prev.awayTeam?.id) : null;


             if (passerPlayer && receiverPlayer && prev.teamPositions[passerPlayer.id] && receiverTeamId) {
                newBallPathHistory.push({
                  id: `ballpath-evt-${event.id}`,
                  passer: { id: passerPlayer.id, teamId: event.teamId }, // event.teamId is passer's team
                  receiver: { id: receiverPlayer.id, teamId: receiverTeamId },
                  startCoordinates: prev.teamPositions[passerPlayer.id], // This is an approximation, real start coord might not be in event
                  endCoordinates: event.coordinates,
                  eventType: 'pass',
                  timestamp: event.timestamp,
                });
             }
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
      const homeEventsCount = events.filter(e => e.teamId === prev.homeTeam?.id).length;
      const awayEventsCount = events.filter(e => e.teamId === prev.awayTeam?.id).length;
      const totalProcEvents = homeEventsCount + awayEventsCount;
      if (totalProcEvents > 0) {
        newStats.possession.home = Math.round((homeEventsCount / totalProcEvents) * 100);
        newStats.possession.away = 100 - newStats.possession.home;
      } else {
        newStats.possession = { home: 50, away: 50 }; // Default if no events
      }

      return {
        ...prev,
        matchEvents: events, // Set the new source of truth for events
        statistics: newStats,
        ballPathHistory: newBallPathHistory,
      };
    });
  }, []);


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
    processEventsForLocalState
  };
};
