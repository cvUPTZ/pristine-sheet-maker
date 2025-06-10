import { aggregateMatchEvents, initializeTeamStats, initializePlayerStatSummary } from './eventAggregator';
import { MatchEvent, Player, EventType, TeamDetailedStats, PlayerStatSummary } from '@/types'; // Assuming types are accessible
import { ShotEventData, PassEventData, AerialDuelWonEventData, AerialDuelLostEventData, BallLostEventData, BallRecoveryEventData, ContactEventData, DecisivePassEventData, SuccessfulCrossEventData, SuccessfulDribbleEventData, SupportPassEventData, OffensivePassEventData, LongPassEventData, ForwardPassEventData, BackwardPassEventData, LateralPassEventData, FreeKickEventData, SixMeterViolationEventData } from '@/types/eventData';

// Mock for xgCalculator if it's complex or has external dependencies
jest.mock('./xgCalculator', () => ({
  calculateXg: jest.fn((shotData, coordinates) => {
    // Simple mock xG: 0.1 for on_target, 0.05 for off_target, 0.2 if "dangerous" situation
    if (shotData.situation === 'dangerous_mock') return 0.2;
    return shotData.on_target ? 0.1 : 0.05;
  }),
}));

const mockHomePlayer1: Player = { id: 'H1', name: 'Home Player 1', player_name: 'H. PlayerOne', position: 'Forward', number: 10, teamId: 'home' };
const mockHomePlayer2: Player = { id: 'H2', name: 'Home Player 2', player_name: 'H. PlayerTwo', position: 'Midfielder', number: 8, teamId: 'home' };
const mockAwayPlayer1: Player = { id: 'A1', name: 'Away Player 1', player_name: 'A. PlayerOne', position: 'Defender', number: 5, teamId: 'away' };
const mockAwayPlayer2: Player = { id: 'A2', name: 'Away Player 2', player_name: 'A. PlayerTwo', position: 'Goalkeeper', number: 1, teamId: 'away' };

const homePlayers: Player[] = [mockHomePlayer1, mockHomePlayer2];
const awayPlayers: Player[] = [mockAwayPlayer1, mockAwayPlayer2];

const baseEvent: Omit<MatchEvent, 'type' | 'event_data' | 'player_id' | 'team' | 'id' | 'timestamp' | 'coordinates'> = {
  match_id: 'match1',
  created_at: new Date().toISOString(),
};

