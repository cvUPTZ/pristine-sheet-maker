import { MatchEvent, Player, EventType as GlobalEventType } from '@/types';
import { ShotEventData, PassEventData, PressureEventData } from '@/types/eventData'; // Added PressureEventData
import { calculateXg } from './xgCalculator';

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
  totalXg: number;
  supportPasses: number;
  offensivePasses: number;
  ballsRecovered: number;
  ballsLost: number;
  ballsPlayed: number;
  contacts: number;
  freeKicks: number;
  // corners: number; // Already exists
  sixMeterViolations: number;
  // offsides: number; // Already exists
  possessionMinutes: number;
  possessionPercentage: number;
  dangerousFootShots: number;
  nonDangerousFootShots: number;
  footShotsOnTarget: number;
  footShotsOffTarget: number;
  footShotsPostHits: number;
  footShotsBlocked: number;
  dangerousHeaderShots: number;
  nonDangerousHeaderShots: number;
  headerShotsOnTarget: number;
  headerShotsOffTarget: number;
  headerShotsPostHits: number;
  headerShotsBlocked: number;
  duelsWon: number;
  duelsLost: number;
  aerialDuelsWon: number;
  aerialDuelsLost: number;
  decisivePasses: number;
  successfulCrosses: number;
  successfulDribbles: number;
  longPasses: number;
  forwardPasses: number;
  backwardPasses: number;
  lateralPasses: number;
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
  totalXg: number;
  progressivePasses: number;
  passesToFinalThird: number;
  passNetworkSent: Array<{ toPlayerId: string | number, count: number, successfulCount: number }>;
  totalPressures: number;
  successfulPressures: number;
  pressureRegains: number;
  ballsPlayed: number;
  ballsGiven: number; // equivalent to balls lost by player
  ballsReceived: number;
  ballsRecovered: number;
  contacts: number;
  possessionTime: number; // individual possession time
  supportPasses: number;
  dangerousFootShots: number;
  nonDangerousFootShots: number;
  footShotsOnTarget: number;
  footShotsOffTarget: number;
  footShotsPostHits: number;
  footShotsBlocked: number;
  dangerousHeaderShots: number;
  nonDangerousHeaderShots: number;
  headerShotsOnTarget: number;
  headerShotsOffTarget: number;
  headerShotsPostHits: number;
  headerShotsBlocked: number;
  duelsWon: number;
  duelsLost: number;
  aerialDuelsWon: number;
  aerialDuelsLost: number;
  decisivePasses: number;
  successfulCrosses: number; // for individual successful crosses
  successfulDribbles: number; // for individual successful dribbles
  longPasses: number;
  forwardPasses: number;
  backwardPasses: number;
  lateralPasses: number;
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
    possessionPercentage: 0,
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
    totalXg: 0,
    progressivePasses: 0,
    passesToFinalThird: 0,
    passNetworkSent: [],
    totalPressures: 0,
    successfulPressures: 0,
    pressureRegains: 0,
    ballsPlayed: 0,
    ballsGiven: 0,
    ballsReceived: 0,
    ballsRecovered: 0,
    contacts: 0,
    possessionTime: 0,
    supportPasses: 0,
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

  const PITCH_LENGTH = 105; // meters
  const PITCH_WIDTH = 68;   // meters

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
      case 'shot': {
        const shotData = event.event_data as ShotEventData;
        const xgValue = shotData && typeof shotData.on_target === 'boolean' ? calculateXg(shotData, event.coordinates) : 0;

        targetTeamStats.shots += 1;
        targetTeamStats.totalXg += xgValue;
        if (playerSummary) {
          playerSummary.shots += 1;
          playerSummary.totalXg += xgValue;
          playerSummary.ballsPlayed += 1; // Increment balls played for the shooter
        }
        targetTeamStats.ballsPlayed +=1;


        let isGoal = shotData?.is_goal === true; // Check if it's a goal directly from shot data
        let wasBlocked = false; // Placeholder for blocked logic

        if (shotData) {
          const dangerousShotThreshold = 0.1;
          const isDangerous = xgValue >= dangerousShotThreshold;

          if (shotData.isHeader) {
            if (isDangerous) targetTeamStats.dangerousHeaderShots += 1; else targetTeamStats.nonDangerousHeaderShots += 1;
            if (playerSummary) {
              if (isDangerous) playerSummary.dangerousHeaderShots += 1; else playerSummary.nonDangerousHeaderShots += 1;
            }

            if (shotData.on_target) {
              targetTeamStats.headerShotsOnTarget += 1;
              if (playerSummary) playerSummary.headerShotsOnTarget += 1;
            } else if (shotData.hitPost) {
              targetTeamStats.headerShotsPostHits += 1;
              if (playerSummary) playerSummary.headerShotsPostHits += 1;
            } else { // Off target or blocked
              // Simplified: if not on_target and not hitPost, assume off_target for now. Blocked needs better definition.
              targetTeamStats.headerShotsOffTarget += 1;
              if (playerSummary) playerSummary.headerShotsOffTarget += 1;
            }
            // Placeholder for blocked header shots
            // if (!shotData.on_target && !shotData.hitPost && !isGoal) {
            // targetTeamStats.headerShotsBlocked += 1;
            // if (playerSummary) playerSummary.headerShotsBlocked += 1;
            // wasBlocked = true;
            // }
          } else { // Foot shot
            if (isDangerous) targetTeamStats.dangerousFootShots += 1; else targetTeamStats.nonDangerousFootShots += 1;
            if (playerSummary) {
              if (isDangerous) playerSummary.dangerousFootShots += 1; else playerSummary.nonDangerousFootShots += 1;
            }

            if (shotData.on_target) {
              targetTeamStats.footShotsOnTarget += 1;
              if (playerSummary) playerSummary.footShotsOnTarget += 1;
            } else if (shotData.hitPost) {
              targetTeamStats.footShotsPostHits += 1;
              if (playerSummary) playerSummary.footShotsPostHits += 1;
            } else { // Off target or blocked
              targetTeamStats.footShotsOffTarget += 1;
              if (playerSummary) playerSummary.footShotsOffTarget += 1;
            }
            // Placeholder for blocked foot shots
            // if (!shotData.on_target && !shotData.hitPost && !isGoal) {
            //  targetTeamStats.footShotsBlocked += 1;
            //  if (playerSummary) playerSummary.footShotsBlocked += 1;
            //  wasBlocked = true;
            // }
          }

          if (shotData.on_target) { // Overall shots on target (already covered by existing logic, but good to be explicit)
            targetTeamStats.shotsOnTarget += 1;
            if (playerSummary) playerSummary.shotsOnTarget += 1;
          }
          if (shotData.hitPost) {
            // Already counted in header/foot specific post hits. Could add a general team post hit if needed.
          }
        }
        // If a shot is explicitly a goal, it implies it was on target.
        // The existing 'goal' event type handles goal counting.
        // If 'shot' event can also signify a goal through 'is_goal', ensure no double counting if 'goal' event also present.
        break;
      }
      case 'goal':
        targetTeamStats.goals += 1;
        if (playerSummary) playerSummary.goals += 1;
        // This assumes 'goal' type is always a goal for the event.team.
        // If the goal resulted from a shot event that had is_goal=true, ensure stats align.
        // Often, a 'shot' event with is_goal=true is followed by a 'goal' event.
        // The shot specific on_target etc. are handled by the shot event itself.
        break;
      case 'assist': // Assuming player_id on assist event is the assister
        targetTeamStats.assists += 1; // Team assist
        if (playerSummary) {
          playerSummary.assists += 1;
          // An assist is often a type of pass, so ballsPlayed could be incremented here too if not captured by a separate pass event.
          // However, if an assist IS a pass event, it will be counted under 'pass' for ballsPlayed.
        }
        break;
      case 'pass': {
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.ballsPlayed += 1;
        if (playerSummary) {
          playerSummary.passesAttempted += 1;
          playerSummary.ballsPlayed += 1;
        }

        const passData = event.event_data as PassEventData;
        if (passData && passData.success === true) {
          targetTeamStats.passesCompleted += 1;
          if (playerSummary) playerSummary.passesCompleted += 1;

          // Handle ballsReceived for the recipient
          if (passData.recipient_player_id) {
            let recipientSummary = playerStatsMap.get(passData.recipient_player_id);
            const recipientDetails = getPlayerDetails(passData.recipient_player_id); // team context might be missing here
            if (!recipientSummary && recipientDetails) {
               // Infer team from existing players or assume based on context if possible
               // For now, let's try to find the recipient in either team list if team context is not in event
                let recipientTeam = recipientDetails.team;
                if (!recipientTeam) { // if getPlayerDetails couldn't resolve, try finding in lists
                    if (homePlayers.find(p => String(p.id) === String(passData.recipient_player_id))) recipientTeam = 'home';
                    else if (awayPlayers.find(p => String(p.id) === String(passData.recipient_player_id))) recipientTeam = 'away';
                }

                if (recipientTeam) {
                    recipientSummary = initializePlayerStatSummary(
                        passData.recipient_player_id,
                        recipientDetails.name,
                        recipientDetails.jerseyNumber,
                        recipientTeam
                    );
                    playerStatsMap.set(passData.recipient_player_id, recipientSummary);
                }
            }
            if (recipientSummary) {
              recipientSummary.ballsReceived += 1;
            }
          }

          // Advanced pass calculations for successful passes with coordinates
          if (playerSummary && event.coordinates && passData.end_coordinates) {
            const startCoords = event.coordinates;
            const endCoords = passData.end_coordinates;

            // Attacking direction normalization (assuming all events are recorded as if attacking towards positive X)
            // If actual data has different orientations per team, normalization is needed here or before this function.
            // For this implementation, we assume coordinates are already normalized or consistently recorded.

            const finalThirdX = (2 / 3) * PITCH_LENGTH;
            const ownHalfEndX = PITCH_LENGTH / 2;

            // Passes to Final Third
            if (startCoords.x < finalThirdX && endCoords.x >= finalThirdX) {
              playerSummary.passesToFinalThird += 1;
            }

            // Progressive Passes
            const longitudinalDistanceGained = endCoords.x - startCoords.x;
            let isProgressive = false;

            if (startCoords.x < ownHalfEndX) { // Originates in own half
              if (longitudinalDistanceGained >= 30) isProgressive = true;
            } else if (startCoords.x < finalThirdX) { // Originates in opponent's half, not final third
              if (longitudinalDistanceGained >= 15) isProgressive = true;
            }

            // Simplified penalty area check (last ~16.5m of pitch length, central ~20m width as per FIFA (20.16m for 18-yard box width))
            const penaltyAreaMinX = PITCH_LENGTH - 16.5;
            const penaltyAreaMinY = (PITCH_WIDTH / 2) - (20.16 / 2); // Approx half of 18-yard box width from center
            const penaltyAreaMaxY = (PITCH_WIDTH / 2) + (20.16 / 2);

            if (startCoords.x >= PITCH_LENGTH / 3 && // Not from own defensive third
                endCoords.x >= penaltyAreaMinX &&
                endCoords.y >= penaltyAreaMinY && endCoords.y <= penaltyAreaMaxY ) {
              isProgressive = true;
            }

            if (isProgressive) {
              playerSummary.progressivePasses += 1;
            }
          }
        }

        // Player-to-Player Pass Network (Sent)
        if (playerSummary && passData && passData.recipient_player_id) {
          const recipientId = passData.recipient_player_id;
          let passLink = playerSummary.passNetworkSent.find(link => link.toPlayerId === recipientId);
          if (!passLink) {
            passLink = { toPlayerId: recipientId, count: 0, successfulCount: 0 };
            playerSummary.passNetworkSent.push(passLink);
          }
          passLink.count += 1;
          if (passData.success) {
            passLink.successfulCount += 1;
          }
        }
        break;
      } // End of 'pass' case
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
        // Potentially, player taking corner could get a "ballsPlayed" if not captured by a pass event
        if (playerSummary) playerSummary.ballsPlayed +=1; // Player taking corner
        targetTeamStats.ballsPlayed +=1;
        break;
      case 'offside':
        targetTeamStats.offsides += 1;
        break;
      case 'tackle':
        targetTeamStats.tackles +=1;
        if(playerSummary) {
          playerSummary.tackles +=1;
          playerSummary.ballsPlayed +=1; // Player attempting tackle
        }
        targetTeamStats.ballsPlayed +=1; // Team that made the tackle attempt
        break;
      case 'interception':
        targetTeamStats.interceptions +=1;
        if(playerSummary) {
          playerSummary.interceptions +=1;
          playerSummary.ballsPlayed +=1; // Player making interception
        }
        targetTeamStats.ballsPlayed +=1; // Team that made interception
        break;
      case 'cross': // This is a generic cross event, successfulCross is more specific
        targetTeamStats.crosses +=1;
        if(playerSummary) {
          playerSummary.crosses +=1; // Counts attempted crosses for player
          playerSummary.ballsPlayed +=1;
        }
        targetTeamStats.ballsPlayed +=1;
        break;
      case 'clearance':
        targetTeamStats.clearances +=1;
        if(playerSummary) {
          playerSummary.clearances +=1;
          playerSummary.ballsPlayed +=1;
        }
        targetTeamStats.ballsPlayed +=1;
        break;
      case 'block': // Defensive block of a shot
        targetTeamStats.blocks +=1; // Team stat for blocks
        if(playerSummary) {
          playerSummary.blocks +=1; // Player stat for blocks
          // A block might also be considered "ballsPlayed" for the blocker
          playerSummary.ballsPlayed +=1;
        }
        targetTeamStats.ballsPlayed +=1; // Team that made the block

        // Logic for attributing blocked shots to the shooter
        // This is complex as the 'block' event is by the defender.
        // We'd need to link this block event to a preceding shot event.
        // For now, the shot categorisation attempts to identify non-on-target, non-post-hit, non-goal shots.
        // This might be where 'footShotsBlocked' / 'headerShotsBlocked' for the *shooter* could be incremented,
        // but it requires knowing who took the shot that was blocked.
        // The current 'block' event is from the perspective of the blocker.
        break;
      case 'dribble': // Generic dribble event
        if(playerSummary) {
          playerSummary.dribbles +=1; // Counts attempted dribbles
          playerSummary.ballsPlayed +=1;
        }
        targetTeamStats.ballsPlayed +=1; // Team of the dribbler
        break;
      case 'pressure':
        if (playerSummary && event.event_data) {
          const pressureData = event.event_data as PressureEventData;

          if (pressureData.outcome) {
            playerSummary.totalPressures += 1;

            const successfulPressureOutcomes: Array<PressureEventData['outcome']> = [
              'regain_possession',
              'forced_turnover_error',
              'foul_won'
            ];

            if (successfulPressureOutcomes.includes(pressureData.outcome)) {
              playerSummary.successfulPressures += 1;
            }

            if (pressureData.outcome === 'regain_possession') {
              playerSummary.pressureRegains += 1;
            }
          }
        }
        // Note: Team-level pressure stats are not being aggregated in this step.
        break;
      // Other event types like 'freeKick', 'throwIn', 'goalKick', 'substitution', etc.
      // can be added here if they contribute to specific stats.
      // For example, 'substitution' doesn't usually count towards typical stats tables
      // unless tracking appearances.

      // New Event Types Handling
      case 'supportPass':
        targetTeamStats.supportPasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass, also count towards general pass stats
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.supportPasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'offensivePass':
        targetTeamStats.offensivePasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          // playerSummary.offensivePasses += 1; // Interface PlayerStatSummary does not have offensivePasses
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'longPass':
        targetTeamStats.longPasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.longPasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'forwardPass':
        targetTeamStats.forwardPasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.forwardPasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'backwardPass':
        targetTeamStats.backwardPasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.backwardPasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'lateralPass':
        targetTeamStats.lateralPasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.lateralPasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'ballRecovered':
        targetTeamStats.ballsRecovered += 1;
        targetTeamStats.ballsPlayed +=1; // Considered a play
        if (playerSummary) {
          playerSummary.ballsRecovered += 1;
          playerSummary.ballsPlayed += 1;
        }
        break;
      case 'ballLost':
        targetTeamStats.ballsLost += 1;
        targetTeamStats.ballsPlayed +=1; // Considered a play, albeit negative
        if (playerSummary) {
          playerSummary.ballsGiven += 1; // Player specific "ball lost"
          playerSummary.ballsPlayed += 1;
        }
        break;
      case 'contact':
        targetTeamStats.contacts += 1;
        targetTeamStats.ballsPlayed +=1; // A contact involves playing the ball
        if (playerSummary) {
          playerSummary.contacts += 1;
          playerSummary.ballsPlayed += 1;
        }
        break;
      case 'freeKick': // This is the awarding of a free kick.
        targetTeamStats.freeKicks += 1;
        // Taking the free kick (pass or shot) would be a separate event and count as ballsPlayed there.
        break;
      case '6MeterViolation':
        targetTeamStats.sixMeterViolations += 1;
        break;
      case 'postHit': // This event type might be redundant if shotData.hitPost is primary
        // If this event is separate from a 'shot' event:
        // targetTeamStats.footShotsPostHits +=1; // Or header, need more info from PostHitEventData
        // if (playerSummary) playerSummary.footShotsPostHits +=1;
        // For now, relying on shotData.hitPost in the 'shot' event.
        break;
      case 'aerialDuelWon':
        targetTeamStats.aerialDuelsWon += 1;
        targetTeamStats.duelsWon += 1; // Add to general duels won
        targetTeamStats.ballsPlayed +=1;
        if (playerSummary) {
          playerSummary.aerialDuelsWon += 1;
          playerSummary.duelsWon += 1;
          playerSummary.ballsPlayed += 1;
        }
        break;
      case 'aerialDuelLost':
        targetTeamStats.aerialDuelsLost += 1;
        targetTeamStats.duelsLost += 1; // Add to general duels lost
        targetTeamStats.ballsPlayed +=1;
        if (playerSummary) {
          playerSummary.aerialDuelsLost += 1;
          playerSummary.duelsLost += 1;
          playerSummary.ballsPlayed += 1;
        }
        break;
      case 'decisivePass':
        targetTeamStats.decisivePasses += 1;
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.decisivePasses += 1;
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'successfulCross': // Specific event for a successful cross
        targetTeamStats.successfulCrosses += 1;
        targetTeamStats.crosses += 1; // Also count towards general attempted crosses if not already
        targetTeamStats.ballsPlayed +=1;
        // Assuming this is a successful pass
        targetTeamStats.passesAttempted += 1;
        targetTeamStats.passesCompleted += 1;
        if (playerSummary) {
          playerSummary.successfulCrosses += 1;
          playerSummary.crosses += 1; // Ensure general crosses are counted if this is the only cross event for this action
          playerSummary.ballsPlayed += 1;
          playerSummary.passesAttempted += 1;
          playerSummary.passesCompleted += 1;
        }
        break;
      case 'successfulDribble':
        targetTeamStats.successfulDribbles += 1;
        targetTeamStats.ballsPlayed +=1;
        if (playerSummary) {
          playerSummary.successfulDribbles += 1;
          playerSummary.dribbles += 1; // Ensure general dribbles are counted
          playerSummary.ballsPlayed += 1;
        }
        break;

      default:
        // Handle other event types or ignore
        // console.log("Unhandled event type:", event.type);
        break;
    }
  }

  // Post-loop processing for stats that might need it (e.g. possession percentage if calculated from events)
  // For now, possession related stats are placeholders or require external calculation.

  return {
    homeTeamStats,
    awayTeamStats,
    playerStats: Array.from(playerStatsMap.values()),
  };
}
