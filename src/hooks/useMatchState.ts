import { useState, useCallback, useEffect, useMemo } from 'react';
import { MatchEvent, Player, Team, Statistics, BallTrackingPoint, TimeSegmentStatistics, PlayerStatistics, EventType } from '@/types';
import { MatchSpecificEventData, ShotEventData, PassEventData, TackleEventData, FoulCommittedEventData, CardEventData, SubstitutionEventData, GenericEventData } from '@/types/eventData';

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
    home: {
      shots: 0,
      shotsOnTarget: 0,
      goals: 0,
      assists: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      foulsCommitted: 0,
      yellowCards: 0,
      redCards: 0,
      corners: 0,
      offsides: 0,
      tackles: 0,
      interceptions: 0,
      crosses: 0,
      clearances: 0,
      blocks: 0,
      possession: 50,
      totalXg: 0,
      supportPasses: 0,
      offensivePasses: 0,
      ballsRecovered: 0,
      ballsLost: 0,
      ballsPlayed: 0,
      contacts: 0,
      freeKicks: 0,
      sixMeterViolations: 0,
      possessionMinutes: 0,
      possessionPercentage: 50,
      dangerousFootShots: 0,
      nonDangerousFootShots: 0,
      footShotsOnTarget: 0,
      footShotsOffTarget: 0,
      footShotsPostHits: 0,
      footShotsBlocked: 0,
      dangerousHeaderShots: 0,
      nonDangerousHeaderShots: 0,
      headerShotsOnTarget: 0,
      headerShotsOffTarget: 0,
      headerShotsPostHits: 0,
      headerShotsBlocked: 0,
      duelsWon: 0,
      duelsLost: 0,
      aerialDuelsWon: 0,
      aerialDuelsLost: 0,
      decisivePasses: 0,
      successfulCrosses: 0,
      successfulDribbles: 0,
      longPasses: 0,
      forwardPasses: 0,
      backwardPasses: 0,
      lateralPasses: 0,
    },
    away: {
      shots: 0,
      shotsOnTarget: 0,
      goals: 0,
      assists: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      foulsCommitted: 0,
      yellowCards: 0,
      redCards: 0,
      corners: 0,
      offsides: 0,
      tackles: 0,
      interceptions: 0,
      crosses: 0,
      clearances: 0,
      blocks: 0,
      possession: 50,
      totalXg: 0,
      supportPasses: 0,
      offensivePasses: 0,
      ballsRecovered: 0,
      ballsLost: 0,
      ballsPlayed: 0,
      contacts: 0,
      freeKicks: 0,
      sixMeterViolations: 0,
      possessionMinutes: 0,
      possessionPercentage: 50,
      dangerousFootShots: 0,
      nonDangerousFootShots: 0,
      footShotsOnTarget: 0,
      footShotsOffTarget: 0,
      footShotsPostHits: 0,
      footShotsBlocked: 0,
      dangerousHeaderShots: 0,
      nonDangerousHeaderShots: 0,
      headerShotsOnTarget: 0,
      headerShotsOffTarget: 0,
      headerShotsPostHits: 0,
      headerShotsBlocked: 0,
      duelsWon: 0,
      duelsLost: 0,
      aerialDuelsWon: 0,
      aerialDuelsLost: 0,
      decisivePasses: 0,
      successfulCrosses: 0,
      successfulDribbles: 0,
      longPasses: 0,
      forwardPasses: 0,
      backwardPasses: 0,
      lateralPasses: 0,
    },
    possession: { home: 50, away: 50 },
    shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
    passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
    duels: { home: { won: 0, total: 0 }, away: { won: 0, total: 0 } },
    crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
  },
  timeSegments: [],
  playerStats: [],
  ballTrackingPoints: [],
};

