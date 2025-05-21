
import { useState, useEffect } from 'react';
import { Team, Player, MatchEvent, EventType, Statistics } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_HOME_TEAM: Team = {
  id: 'home',
  name: 'Home Team',
  players: [],
};

const DEFAULT_AWAY_TEAM: Team = {
  id: 'away',
  name: 'Away Team',
  players: [],
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
  }, [events]);

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
    };
    
    // This is a simplified version that saves to localStorage
    localStorage.setItem(`efootpad_match_${matchId}`, JSON.stringify(matchData));
    
    return matchId;
  };

  const updateTeams = (teams: { home: Team; away: Team }) => {
    setHomeTeam(teams.home);
    setAwayTeam(teams.away);
  };

  const completeSetup = () => {
    setSetupComplete(true);
  };

  // For ball tracking mode (not fully implemented in this version)
  const trackBallMovement = (coordinates: { x: number; y: number }) => {
    console.log('Ball position:', coordinates);
    // This would be expanded in the ball tracking mode
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
    setSelectedTeam,
    setSelectedPlayer,
    toggleTimer,
    resetTimer,
    addEvent,
    undoLastEvent,
    saveMatch,
    updateTeams,
    completeSetup,
    setElapsedTime,
    trackBallMovement,
  };
};
