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

*   **Test Case 1.5: Create a generic event (e.g., 'foul') using `useMatchState.recordEvent`**
    *   **Setup:** Call `recordEvent` from `useMatchState` with `eventType: 'foul'` and minimal `details` (not containing specific `FoulCommittedEventData`).
    *   **Assertion (on the `MatchEvent` created):**
        *   `event.type === 'foul'`.
        *   `event.event_data` should be `{}` (empty `FoulCommittedEventData` or `GenericEventData` as per current logic).

*   **Test Case 1.6: Create events for newly defined types (pressure, dribble_attempt, ball_recovery) using `useMatchState.recordEvent`**
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

**Test Suite 3.2: `XgAggregation` (testing `eventAggregator.ts` or `Statistics.tsx`)**

*   **Test Case 3.2.1: Aggregation of `totalXg` for teams and players:**
    *   **Setup:** Mock `MatchEvent[]` with several shot events:
        *   Shot 1 (Home Player A): `event_data: { situation: 'penalty', on_target: true } as ShotEventData`, `coordinates: {x:94,y:34}` (xG ~0.76)
        *   Shot 2 (Home Player A): `event_data: { situation: 'open_play', assist_type: 'through_ball', on_target: true } as ShotEventData`, `coordinates: {x:95,y:30}` (xG ~0.08+0.06+0.05 = 0.19)
        *   Shot 3 (Away Player B): `event_data: { situation: 'direct_free_kick', on_target: false } as ShotEventData`, `coordinates: {x:80,y:40}` (xG ~0.08+0.04-0.01 = 0.11)
    *   **Assertion (using `eventAggregator.ts`):**
        *   `result.homeTeamStats.totalXg` should be approx `0.76 + 0.19 = 0.95`.
        *   `result.awayTeamStats.totalXg` should be approx `0.11`.
        *   Player A's `totalXg` in `result.playerStats` should be approx `0.95`.
        *   Player B's `totalXg` in `result.playerStats` should be approx `0.11`.

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

## 4. Testing Passing Network Analysis & Visualization

**Test Suite 4.1: `PassDataCollectionUI` (testing `PassDetailModal.tsx` and its integration with `TrackerPianoInput.tsx`)**

*   **Test Case 4.1.1: Open Pass Detail Modal:**
    *   **Action:** In `TrackerPianoInput`, select a passer, then click the 'Pass' event button.
    *   **Assertion:** `PassDetailModal` opens, displaying the correct passer name and a list of teammates (excluding the passer) as potential recipients. "Pass Successful?" defaults to true.
*   **Test Case 4.1.2: Record Pass with Recipient:**
    *   **Action:** In `PassDetailModal`, select a recipient, keep success as true, and click "Record Pass".
    *   **Assertion:** `recordEvent` in `TrackerPianoInput.tsx` is called with `eventType: 'pass'`, the correct passer, and `event_data` conforming to `PassEventData` including the selected `recipient_player_id` and `success: true`.
*   **Test Case 4.1.3: Record Unsuccessful Pass:**
    *   **Action:** In `PassDetailModal`, select recipient, uncheck "Pass Successful?", click "Record Pass".
    *   **Assertion:** `event_data` in `recordEvent` call has `success: false`.
*   **Test Case 4.1.4: Cancel Pass Detail Modal:**
    *   **Action:** Open modal, then click "Cancel".
    *   **Assertion:** Modal closes, no event is recorded.

**Test Suite 4.2: `PassAggregationLogic` (testing additions in `eventAggregator.ts`)**

*   **Test Case 4.2.1: `passNetworkSent` aggregation:**
    *   **Setup:** Mock `MatchEvent[]` with several 'pass' events between different players (PlayerA -> PlayerB, PlayerA -> PlayerC, PlayerB -> PlayerA), some successful, some not. Ensure `event_data` has `recipient_player_id` and `success`.
    *   **Assertion:** For PlayerA in `result.playerStats`, `passNetworkSent` array correctly shows links to PlayerB and PlayerC with aggregated `count` and `successfulCount`.
*   **Test Case 4.2.2: `passesToFinalThird` calculation:**
    *   **Setup:** Passes with `start_coordinates` and `end_coordinates` that cross into the final third (e.g., x from 60 to 80 on a 105m pitch, final third > 70m), and some that don't. All passes are successful.
    *   **Assertion:** `playerStats[playerIndex].passesToFinalThird` is correctly incremented only for successful passes that meet the criteria.
*   **Test Case 4.2.3: `progressivePasses` calculation:**
    *   **Setup:** Successful passes with varying `start_coordinates`, `end_coordinates` to test the different conditions (own half >=30m gain, opponent half >=15m gain, into penalty area).
    *   **Assertion:** `playerStats[playerIndex].progressivePasses` is correctly incremented only for successful passes meeting the defined criteria.
*   **Test Case 4.2.4: Passes with missing `recipient_player_id` or `coordinates`:**
    *   **Setup:** Pass events where `event_data.recipient_player_id` is missing, or `event.coordinates` or `event_data.end_coordinates` are missing.
    *   **Assertion:** These passes are still counted towards `passesAttempted` but do not contribute to `passNetworkSent`, `passesToFinalThird`, or `progressivePasses` if the required data for those specific calculations is absent. No errors occur.

**Test Suite 4.3: `PassingNetworkMapComponent` (testing `PassingNetworkMap.tsx`)**

*   **Test Case 4.3.1: Render nodes and links:**
    *   **Input:** `playerStats` with `passNetworkSent` data, `allPlayers`.
    *   **Assertion:** Correct number of player nodes and pass links are rendered. Link thickness/opacity/color and node size vary based on data.
*   **Test Case 4.3.2: Team and Player Filters:**
    *   **Action:** Apply team filter, then player filter.
    *   **Assertion:** Only relevant nodes and links are displayed.
*   **Test Case 4.3.3: Tooltip display for nodes and links:**
    *   **Assertion:** Hovering over nodes shows player info; hovering over links shows pass stats between the pair.
*   **Test Case 4.3.4: Placeholder Player Positions:**
    *   **Assertion:** Players are distributed on the pitch (even if simplified), not all at (0,0). Ensure nodes for different teams are on appropriate sides if team filter is 'all'.
```
