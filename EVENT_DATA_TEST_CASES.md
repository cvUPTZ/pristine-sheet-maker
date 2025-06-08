# Unit Test Cases for Event Data Structures and Logic

This document outlines test cases for verifying the correct creation and consumption of `MatchEvent` objects, with a particular focus on the typed `event_data` field and the event creation/modification flow in `TrackerPianoInput.tsx`.

## 1. Testing Event Creation & Modification Logic in `TrackerPianoInput.tsx`

**Objective:** Ensure `MatchEvent` objects are created with correct default `event_data` during the initial tap of the "Fast Detail Input" system, and that these events are correctly updated when a post-tap modifier button is used. Also ensure modals function correctly for editing events.

**Test Suite: `TrackerPianoInputEventFlow`**

*   **Test Case 1.1: Initial 'shot' event log on First Tap (Fast Input)**
    *   **Context:** Testing the initial `recordEvent` call when a 'shot' button is tapped.
    *   **Setup:**
        *   `focusedPlayer` is set.
        *   Simulate `handleEventTypeClick` for a 'shot' event type.
    *   **Assertion (on the object passed to Supabase `match_events.upsert` within `recordEvent`):**
        *   `event_type` should be `'shot'`.
        *   `event_data` should be a `ShotEventData` object containing comprehensive defaults:
            *   `on_target: false`
            *   `is_goal: false`
            *   `situation: 'open_play'`
            *   `body_part_used: 'right_foot'`
            *   `shot_type: 'normal'`
            *   `assist_type: 'none'`
        *   `modifierContext` state should be set for 'shot' with the new event's ID.

*   **Test Case 1.2: 'Shot' Event Update via "Goal" Modifier Button**
    *   **Context:** Testing `handleShotOutcomeModifier`.
    *   **Setup:**
        *   An initial 'shot' event has been logged (as per Test Case 1.1), and its ID is in `modifierContext`.
        *   The `modifierContext.lastEventDetails.data` reflects the initial default `ShotEventData`.
        *   Simulate clicking the "Goal" modifier button.
    *   **Assertion (on the object passed to Supabase `match_events.update` within `updateLastEventData`):**
        *   The `id` should match the `modifierContext.eventId`.
        *   The `event_data` should be updated to:
            *   `on_target: true`
            *   `is_goal: true`
            *   Other fields from the initial default `ShotEventData` (like `situation`, `body_part_used`, etc.) should be preserved.
        *   `modifierContext` state should be cleared after the update.

*   **Test Case 1.3: 'Shot' Event Update via "On Target" Modifier Button**
    *   **Setup:** (Similar to 1.2) Initial 'shot' logged.
    *   **Action:** Simulate clicking "On Target" modifier.
    *   **Assertion:** `event_data` updated to `on_target: true, is_goal: false`, other defaults preserved.

*   **Test Case 1.4: 'Shot' Event Update via "Off Target/Block" Modifier Button**
    *   **Setup:** (Similar to 1.2) Initial 'shot' logged.
    *   **Action:** Simulate clicking "Off Target/Block" modifier.
    *   **Assertion:** `event_data` updated to `on_target: false, is_goal: false`, other defaults preserved.

*   **Test Case 1.5: Initial 'pass' event log on First Tap (Fast Input)**
    *   **Setup:** `focusedPlayer` set, simulate `handleEventTypeClick` for a 'pass'.
    *   **Assertion:** `event_type: 'pass'`, `event_data: { success: true }`. `modifierContext` set for 'pass'.

*   **Test Case 1.6: 'Pass' Event Update via "Pass Failed" Modifier Button**
    *   **Setup:** Initial 'pass' logged. `modifierContext.lastEventDetails.data` is `{ success: true }`.
    *   **Action:** Simulate clicking "Pass Failed" modifier.
    *   **Assertion:** `event_data` updated to `{ success: false }`.

*   **Test Case 1.7: Initial 'pressure' event log on First Tap (Fast Input)**
    *   **Setup:** `focusedPlayer` set, simulate `handleEventTypeClick` for 'pressure'.
    *   **Assertion:** `event_type: 'pressure'`, `event_data: { outcome: 'no_effect' }`. `modifierContext` set for 'pressure'.

*   **Test Case 1.8: 'Pressure' Event Update via "Regain" Modifier Button**
    *   **Setup:** Initial 'pressure' logged. `modifierContext.lastEventDetails.data` is `{ outcome: 'no_effect' }`.
    *   **Action:** Simulate clicking "Regain" modifier for pressure.
    *   **Assertion:** `event_data` updated to `{ outcome: 'regain_possession' }`. (Verify other outcomes similarly).

