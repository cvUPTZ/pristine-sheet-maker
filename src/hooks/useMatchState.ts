
import { useState } from 'react';
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
    shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
    passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
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
  updateStatistics: (stats: Partial<Statistics>) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  undoLastAction: () => void;
  setTimeSegments: (timeSegments: TimeSegmentStatistics[]) => void;
  activeTab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video') => void;
  setStatistics: (stats: Statistics) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  completeSetup: (homeTeam: Team, awayTeam: Team) => void;
  updateTeams: (homeTeam: Team, awayTeam: Team) => void;
  setElapsedTime: (time: number) => void;
  toggleBallTrackingMode: () => void;
  addEvent: (type: EventType, coordinates: { x: number; y: number }) => void;
  undoLastEvent: () => void;
  trackBallMovement: (coordinates: { x: number; y: number }) => void;
  saveMatch: () => string;
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
}

export const useMatchState = (): MatchState & MatchActions => {
  const [state, setState] = useState<MatchState>(initialMatchState);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>('pitch');

  const setMatch = (match: Match) => {
    setState(prev => ({ ...prev, match }));
  };

  const setHomeTeam = (team: Team) => {
    setState(prev => ({ ...prev, homeTeam: team }));
  };

  const setAwayTeam = (team: Team) => {
    setState(prev => ({ ...prev, awayTeam: team }));
  };

  const setTeamPositions = (positions: Record<number, { x: number; y: number }>) => {
    setState(prev => ({ ...prev, teamPositions: positions }));
  };

  const setSelectedPlayer = (player: Player | null) => {
    setState(prev => ({ ...prev, selectedPlayer: player }));
  };

  const setSelectedTeam = (team: 'home' | 'away') => {
    setState(prev => ({ ...prev, selectedTeam: team }));
  };

  const addMatchEvent = (event: MatchEvent) => {
    setState(prev => ({ ...prev, matchEvents: [...prev.matchEvents, event] }));
  };

  const updateStatistics = (stats: Partial<Statistics>) => {
    setState(prev => ({
      ...prev,
      statistics: { ...prev.statistics, ...stats }
    }));
  };

  const addBallTrackingPoint = (point: BallTrackingPoint) => {
    setState(prev => ({ ...prev, ballTrackingPoints: [...prev.ballTrackingPoints, point] }));
  };

  const undoLastAction = () => {
    setState(prev => ({
      ...prev,
      matchEvents: prev.matchEvents.slice(0, -1),
      ballTrackingPoints: prev.ballTrackingPoints.slice(0, -1),
    }));
  };

  const setTimeSegments = (timeSegments: TimeSegmentStatistics[]) => {
    setState(prev => ({ ...prev, timeSegments }));
  };
  
  // Add a setter function for statistics
  const setStatistics = (newStats: Statistics) => {
    setState(prev => ({
      ...prev,
      statistics: newStats
    }));
  };

  // Add new functions to match those used in Index.tsx
  const toggleTimer = () => {
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetTimer = () => {
    setState(prev => ({ ...prev, elapsedTime: 0 }));
  };

  const completeSetup = (homeTeam: Team, awayTeam: Team) => {
    setState(prev => ({ 
      ...prev, 
      homeTeam, 
      awayTeam, 
      setupComplete: true 
    }));
  };

  const updateTeams = (homeTeam: Team, awayTeam: Team) => {
    setState(prev => ({ ...prev, homeTeam, awayTeam }));
  };

  const setElapsedTime = (time: number) => {
    setState(prev => ({ ...prev, elapsedTime: time }));
  };

  const toggleBallTrackingMode = () => {
    setState(prev => ({ ...prev, ballTrackingMode: !prev.ballTrackingMode }));
  };

  const addEvent = (type: EventType, coordinates: { x: number; y: number }) => {
    // This is a simplified implementation
    const event: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: state.match?.id || 'temp-match',
      teamId: state.selectedTeam === 'home' ? state.homeTeam?.id || 'home' : state.awayTeam?.id || 'away',
      playerId: state.selectedPlayer?.id || 0,
      type,
      timestamp: state.elapsedTime,
      coordinates
    };
    addMatchEvent(event);
  };

  const undoLastEvent = () => {
    undoLastAction();
  };

  const trackBallMovement = (coordinates: { x: number; y: number }) => {
    const point: BallTrackingPoint = {
      x: coordinates.x,
      y: coordinates.y,
      timestamp: Date.now(),
      playerId: state.selectedPlayer?.id,
      teamId: state.selectedTeam === 'home' ? state.homeTeam?.id : state.awayTeam?.id
    };
    addBallTrackingPoint(point);
  };

  const saveMatch = (): string => {
    // This is a simplified implementation that would normally persist data
    console.log('Saving match data:', state);
    return `match-${Date.now()}`;
  };

  const recordEvent = (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    const event: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: state.match?.id || 'temp-match',
      teamId: teamId === 'home' ? state.homeTeam?.id || 'home' : state.awayTeam?.id || 'away',
      playerId,
      type: eventType,
      timestamp: state.elapsedTime,
      coordinates
    };
    addMatchEvent(event);
  };

  return {
    ...state,
    setMatch,
    setHomeTeam,
    setAwayTeam,
    setTeamPositions,
    setSelectedPlayer,
    setSelectedTeam,
    addMatchEvent,
    updateStatistics,
    addBallTrackingPoint,
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
    recordEvent
  };
};
