
import { useState, useEffect } from 'react';
import { Team, Player, MatchEvent, EventType, Statistics, BallTrackingPoint, Formation, PlayerStatistics, TimeSegmentStatistics } from '@/types';
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

// Create empty time segments
const generateEmptyTimeSegments = (): TimeSegmentStatistics[] => {
  const segments = [];
  for (let i = 0; i < 90; i += 5) {
    segments.push({
      timeSegment: `${i}-${i + 5}`,
      ballsPlayed: { home: 0, away: 0 },
      ballsGiven: { home: 0, away: 0 },
      ballsRecovered: { home: 0, away: 0 },
      ballsLost: { home: 0, away: 0 },
      possession: { home: 50, away: 50 },
      recoveryTime: { home: 0, away: 0 }
    });
  }
  return segments;
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
    duels: {
      home: { won: 0, lost: 0, aerial: 0 },
      away: { won: 0, lost: 0, aerial: 0 }
    },
    cards: {
      home: { yellow: 0, red: 0 },
      away: { yellow: 0, red: 0 }
    },
    crosses: {
      home: { total: 0, successful: 0 },
      away: { total: 0, successful: 0 }
    },
    dribbles: {
      home: { successful: 0, attempted: 0 },
      away: { successful: 0, attempted: 0 }
    },
    corners: {
      home: 0,
      away: 0
    },
    offsides: {
      home: 0,
      away: 0
    },
    freeKicks: {
      home: 0,
      away: 0
    }
  });
  
  const [setupComplete, setSetupComplete] = useState(false);
  const [ballTrackingMode, setBallTrackingMode] = useState(false);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatistics[]>([]);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>(generateEmptyTimeSegments());
  
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
    
    // Count duels
    const homeDuelsWon = homeEvents.filter(e => e.type === 'tackle').length;
    const awayDuelsWon = awayEvents.filter(e => e.type === 'tackle').length;
    
    // Count cards
    const homeYellowCards = homeEvents.filter(e => e.type === 'card' && e.additionalData?.cardType === 'yellow').length;
    const homeRedCards = homeEvents.filter(e => e.type === 'card' && e.additionalData?.cardType === 'red').length;
    const awayYellowCards = awayEvents.filter(e => e.type === 'card' && e.additionalData?.cardType === 'yellow').length;
    const awayRedCards = awayEvents.filter(e => e.type === 'card' && e.additionalData?.cardType === 'red').length;
    
    // Count crosses
    const homeCrosses = homeEvents.filter(e => e.type === 'cross').length;
    const homeSuccessfulCrosses = homeEvents.filter(e => e.type === 'cross' && e.additionalData?.successful === true).length;
    const awayCrosses = awayEvents.filter(e => e.type === 'cross').length;
    const awaySuccessfulCrosses = awayEvents.filter(e => e.type === 'cross' && e.additionalData?.successful === true).length;
    
    // Count dribbles
    const homeDribbles = homeEvents.filter(e => e.type === 'dribble').length;
    const homeSuccessfulDribbles = homeEvents.filter(e => e.type === 'dribble' && e.additionalData?.successful === true).length;
    const awayDribbles = awayEvents.filter(e => e.type === 'dribble').length;
    const awaySuccessfulDribbles = awayEvents.filter(e => e.type === 'dribble' && e.additionalData?.successful === true).length;
    
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
      duels: {
        home: {
          won: homeDuelsWon,
          lost: awayDuelsWon,
          aerial: homeEvents.filter(e => e.type === 'header').length
        },
        away: {
          won: awayDuelsWon,
          lost: homeDuelsWon,
          aerial: awayEvents.filter(e => e.type === 'header').length
        }
      },
      cards: {
        home: {
          yellow: homeYellowCards,
          red: homeRedCards
        },
        away: {
          yellow: awayYellowCards,
          red: awayRedCards
        }
      },
      crosses: {
        home: {
          total: homeCrosses,
          successful: homeSuccessfulCrosses
        },
        away: {
          total: awayCrosses,
          successful: awaySuccessfulCrosses
        }
      },
      dribbles: {
        home: {
          successful: homeSuccessfulDribbles,
          attempted: homeDribbles
        },
        away: {
          successful: awaySuccessfulDribbles,
          attempted: awayDribbles
        }
      },
      corners: {
        home: homeEvents.filter(e => e.type === 'corner').length,
        away: awayEvents.filter(e => e.type === 'corner').length
      },
      offsides: {
        home: homeEvents.filter(e => e.type === 'offside').length,
        away: awayEvents.filter(e => e.type === 'offside').length
      },
      freeKicks: {
        home: homeEvents.filter(e => e.type === 'free-kick').length,
        away: awayEvents.filter(e => e.type === 'free-kick').length
      }
    });
    
    // Update player statistics
    updatePlayerStats();
    
    // Update time segments statistics
    updateTimeSegments();
    
  }, [events]);
  
  // Update time segments based on events
  const updateTimeSegments = () => {
    const newTimeSegments = generateEmptyTimeSegments();
    
    events.forEach(event => {
      const segmentIndex = Math.min(Math.floor(event.timestamp / 60 / 5), 17); // 0-17 for 0-90 minutes
      
      if (segmentIndex >= 0 && segmentIndex < newTimeSegments.length) {
        const segment = newTimeSegments[segmentIndex];
        
        // Update balls played
        if (event.teamId === 'home') {
          segment.ballsPlayed.home += 1;
        } else {
          segment.ballsPlayed.away += 1;
        }
        
        // Update balls given (passes)
        if (event.type === 'pass') {
          if (event.teamId === 'home') {
            segment.ballsGiven.home += 1;
          } else {
            segment.ballsGiven.away += 1;
          }
        }
        
        // Update balls recovered (interceptions, tackles)
        if (event.type === 'tackle' || event.type === 'interception') {
          if (event.teamId === 'home') {
            segment.ballsRecovered.home += 1;
          } else {
            segment.ballsRecovered.away += 1;
          }
        }
        
        // Update balls lost (fouls)
        if (event.type === 'foul') {
          if (event.teamId === 'home') {
            segment.ballsLost.home += 1;
          } else {
            segment.ballsLost.away += 1;
          }
        }
      }
    });
    
    // Calculate possession for each time segment
    newTimeSegments.forEach(segment => {
      const totalBallsPlayed = segment.ballsPlayed.home + segment.ballsPlayed.away;
      if (totalBallsPlayed > 0) {
        segment.possession.home = Math.round((segment.ballsPlayed.home / totalBallsPlayed) * 100);
        segment.possession.away = 100 - segment.possession.home;
      }
      
      // Simulate recovery time (in seconds)
      segment.recoveryTime.home = segment.ballsRecovered.home > 0 ? 
        Math.round(300 / segment.ballsRecovered.home) : 0;
      segment.recoveryTime.away = segment.ballsRecovered.away > 0 ? 
        Math.round(300 / segment.ballsRecovered.away) : 0;
    });
    
    setTimeSegments(newTimeSegments);
  };
  
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
        fouls: playerEvents.filter(e => e.type === 'foul').length,
        // New player statistics
        ballsReceived: playerEvents.filter(e => {
          // Count when this player is receiving a pass
          const isPrevPass = events.some(prev => 
            prev.type === 'pass' && 
            prev.timestamp < e.timestamp && 
            prev.timestamp > e.timestamp - 3 && 
            prev.additionalData?.targetPlayerId === player.id
          );
          return isPrevPass;
        }).length,
        ballsRecovered: playerEvents.filter(e => e.type === 'interception' || e.type === 'tackle').length,
        touches: playerEvents.length, // Simplified
        duelsWon: playerEvents.filter(e => e.type === 'tackle').length,
        duelsLost: events.filter(e => 
          e.type === 'tackle' && 
          e.additionalData?.againstPlayerId === player.id
        ).length,
        aerialDuelsWon: playerEvents.filter(e => e.type === 'header').length,
        successfulDribbles: playerEvents.filter(e => 
          e.type === 'dribble' && e.additionalData?.successful === true
        ).length,
        successfulCrosses: playerEvents.filter(e => 
          e.type === 'cross' && e.additionalData?.successful === true
        ).length,
        passesForward: playerEvents.filter(e => 
          e.type === 'pass' && e.additionalData?.direction === 'forward'
        ).length,
        passesBackward: playerEvents.filter(e => 
          e.type === 'pass' && e.additionalData?.direction === 'backward'
        ).length,
        passesLateral: playerEvents.filter(e => 
          e.type === 'pass' && e.additionalData?.direction === 'lateral'
        ).length,
        longPasses: playerEvents.filter(e => 
          e.type === 'pass' && e.additionalData?.isLong === true
        ).length,
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

  const addEvent = (type: EventType, coordinates: { x: number; y: number }, additionalData?: Record<string, any>) => {
    if (!selectedPlayer) return;
    
    const newEvent: MatchEvent = {
      id: uuidv4(),
      matchId,
      teamId: selectedTeam,
      playerId: selectedPlayer.id,
      type,
      timestamp: elapsedTime,
      coordinates,
      additionalData
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
      playerStats,
      timeSegments
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

  // Record event from Piano Input
  const recordEvent = (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    const team = teamId === 'home' ? homeTeam : awayTeam;
    const player = team.players.find(p => p.id === playerId);
    
    if (!player) return;
    
    const newEvent: MatchEvent = {
      id: uuidv4(),
      matchId,
      teamId,
      playerId,
      type: eventType,
      timestamp: elapsedTime,
      coordinates,
    };
    
    setEvents([...events, newEvent]);
    
    // Add ball tracking point
    addBallTrackingPoint({
      x: coordinates.x,
      y: coordinates.y,
      timestamp: elapsedTime,
      teamId,
      playerId
    });
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
    timeSegments,
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
    recordEvent,
  };
};
