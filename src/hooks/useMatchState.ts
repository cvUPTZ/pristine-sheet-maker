
import { useState, useCallback, useEffect } from 'react';
import { MatchEvent, Player, Team, Statistics, BallTrackingPoint, TimeSegmentStatistics, PlayerStatistics, EventType } from '@/types';

export interface BallPath {
  id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  playerId: number;
  teamId: string;
  timestamp: number;
  eventType: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface MatchState {
  events: MatchEvent[];
  statistics: Statistics;
  timeSegments: TimeSegmentStatistics[];
  playerStats: PlayerStatistics[];
  ballTrackingPoints: BallTrackingPoint[];
}

const initialMatchState: MatchState = {
  events: [],
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
  timeSegments: [],
  playerStats: [],
  ballTrackingPoints: [],
};

export const useMatchState = () => {
  const [events, setEvents] = useState<MatchEvent[]>(initialMatchState.events);
  const [statistics, setStatistics] = useState<Statistics>(initialMatchState.statistics);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>(initialMatchState.timeSegments);
  const [playerStats, setPlayerStats] = useState<PlayerStatistics[]>(initialMatchState.playerStats);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>(initialMatchState.ballTrackingPoints);
  const [homeTeam, setHomeTeam] = useState<Team>({ id: 'home', name: 'Home Team', players: [], formation: '4-4-2' });
  const [awayTeam, setAwayTeam] = useState<Team>({ id: 'away', name: 'Away Team', players: [], formation: '4-4-2' });
  
  // UI State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [ballTrackingMode, setBallTrackingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>('pitch');
  const [teamPositions, setTeamPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [match, setMatch] = useState<any>(null);
  const [isPassTrackingModeActive, setIsPassTrackingModeActive] = useState(false);
  const [potentialPasser, setPotentialPasser] = useState<Player | null>(null);
  const [ballPathHistory, setBallPathHistory] = useState<BallPath[]>([]);

  const addEvent = (event: MatchEvent) => {
    setEvents((prevEvents) => [...prevEvents, event]);
    setMatchEvents((prevEvents) => [...prevEvents, event]);
  };

  const confirmEvent = (clientId: string) => {
    setEvents(prev => 
      prev.map(event => 
        event.clientId === clientId 
          ? { ...event, status: 'confirmed' as const }
          : event
      )
    );
  };

  const updateEvent = (update: { id: string; clientId: string; status: 'confirmed' | 'failed' }) => {
    setEvents(prev => 
      prev.map(event => 
        event.clientId === update.clientId 
          ? { ...event, id: update.id, status: update.status }
          : event
      )
    );
  };

  const updateStatistics = (newStatistics: Partial<Statistics>) => {
    setStatistics((prevStatistics) => ({
      ...prevStatistics,
      ...newStatistics,
    }));
  };

  const addBallTrackingPoint = (point: BallTrackingPoint) => {
    setBallTrackingPoints((prevPoints) => [...prevPoints, point]);
  };

  const setTeams = (home: Team, away: Team) => {
    setHomeTeam(home);
    setAwayTeam(away);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setElapsedTime(0);
  };

  const undoLastEvent = () => {
    setEvents(prev => prev.slice(0, -1));
    setMatchEvents(prev => prev.slice(0, -1));
  };

  const updateTeams = (home: Team, away: Team) => {
    setHomeTeam(home);
    setAwayTeam(away);
  };

  const completeSetup = (home: Team, away: Team) => {
    setHomeTeam(home);
    setAwayTeam(away);
    setSetupComplete(true);
  };

  const toggleBallTrackingMode = () => {
    setBallTrackingMode(!ballTrackingMode);
  };

  const trackBallMovement = (coordinates: { x: number; y: number }) => {
    addBallTrackingPoint({
      x: coordinates.x,
      y: coordinates.y,
      timestamp: Date.now()
    });
  };

  const saveMatch = () => {
    const matchId = `match-${Date.now()}`;
    return matchId;
  };

  const recordEvent = useCallback((
    eventType: EventType,
    playerId: number,
    teamId: 'home' | 'away',
    coordinates: { x: number; y: number }
  ) => {
    const newEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: 'current-match',
      teamId,
      playerId,
      type: eventType,
      timestamp: Date.now(),
      coordinates,
      status: 'confirmed'
    };

    addEvent(newEvent);
  }, [addEvent]);

  const recordPass = useCallback((
    passer: Player,
    receiver: Player,
    passerTeamIdStr: 'home' | 'away',
    receiverTeamIdStr: 'home' | 'away',
    passerCoords: { x: number; y: number },
    receiverCoords: { x: number; y: number }
  ) => {
    const passEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: 'current-match',
      teamId: passerTeamIdStr,
      playerId: passer.id,
      type: 'pass',
      timestamp: Date.now(),
      coordinates: passerCoords,
      status: 'confirmed',
      relatedPlayerId: receiver.id
    };

    addEvent(passEvent);
  }, [addEvent]);

  const processEventsForLocalState = (events: MatchEvent[]) => {
    setEvents(events);
    setMatchEvents(events);
  };

  const togglePassTrackingMode = () => {
    setIsPassTrackingModeActive(!isPassTrackingModeActive);
  };

