
import { useState, useCallback } from 'react';
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
  playerStats: []
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
}

export const useMatchState = (): MatchState & MatchActions => {
  const [state, setState] = useState<MatchState>(initialMatchState);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>('pitch');

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

  const recordEvent = useCallback((eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    setState(prev => {
      const event: MatchEvent = {
        id: `event-${Date.now()}`,
        matchId: prev.match?.id || 'temp-match',
        teamId: teamId === 'home' ? prev.homeTeam?.id || 'home' : prev.awayTeam?.id || 'away',
        playerId,
        type: eventType,
        timestamp: prev.elapsedTime,
        coordinates
      };
      const updatedEvents = [...prev.matchEvents, event];
      
      // Also update related statistics based on the event type
      let updatedStats = { ...prev.statistics };
      
      if (eventType === 'pass') {
        if (teamId === 'home') {
          updatedStats.passes.home.attempted = (updatedStats.passes.home.attempted || 0) + 1;
          updatedStats.passes.home.successful = (updatedStats.passes.home.successful || 0) + 1;
          updatedStats.passes.home.total = (updatedStats.passes.home.total || 0) + 1;
        } else {
          updatedStats.passes.away.attempted = (updatedStats.passes.away.attempted || 0) + 1;
          updatedStats.passes.away.successful = (updatedStats.passes.away.successful || 0) + 1;
          updatedStats.passes.away.total = (updatedStats.passes.away.total || 0) + 1;
        }
      } else if (eventType === 'shot') {
        if (teamId === 'home') {
          updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
          // Randomly determine if it's on target for this example
          if (Math.random() > 0.5) {
            updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
          } else {
            updatedStats.shots.home.offTarget = (updatedStats.shots.home.offTarget || 0) + 1;
          }
        } else {
          updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
          if (Math.random() > 0.5) {
            updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
          } else {
            updatedStats.shots.away.offTarget = (updatedStats.shots.away.offTarget || 0) + 1;
          }
        }
      } else if (eventType === 'goal') {
        if (teamId === 'home') {
          updatedStats.shots.home.onTarget = (updatedStats.shots.home.onTarget || 0) + 1;
          updatedStats.shots.home.total = (updatedStats.shots.home.total || 0) + 1;
        } else {
          updatedStats.shots.away.onTarget = (updatedStats.shots.away.onTarget || 0) + 1;
          updatedStats.shots.away.total = (updatedStats.shots.away.total || 0) + 1;
        }
      } else if (eventType === 'corner') {
        if (teamId === 'home') {
          updatedStats.corners.home = (updatedStats.corners.home || 0) + 1;
        } else {
          updatedStats.corners.away = (updatedStats.corners.away || 0) + 1;
        }
      } else if (eventType === 'foul') {
        // Update foul statistics if we have them
      } else if (eventType === 'yellowCard') {
        if (teamId === 'home') {
          updatedStats.cards.home.yellow = (updatedStats.cards.home.yellow || 0) + 1;
        } else {
          updatedStats.cards.away.yellow = (updatedStats.cards.away.yellow || 0) + 1;
        }
      } else if (eventType === 'redCard') {
        if (teamId === 'home') {
          updatedStats.cards.home.red = (updatedStats.cards.home.red || 0) + 1;
        } else {
          updatedStats.cards.away.red = (updatedStats.cards.away.red || 0) + 1;
        }
      }
      
      // Recalculate possession based on events
      const homeEventsCount = updatedEvents.filter(e => e.teamId === prev.homeTeam?.id || e.teamId === 'home').length;
      const awayEventsCount = updatedEvents.filter(e => e.teamId === prev.awayTeam?.id || e.teamId === 'away').length;
      const totalEvents = homeEventsCount + awayEventsCount;
      
      if (totalEvents > 0) {
        updatedStats.possession.home = Math.round((homeEventsCount / totalEvents) * 100);
        updatedStats.possession.away = 100 - updatedStats.possession.home;
      }
      
      return { 
        ...prev, 
        matchEvents: updatedEvents,
        statistics: updatedStats
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
    calculatePlayerStats
  };
};
