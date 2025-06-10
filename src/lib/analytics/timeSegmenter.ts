import { MatchEvent } from '@/types'; // Assuming MatchEvent is in @/types

/**
 * Segments match events into time intervals.
 * @param events - Array of MatchEvent objects, sorted by timestamp.
 * @param intervalMinutes - The duration of each time segment in minutes.
 * @param matchDurationMinutes - The total duration of the match in minutes.
 * @returns An array of arrays, where each inner array contains events for a segment.
 */
export function segmentEventsByTime(
  events: MatchEvent[],
  intervalMinutes: number,
  matchDurationMinutes: number
): MatchEvent[][] {
  if (!events || events.length === 0 || intervalMinutes <= 0 || matchDurationMinutes <= 0) {
    return [];
  }

  const intervalSeconds = intervalMinutes * 60;
  const matchDurationSeconds = matchDurationMinutes * 60;
  const numberOfSegments = Math.ceil(matchDurationSeconds / intervalSeconds);

  const segmentedEvents: MatchEvent[][] = Array.from({ length: numberOfSegments }, () => []);

  for (const event of events) {
    // Assuming event.timestamp is in seconds from the start of the match
    const timestampInSeconds = event.timestamp;

    if (timestampInSeconds < 0) continue; // Skip events with negative timestamp

    const segmentIndex = Math.floor(timestampInSeconds / intervalSeconds);

    if (segmentIndex < numberOfSegments) {
      segmentedEvents[segmentIndex].push(event);
    } else if (timestampInSeconds === matchDurationSeconds && segmentIndex === numberOfSegments) {
      // Edge case: Event exactly at match end, goes into the last segment
      segmentedEvents[numberOfSegments - 1].push(event);
    }
    // Events beyond matchDurationMinutes (if any) are ignored unless they fall into the last segment due to exact match end.
  }

  return segmentedEvents;
}
