import { MatchEvent, Player, TeamDetailedStats } from '@/types'; // Assuming AggregatedStats uses TeamDetailedStats
import { aggregateMatchEvents, AggregatedStats } from './eventAggregator'; // Existing aggregator

/**
 * Aggregates statistics for each time segment of a match.
 * @param segmentedEvents - An array of arrays, where each inner array contains MatchEvents for a segment.
 * @param homePlayers - Array of home team players.
 * @param awayPlayers - Array of away team players.
 * @returns An array of AggregatedStats objects, one for each time segment.
 */
export function aggregateStatsForSegments(
  segmentedEvents: MatchEvent[][],
  homePlayers: Player[],
  awayPlayers: Player[]
): AggregatedStats[] {
  if (!segmentedEvents) {
    return [];
  }

  const segmentStats: AggregatedStats[] = [];

  for (const eventSegment of segmentedEvents) {
    // For each segment, call the existing aggregateMatchEvents function.
    // aggregateMatchEvents is expected to return an AggregatedStats object which contains
    // homeTeamStats and awayTeamStats (of type TeamDetailedStats after previous updates)
    // and playerStats (of type PlayerStatSummary[]).
    const aggregatedSegmentData = aggregateMatchEvents(eventSegment, homePlayers, awayPlayers);
    segmentStats.push(aggregatedSegmentData);
  }

  return segmentStats;
}
