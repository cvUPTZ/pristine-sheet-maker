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
  
  // Add new function to calculate time segments
  calculateTimeSegments: () => TimeSegmentStatistics[];
  calculatePlayerStats: () => PlayerStatistics[];
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
    console.log("Setting new statistics:", newStats);
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
    // This is a simplified implementation that persists data to localStorage
    const matchId = `match-${Date.now()}`;
    
    // Calculate time segments if not already done
    let matchTimeSegments = state.timeSegments;
    if (matchTimeSegments.length === 0 && state.ballTrackingPoints.length > 0) {
      matchTimeSegments = calculateTimeSegments();
    }
    
    // Calculate player statistics
    const playerStats = calculatePlayerStats();
    
    const matchData = {
      matchId,
      date: new Date().toISOString(),
      elapsedTime: state.elapsedTime,
      homeTeam: state.homeTeam,
      awayTeam: state.awayTeam,
      events: state.matchEvents,
      statistics: state.statistics,
      ballTrackingPoints: state.ballTrackingPoints,
      timeSegments: matchTimeSegments,
      playerStats
    };
    
    console.log('Saving match data:', matchData);
    
    try {
      localStorage.setItem(`efootpad_match_${matchId}`, JSON.stringify(matchData));
      return matchId;
    } catch (error) {
      console.error('Error saving match data:', error);
      return matchId;
    }
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
  
  // Calculate time segments from ball tracking points
  const calculateTimeSegments = (): TimeSegmentStatistics[] => {
    const { ballTrackingPoints, homeTeam, awayTeam } = state;
    
    if (!ballTrackingPoints.length || !homeTeam || !awayTeam) {
      return [];
    }
    
    // Determine match duration from first to last tracking point
    const firstTimestamp = ballTrackingPoints[0].timestamp;
    const lastTimestamp = ballTrackingPoints[ballTrackingPoints.length - 1].timestamp;
    const totalDuration = lastTimestamp - firstTimestamp;
    
    // Create 5-minute segments
    const segmentDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    const numSegments = Math.ceil(totalDuration / segmentDuration);
    
    // Initialize segments
    const segments: TimeSegmentStatistics[] = [];
    
    for (let i = 0; i < numSegments; i++) {
      const startTime = firstTimestamp + (i * segmentDuration);
      const endTime = Math.min(startTime + segmentDuration, lastTimestamp);
      
      segments.push({
        id: `segment-${i}`,
        timeSegment: `${i*5}-${Math.min((i+1)*5, Math.ceil(totalDuration / (60 * 1000)))}`,
        possession: { home: 0, away: 0 },
        ballsPlayed: { home: 0, away: 0 },
        ballsGiven: { home: 0, away: 0 },
        ballsRecovered: { home: 0, away: 0 },
        recoveryTime: { home: 0, away: 0 },
        contacts: { home: 0, away: 0 },
        cumulativePossession: { home: 0, away: 0 },
        cumulativeBallsPlayed: { home: 0, away: 0 },
        cumulativeBallsGiven: { home: 0, away: 0 },
        cumulativeBallsRecovered: { home: 0, away: 0 },
        cumulativeRecoveryTime: { home: 0, away: 0 },
        cumulativeContacts: { home: 0, away: 0 },
        possessionDifference: { home: 0, away: 0 },
        ballsPlayedDifference: { home: 0, away: 0 },
        ballsGivenDifference: { home: 0, away: 0 },
        ballsRecoveredDifference: { home: 0, away: 0 }
      });
    }
    
    // Process ball tracking points to fill segment data
    let lastTeamId: string | undefined = undefined;
    let lastPlayerId: number | undefined = undefined;
    let lastTimestamp = firstTimestamp;
    
    // Track recovery times
    let ballLostTimestamp: Record<string, number> = { 
      [homeTeam.id]: 0,
      [awayTeam.id]: 0
    };
    
    // Cumulative trackers
    let cumulativeBallsPlayed = { home: 0, away: 0 };
    let cumulativeBallsGiven = { home: 0, away: 0 };
    let cumulativeBallsRecovered = { home: 0, away: 0 };
    let cumulativePossession = { home: 0, away: 0 };
    let cumulativeRecoveryTime = { home: 0, away: 0 };
    let cumulativeContacts = { home: 0, away: 0 };
    
    ballTrackingPoints.forEach((point, index) => {
      // Determine which segment this point belongs to
      const timeSinceStart = point.timestamp - firstTimestamp;
      const segmentIndex = Math.min(
        Math.floor(timeSinceStart / segmentDuration),
        segments.length - 1
      );
      
      // Skip if missing important data
      if (!point.teamId) return;
      
      const isHome = point.teamId === homeTeam.id;
      const team = isHome ? 'home' : 'away';
      
      // Count ball possession time
      if (index > 0) {
        const possessionDuration = point.timestamp - lastTimestamp;
        
        if (lastTeamId) {
          const lastTeam = lastTeamId === homeTeam.id ? 'home' : 'away';
          segments[segmentIndex].possession[lastTeam] += possessionDuration;
          cumulativePossession[lastTeam] += possessionDuration;
        }
      }
      
      // Count balls played
      if (point.playerId) {
        segments[segmentIndex].ballsPlayed[team] += 1;
        segments[segmentIndex].contacts[team] += 1;
        cumulativeBallsPlayed[team] += 1;
        cumulativeContacts[team] += 1;
        
        // Check for ball recovery
        if (lastTeamId && lastTeamId !== point.teamId) {
          segments[segmentIndex].ballsRecovered[team] += 1;
          cumulativeBallsRecovered[team] += 1;
          
          // Calculate recovery time if we have a ball lost timestamp
          if (ballLostTimestamp[point.teamId] > 0) {
            const recoveryTime = (point.timestamp - ballLostTimestamp[point.teamId]) / 1000; // in seconds
            segments[segmentIndex].recoveryTime[team] = 
              (segments[segmentIndex].ballsRecovered[team] === 1) ? 
                recoveryTime : 
                (segments[segmentIndex].recoveryTime[team] + recoveryTime) / 2;
            
            cumulativeRecoveryTime[team] += recoveryTime;
            // Reset ball lost timestamp
            ballLostTimestamp[point.teamId] = 0;
          }
        }
        
        // Check for ball lost/given
        if (lastTeamId && lastPlayerId && lastTeamId !== point.teamId) {
          const lastTeam = lastTeamId === homeTeam.id ? 'home' : 'away';
          segments[segmentIndex].ballsGiven[lastTeam] += 1;
          cumulativeBallsGiven[lastTeam] += 1;
          
          // Record when this team lost the ball
          ballLostTimestamp[lastTeamId] = lastTimestamp;
        }
      }
      
      lastTeamId = point.teamId;
      lastPlayerId = point.playerId;
      lastTimestamp = point.timestamp;
    });
    
    // Calculate cumulative and difference stats
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        // Add previous segment's cumulative stats
        segments[i].cumulativePossession.home = segments[i-1].cumulativePossession.home + segments[i].possession.home;
        segments[i].cumulativePossession.away = segments[i-1].cumulativePossession.away + segments[i].possession.away;
        segments[i].cumulativeBallsPlayed.home = segments[i-1].cumulativeBallsPlayed.home + segments[i].ballsPlayed.home;
        segments[i].cumulativeBallsPlayed.away = segments[i-1].cumulativeBallsPlayed.away + segments[i].ballsPlayed.away;
        segments[i].cumulativeBallsGiven.home = segments[i-1].cumulativeBallsGiven.home + segments[i].ballsGiven.home;
        segments[i].cumulativeBallsGiven.away = segments[i-1].cumulativeBallsGiven.away + segments[i].ballsGiven.away;
        segments[i].cumulativeBallsRecovered.home = segments[i-1].cumulativeBallsRecovered.home + segments[i].ballsRecovered.home;
        segments[i].cumulativeBallsRecovered.away = segments[i-1].cumulativeBallsRecovered.away + segments[i].ballsRecovered.away;
        segments[i].cumulativeRecoveryTime.home = segments[i-1].cumulativeRecoveryTime.home + segments[i].recoveryTime.home;
        segments[i].cumulativeRecoveryTime.away = segments[i-1].cumulativeRecoveryTime.away + segments[i].recoveryTime.away;
        segments[i].cumulativeContacts.home = segments[i-1].cumulativeContacts.home + segments[i].contacts.home;
        segments[i].cumulativeContacts.away = segments[i-1].cumulativeContacts.away + segments[i].contacts.away;
      } else {
        // First segment cumulative = segment values
        segments[i].cumulativePossession = {...segments[i].possession};
        segments[i].cumulativeBallsPlayed = {...segments[i].ballsPlayed};
        segments[i].cumulativeBallsGiven = {...segments[i].ballsGiven};
        segments[i].cumulativeBallsRecovered = {...segments[i].ballsRecovered};
        segments[i].cumulativeRecoveryTime = {...segments[i].recoveryTime};
        segments[i].cumulativeContacts = {...segments[i].contacts};
      }
      
      // Calculate difference stats
      segments[i].possessionDifference = {
        home: segments[i].possession.home - segments[i].possession.away,
        away: segments[i].possession.away - segments[i].possession.home
      };
      
      segments[i].ballsPlayedDifference = {
        home: segments[i].ballsPlayed.home - segments[i].ballsPlayed.away,
        away: segments[i].ballsPlayed.away - segments[i].ballsPlayed.home
      };
      
      segments[i].ballsGivenDifference = {
        home: segments[i].ballsGiven.home - segments[i].ballsGiven.away,
        away: segments[i].ballsGiven.away - segments[i].ballsGiven.home
      };
      
      segments[i].ballsRecoveredDifference = {
        home: segments[i].ballsRecovered.home - segments[i].ballsRecovered.away,
        away: segments[i].ballsRecovered.away - segments[i].ballsRecovered.home
      };
    }
    
    // Convert possession from milliseconds to percentages
    segments.forEach(segment => {
      const totalPossession = segment.possession.home + segment.possession.away;
      if (totalPossession > 0) {
        segment.possession.home = (segment.possession.home / totalPossession) * 100;
        segment.possession.away = (segment.possession.away / totalPossession) * 100;
      }
      
      const totalCumulativePossession = segment.cumulativePossession.home + segment.cumulativePossession.away;
      if (totalCumulativePossession > 0) {
        segment.cumulativePossession.home = (segment.cumulativePossession.home / totalCumulativePossession) * 100;
        segment.cumulativePossession.away = (segment.cumulativePossession.away / totalCumulativePossession) * 100;
      }
    });
    
    return segments;
  };

  // Calculate player statistics
  const calculatePlayerStats = (): PlayerStatistics[] => {
    const { ballTrackingPoints, homeTeam, awayTeam } = state;
    
    if (!ballTrackingPoints.length || !homeTeam || !awayTeam) {
      return [];
    }
    
    const playerStats: Record<number, PlayerStatistics> = {};
    
    // Initialize player stats
    const allPlayers = [...homeTeam.players, ...awayTeam.players];
    allPlayers.forEach(player => {
      const teamId = homeTeam.players.some(p => p.id === player.id) ? homeTeam.id : awayTeam.id;
      playerStats[player.id] = {
        playerId: player.id,
        playerName: player.name,
        teamId,
        ballsPlayed: 0,
        ballsLost: 0,
        ballsRecovered: 0,
        passesCompleted: 0,
        passesAttempted: 0,
        possessionTime: 0,
        contacts: 0,
        lossRatio: 0
      };
    });
    
    // Process ball tracking points
    let lastPlayerId: number | undefined;
    let lastTeamId: string | undefined;
    let lastTimestamp = ballTrackingPoints[0]?.timestamp || 0;
    
    ballTrackingPoints.forEach((point, index) => {
      if (!point.playerId || !point.teamId) return;
      
      const playerId = point.playerId;
      const stats = playerStats[playerId];
      
      if (!stats) return;
      
      // Count ball possession
      stats.contacts++;
      stats.ballsPlayed++;
      
      // Calculate possession time
      if (index > 0 && lastPlayerId === playerId) {
        const possessionDuration = (point.timestamp - lastTimestamp) / 1000; // in seconds
        stats.possessionTime += possessionDuration;
      }
      
      // Check for passes
      if (lastPlayerId && lastPlayerId !== playerId) {
        const lastPlayerStats = playerStats[lastPlayerId];
        if (lastPlayerStats) {
          lastPlayerStats.passesAttempted++;
          
          // If same team, it's a completed pass
          if (lastTeamId === point.teamId) {
            lastPlayerStats.passesCompleted++;
          } else {
            // Ball lost to other team
            lastPlayerStats.ballsLost++;
            
            // Ball recovered by this player
            stats.ballsRecovered++;
          }
        }
      }
      
      lastPlayerId = playerId;
      lastTeamId = point.teamId;
      lastTimestamp = point.timestamp;
    });
    
    // Calculate loss ratio
    Object.values(playerStats).forEach(stats => {
      if (stats.ballsPlayed > 0) {
        stats.lossRatio = (stats.ballsLost / stats.ballsPlayed) * 100;
      }
    });
    
    return Object.values(playerStats).filter(stats => stats.contacts > 0);
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
    recordEvent,
    calculateTimeSegments,
    calculatePlayerStats
  };
};