export const useMatchState = () => {
  const [events, setEvents] = useState<MatchEvent[]>(initialMatchState.events);
  const [statistics, setStatistics] = useState<Statistics>(initialMatchState.statistics);
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
    console.log('useMatchState: completeSetup called with homeTeam:', home, 'and awayTeam:', away);
    setHomeTeam(home);
    setAwayTeam(away);
    setSetupComplete(true);
    console.log('useMatchState: setupComplete state has been set to true.');
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

  const generateMatchId = () => {
    const matchId = `match-${Date.now()}`;
    return matchId;
  };

  const recordEvent = useCallback((
    eventType: EventType,
    playerId: number,
    teamId: 'home' | 'away',
    coordinates: { x: number; y: number },
    details?: Partial<MatchSpecificEventData>
  ) => {
    let event_data: MatchSpecificEventData | null = null;

    switch (eventType) {
      case 'shot':
        event_data = { on_target: false, ...details } as ShotEventData;
        break;
      case 'pass':
        // Default success to true for passes if not specified in details
        event_data = { success: true, ...details } as PassEventData;
        break;
      case 'tackle':
        event_data = { success: false, ...details } as TackleEventData;
        break;
      case 'foul':
        event_data = { ...details } as FoulCommittedEventData;
        break;
      case 'yellowCard':
      case 'redCard':
        event_data = { card_type: eventType === 'yellowCard' ? 'yellow' : 'red', ...details } as CardEventData;
        break;
      case 'substitution':
        event_data = { player_in_id: '', player_out_id: '', ...details } as SubstitutionEventData;
        break;
      default:
        event_data = { ...details } as GenericEventData;
    }

    const newEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      match_id: 'current-match',
      team_id: teamId,
      player_id: playerId,
      type: eventType,
      timestamp: Date.now(),
      coordinates,
      status: 'confirmed',
      event_data,
    };

    addEvent(newEvent);
  }, [addEvent]);

  const recordPass = useCallback((
    passer: Player,
    receiver: Player,
    passerTeamIdStr: 'home' | 'away',
    // receiverTeamIdStr: 'home' | 'away', // Not directly used for event creation itself
    passerCoords: { x: number; y: number },
    receiverCoords: { x: number; y: number }, // Used for end_coordinates
    success: boolean = true // Assume success by default
  ) => {
    const passEventData: PassEventData = {
      success,
      recipient_player_id: receiver.id,
      end_coordinates: receiverCoords,
    };

    const newEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      match_id: 'current-match',
      team_id: passerTeamIdStr,
      player_id: Number(passer.id),
      type: 'pass',
      timestamp: Date.now(),
      coordinates: passerCoords,
      status: 'confirmed',
      event_data: passEventData,
      // relatedPlayerId: receiver.id, // Moved to event_data
    };

    addEvent(newEvent);
  }, [addEvent]);

  const processEventsForLocalState = (events: MatchEvent[]) => {
    setEvents(events);
    setMatchEvents(events);
  };

  const togglePassTrackingMode = () => {
    setIsPassTrackingModeActive(!isPassTrackingModeActive);
  };

  const calculatePossession = () => {
    const homeEvents = events.filter((event) => event.team_id === homeTeam.id);
    const awayEvents = events.filter((event) => event.team_id === awayTeam.id);

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

  const timeSegments = useMemo(() => {
    const segmentLength = 5; // minutes
    const matchDuration = 90; // minutes
    const numberOfSegments = matchDuration / segmentLength;

    const segments = Array.from({ length: numberOfSegments }, (_, i) => ({
      start: i * segmentLength,
      end: (i + 1) * segmentLength,
    }));

    return segments.map((segment, index) => ({
      startTime: segment.start * 60000,
      endTime: segment.end * 60000,
      timeSegment: `${segment.start}-${segment.end}min`,
      events: events.filter(e => e.timestamp >= segment.start * 60000 && e.timestamp < segment.end * 60000),
      possession: {
        home: 50,
        away: 50,
      },
      ballsPlayed: {
        home: events.filter(e => e.team_id === homeTeam.id && e.timestamp >= segment.start * 60000 && e.timestamp < segment.end * 60000).length,
        away: events.filter(e => e.team_id === awayTeam.id && e.timestamp >= segment.start * 60000 && e.timestamp < segment.end * 60000).length,
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
      cumulativePossession: { home: 50, away: 50 },
      cumulativeBallsPlayed: { home: 0, away: 0 },
      cumulativeBallsGiven: { home: 0, away: 0 },
      cumulativeBallsRecovered: { home: 0, away: 0 },
      cumulativeRecoveryTime: { home: 0, away: 0 },
      possessionDifference: { home: 0, away: 0 },
      ballsPlayedDifference: { home: 0, away: 0 },
      ballsGivenDifference: { home: 0, away: 0 },
    }));
  }, [events, homeTeam.id, awayTeam.id]);

  const playerStats = useMemo(() => {
    const playerStats: PlayerStatistics[] = [];
    const allPlayers: Player[] = [...homeTeam.players, ...awayTeam.players];

    allPlayers.forEach(player => {
      const playerEvents = events.filter(event => event.player_id === Number(player.id));
      const ballsPlayed = playerEvents.length;
      const ballsLost = playerEvents.filter(event => event.type === 'foul').length;
      const ballsRecovered = playerEvents.filter(event => event.type === 'tackle').length;
      const passesCompleted = playerEvents.filter(event => event.type === 'pass' && event.status === 'confirmed').length;
      const passesAttempted = playerEvents.filter(event => event.type === 'pass').length;
      const possessionTime = ballsPlayed * 2;
      const contacts = ballsPlayed + ballsLost + ballsRecovered;
      const lossRatio = ballsPlayed > 0 ? ballsLost / ballsPlayed : 0;
      const goals = playerEvents.filter(event => event.type === 'goal').length;
      const assists = playerEvents.filter(event => event.type === 'assist').length;
      const shots = playerEvents.filter(event => event.type === 'shot').length;
      const fouls = playerEvents.filter(event => event.type === 'foul').length;

      const isHomePlayer = homeTeam.players.find(p => p.id === player.id);
      const team = isHomePlayer ? 'home' : 'away';

      playerStats.push({
        playerId: player.id,
        playerName: player.name,
        team: team,
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
        passes: passesAttempted,
        shots: shots,
        fouls: fouls,
        // Updated to match new interface
        shotsOnTarget: 0,
        foulsCommitted: fouls,
        yellowCards: 0,
        redCards: 0,
        tackles: ballsRecovered,
        interceptions: 0,
        crosses: 0,
        clearances: 0,
        blocks: 0,
        dribbles: 0,
        totalXg: 0,
        progressivePasses: 0,
        passesToFinalThird: 0,
        passNetworkSent: [],
        supportPasses: 0,
        decisivePasses: 0,
        longPasses: 0,
        forwardPasses: 0,
        backwardPasses: 0,
        lateralPasses: 0,
        successfulCrosses: 0,
        ballsGiven: ballsLost,
        ballsReceived: 0,
        totalPressures: 0,
        successfulPressures: 0,
        pressureRegains: 0,
        dangerousFootShots: 0,
        nonDangerousFootShots: 0,
        footShotsOnTarget: 0,
        footShotsOffTarget: 0,
        footShotsPostHits: 0,
        footShotsBlocked: 0,
        dangerousHeaderShots: 0,
        nonDangerousHeaderShots: 0,
        headerShotsOnTarget: 0,
        headerShotsOffTarget: 0,
        headerShotsPostHits: 0,
        headerShotsBlocked: 0,
        duelsWon: 0,
        duelsLost: 0,
        aerialDuelsWon: 0,
        aerialDuelsLost: 0,
        successfulDribbles: 0,
        jerseyNumber: player.jersey_number || player.number,
      });
    });
    return playerStats;
  }, [events, homeTeam.players, awayTeam.players]);

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
    generateMatchId,
    recordEvent,
    recordPass,
    setStatistics,
    updateStatistics,
    setTeams,
    confirmEvent,
    updateEvent,
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
