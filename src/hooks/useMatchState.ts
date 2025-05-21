
import { useState, useEffect } from 'react';
import { Team, Player, MatchEvent, EventType, Statistics, BallTrackingPoint, Formation, PlayerStatistics } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_HOME_TEAM: Team = {
  id: 'home',
  name: 'Home Team',
  players: [],
  formation: '4-4-2',
};

const DEFAULT_AWAY_TEAM: Team = {
  id: 'away',
  name: 'Away Team',
  players: [],
  formation: '4-3-3',
};

export const useMatchState = () => {
  const [matchId] = useState(uuidv4());
  const [homeTeam, setHomeTeam] = useState<Team>(DEFAULT_HOME_TEAM);
  const [awayTeam, setAwayTeam] = useState<Team>(DEFAULT_AWAY_TEAM);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    possession: { home: 50, away: 50 },
    shots: { 
      home: { onTarget: 0, offTarget: 0 }, 
      away: { onTarget: 0, offTarget: 0 } 
    },
    passes: { 
      home: { successful: 0, attempted: 0 }, 
      away: { successful: 0, attempted: 0 } 
    },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
  });
  
  const [setupComplete, setSetupComplete] = useState(false);
  const [ballTrackingMode, setBallTrackingMode] = useState(false);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatistics[]>([]);
  
  // Timer logic
  useEffect(() => {
    let interval: number | undefined;
    
    if (isRunning) {
      interval = window.setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);
  
  // Update statistics when events change
  useEffect(() => {
    if (events.length === 0) return;
    
    // Calculate statistics based on events
    const homeEvents = events.filter(event => event.teamId === 'home');
    const awayEvents = events.filter(event => event.teamId === 'away');
    
    // Calculate possession (simplified)
    const totalEvents = events.length;
    const homePercent = totalEvents > 0 ? (homeEvents.length / totalEvents) * 100 : 50;
    
    // Count shots
    const homeShots = homeEvents.filter(e => e.type === 'shot' || e.type === 'goal');
    const awayShots = awayEvents.filter(e => e.type === 'shot' || e.type === 'goal');
    const homeGoals = homeEvents.filter(e => e.type === 'goal').length;
    const awayGoals = awayEvents.filter(e => e.type === 'goal').length;
    
    // Simplified pass count
    const homePasses = homeEvents.filter(e => e.type === 'pass');
    const awayPasses = awayEvents.filter(e => e.type === 'pass');
    
    setStatistics({
      possession: { 
        home: homePercent, 
        away: 100 - homePercent 
      },
      shots: { 
        home: { 
          onTarget: homeGoals, 
          offTarget: homeShots.length - homeGoals 
        }, 
        away: { 
          onTarget: awayGoals, 
          offTarget: awayShots.length - awayGoals 
        } 
      },
      passes: { 
        home: { 
          successful: Math.floor(homePasses.length * 0.8), 
          attempted: homePasses.length 
        }, 
        away: { 
          successful: Math.floor(awayPasses.length * 0.8), 
          attempted: awayPasses.length 
        } 
      },
      ballsPlayed: { 
        home: homeEvents.length, 
        away: awayEvents.length 
      },
      ballsLost: { 
        home: homeEvents.filter(e => e.type === 'foul').length, 
        away: awayEvents.filter(e => e.type === 'foul').length 
      },
    });
    
    // Update player statistics
    updatePlayerStats();
    
  }, [events]);
  
  // Calculate individual player statistics
  const updatePlayerStats = () => {
    const allPlayers = [...homeTeam.players.map(p => ({ ...p, teamId: 'home' })), 
                        ...awayTeam.players.map(p => ({ ...p, teamId: 'away' }))];
                        
    const stats: PlayerStatistics[] = allPlayers.map(player => {
      const playerEvents = events.filter(e => e.playerId === player.id);
      
      return {
        player: {
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position
        },
        team: player.teamId,
        goals: playerEvents.filter(e => e.type === 'goal').length,
        assists: playerEvents.filter(e => e.type === 'pass').filter((e, i, arr) => {
          // Simplified assist calculation - if a pass is followed by a goal within 10 seconds
          const nextEvent = events.find(next => 
            next.timestamp > e.timestamp && 
            next.timestamp < e.timestamp + 10 && 
            next.type === 'goal'
          );
          return !!nextEvent;
        }).length,
        passes: playerEvents.filter(e => e.type === 'pass').length,
        shots: playerEvents.filter(e => e.type === 'shot' || e.type === 'goal').length,
        ballsPlayed: playerEvents.length,
        fouls: playerEvents.filter(e => e.type === 'foul').length
      };
    });
    
    setPlayerStats(stats);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setElapsedTime(0);
    setIsRunning(false);
  };

  const addEvent = (type: EventType, coordinates: { x: number; y: number }) => {
    if (!selectedPlayer) return;
    
    const newEvent: MatchEvent = {
      id: uuidv4(),
      matchId,
      teamId: selectedTeam,
      playerId: selectedPlayer.id,
      type,
      timestamp: elapsedTime,
      coordinates,
    };
    
    setEvents([...events, newEvent]);
    
    // Add ball tracking point with this event
    addBallTrackingPoint({
      x: coordinates.x,
      y: coordinates.y,
      timestamp: elapsedTime,
      teamId: selectedTeam,
      playerId: selectedPlayer.id
    });
    
    setSelectedPlayer(null); // Reset selection after adding event
  };

  const undoLastEvent = () => {
    if (events.length === 0) return;
    setEvents(events.slice(0, -1));
  };

  const saveMatch = () => {
    const matchData = {
      matchId,
      homeTeam,
      awayTeam,
      events,
      statistics,
      elapsedTime,
      date: new Date(),
      ballTrackingPoints,
      playerStats
    };
    
    // This is a simplified version that saves to localStorage
    localStorage.setItem(`efootpad_match_${matchId}`, JSON.stringify(matchData));
    
    return matchId;
  };

  const updateTeams = (teams: { home: Team; away: Team }) => {
    setHomeTeam(teams.home);
    setAwayTeam(teams.away);
  };
  
  const updateTeamFormation = (teamId: 'home' | 'away', formation: Formation) => {
    if (teamId === 'home') {
      setHomeTeam({ ...homeTeam, formation });
    } else {
      setAwayTeam({ ...awayTeam, formation });
    }
  };

  const completeSetup = () => {
    setSetupComplete(true);
  };

  // For ball tracking mode
  const toggleBallTrackingMode = () => {
    setBallTrackingMode(!ballTrackingMode);
  };
  
  const addBallTrackingPoint = (point: BallTrackingPoint) => {
    setBallTrackingPoints([...ballTrackingPoints, point]);
  };
  
  const trackBallMovement = (coordinates: { x: number; y: number }) => {
    if (!ballTrackingMode) return;
    
    // If coordinates are (0,0) and we have an active button click, clear the tracking points
    if (coordinates.x === 0 && coordinates.y === 0) {
      setBallTrackingPoints([]);
      return;
    }
    
    addBallTrackingPoint({
      x: coordinates.x,
      y: coordinates.y,
      timestamp: elapsedTime
    });
  };
  
  const resetBallTracking = () => {
    setBallTrackingPoints([]);
  };

  return {
    homeTeam,
    awayTeam,
    events,
    isRunning,
    elapsedTime,
    selectedTeam,
    selectedPlayer,
    statistics,
    setupComplete,
    ballTrackingMode,
    ballTrackingPoints,
    playerStats,
    setSelectedTeam,
    setSelectedPlayer,
    toggleTimer,
    resetTimer,
    addEvent,
    undoLastEvent,
    saveMatch,
    updateTeams,
    updateTeamFormation,
    completeSetup,
    setElapsedTime,
    toggleBallTrackingMode,
    addBallTrackingPoint,
    trackBallMovement,
    resetBallTracking,
  };
};
