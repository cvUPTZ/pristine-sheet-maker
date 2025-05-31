import { MatchEvent, Player, EventType as GlobalEventType } from '@/types';

// Define interfaces for aggregated statistics
export interface TeamStats {
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number; // Team assists might be tricky if not directly logged to team
  passesAttempted: number;
  passesCompleted: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  offsides: number;
  tackles: number;
  interceptions: number;
  crosses: number;
  clearances: number;
  blocks: number; // Defensive blocks
  possession: number; // Placeholder - possession usually calculated differently
}

export interface PlayerStatSummary {
  playerId: string | number;
  playerName: string;
  jerseyNumber?: number;
  team: 'home' | 'away';
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  passesAttempted: number;
  passesCompleted: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  tackles: number;
  interceptions: number;
  crosses: number;
  clearances: number;
  blocks: number;
  dribbles: number;
}

export interface AggregatedStats {
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  playerStats: PlayerStatSummary[];
  // Could add other summary data like total events, match duration estimates etc.
}

function initializeTeamStats(): TeamStats {
  return {
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
    possession: 0,
  };
}

function initializePlayerStatSummary(
  playerId: string | number,
  playerName: string,
  jerseyNumber: number | undefined,
  team: 'home' | 'away'
): PlayerStatSummary {
  return {
    playerId,
    playerName,
    jerseyNumber,
    team,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    assists: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    foulsCommitted: 0,
    yellowCards: 0,
    redCards: 0,
    tackles: 0,
    interceptions: 0,
    crosses: 0,
    clearances: 0,
    blocks: 0,
    dribbles: 0,
  };
}

export function aggregateMatchEvents(
  events: MatchEvent[],
  homePlayers: Player[],
  awayPlayers: Player[]
): AggregatedStats {
  const homeTeamStats = initializeTeamStats();
  const awayTeamStats = initializeTeamStats();
  const playerStatsMap = new Map<string | number, PlayerStatSummary>();

  const getPlayerDetails = (
    playerId: string | number,
    teamContext?: 'home' | 'away'
  ): { name: string; jerseyNumber?: number; team: 'home' | 'away' } | null => {
    let player: Player | undefined;
    let resolvedTeam: 'home' | 'away' | undefined = teamContext;

    if (teamContext === 'home' || !teamContext) {
      player = homePlayers.find(p => String(p.id) === String(playerId));
      if (player) resolvedTeam = 'home';
    }
    if (!player && (teamContext === 'away' || !teamContext)) {
      player = awayPlayers.find(p => String(p.id) === String(playerId));
      if (player) resolvedTeam = 'away';
    }

    if (player && resolvedTeam) {
      return {
        name: player.name || player.player_name || `Player ${playerId}`,
        jerseyNumber: player.number || player.jersey_number,
        team: resolvedTeam,
      };
    }
    // Fallback if player not found in provided lists but team context is known
    if(resolvedTeam) {
        return { name: `Player ${playerId}`, jerseyNumber: undefined, team: resolvedTeam };
    }
    return null;
  };

  for (const event of events) {
    if (!event.type || !event.team) continue; // Skip events without type or team

    const targetTeamStats = event.team === 'home' ? homeTeamStats : awayTeamStats;
    let playerSummary: PlayerStatSummary | undefined = undefined;

    if (event.player_id) {
      playerSummary = playerStatsMap.get(event.player_id);
      if (!playerSummary) {
        const playerDetails = getPlayerDetails(event.player_id, event.team);
        if (playerDetails) {
          playerSummary = initializePlayerStatSummary(
            event.player_id,
            playerDetails.name,
            playerDetails.jerseyNumber,
            playerDetails.team
          );
          playerStatsMap.set(event.player_id, playerSummary);
        }
      }
    }

    switch (event.type as GlobalEventType) {
      case 'shot':
        targetTeamStats.shots += 1;
        if (playerSummary) playerSummary.shots += 1;
        if (event.event_data?.on_target === true) {
          targetTeamStats.shotsOnTarget += 1;
          if (playerSummary) playerSummary.shotsOnTarget += 1;
        }
        break;
      case 'goal':
        targetTeamStats.goals += 1;
        if (playerSummary) playerSummary.goals += 1;
        // Note: Own goals should be handled. If event.type is 'ownGoal', it's different.
        // This assumes 'goal' type is always a goal for the event.team.
        break;
      case 'assist': // Assuming player_id on assist event is the assister
        targetTeamStats.assists += 1; // Team assist
        if (playerSummary) playerSummary.assists += 1;
        break;
      case 'pass':
        targetTeamStats.passesAttempted += 1;
        if (playerSummary) playerSummary.passesAttempted += 1;
        if (event.event_data?.success === true) {
          targetTeamStats.passesCompleted += 1;
          if (playerSummary) playerSummary.passesCompleted += 1;
        }
        break;
      case 'foul':
        targetTeamStats.foulsCommitted += 1;
        if (playerSummary) playerSummary.foulsCommitted += 1;
        break;
      case 'yellowCard':
        targetTeamStats.yellowCards += 1;
        if (playerSummary) playerSummary.yellowCards += 1;
        break;
      case 'redCard':
        targetTeamStats.redCards += 1;
        if (playerSummary) playerSummary.redCards += 1;
        break;
      case 'corner':
        targetTeamStats.corners += 1;
        break;
      case 'offside':
        targetTeamStats.offsides += 1;
        break;
      case 'tackle':
        targetTeamStats.tackles +=1;
        if(playerSummary) playerSummary.tackles +=1;
        break;
      case 'interception':
        targetTeamStats.interceptions +=1;
        if(playerSummary) playerSummary.interceptions +=1;
        break;
      case 'cross':
        targetTeamStats.crosses +=1;
        if(playerSummary) playerSummary.crosses +=1;
        break;
      case 'clearance':
        targetTeamStats.clearances +=1;
        if(playerSummary) playerSummary.clearances +=1;
        break;
      case 'block': // Defensive block
        targetTeamStats.blocks +=1;
        if(playerSummary) playerSummary.blocks +=1;
        break;
      case 'dribble':
        if(playerSummary) playerSummary.dribbles +=1;
        break;
      // Other event types like 'freeKick', 'throwIn', 'goalKick', 'substitution', etc.
      // can be added here if they contribute to specific stats.
      // For example, 'substitution' doesn't usually count towards typical stats tables
      // unless tracking appearances.
      default:
        // Handle other event types or ignore
        break;
    }
  }

  return {
    homeTeamStats,
    awayTeamStats,
    playerStats: Array.from(playerStatsMap.values()),
  };
}
