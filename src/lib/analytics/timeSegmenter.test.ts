import { segmentEventsByTime } from './timeSegmenter';
import { MatchEvent, EventType } from '@/types';

const baseEvent: Omit<MatchEvent, 'type' | 'timestamp' | 'id' | 'coordinates' | 'event_data'> = {
  match_id: 'match1',
  created_at: new Date().toISOString(),
};

describe('segmentEventsByTime', () => {
  it('should return an empty array if no events are provided', () => {
    const result = segmentEventsByTime([], 5, 90);
    expect(result).toEqual([]);
  });

  it('should return an empty array if intervalMinutes is zero or negative', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
    ];
    expect(segmentEventsByTime(events, 0, 90)).toEqual([]);
    expect(segmentEventsByTime(events, -5, 90)).toEqual([]);
  });

  it('should return an empty array if matchDurationMinutes is zero or negative', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
    ];
    expect(segmentEventsByTime(events, 5, 0)).toEqual([]);
    expect(segmentEventsByTime(events, 5, -90)).toEqual([]);
  });

  it('should correctly segment events into 5-minute intervals for a 10-minute match', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 50, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} }, // 0-5 min segment (index 0)
      { ...baseEvent, id: 'e2', timestamp: 299, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} }, // 0-5 min segment
      { ...baseEvent, id: 'e3', timestamp: 300, type: 'foul', team: 'home', player_id: 'P3', coordinates: {x:0,y:0}, event_data: {} }, // 5-10 min segment (index 1)
      { ...baseEvent, id: 'e4', timestamp: 599, type: 'corner', team: 'away', player_id: 'P4', coordinates: {x:0,y:0}, event_data: {} }, // 5-10 min segment
    ];
    const intervalMinutes = 5;
    const matchDurationMinutes = 10; // 600 seconds
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);

    expect(result.length).toBe(2); // 10 min match / 5 min interval = 2 segments
    expect(result[0].length).toBe(2);
    expect(result[0]).toEqual(expect.arrayContaining([events[0], events[1]]));
    expect(result[1].length).toBe(2);
    expect(result[1]).toEqual(expect.arrayContaining([events[2], events[3]]));
  });

  it('should handle events exactly on interval boundaries', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 0, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },    // Seg 0
      { ...baseEvent, id: 'e2', timestamp: 300, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} }, // Seg 1 (5*60 = 300)
      { ...baseEvent, id: 'e3', timestamp: 600, type: 'foul', team: 'home', player_id: 'P3', coordinates: {x:0,y:0}, event_data: {} }, // Seg 2 (or last seg if match ends at 600)
    ];
    const intervalMinutes = 5;
    const matchDurationMinutes = 15; // 900 seconds. 3 segments.
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);

    expect(result.length).toBe(3);
    expect(result[0]).toEqual([events[0]]);
    expect(result[1]).toEqual([events[1]]);
    expect(result[2]).toEqual([events[2]]);
  });

  it('should place an event exactly at match end time into the last segment', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 599, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} }, // Seg 1
      { ...baseEvent, id: 'e2', timestamp: 600, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} }, // Seg 1 (last segment)
    ];
    const intervalMinutes = 5; // 300s
    const matchDurationMinutes = 10; // 600s. 2 segments.
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);

    expect(result.length).toBe(2);
    expect(result[0].length).toBe(0); // No events in 0-299s
    expect(result[1].length).toBe(2); // Both events in 300-600s segment
    expect(result[1]).toEqual(expect.arrayContaining([events[0], events[1]]));
  });


  it('should handle a match duration shorter than the interval (one segment)', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 50, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e2', timestamp: 100, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} },
    ];
    const intervalMinutes = 15;
    const matchDurationMinutes = 10;
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);

    expect(result.length).toBe(1); // Match duration / interval = 10/15 = 0.66 => 1 segment
    expect(result[0].length).toBe(2);
    expect(result[0]).toEqual(expect.arrayContaining([events[0], events[1]]));
  });

  it('should ignore events with timestamps beyond matchDurationMinutes', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: 50, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} }, // Valid
      { ...baseEvent, id: 'e2', timestamp: 650, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} }, // Invalid (10 min match = 600s)
    ];
    const intervalMinutes = 5;
    const matchDurationMinutes = 10;
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);

    expect(result.length).toBe(2);
    expect(result[0].length).toBe(1);
    expect(result[0]).toEqual([events[0]]);
    expect(result[1].length).toBe(0); // e2 is ignored
  });

  it('should handle events with negative timestamps by skipping them', () => {
    const events: MatchEvent[] = [
      { ...baseEvent, id: 'e1', timestamp: -10, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e2', timestamp: 50, type: 'shot', team: 'away', player_id: 'P2', coordinates: {x:0,y:0}, event_data: {} },
    ];
    const intervalMinutes = 5;
    const matchDurationMinutes = 10;
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(1);
    expect(result[0]).toEqual([events[1]]);
    expect(result[1].length).toBe(0);
  });

  it('should create the correct number of segments for a standard 90-min match with 15-min intervals', () => {
    const events: MatchEvent[] = [ // Events spread throughout
      { ...baseEvent, id: 'e1', timestamp: 10*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e2', timestamp: 20*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e3', timestamp: 40*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e4', timestamp: 50*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e5', timestamp: 70*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
      { ...baseEvent, id: 'e6', timestamp: 85*60, type: 'pass', team: 'home', player_id: 'P1', coordinates: {x:0,y:0}, event_data: {} },
    ];
    const intervalMinutes = 15;
    const matchDurationMinutes = 90;
    const result = segmentEventsByTime(events, intervalMinutes, matchDurationMinutes);
    expect(result.length).toBe(6); // 90 / 15 = 6 segments
    expect(result[0]).toEqual([events[0]]); // 0-15 min (0-900s), event at 600s
    expect(result[1]).toEqual([events[1]]); // 15-30 min (900-1800s), event at 1200s
    expect(result[2]).toEqual([events[2]]); // 30-45 min (1800-2700s), event at 2400s
    expect(result[3]).toEqual([events[3]]); // 45-60 min (2700-3600s), event at 3000s
    expect(result[4]).toEqual([events[4]]); // 60-75 min (3600-4500s), event at 4200s
    expect(result[5]).toEqual([events[5]]); // 75-90 min (4500-5400s), event at 5100s
  });
});
