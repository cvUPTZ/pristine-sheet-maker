
import { useState, useEffect } from 'react';
import { MatchEvent, Statistics, TimeSegmentStatistics, PlayerStatistics, Player, Team } from '@/types';

interface MatchState {
  events: MatchEvent[];
  statistics: Statistics;
  timeSegments: TimeSegmentStatistics[];
  playerStats: PlayerStatistics[];
  ballTrackingPoints: { x: number; y: number; timestamp: number }[];
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
  const [ballTrackingPoints, setBallTrackingPoints] = useState<{ x: number; y: number; timestamp: number }[]>(initialMatchState.ballTrackingPoints);
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

  const addEvent = (event: MatchEvent) => {
    setEvents((prevEvents) => [...prevEvents, event]);
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

  const addBallTrackingPoint = (point: { x: number; y: number; timestamp: number }) => {
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
    // Save logic here
    return matchId;
  };

  const recordEvent = (eventType: string, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    const newEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: 'current-match',
      teamId: teamId,
      playerId: playerId,
      type: eventType as any,
      timestamp: Date.now(),
      coordinates: coordinates,
      status: 'confirmed'
    };
    addEvent(newEvent);
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
        team: homeTeam.name,
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
    setStatistics,
    updateStatistics,
    setTeams,
    confirmEvent,
    updateEvent,
    generateTimeSegmentStatistics,
    generatePlayerStatistics,
  };
};