*   **Test Case 1.9: Modifier Timeout**
    *   **Context:** Verify modifier context is cleared if no modifier button is clicked.
    *   **Setup:**
        *   An initial event (e.g., 'shot') is logged, `modifierContext` is set with a `timeoutId`.
    *   **Action:** Allow the timeout (e.g., 3.5 seconds) to elapse without clicking a modifier.
    *   **Assertion:**
        *   The `clearTimeout` function should have been called.
        *   `modifierContext` state should be `null`.
        *   No call to `updateLastEventData` or Supabase update should have been made for the modifier.

*   **Test Case 1.10: Editing an existing 'shot' event via `ShotDetailModal`**
    *   **Context:** Testing the modal flow for editing, triggered by "Edit Last Event".
    *   **Setup:**
        *   `lastRecordedEventDisplay` holds data for a previously recorded shot event (e.g., ID: 'shot123', event_data: initial defaults).
        *   Simulate `openEditModalForLastEvent()` being called. This sets `editingEvent` and `showShotDetailModal` to true.
        *   Modal is pre-filled with `editingEvent.event_data`.
        *   User changes `body_part_used` to 'left_foot' and `situation` to 'set_piece' in the modal form.
        *   Simulate modal submission, calling `handleModalSubmit` with the updated `ShotEventData`.
    *   **Assertion (on the object passed to Supabase `match_events.update` via `updateLastEventData`):**
        *   The `id` should be 'shot123' (from `editingEvent.id`).
        *   `event_data` should reflect the changes: `body_part_used: 'left_foot'`, `situation: 'set_piece'`, while other fields like `on_target`, `is_goal` (from original `editingEvent.event_data`) are preserved.
        *   `showShotDetailModal` is false, `editingEvent` is null after submission.

*   **Test Case 1.11: Editing an existing 'pass' event via `PassDetailModal`**
    *   **Setup:** (Similar to 1.10) `lastRecordedEventDisplay` is a pass event. Modal opened via "Edit Last Event". User adds `recipient_player_id: 'playerXYZ'` and `pass_type: 'through_ball'`.
    *   **Action:** Modal submission.
    *   **Assertion:** Supabase update call with correct pass event ID and `event_data` including `recipient_player_id: 'playerXYZ'`, `pass_type: 'through_ball'`, and original `success` status.

*   **Test Case 1.12: Editing an existing 'pressure' event via `PressureDetailModal`**
    *   **Setup:** (Similar to 1.10) `lastRecordedEventDisplay` is a pressure event. Modal opened. User changes `outcome` to `forced_turnover_error`.
    *   **Action:** Modal submission.
    *   **Assertion:** Supabase update call with correct pressure event ID and `event_data.outcome: 'forced_turnover_error'`.

*   **Test Case 1.13: Create a generic event (e.g., 'foul') not using fast modifiers**
    *   **Context:** For events not part of the fast modifier system.
    *   **Setup:** `focusedPlayer` set, simulate `handleEventTypeClick` for a 'foul' event type.
    *   **Assertion (on object passed to Supabase `match_events.upsert`):**
        *   `event_type` should be `'foul'`.
        *   `event_data` should be `{}` (or current default for generic events like `FoulCommittedEventData` or `GenericEventData`).
        *   `modifierContext` should be `null`.

*   **Test Case 1.14: Create 'dribble_attempt' with its specific data (if not using fast modifiers)**
    *   **Setup:** `focusedPlayer` set, `handleEventTypeClick` for 'dribble_attempt'. Assume `recordEvent` is adapted or a modal is used if it needs specific data beyond simple defaults. For this test, assume `recordEvent` sets `event_data: { success: true } as DribbleAttemptEventData` based on some logic.
    *   **Assertion:** `event_type: 'dribble_attempt'`, `event_data` as `DribbleAttemptEventData`.

## 2. Testing Event Consumption Logic (e.g., `src/lib/analytics/eventAggregator.ts`, `src/pages/Statistics.tsx`)

**Objective:** Ensure aggregation functions correctly process `MatchEvent` objects with the new typed `event_data`.

**Test Suite: `EventAggregation`**

*   **Mock Data Setup:**
    *   Define mock `homePlayers` and `awayPlayers` arrays.
    *   Create an array of `MatchEvent` objects for testing, including varied `event_data` structures.

*   **Test Case 2.1: Aggregate 'shot' events with `on_target: true` and `is_goal: false`**
    *   **Context:** Testing `eventAggregator.ts`.
    *   **Setup:** `events` array with one 'shot' event for a home player, `event_data: { on_target: true, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' } as ShotEventData`.
    *   **Assertion:**
        *   `result.homeTeamStats.shots` should be 1.
        *   `result.homeTeamStats.shotsOnTarget` should be 1.
        *   `result.homeTeamStats.goals` should be 0.
        *   Corresponding player stats should match.