  const calculatePossession = () => {
    const homeEvents = events.filter((event) => event.teamId === homeTeam.id);
    const awayEvents = events.filter((event) => event.teamId === awayTeam.id);

    const totalEvents = events.length;
    const homePossession = totalEvents > 0 ? (homeEvents.length / totalEvents) * 100 : 50;
    const awayPossession = totalEvents > 0 ? (awayEvents.length / totalEvents) * 100 : 50;

    setStatistics((prev) => ({
      ...prev,
      possession: {
        home: homePossession,
        away: awayPossession,
      },
    }));
  };

  useEffect(() => {
    calculatePossession();
  }, [events, homeTeam.id, awayTeam.id]);

  const generateTimeSegmentStatistics = (): TimeSegmentStatistics[] => {
    const segmentLength = 5; // minutes
    const matchDuration = 90; // minutes
    const numberOfSegments = matchDuration / segmentLength;
  
    const segments = Array.from({ length: numberOfSegments }, (_, i) => ({
      start: i * segmentLength,
      end: (i + 1) * segmentLength,
    }));
  
    return segments.map((segment, index) => ({
      id: `segment-${index}`,
      timeSegment: `${segment.start}-${segment.end}min`,
      possession: {
        home: 50,
        away: 50,
      },
      ballsPlayed: {
        home: 0,
        away: 0,
      },
      ballsGiven: {
        home: 0,
        away: 0,
      },
      ballsRecovered: {
        home: 0,
        away: 0,
      },
      recoveryTime: {
        home: 0,
        away: 0,
      },
      contacts: {
        home: 0,
        away: 0,
      },
      cumulativePossession: {
        home: 50,
        away: 50,
      },
      cumulativeBallsPlayed: {
        home: 0,
        away: 0,
      },
      cumulativeBallsGiven: {
        home: 0,
        away: 0,
      },
      cumulativeBallsRecovered: {
        home: 0,
        away: 0,
      },
      cumulativeRecoveryTime: {
        home: 0,
        away: 0,
      },
      cumulativeContacts: {
        home: 0,
        away: 0,
      },
      possessionDifference: {
        home: 0,
        away: 0,
      },
      ballsPlayedDifference: {
        home: 0,
        away: 0,
      },
      ballsGivenDifference: {
        home: 0,
        away: 0,
      },
      ballsRecoveredDifference: {
        home: 0,
        away: 0,
      },
    }));
  };

  const calculateTimeSegments = () => {
    return generateTimeSegmentStatistics();
  };

  const generatePlayerStatistics = (): PlayerStatistics[] => {
    const playerStats: PlayerStatistics[] = [];
    
    const allPlayers: Player[] = [...homeTeam.players, ...awayTeam.players];
    
    allPlayers.forEach(player => {
      const playerEvents = events.filter(event => event.playerId === player.id);
      const ballsPlayed = playerEvents.length;
      const ballsLost = playerEvents.filter(event => event.type === 'foul').length;
      const ballsRecovered = playerEvents.filter(event => event.type === 'tackle').length;
      const passesCompleted = playerEvents.filter(event => event.type === 'pass').length;
      const passesAttempted = passesCompleted + ballsLost;
      const possessionTime = ballsPlayed * 2;
      const contacts = ballsPlayed + ballsLost + ballsRecovered;
      const lossRatio = ballsPlayed > 0 ? ballsLost / ballsPlayed : 0;
      const goals = playerEvents.filter(event => event.type === 'goal').length;
      const assists = playerEvents.filter(event => event.type === 'assist').length;
      const passes = playerEvents.filter(event => event.type === 'pass').length;
      const shots = playerEvents.filter(event => event.type === 'shot').length;
      const fouls = playerEvents.filter(event => event.type === 'foul').length;
      
      playerStats.push({
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId || (homeTeam.players.includes(player) ? homeTeam.id : awayTeam.id),
        team: homeTeam.players.includes(player) ? homeTeam.name : awayTeam.name,
        player: player,
        ballsPlayed: ballsPlayed,
        ballsLost: ballsLost,
        ballsRecovered: ballsRecovered,
        passesCompleted: passesCompleted,
        passesAttempted: passesAttempted,
        possessionTime: possessionTime,
        contacts: contacts,
        lossRatio: lossRatio,
        goals: goals,
        assists: assists,
        passes: passes,
        shots: shots,
        fouls: fouls,
      });
    });

    return playerStats;
  };

  return {
    events,
    statistics,
    timeSegments,
    playerStats,
    ballTrackingPoints,
    homeTeam,
    awayTeam,
    isRunning,
    elapsedTime,
    selectedTeam,
    selectedPlayer,
    setupComplete,
    ballTrackingMode,
    activeTab,
    teamPositions,
    matchEvents,
    match,
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    setActiveTab,
    setSelectedTeam,
    setSelectedPlayer,
    toggleTimer,
    resetTimer,
    addEvent,
    undoLastEvent,
    updateTeams,
    completeSetup,
    setElapsedTime,
    toggleBallTrackingMode,
    addBallTrackingPoint,
    trackBallMovement,
    saveMatch,
    recordEvent,
    recordPass,
    setStatistics,
    updateStatistics,
    setTeams,
    confirmEvent,
    updateEvent,
    generateTimeSegmentStatistics,
    generatePlayerStatistics,
    calculateTimeSegments,
    setTimeSegments,
    setBallTrackingPoints,
    setMatchEvents,
    setMatch,
    setHomeTeam,
    setAwayTeam,
    processEventsForLocalState,
    togglePassTrackingMode,
    setPotentialPasser,
    setBallPathHistory,
    setTeamPositions,
  };
};
