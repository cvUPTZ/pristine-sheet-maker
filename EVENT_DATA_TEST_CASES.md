# Unit Test Cases for Event Data Structures and Logic

This document outlines test cases for verifying the correct creation and consumption of `MatchEvent` objects, with a particular focus on the typed `event_data` field.

## 1. Testing Event Creation Logic (e.g., in `useMatchState.ts`, `TrackerPianoInput.tsx`)

**Objective:** Ensure `MatchEvent` objects (and data payloads for Supabase) are created with correctly structured and typed `event_data`.

**Test Suite: `EventCreation`**

*   **Test Case 1.1: Create a 'shot' event with specific `ShotEventData` via `ShotDetailModal` flow**
    *   **Context:** Testing `TrackerPianoInput.handleRecordShotWithDetails` and the data passed to `recordEvent`.
    *   **Setup:**
        *   Simulate `pendingEventTrigger` with `eventType: 'shot'`, player, and coordinates.
        *   Simulate `ShotDetailModal` submitting `ShotEventData` like `{ on_target: true, body_part_used: 'right_foot', shot_type: 'volley', situation: 'open_play', assist_type: 'pass', is_goal: false }`.
    *   **Assertion (on the object passed to Supabase in `TrackerPianoInput.recordEvent`):**
        *   The `event_type` field (DB column name) should be `'shot'`.
        *   The `event_data` field should be an object.
        *   `(event_data as ShotEventData).on_target` should be `true`.
        *   `(event_data as ShotEventData).body_part_used` should be `'right_foot'`.
        *   `(event_data as ShotEventData).shot_type` should be `'volley'`.
        *   Other `ShotEventData` fields should match the input.

*   **Test Case 1.2: Create a 'shot' event with minimal data (fallback in `TrackerPianoInput.recordEvent`)**
    *   **Context:** If `recordEvent` in `TrackerPianoInput` is called for a 'shot' without `details.event_data`.
    *   **Setup:** Call `recordEvent` with `eventType: 'shot'` and `details` not containing `event_data`.
    *   **Assertion (on the object passed to Supabase):**
        *   `event_data` should be `{ on_target: false }` (or current default).

*   **Test Case 1.3: Create a 'pass' event with specific `PassEventData` via `PassDetailModal` flow**
    *   **Context:** Testing `TrackerPianoInput.handleRecordPassWithDetails` and data passed to `recordEvent`.
    *   **Setup:**
        *   Simulate `pendingEventTrigger` with `eventType: 'pass'`, passer player, and coordinates.
        *   Simulate `PassDetailModal` submitting `PassEventData` like `{ success: true, recipient_player_id: 'player2', pass_type: 'long' }`.
    *   **Assertion (on the object passed to Supabase in `TrackerPianoInput.recordEvent`):**
        *   The `event_type` field should be `'pass'`.
        *   `event_data` should be an object.
        *   `(event_data as PassEventData).success` should be `true`.
        *   `(event_data as PassEventData).recipient_player_id` should be `'player2'`.
        *   `(event_data as PassEventData).pass_type` should be `'long'`.

*   **Test Case 1.4: Create a 'pass' event (via `useMatchState.recordPass`)**
    *   **Context:** Testing `useMatchState.recordPass`.
    *   **Setup:** Call `recordPass` with passer, receiver, coordinates, and success status (e.g., `true`).
    *   **Assertion (on the `MatchEvent` created within `useMatchState`):**
        *   `event.type === 'pass'`.
        *   `event.event_data` should not be null.
        *   `(event.event_data as PassEventData).success` should be `true`.
        *   `(event.event_data as PassEventData).recipient_player_id` should match `receiver.id`.
        *   `(event.event_data as PassEventData).end_coordinates` should match `receiverCoords`.
        *   The top-level `relatedPlayerId` field on `MatchEvent` should be undefined.