*   **Test Case 2.2: Aggregate 'shot' events with `is_goal: true`**
    *   **Setup:** `events` array with one 'shot' event, `event_data: { on_target: true, is_goal: true, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' } as ShotEventData`.
    *   **Assertion:**
        *   Team shots attempted should be 1.
        *   Team shots on target should be 1.
        *   Team goals should be 1.

*   **Test Case 2.3: Aggregate 'shot' events with `on_target: false` (missed/blocked)**
    *   **Setup:** `events` array with one 'shot' event, `event_data: { on_target: false, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' } as ShotEventData`.
    *   **Assertion:**
        *   Team shots attempted should be 1.
        *   Team shots on target should be 0.
        *   Team goals should be 0.

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

*   **Test Case 2.6: Aggregate 'pressure' events with `outcome: 'regain_possession'`**
    *   **Setup:** `events` array with one 'pressure' event, `event_data: { outcome: 'regain_possession' } as PressureEventData`.
    *   **Assertion (assuming `eventAggregator` is updated for pressure stats):**
        *   Team total pressures should be 1.
        *   Team successful pressures should be 1.
        *   Team pressure regains should be 1.

*   **Test Case 2.7: Mixed events**
    *   **Setup:** `events` array with a mix of shots, passes, pressures, and other event types, with varied `event_data`.
    *   **Assertion:** Verify all aggregated stats (team and player) are calculated correctly based on their `event_data`.

*   **Test Case 2.8: Events with player_id not in player lists (for `eventAggregator`)**
    *   **Setup:** Include an event with a `player_id` that doesn't exist in `homePlayers` or `awayPlayers`.
    *   **Assertion:** `getPlayerDetails` handles this gracefully; no player stats for this ID, team stats are correct.

*   **Test Case 2.9: Events with no `event.team` (for `eventAggregator`)**
    *   **Setup:** Include an event where `event.team` is undefined.
    *   **Assertion:** Event is skipped; no stats affected.

## 3. Testing xG Calculation and Shot Map

**Test Suite 3.1: `XgCalculationLogic` (testing `calculateXg` in `xgCalculator.ts`)**
(Content as before - assuming `ShotEventData` now includes more fields like `situation`, `body_part_used`, `shot_type`, `assist_type` which `calculateXg` might use)

**Test Suite 3.2: `XgAggregation` (testing `eventAggregator.ts` or `Statistics.tsx`)**
(Content as before)

**Test Suite 3.3: `ShotMapComponent` (testing `ShotMap.tsx`)**
(Content as before)

## 4. Testing Passing Network Analysis & Visualization

**Test Suite 4.1: `PassDataCollectionUI_EditFlow` (testing `PassDetailModal.tsx` for editing)**
*   **Test Case 4.1.1: Open Pass Detail Modal for Editing:**
    *   **Context:** User wants to edit a previously logged pass via "Edit Last Event".
    *   **Action:** In `TrackerPianoInput`, `openEditModalForLastEvent` is triggered for a pass event.
    *   **Assertion:** `PassDetailModal` opens, pre-filled with the existing pass data (e.g., `success`, `recipient_player_id` if any).
*   **Test Case 4.1.2: Edit Pass Details and Submit:**
    *   **Action:** In `PassDetailModal`, user changes `recipient_player_id` and `pass_type`, then submits.
    *   **Assertion:** `handleModalSubmit` in `TrackerPianoInput.tsx` calls `updateLastEventData` with the correct event ID and the fully updated `PassEventData`.

**Test Suite 4.2: `PassAggregationLogic` (testing additions in `eventAggregator.ts`)**
(Content as before)

**Test Suite 4.3: `PassingNetworkMapComponent` (testing `PassingNetworkMap.tsx`)**
(Content as before)

## 5. Testing Pressure Stats UI Integration

**Test Suite 5.1: `PressureDataCollectionUI_EditFlow` (testing `PressureDetailModal.tsx` for editing)**

*   **Test Case 5.1.1: Open Pressure Detail Modal for Editing:**
    *   **Context:** User wants to edit a previously logged pressure event.
    *   **Action:** In `TrackerPianoInput`, `openEditModalForLastEvent` is triggered for a pressure event.
    *   **Assertion:** `PressureDetailModal` opens, pre-filled with the existing pressure `outcome`.
*   **Test Case 5.1.2: Edit Pressure Outcome and Submit:**
    *   **Action:** In `PressureDetailModal`, user changes the `outcome` (e.g., to "forced_turnover_error"), then submits.
    *   **Assertion:** `handleModalSubmit` in `TrackerPianoInput.tsx` calls `updateLastEventData` with the correct event ID and `PressureEventData` including the new `outcome`.

**Test Suite 5.2: `PressureAggregationLogic` (testing additions in `eventAggregator.ts`)**
(Content as before)

**Test Suite 5.3: `PressureStatsDisplay` (testing `Statistics.tsx` "Players" table)**
(Content as before)
```