describe('aggregateMatchEvents', () => {
  it('should initialize with zero stats for no events', () => {
    const aggregated = aggregateMatchEvents([], homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats).toEqual(initializeTeamStats());
    expect(aggregated.awayTeamStats).toEqual(initializeTeamStats());
    expect(aggregated.playerStats).toEqual([]);
  });

  it('should count a simple shot for home team and player', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 100, type: 'shot', team: 'home', player_id: 'H1', coordinates: { x: 80, y: 50 }, event_data: { on_target: true } as ShotEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats.shots).toBe(1);
    expect(aggregated.homeTeamStats.shotsOnTarget).toBe(1);
    expect(aggregated.homeTeamStats.totalXg).toBe(0.1); // From mock
    expect(aggregated.awayTeamStats.shots).toBe(0);

    const playerStat = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerStat).toBeDefined();
    expect(playerStat?.shots).toBe(1);
    expect(playerStat?.shotsOnTarget).toBe(1);
    expect(playerStat?.totalXg).toBe(0.1);
    expect(playerStat?.ballsPlayed).toBe(1);
  });

  it('should correctly aggregate goals and assists', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 120, type: 'shot', team: 'away', player_id: 'A1', coordinates: { x: 15, y: 50 }, event_data: { on_target: true, is_goal: true } as ShotEventData },
      { ...baseEvent, id: 'e2', timestamp: 115, type: 'assist', team: 'away', player_id: 'A2', coordinates: { x: 30, y: 40 }, event_data: {} }, // Assuming assist implies successful pass action for player
    ];
     // The 'goal' event itself is usually separate. Here is_goal in shot is used.
     // Let's add a goal event for clarity if the system relies on it
    events.push({ ...baseEvent, id: 'e3', timestamp: 121, type: 'goal', team: 'away', player_id: 'A1', coordinates: { x: 15, y: 50 }, event_data: {} });

    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.awayTeamStats.goals).toBe(1); // From 'goal' event
    expect(aggregated.awayTeamStats.assists).toBe(1);

    const scorerStat = aggregated.playerStats.find(p => p.playerId === 'A1');
    expect(scorerStat?.goals).toBe(1); // From 'goal' event

    const assisterStat = aggregated.playerStats.find(p => p.playerId === 'A2');
    expect(assisterStat?.assists).toBe(1);
  });

  it('should aggregate various pass types for team and player', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'p1', timestamp: 200, type: 'pass', team: 'home', player_id: 'H1', coordinates: {x:10,y:10}, event_data: { success: true, recipient_player_id: 'H2', end_coordinates: {x:20,y:20} } as PassEventData },
      { ...baseEvent, id: 'p2', timestamp: 201, type: 'supportPass', team: 'home', player_id: 'H2', coordinates: {x:20,y:20}, event_data: {} as SupportPassEventData },
      { ...baseEvent, id: 'p3', timestamp: 202, type: 'offensivePass', team: 'home', player_id: 'H1', coordinates: {x:30,y:30}, event_data: {} as OffensivePassEventData },
      { ...baseEvent, id: 'p4', timestamp: 203, type: 'longPass', team: 'home', player_id: 'H2', coordinates: {x:40,y:40}, event_data: {} as LongPassEventData },
      { ...baseEvent, id: 'p5', timestamp: 204, type: 'forwardPass', team: 'home', player_id: 'H1', coordinates: {x:50,y:50}, event_data: {} as ForwardPassEventData },
      { ...baseEvent, id: 'p6', timestamp: 205, type: 'backwardPass', team: 'home', player_id: 'H2', coordinates: {x:60,y:60}, event_data: {} as BackwardPassEventData },
      { ...baseEvent, id: 'p7', timestamp: 206, type: 'lateralPass', team: 'home', player_id: 'H1', coordinates: {x:70,y:70}, event_data: {} as LateralPassEventData },
      { ...baseEvent, id: 'p8', timestamp: 207, type: 'decisivePass', team: 'home', player_id: 'H2', coordinates: {x:80,y:80}, event_data: {} as DecisivePassEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);

    expect(aggregated.homeTeamStats.passesAttempted).toBe(7); // 1 'pass' + 6 specific successful pass types
    expect(aggregated.homeTeamStats.passesCompleted).toBe(7); // All assumed successful for specific types
    expect(aggregated.homeTeamStats.supportPasses).toBe(1);
    expect(aggregated.homeTeamStats.offensivePasses).toBe(1);
    expect(aggregated.homeTeamStats.longPasses).toBe(1);
    expect(aggregated.homeTeamStats.forwardPasses).toBe(1);
    expect(aggregated.homeTeamStats.backwardPasses).toBe(1);
    expect(aggregated.homeTeamStats.lateralPasses).toBe(1);
    expect(aggregated.homeTeamStats.decisivePasses).toBe(1);

    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.passesAttempted).toBe(4); // pass, offensive, forward, lateral
    expect(playerH1?.passesCompleted).toBe(4);
    // PlayerStatSummary does not have offensivePasses, so not checking here.
    expect(playerH1?.forwardPasses).toBe(1);
    expect(playerH1?.lateralPasses).toBe(1);


    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.supportPasses).toBe(1);
    expect(playerH2?.longPasses).toBe(1);
    expect(playerH2?.backwardPasses).toBe(1);
    expect(playerH2?.decisivePasses).toBe(1);
    expect(playerH2?.ballsReceived).toBe(1); // From p1
  });

  it('should count ball control events (lost, recovered, contacts)', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'bc1', timestamp: 300, type: 'ballLost', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} as BallLostEventData },
      { ...baseEvent, id: 'bc2', timestamp: 301, type: 'ballRecovered', team: 'away', player_id: 'A1', coordinates: {x:1,y:1}, event_data: {} as BallRecoveryEventData },
      { ...baseEvent, id: 'bc3', timestamp: 302, type: 'contact', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} as ContactEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats.ballsLost).toBe(1);
    expect(aggregated.homeTeamStats.contacts).toBe(1);
    expect(aggregated.awayTeamStats.ballsRecovered).toBe(1);

    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.ballsGiven).toBe(1);
    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.contacts).toBe(1);
    const playerA1 = aggregated.playerStats.find(p => p.playerId === 'A1');
    expect(playerA1?.ballsRecovered).toBe(1);
  });

  it('should count duel events (aerialWon, aerialLost)', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'd1', timestamp: 400, type: 'aerialDuelWon', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} as AerialDuelWonEventData },
      { ...baseEvent, id: 'd2', timestamp: 401, type: 'aerialDuelLost', team: 'away', player_id: 'A1', coordinates: {x:1,y:1}, event_data: {} as AerialDuelLostEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats.aerialDuelsWon).toBe(1);
    expect(aggregated.homeTeamStats.duelsWon).toBe(1);
    expect(aggregated.awayTeamStats.aerialDuelsLost).toBe(1);
    expect(aggregated.awayTeamStats.duelsLost).toBe(1);

    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.aerialDuelsWon).toBe(1);
    expect(playerH1?.duelsWon).toBe(1);
    const playerA1 = aggregated.playerStats.find(p => p.playerId === 'A1');
    expect(playerA1?.aerialDuelsLost).toBe(1);
    expect(playerA1?.duelsLost).toBe(1);
  });

  it('should count game actions (freeKick, 6MeterViolation, successfulCross, successfulDribble)', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'ga1', timestamp: 500, type: 'freeKick', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} as FreeKickEventData },
      { ...baseEvent, id: 'ga2', timestamp: 501, type: '6MeterViolation', team: 'away', player_id: 'A1', coordinates: {x:1,y:1}, event_data: {} as SixMeterViolationEventData },
      { ...baseEvent, id: 'ga3', timestamp: 502, type: 'successfulCross', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} as SuccessfulCrossEventData },
      { ...baseEvent, id: 'ga4', timestamp: 503, type: 'successfulDribble', team: 'away', player_id: 'A2', coordinates: {x:1,y:1}, event_data: {} as SuccessfulDribbleEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats.freeKicks).toBe(1);
    expect(aggregated.homeTeamStats.successfulCrosses).toBe(1);
    expect(aggregated.awayTeamStats.sixMeterViolations).toBe(1);
    expect(aggregated.awayTeamStats.successfulDribbles).toBe(1);

    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.successfulCrosses).toBe(1);
    const playerA2 = aggregated.playerStats.find(p => p.playerId === 'A2');
    expect(playerA2?.successfulDribbles).toBe(1);
  });

  it('should correctly categorize shots (foot/header, dangerous/non-dangerous, on/off target, post, blocked)', () => {
    const events: MatchEvent[] = [
      // Home Foot Shots
      { ...baseEvent, id: 's1', timestamp: 600, type: 'shot', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: { on_target: true, isHeader: false, situation: 'dangerous_mock' } as ShotEventData }, // Dangerous Foot On Target (xG: 0.2)
      { ...baseEvent, id: 's2', timestamp: 601, type: 'shot', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: { on_target: false, isHeader: false, hitPost: true } as ShotEventData }, // Non-Dangerous Foot Hit Post (xG: 0.05)
      // Home Header Shots
      { ...baseEvent, id: 's3', timestamp: 602, type: 'shot', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: { on_target: false, isHeader: true } as ShotEventData }, // Non-Dangerous Header Off Target (xG: 0.05)
      // Away Shot (Placeholder for Blocked - current logic doesn't explicitly set blocked from shot event)
      { ...baseEvent, id: 's4', timestamp: 603, type: 'shot', team: 'away', player_id: 'A1', coordinates: {x:1,y:1}, event_data: { on_target: false, isHeader: false } as ShotEventData }, // Non-Dangerous Foot Off Target (xG: 0.05)
      // Assume a block event would be separate for the defender. The shooter's stat for 'blocked' is tricky.
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);

    // Home Team Shot Stats
    expect(aggregated.homeTeamStats.shots).toBe(3);
    expect(aggregated.homeTeamStats.shotsOnTarget).toBe(1); // s1
    expect(aggregated.homeTeamStats.totalXg).toBeCloseTo(0.2 + 0.05 + 0.05); // s1 + s2 + s3

    expect(aggregated.homeTeamStats.dangerousFootShots).toBe(1); // s1
    expect(aggregated.homeTeamStats.nonDangerousFootShots).toBe(1); // s2
    expect(aggregated.homeTeamStats.footShotsOnTarget).toBe(1); // s1
    expect(aggregated.homeTeamStats.footShotsPostHits).toBe(1); // s2
    // expect(aggregated.homeTeamStats.footShotsBlocked).toBe(0); // No explicit block for H1

    expect(aggregated.homeTeamStats.nonDangerousHeaderShots).toBe(1); // s3
    expect(aggregated.homeTeamStats.headerShotsOffTarget).toBe(1); // s3
    // expect(aggregated.homeTeamStats.headerShotsBlocked).toBe(0);

    // Player H1
    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.shots).toBe(2);
    expect(playerH1?.shotsOnTarget).toBe(1);
    expect(playerH1?.dangerousFootShots).toBe(1);
    expect(playerH1?.nonDangerousFootShots).toBe(1);
    expect(playerH1?.footShotsOnTarget).toBe(1);
    expect(playerH1?.footShotsPostHits).toBe(1);

    // Player H2
    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.shots).toBe(1);
    expect(playerH2?.nonDangerousHeaderShots).toBe(1);
    expect(playerH2?.headerShotsOffTarget).toBe(1);
  });

  it('should handle progressive passes and passes to final third correctly', () => {
    // Assuming PITCH_LENGTH = 105
    const events: MatchEvent[] = [
      // Progressive pass from own half
      { ...baseEvent, id: 'pp1', timestamp: 700, type: 'pass', team: 'home', player_id: 'H1',
        coordinates: { x: 30, y: 30 },
        event_data: { success: true, end_coordinates: { x: 70, y: 30 } } as PassEventData }, // Prog: Yes (40m gain from x=30)
      // Pass to final third (final third starts at x=70 if PITCH_LENGTH=105)
      { ...baseEvent, id: 'pft1', timestamp: 701, type: 'pass', team: 'home', player_id: 'H2',
        coordinates: { x: 60, y: 30 },
        event_data: { success: true, end_coordinates: { x: 80, y: 30 } } as PassEventData }, // ToFinalThird: Yes
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.progressivePasses).toBe(1);

    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.passesToFinalThird).toBe(1);
    // This pass (60 to 80) might also be progressive (20m gain from opponent half but not final third)
    expect(playerH2?.progressivePasses).toBe(1);
  });

  it('should build passNetworkSent for players', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'pn1', timestamp: 800, type: 'pass', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: { success: true, recipient_player_id: 'H2' } as PassEventData },
      { ...baseEvent, id: 'pn2', timestamp: 801, type: 'pass', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: { success: false, recipient_player_id: 'H2' } as PassEventData },
      { ...baseEvent, id: 'pn3', timestamp: 802, type: 'pass', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: { success: true, recipient_player_id: 'H2' } as PassEventData },
    ];
    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.passNetworkSent).toBeDefined();
    expect(playerH1?.passNetworkSent.length).toBe(1);
    expect(playerH1?.passNetworkSent[0].toPlayerId).toBe('H2');
    expect(playerH1?.passNetworkSent[0].count).toBe(3);
    expect(playerH1?.passNetworkSent[0].successfulCount).toBe(2);
  });

  it('should correctly sum ballsPlayed for various actions', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 's1', timestamp: 100, type: 'shot', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {on_target: true} as ShotEventData },
      { ...baseEvent, id: 'p1', timestamp: 200, type: 'pass', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {success: true} as PassEventData },
      { ...baseEvent, id: 'sp1', timestamp: 201, type: 'supportPass', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} },
      { ...baseEvent, id: 'bl1', timestamp: 300, type: 'ballLost', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} },
      { ...baseEvent, id: 'br1', timestamp: 301, type: 'ballRecovered', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} },
      { ...baseEvent, id: 'ct1', timestamp: 302, type: 'contact', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} },
      { ...baseEvent, id: 'adw1', timestamp: 400, type: 'aerialDuelWon', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} },
      { ...baseEvent, id: 'adl1', timestamp: 401, type: 'aerialDuelLost', team: 'home', player_id: 'H1', coordinates: {x:1,y:1}, event_data: {} }, // Player involved in duel still "played"
      { ...baseEvent, id: 'tk1', timestamp: 402, type: 'tackle', team: 'home', player_id: 'H2', coordinates: {x:1,y:1}, event_data: {} },
    ];

    const aggregated = aggregateMatchEvents(events, homePlayers, awayPlayers);
    expect(aggregated.homeTeamStats.ballsPlayed).toBe(events.length); // Each event increments team's ballsPlayed

    const playerH1 = aggregated.playerStats.find(p => p.playerId === 'H1');
    expect(playerH1?.ballsPlayed).toBe(5); // shot, pass, ballLost, contact, aerialDuelLost

    const playerH2 = aggregated.playerStats.find(p => p.playerId === 'H2');
    expect(playerH2?.ballsPlayed).toBe(4); // supportPass, ballRecovered, aerialDuelWon, tackle
  });

});
