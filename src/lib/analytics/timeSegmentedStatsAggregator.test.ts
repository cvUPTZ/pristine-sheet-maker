import { aggregateStatsForSegments } from './timeSegmentedStatsAggregator';
import { aggregateMatchEvents, AggregatedStats, initializeTeamStats } from './eventAggregator'; // Actual aggregateMatchEvents
import { MatchEvent, Player, TeamDetailedStats, PlayerStatSummary } from '@/types';

// Mock the actual aggregateMatchEvents function to control its output and check calls
jest.mock('./eventAggregator', () => ({
  ...jest.requireActual('./eventAggregator'), // Import and retain default exports like initializeTeamStats
  aggregateMatchEvents: jest.fn(),
}));

const mockPlayer1: Player = { id: 'P1', name: 'Player 1', player_name: 'P. One', position: 'Midfielder', number: 10 };
const mockPlayer2: Player = { id: 'P2', name: 'Player 2', player_name: 'P. Two', position: 'Forward', number: 9 };
const homePlayers: Player[] = [mockPlayer1];
const awayPlayers: Player[] = [mockPlayer2];

const baseEvent: Omit<MatchEvent, 'type' | 'timestamp' | 'id' | 'coordinates' | 'event_data'> = {
  match_id: 'testMatch',
  created_at: new Date().toISOString(),
};

describe('aggregateStatsForSegments', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    (aggregateMatchEvents as jest.Mock).mockClear();
  });

  it('should return an empty array if segmentedEvents is null or empty', () => {
    expect(aggregateStatsForSegments([], homePlayers, awayPlayers)).toEqual([]);
    // expect(aggregateStatsForSegments(null as any, homePlayers, awayPlayers)).toEqual([]); // Not testing null directly as TS expects array
  });

  it('should call aggregateMatchEvents for each segment and return collected results', () => {
    const segment1Events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', type: 'pass', timestamp: 100, team: 'home', player_id: 'P1', coordinates:{x:0,y:0}, event_data:{} },
    ];
    const segment2Events: MatchEvent[] = [
      { ...baseEvent, id: 'e2', type: 'shot', timestamp: 700, team: 'away', player_id: 'P2', coordinates:{x:0,y:0}, event_data:{} },
    ];
    const segmentedEvents: MatchEvent[][] = [segment1Events, segment2Events];

    const mockAggregatedStats1: AggregatedStats = {
      homeTeamStats: { ...initializeTeamStats(), shots: 1 } as TeamDetailedStats,
      awayTeamStats: initializeTeamStats(),
      playerStats: [],
    };
    const mockAggregatedStats2: AggregatedStats = {
      homeTeamStats: initializeTeamStats(),
      awayTeamStats: { ...initializeTeamStats(), passesAttempted: 5 } as TeamDetailedStats,
      playerStats: [],
    };

    (aggregateMatchEvents as jest.Mock)
      .mockReturnValueOnce(mockAggregatedStats1)
      .mockReturnValueOnce(mockAggregatedStats2);

    const result = aggregateStatsForSegments(segmentedEvents, homePlayers, awayPlayers);

    expect(aggregateMatchEvents).toHaveBeenCalledTimes(2);
    expect(aggregateMatchEvents).toHaveBeenCalledWith(segment1Events, homePlayers, awayPlayers);
    expect(aggregateMatchEvents).toHaveBeenCalledWith(segment2Events, homePlayers, awayPlayers);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual(mockAggregatedStats1);
    expect(result[1]).toEqual(mockAggregatedStats2);
  });

  it('should handle segments with no events', () => {
    const segment1Events: MatchEvent[] = []; // Empty segment
    const segment2Events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', type: 'shot', timestamp: 700, team: 'home', player_id: 'P1', coordinates:{x:0,y:0}, event_data:{} },
    ];
    const segmentedEvents: MatchEvent[][] = [segment1Events, segment2Events];

    const mockEmptySegmentStats: AggregatedStats = { // What aggregateMatchEvents returns for empty events
      homeTeamStats: initializeTeamStats(),
      awayTeamStats: initializeTeamStats(),
      playerStats: [],
    };
    const mockSegment2Stats: AggregatedStats = {
      homeTeamStats: { ...initializeTeamStats(), shots: 1 } as TeamDetailedStats,
      awayTeamStats: initializeTeamStats(),
      playerStats: [],
    };

    (aggregateMatchEvents as jest.Mock)
      .mockReturnValueOnce(mockEmptySegmentStats)
      .mockReturnValueOnce(mockSegment2Stats);

    const result = aggregateStatsForSegments(segmentedEvents, homePlayers, awayPlayers);

    expect(aggregateMatchEvents).toHaveBeenCalledTimes(2);
    expect(aggregateMatchEvents).toHaveBeenCalledWith(segment1Events, homePlayers, awayPlayers);
    expect(result[0]).toEqual(mockEmptySegmentStats); // Expect initialized stats for empty segment
    expect(result[1]).toEqual(mockSegment2Stats);
  });
});