*   **Test Case 1.5: Create a 'pressure' event with specific `PressureEventData` via `PressureDetailModal` flow**
    *   **Context:** Testing `TrackerPianoInput.handleRecordPressureWithDetails` and data passed to `recordEvent`.
    *   **Setup:**
        *   Simulate `pendingEventTrigger` with `eventType: 'pressure'`, pressuring player.
        *   Simulate `PressureDetailModal` submitting `PressureEventData` like `{ outcome: 'regain_possession' }`.
    *   **Assertion (on the object passed to Supabase in `TrackerPianoInput.recordEvent`):**
        *   The `event_type` field should be `'pressure'`.
        *   `event_data` should be an object.
        *   `(event_data as PressureEventData).outcome` should be `'regain_possession'`.

*   **Test Case 1.6: Create a generic event (e.g., 'foul') using `useMatchState.recordEvent`**
    *   **Setup:** Call `recordEvent` from `useMatchState` with `eventType: 'foul'` and minimal `details` (not containing specific `FoulCommittedEventData`).
    *   **Assertion (on the `MatchEvent` created):**
        *   `event.type === 'foul'`.
        *   `event.event_data` should be `{}` (empty `FoulCommittedEventData` or `GenericEventData` as per current logic).

*   **Test Case 1.7: Create events for newly defined types (dribble_attempt, ball_recovery) using `useMatchState.recordEvent`**
    *   **Setup:** Call `recordEvent` for `eventType: 'dribble_attempt'` with `details: { success: true } as DribbleAttemptEventData`.
    *   **Assertion (on the `MatchEvent` created):**
        *   `event.type === 'dribble_attempt'`.
        *   `event.event_data` conforms to `DribbleAttemptEventData`.
        *   `(event.event_data as DribbleAttemptEventData).success` is `true`.
    *   **Repeat for `ball_recovery` (e.g., with `recovery_type: 'loose_ball'`).**

## 2. Testing Event Consumption Logic (e.g., `src/lib/analytics/eventAggregator.ts`, `src/pages/Statistics.tsx`)

**Objective:** Ensure aggregation functions correctly process `MatchEvent` objects with the new typed `event_data`.

**Test Suite: `EventAggregation`**

*   **Mock Data Setup:**
    *   Define mock `homePlayers` and `awayPlayers` arrays.
    *   Create an array of `MatchEvent` objects for testing, including varied `event_data` structures.

*   **Test Case 2.1: Aggregate 'shot' events with `on_target: true`**
    *   **Context:** Testing `eventAggregator.ts`.
    *   **Setup:** `events` array with one 'shot' event for a home player, `event_data: { on_target: true } as ShotEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.shots` should be 1.
        *   `result.homeTeamStats.shotsOnTarget` should be 1.
        *   Corresponding player stats for shots and shotsOnTarget should be 1.

*   **Test Case 2.2: Aggregate 'shot' events with `on_target: false`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: { on_target: false } as ShotEventData`.
    *   **Assertion:**
        *   Team shots attempted should be 1.
        *   Team shots on target should be 0.

*   **Test Case 2.3: Aggregate 'shot' events with `event_data: null` or incomplete `event_data`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: null` or `event_data: {}`.
    *   **Assertion:**
        *   Team shots attempted should be 1.
        *   Team shots on target should be 0.

*   **Test Case 2.4: Aggregate 'pass' events with `success: true`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: true, recipient_player_id: 'p2' } as PassEventData`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 1.

*   **Test Case 2.5: Aggregate 'pass' events with `success: false`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: false, recipient_player_id: 'p3' } as PassEventData`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 0.

