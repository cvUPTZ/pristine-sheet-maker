# Unit Test Cases for Event Data Structures and Logic

This document outlines test cases for verifying the correct creation and consumption of `MatchEvent` objects, with a particular focus on the typed `event_data` field.

## 1. Testing Event Creation Logic (e.g., in `useMatchState.ts` or helpers)

**Objective:** Ensure `MatchEvent` objects are created with correctly structured and typed `event_data`.

**Test Suite: `EventCreation`**

*   **Test Case 1.1: Create a 'shot' event with specific `ShotEventData`**
    *   **Setup:** Call the event creation function (e.g., a wrapper around `recordEvent` from `useMatchState` or the function itself if testable in isolation) with `eventType: 'shot'` and provide details for `ShotEventData` (e.g., `on_target: true`, `body_part_used: 'right_foot'`).
    *   **Assertion:**
        *   The returned `MatchEvent` object should have `event.type === 'shot'`.
        *   `event.event_data` should not be null.
        *   `(event.event_data as ShotEventData).on_target` should be `true`.
        *   `(event.event_data as ShotEventData).body_part_used` should be `'right_foot'`.
        *   Other fields in `ShotEventData` not provided should be `undefined` or their specified defaults.

*   **Test Case 1.2: Create a 'shot' event with minimal data**
    *   **Setup:** Call event creation for a 'shot' event, providing only mandatory data for `MatchEvent` and minimal or no specific `ShotEventData` details (e.g., only `on_target: false`).
    *   **Assertion:**
        *   `event.type === 'shot'`.
        *   `event.event_data` should be an object conforming to `ShotEventData`.
        *   `(event.event_data as ShotEventData).on_target` should be `false`.
        *   Optional fields like `body_part_used` should be `undefined`.

*   **Test Case 1.3: Create a 'pass' event with specific `PassEventData`**
    *   **Setup:** Call event creation for `eventType: 'pass'` with details for `PassEventData` (e.g., `success: true`, `recipient_player_id: 'player2'`, `end_coordinates: {x: 50, y: 50}`).
    *   **Assertion:**
        *   `event.type === 'pass'`.
        *   `event.event_data` should not be null.
        *   `(event.event_data as PassEventData).success` should be `true`.
        *   `(event.event_data as PassEventData).recipient_player_id` should be `'player2'`.
        *   `(event.event_data as PassEventData).end_coordinates` should deep equal `{x: 50, y: 50}`.

*   **Test Case 1.4: Create a 'pass' event with `recipient_player_id` (from old `relatedPlayerId`)**
    *   **Setup:** Specifically test the logic in `useMatchState.recordPass` (or its equivalent) that moves `relatedPlayerId` into `event_data.recipient_player_id`.
    *   **Assertion:**
        *   `(event.event_data as PassEventData).recipient_player_id` should be correctly populated.
        *   The top-level `relatedPlayerId` field on `MatchEvent` should no longer exist or be undefined.

*   **Test Case 1.5: Create an event with no specific `event_data` details**
    *   **Setup:** Call event creation for an event type that might not have detailed `event_data` initially (e.g., 'foul' if `FoulCommittedEventData` fields are all optional).
    *   **Assertion:**
        *   `event.event_data` should be an empty object `{}` or `null` if that's the defined behavior for event types that currently have no specific `event_data` fields defined as mandatory. (The current implementation of `recordEvent` in `useMatchState` would likely create a default typed object, e.g. `FoulCommittedEventData: {}`). This needs to align with the implementation.

*   **Test Case 1.6: Create events for newly defined types (pressure, dribble_attempt, ball_recovery)**
    *   **Setup:** Call event creation for `eventType: 'pressure'` with some `PressureEventData`.
    *   **Assertion:**
        *   `event.type === 'pressure'`.
        *   `event.event_data` conforms to `PressureEventData`.
    *   **Repeat for `dribble_attempt` and `ball_recovery`.**

## 2. Testing Event Consumption Logic (e.g., `src/lib/analytics/eventAggregator.ts`)

**Objective:** Ensure `aggregateMatchEvents` correctly processes `MatchEvent` objects with the new typed `event_data`.

**Test Suite: `EventAggregation`**

*   **Mock Data Setup:**
    *   Define mock `homePlayers` and `awayPlayers` arrays.
    *   Create an array of `MatchEvent` objects for testing.

*   **Test Case 2.1: Aggregate 'shot' events with `on_target: true`**
    *   **Setup:** `events` array with one 'shot' event for a home player, `event_data: { on_target: true } as ShotEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.shots` should be 1.
        *   `result.homeTeamStats.shotsOnTarget` should be 1.
        *   Corresponding player stats for shots and shotsOnTarget should be 1.

*   **Test Case 2.2: Aggregate 'shot' events with `on_target: false`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: { on_target: false } as ShotEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.shots` should be 1.
        *   `result.homeTeamStats.shotsOnTarget` should be 0.

*   **Test Case 2.3: Aggregate 'shot' events with `event_data: null`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: null`.
    *   **Assertion:** (Based on current `eventAggregator` logic: `if (event.event_data && ...))`)
        *   `result.homeTeamStats.shots` should be 1.
        *   `result.homeTeamStats.shotsOnTarget` should be 0.

*   **Test Case 2.4: Aggregate 'pass' events with `success: true`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: true } as PassEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.passesAttempted` should be 1.
        *   `result.homeTeamStats.passesCompleted` should be 1.

*   **Test Case 2.5: Aggregate 'pass' events with `success: false`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: false } as PassEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.passesAttempted` should be 1.
        *   `result.homeTeamStats.passesCompleted` should be 0.

*   **Test Case 2.6: Aggregate 'pass' events with `event_data: null`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: null`.
    *   **Assertion:** (Based on current `eventAggregator` logic)
        *   `result.homeTeamStats.passesAttempted` should be 1.
        *   `result.homeTeamStats.passesCompleted` should be 0.

*   **Test Case 2.7: Mixed events**
    *   **Setup:** `events` array with a mix of shots (on/off target, with/without event_data), passes (successful/unsuccessful, with/without event_data), and other event types.
    *   **Assertion:** Verify all aggregated stats (team and player) are calculated correctly based on the individual event properties and their `event_data`.

*   **Test Case 2.8: Events with player_id not in player lists**
    *   **Setup:** Include an event with a `player_id` that doesn't exist in `homePlayers` or `awayPlayers`.
    *   **Assertion:** Ensure `getPlayerDetails` handles this gracefully (returns null) and `playerSummary` remains undefined, so no player stats are updated for this phantom player, but team stats are still correctly aggregated if `event.team` is valid.

*   **Test Case 2.9: Events with no `event.team`**
    *   **Setup:** Include an event where `event.team` is undefined.
    *   **Assertion:** The event should be skipped by the main loop in `aggregateMatchEvents` (`if (!event.type || !event.team) continue;`), and no stats should be affected.

```
