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
        *   The `event_type` field should be `'shot'`.
        *   The `event_data` field should be an object.
        *   `(event_data as ShotEventData).on_target` should be `true`.
        *   `(event_data as ShotEventData).body_part_used` should be `'right_foot'`.
        *   `(event_data as ShotEventData).shot_type` should be `'volley'`.
        *   Other `ShotEventData` fields should match the input.

*   **Test Case 1.2: Create a 'shot' event with minimal data (fallback in `TrackerPianoInput.recordEvent`)**
    *   **Context:** If `recordEvent` in `TrackerPianoInput` is called for a 'shot' without `details.event_data` (e.g., if modal flow was bypassed - less likely now).
    *   **Setup:** Call `recordEvent` with `eventType: 'shot'` and `details` not containing `event_data`.
    *   **Assertion (on the object passed to Supabase):**
        *   `event_data` should be `{ on_target: false }` (or current default).

*   **Test Case 1.3: Create a 'pass' event (via `useMatchState.recordPass`)**
    *   **Context:** Testing `useMatchState.recordPass`.
    *   **Setup:** Call `recordPass` with passer, receiver, coordinates, and success status (e.g., `true`).
    *   **Assertion (on the `MatchEvent` created within `useMatchState`):**
        *   `event.type === 'pass'`.
        *   `event.event_data` should not be null.
        *   `(event.event_data as PassEventData).success` should be `true`.
        *   `(event.event_data as PassEventData).recipient_player_id` should match `receiver.id`.
        *   `(event.event_data as PassEventData).end_coordinates` should match `receiverCoords`.
        *   The top-level `relatedPlayerId` field on `MatchEvent` should be undefined.

*   **Test Case 1.4: Create a generic event (e.g., 'foul') using `useMatchState.recordEvent`**
    *   **Setup:** Call `recordEvent` from `useMatchState` with `eventType: 'foul'` and minimal `details` (not containing specific `FoulCommittedEventData`).
    *   **Assertion (on the `MatchEvent` created):**
        *   `event.type === 'foul'`.
        *   `event.event_data` should be `{}` (empty `FoulCommittedEventData` or `GenericEventData` as per current logic).

*   **Test Case 1.5: Create events for newly defined types (pressure, dribble_attempt, ball_recovery) using `useMatchState.recordEvent`**
    *   **Setup:** Call `recordEvent` for `eventType: 'pressure'` with `details: { outcome: 'regain_possession' } as PressureEventData`.
    *   **Assertion (on the `MatchEvent` created):**
        *   `event.type === 'pressure'`.
        *   `event.event_data` conforms to `PressureEventData`.
        *   `(event.event_data as PressureEventData).outcome` is `'regain_possession'`.
    *   **Repeat for `dribble_attempt` (e.g., with `success: true`) and `ball_recovery` (e.g., with `recovery_type: 'loose_ball'`).**

## 2. Testing Event Consumption Logic (e.g., `src/lib/analytics/eventAggregator.ts`, `src/pages/Statistics.tsx`)

**Objective:** Ensure aggregation functions correctly process `MatchEvent` objects with the new typed `event_data`.

**Test Suite: `EventAggregation`**

*   **Mock Data Setup:**
    *   Define mock `homePlayers` and `awayPlayers` arrays.
    *   Create an array of `MatchEvent` objects for testing, including varied `event_data` structures.

*   **Test Case 2.1: Aggregate 'shot' events with `on_target: true`**
    *   **Context:** Testing `eventAggregator.ts` or `Statistics.tsx`'s `calculateStatisticsFromEvents` and `calculatePlayerStatistics`.
    *   **Setup:** `events` array with one 'shot' event for a home player, `event_data: { on_target: true } as ShotEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.shots` (or `statistics.shots.home.total`) should be 1.
        *   `result.homeTeamStats.shotsOnTarget` (or `statistics.shots.home.onTarget`) should be 1.
        *   Corresponding player stats for shots and shotsOnTarget should be 1.

*   **Test Case 2.2: Aggregate 'shot' events with `on_target: false`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: { on_target: false } as ShotEventData`.
    *   **Assertion:**
        *   Team shots attempted should be 1.
        *   Team shots on target should be 0.

*   **Test Case 2.3: Aggregate 'shot' events with `event_data: null` or incomplete `event_data`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: null` or `event_data: {}`.
    *   **Assertion:** (Based on current logic with type guards `if (event.event_data && (event.event_data as ShotEventData).on_target ...)` )
        *   Team shots attempted should be 1.
        *   Team shots on target should be 0.

*   **Test Case 2.4: Aggregate 'pass' events with `success: true`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: true } as PassEventData`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 1.

*   **Test Case 2.5: Aggregate 'pass' events with `success: false`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: { success: false } as PassEventData`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 0.

*   **Test Case 2.6: Aggregate 'pass' events with `event_data: null` or incomplete `event_data`**
    *   **Setup:** `events` array with one 'pass' event, `event_data: null` or `event_data: {}`.
    *   **Assertion:**
        *   Team passes attempted should be 1.
        *   Team passes completed should be 0.

*   **Test Case 2.7: Mixed events**
    *   **Setup:** `events` array with a mix of shots (on/off target, with/without event_data), passes (successful/unsuccessful, with/without event_data), and other event types.
    *   **Assertion:** Verify all aggregated stats (team and player) are calculated correctly based on the individual event properties and their `event_data`.

*   **Test Case 2.8: Events with player_id not in player lists (for `eventAggregator`)**
    *   **Setup:** Include an event with a `player_id` that doesn't exist in `homePlayers` or `awayPlayers` when testing `eventAggregator.ts`.
    *   **Assertion:** Ensure `getPlayerDetails` handles this gracefully and no player stats are updated for this phantom player, but team stats are still correctly aggregated.