*   **Test Case 2.6: Aggregate 'pass' events with `event_data: null` or incomplete `event_data`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: null` or `event_data: {}`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 0 (as success cannot be determined).

*   **Test Case 2.7: Mixed events**
    *   **Setup:** `events` array with a mix of shots, passes, and other event types, with varied `event_data`.
    *   **Assertion:** Verify all aggregated stats (team and player) are calculated correctly.

*   **Test Case 2.8: Events with player_id not in player lists (for `eventAggregator`)**
    *   **Setup:** Include an event with a `player_id` that doesn't exist in `homePlayers` or `awayPlayers`.
    *   **Assertion:** `getPlayerDetails` handles this gracefully; no player stats for this ID, team stats are correct.

*   **Test Case 2.9: Events with no `event.team` (for `eventAggregator`)**
    *   **Setup:** Include an event where `event.team` is undefined.
    *   **Assertion:** Event is skipped; no stats affected.

## 3. Testing xG Calculation and Shot Map

**Test Suite 3.1: `XgCalculationLogic` (testing `calculateXg` in `xgCalculator.ts`)**
(Content as before)

**Test Suite 3.2: `XgAggregation` (testing `eventAggregator.ts` or `Statistics.tsx`)**
(Content as before)

**Test Suite 3.3: `ShotMapComponent` (testing `ShotMap.tsx`)**
(Content as before)

## 4. Testing Passing Network Analysis & Visualization

**Test Suite 4.1: `PassDataCollectionUI` (testing `PassDetailModal.tsx` and its integration with `TrackerPianoInput.tsx`)**
(Content as before)

**Test Suite 4.2: `PassAggregationLogic` (testing additions in `eventAggregator.ts`)**
(Content as before)

**Test Suite 4.3: `PassingNetworkMapComponent` (testing `PassingNetworkMap.tsx`)**
(Content as before)

## 5. Testing Pressure Stats UI Integration

**Test Suite 5.1: `PressureDataCollectionUI` (testing `PressureDetailModal.tsx` and `TrackerPianoInput.tsx`)**

*   **Test Case 5.1.1: Open Pressure Detail Modal:**
    *   **Action:** In `TrackerPianoInput`, select a pressuring player, then click the 'Pressure' event button.
    *   **Assertion:** `PressureDetailModal` opens, displaying the correct pressurer name. "Outcome" field defaults to "No Significant Effect".
*   **Test Case 5.1.2: Record Pressure with Outcome:**
    *   **Action:** In `PressureDetailModal`, select an outcome (e.g., "Regain Possession"), click "Record Pressure".
    *   **Assertion:** `recordEvent` in `TrackerPianoInput.tsx` is called with `eventType: 'pressure'`, the correct pressurer, and `event_data` conforming to `PressureEventData` including `outcome: 'regain_possession'`.
*   **Test Case 5.1.3: Cancel Pressure Detail Modal:**
    *   **Action:** Open modal, then click "Cancel".
    *   **Assertion:** Modal closes, no event is recorded.

**Test Suite 5.2: `PressureAggregationLogic` (testing additions in `eventAggregator.ts`)**

*   **Test Case 5.2.1: `totalPressures` aggregation:**
    *   **Setup:** Mock `MatchEvent[]` with three 'pressure' events for Player A, `event_data` having valid outcomes.
    *   **Assertion:** `result.playerStats` for Player A shows `totalPressures: 3`.
*   **Test Case 5.2.2: `successfulPressures` aggregation:**
    *   **Setup:** Mock `MatchEvent[]` with 'pressure' events:
        *   Player A: `outcome: 'regain_possession'`
        *   Player A: `outcome: 'forced_turnover_error'`
        *   Player A: `outcome: 'no_effect'`
        *   Player A: `outcome: 'foul_won'`
    *   **Assertion:** `result.playerStats` for Player A shows `successfulPressures: 3`.
*   **Test Case 5.2.3: `pressureRegains` aggregation:**
    *   **Setup:** Mock `MatchEvent[]` with 'pressure' events:
        *   Player A: `outcome: 'regain_possession'`
        *   Player A: `outcome: 'forced_pass_backwards'`
        *   Player A: `outcome: 'regain_possession'`
    *   **Assertion:** `result.playerStats` for Player A shows `pressureRegains: 2`.
*   **Test Case 5.2.4: Pressure event with missing `event_data.outcome`:**
    *   **Setup:** A 'pressure' event with `event_data: {}` or `event_data: null`.
    *   **Assertion:** This event does not contribute to `totalPressures`, `successfulPressures`, or `pressureRegains`. No errors occur.

**Test Suite 5.3: `PressureStatsDisplay` (testing `Statistics.tsx` "Players" table)**

*   **Test Case 5.3.1: Display player pressure stats:**
    *   **Setup:** `playerStats` array where players have `totalPressures: 5`, `successfulPressures: 2`, `pressureRegains: 1`.
    *   **Assertion:** The "Players" table in `Statistics.tsx` correctly renders these values in the "Pressures", "Successful Press.", and "Pressure Regains" columns. Undefined or null values should default to "0".
```