*   **Test Case 2.9: Events with no `event.team` (for `eventAggregator`)**
    *   **Setup:** Include an event where `event.team` is undefined.
    *   **Assertion:** The event should be skipped by the main loop in `aggregateMatchEvents`, and no stats should be affected.

## 3. Testing xG Calculation and Shot Map

**Test Suite 3.1: `XgCalculationLogic` (testing `calculateXg` in `xgCalculator.ts`)**

*   **Test Case 3.1.1: Penalty xG:**
    *   **Input:** `ShotEventData` with `situation: 'penalty'`.
    *   **Expected Output:** `0.76`.
*   **Test Case 3.1.2: Open play shot (default values):**
    *   **Input:** `ShotEventData` with `situation: 'open_play'`, default `shot_type`, `body_part_used`, `assist_type`.
    *   **Expected Output:** The calculated base xG (e.g., around `0.08`, adjusted by minor defaults, bounded). Verify against the rule-based logic.
*   **Test Case 3.1.3: Header from corner:**
    *   **Input:** `ShotEventData` with `situation: 'corner_related'`, `shot_type: 'header'`.
    *   **Expected Output:** Verify calculated value based on rules (e.g., `0.08 + 0.05` bounded).
*   **Test Case 3.1.4: Shot with through ball assist:**
    *   **Input:** `ShotEventData` with `assist_type: 'through_ball'`.
    *   **Expected Output:** Verify calculated value (e.g., `0.08 + 0.06` bounded).
*   **Test Case 3.1.5: Long distance shot (if coordinate logic is testable):**
    *   **Input:** `ShotEventData` and `coordinates: { x: 70, y: 34 }` (assuming goal at x=105). Distance approx 35m.
    *   **Expected Output:** Verify xG is reduced (e.g., `0.08 - 0.03` bounded).
*   **Test Case 3.1.6: Close range shot (if coordinate logic is testable):**
    *   **Input:** `ShotEventData` and `coordinates: { x: 98, y: 34 }` (assuming goal at x=105). Distance approx 7m.
    *   **Expected Output:** Verify xG is increased (e.g., `0.08 + 0.05` bounded).
*   **Test Case 3.1.7: xG value bounding:**
    *   **Input:** `ShotEventData` that would result in a raw xG > 1.0 (e.g., very close penalty-like situation not marked as penalty) or < 0.0 before bounding.
    *   **Expected Output:** xG is correctly bounded (between 0.01 and 0.95).

**Test Suite 3.2: `XgAggregation` (testing `eventAggregator.ts` or equivalent in `Statistics.tsx`)**

*   **Test Case 3.2.1: Aggregation of `totalXg` for teams and players:**
    *   **Setup:** Mock `MatchEvent[]` with several shot events:
        *   Shot 1 (Home): `ShotEventData { situation: 'penalty' }`, `coordinates: {x:94,y:34}` (xG ~0.76)
        *   Shot 2 (Home): `ShotEventData { situation: 'open_play', assist_type: 'through_ball' }`, `coordinates: {x:95,y:30}` (xG ~0.08+0.06+0.05 = 0.19)
        *   Shot 3 (Away): `ShotEventData { situation: 'direct_free_kick' }`, `coordinates: {x:80,y:40}` (xG ~0.08+0.04-0.01 = 0.11)
    *   **Assertion:**
        *   `result.homeTeamStats.totalXg` should be approx `0.76 + 0.19 = 0.95`.
        *   `result.awayTeamStats.totalXg` should be approx `0.11`.
        *   Individual player `totalXg` should sum correctly if players are assigned.

**Test Suite 3.3: `ShotMapComponent` (testing `ShotMap.tsx`)**

*   **Test Case 3.3.1: Render shots correctly:**
    *   **Input:** Array of shot `MatchEvent`s with coordinates and `ShotEventData` (including `is_goal`, `on_target`, `xg_value`).
        *   Shot A: `is_goal: true, xg_value: 0.5`
        *   Shot B: `on_target: true, is_goal: false, xg_value: 0.2`
        *   Shot C: `on_target: false, xg_value: 0.05`
    *   **Assertion:**
        *   Verify 3 circles are rendered.
        *   Circle A: color green, radius based on 0.5 xG.
        *   Circle B: color orange, radius based on 0.2 xG.
        *   Circle C: color red, radius based on 0.05 xG.
*   **Test Case 3.3.2: Team filter functionality:**
    *   **Input:** Shots for home and away teams.
    *   **Action:** Simulate selecting "Home Team" filter.
    *   **Assertion:** Only home team shots are rendered. Repeat for "Away Team" and "All Teams".
*   **Test Case 3.3.3: Tooltip display (Conceptual):**
    *   **Setup:** Render map with a shot event having full `ShotEventData`.
    *   **Action:** Simulate hover over the shot circle.
    *   **Assertion:** Tooltip appears and contains correct player name, outcome, xG, body part, situation, assist type, and shot type from `event_data`.
*   **Test Case 3.3.4: Coordinate flipping for 'away' team:**
    *   **Input:**
        *   Home shot: `team: 'home', coordinates: { x: 80, y: 30 }`
        *   Away shot: `team: 'away', coordinates: { x: 25, y: 38 }` (which is 80 from their goal if pitch length is 105)
    *   **Assertion:** Both shots should appear on the map as if attacking the same goal (e.g., the right-hand side goal). The away shot's x-coordinate should be transformed (e.g., `105 - 25 = 80`).
```
