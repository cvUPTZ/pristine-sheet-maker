# Statistics and Analytics Feature Analysis

## 1. Overview

This document provides a deep dive into the statistics and analytics features currently implemented in the web application. It covers data collection, processing, display, and underlying data structures.

## 2. Data Collection and Storage
(Content as before)

## 3. Data Processing
(Content as before)

## 4. Data Display and Visualizations

### 4.1. Core Statistics Display Components
(Content as before)

### 4.2. Analytics Pages
- **`src/pages/Statistics.tsx`** (Content as before)
- **`src/pages/MatchAnalysis.tsx` & `src/pages/MatchAnalysisV2.tsx`**
    - **Purpose:** Primarily for real-time match event tracking and input.
    - **Features:**
        - Team setup, player selection.
        - Event recording interfaces (`TrackerPianoInput.tsx`, pitch interaction). `TrackerPianoInput.tsx` now operates with a single `focusedPlayer` and their assigned event types displayed as context-specific buttons. It utilizes a "post-tap modifier" system for rapid detail input for key events (shot, pass, pressure). An "Edit Last Event" button allows triggering detail modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, `PressureDetailModal.tsx`) for more comprehensive editing of the last recorded event. (See Section 14 for full details).
        - Real-time display of some basic stats.
        - `MatchAnalysisV2.tsx` includes role-based views, voice collaboration, and tracker assignment features.

### 4.3. Visualization Components
(Content as before)

## 5. Key Data Structures (Types/Interfaces)
(Content as before)

## 6. Data Flow Summary
1.  **Match Setup:** Admin/user sets up match details, including teams and players.
2.  **Event Recording (Real-time via `TrackerPianoInput.tsx`):**
    - The tracker is assigned a `focusedPlayer` and sees only their `focusedAssignedEventTypes` as active buttons.
    - **Initial Tap:** Tracker taps an event button (e.g., "Shot", "Pass", "Pressure").
        - `recordEvent` in `TrackerPianoInput.tsx` immediately logs the event to Supabase with pre-defined default `event_data`. For example, a 'shot' defaults to `{ on_target: false, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' }`.
        - The ID of this newly created event is stored.
    - **Modifier Phase (for Shot, Pass, Pressure):**
        - A set of contextual "modifier buttons" (e.g., for Shot: "Goal", "On Target", "Off Target/Block") appears temporarily (e.g., 3.5 seconds).
        - If the tracker taps a modifier button:
            - The corresponding handler (e.g., `handleShotOutcomeModifier`) is called.
            - This handler updates the `event_data` of the previously logged event in Supabase using its stored ID (e.g., for a "Goal" tap, `event_data` becomes `{... defaults ..., on_target: true, is_goal: true }`).
        - If no modifier is tapped within the timeout, the event remains in the database with its initial default `event_data`.
    - **Editing Last Event (Optional):**
        - An "Edit Last Event" button is available, showing details of the `lastRecordedEventDisplay`.
        - If tapped, the relevant detail modal (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, or `PressureDetailModal.tsx`) opens, pre-filled with the data of the last recorded event.
        - The user can make comprehensive changes in the modal and submit.
        - On submission, `handleModalSubmit` calls `updateLastEventData` to update the event in Supabase.
    - **Other Event Types:** Events not using the modifier system are logged directly with their respective default or collected data if applicable.
    - `useMatchState` (if still used for some flows) and `useMatchCollaboration` help manage local state and synchronize events. Event creation logic populates `event_data` with strongly-typed objects.
    - Events are sent to Supabase (`match_events` table) and potentially broadcast to other connected clients.
3.  **Ball Tracking (Real-time):** (Content as before)
4.  **Statistics Calculation & Display:** (Content as before)
5.  **Data Persistence:** (Content as before)

## 7. Identified Gaps and Areas for Advanced Analytics
(Content as before)

## 8. Data Structure Analysis for Advanced Metrics
(Content as before)

## 9. Proposed New Analytics Features

### 9.1. Feature 1: Expected Goals (xG) and Shot Map Visualization
(Content as before, status Implemented)

### 9.2. Feature 2: Enhanced Passing Network Analysis & Visualization
(Content as before, status Implemented - Initial Version)

### 9.3. Feature 3: Pressure Event Tracking and Analysis
*   **Description:** (Content as before)
*   **Data Required (from new `MatchEvent` with `PressureEventData`):** (Content as before)
*   **Calculation/Generation:**
    1.  **Data Collection (Implemented):** `TrackerPianoInput.tsx` now uses a fast post-tap modifier system for primary input of pressure `outcome`. `PressureDetailModal.tsx` exists for editing or more detailed input.
    2.  **Processing (Implemented - Player Level):** (Content as before)
    3.  **Visualization (Pending):** (Content as before)
*   **UI Integration (Partially Implemented):** (Content as before)

## 10. Summary of Findings and Recommendations
(Content as before)

## 11. UI Design for Enhanced Shot Data Collection (xG Feature)

*   **Status: Implemented (Fast Input via Modifiers; Modal for Editing)**
*   **Note:** The primary method for live recording of shot outcomes (Goal, On Target, Off Target/Blocked) is the "post-tap modifier" system in `TrackerPianoInput.tsx` (see Section 14.5). The `ShotDetailModal.tsx` is now primarily for **editing the last recorded shot event** via the "Edit Last Event" button, allowing for more detailed attribute changes (body part, shot type, etc.) after the initial fast input.

### 11.1. Design Goals (Achieved via combined approach)
(Content as before)

### 11.2. Implemented UI Flow and Components
1.  **Fast Input via `TrackerPianoInput.tsx` (Primary Flow):**
    *   User taps the 'Shot' button for the `focusedPlayer`.
    *   `recordEvent` logs a shot with comprehensive defaults: `{ on_target: false, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' }`.
    *   Modifier buttons ("Goal", "On Target", "Off Target/Block") appear.
    *   Tapping a modifier calls `handleShotOutcomeModifier` to update the `on_target` and `is_goal` fields of the already logged event.
2.  **Shot Detail Modal (`src/components/modals/ShotDetailModal.tsx`) (Secondary/Edit Flow):**
    *   Triggered by the "Edit Last Event" button in `TrackerPianoInput.tsx` if the last event was a shot.
    *   Opens pre-filled with all data from the selected shot event (including defaults and any modifier-applied changes).
    *   Allows comprehensive editing of all `ShotEventData` fields (e.g., `body_part_used`, `shot_type`, `situation`, `assist_type`, as well as `on_target`, `is_goal`).
    *   Submission calls `handleModalSubmit`, which updates the event in the database.

### 11.3. Data Flow Summary for Shots (Implemented with Fast Modifiers & Edit Modal)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer`.
2.  User taps the "Shot" button.
3.  `handleEventTypeClick` calls `recordEvent` immediately with comprehensive default `ShotEventData` (includes `situation`, `body_part_used`, etc., with `on_target: false, is_goal: false`). The ID of this new event is stored.
4.  A set of modifier buttons ("Goal", "On Target", "Off Target/Block") appears temporarily (e.g., 3.5 seconds).
5.  If the user taps a modifier button (e.g., "Goal"):
    *   `handleShotOutcomeModifier` is called with the outcome.
    *   This function updates the `event_data` of the previously logged shot event in Supabase (e.g., sets `on_target: true, is_goal: true`).
6.  If no modifier is tapped, the shot remains logged with the initial defaults.
7.  The `ShotDetailModal.tsx` can be used via an "Edit" button to further refine details of the last event.

## 12. UI Design for Detailed Pass Data Collection (Passing Network Feature)

*   **Status: Implemented (Fast Input via Modifiers; Modal for Editing)**
*   **Note:** The primary method for live recording of pass success/failure is the "post-tap modifier" system in `TrackerPianoInput.tsx`. The `PassDetailModal.tsx` is now primarily for **editing the last recorded pass event** (e.g., to add/change recipient, pass type) via the "Edit Last Event" button. For fast input, `recipient_player_id` is not captured on the initial tap.

### 12.1. Design Goals (Achieved via combined approach)
(Content as before)

### 12.2. Implemented UI Flow and Components
1.  **Fast Input via `TrackerPianoInput.tsx` (Primary Flow):**
    *   User taps the 'Pass' button for the `focusedPlayer`.
    *   `recordEvent` logs a pass with default `PassEventData ({ success: true })`.
    *   Modifier buttons ("Pass Succeeded", "Pass Failed") appear.
    *   Tapping a modifier calls `handlePassOutcomeModifier` to update the `success` field of the logged event.
2.  **Pass Detail Modal (`src/components/modals/PassDetailModal.tsx`) (Secondary/Edit Flow):**
    *   Triggered by the "Edit Last Event" button if the last event was a pass.
    *   Opens pre-filled with pass data.
    *   Allows editing of `success`, `recipient_player_id`, `pass_type`, `end_coordinates`, etc.
    *   Submission calls `handleModalSubmit` to update the event.

### 12.3. Data Flow Summary for Passes (Implemented with Fast Modifiers & Edit Modal)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer` (the passer).
2.  User taps the "Pass" button.
3.  `handleEventTypeClick` calls `recordEvent` immediately with default `PassEventData ({ success: true })`. The ID of this new event is stored.
4.  Modifier buttons "Pass Succeeded", "Pass Failed" appear temporarily (e.g., 3.5 seconds).
5.  If the user taps "Pass Failed":
    *   `handlePassOutcomeModifier` is called.
    *   This function updates `PassEventData.success` to `false` for the previously logged pass event in Supabase.
6.  If no modifier is tapped, the pass remains logged as successful (default).
7.  The `PassDetailModal.tsx` (for recipient, detailed pass type) can be used via an "Edit" button.

## 13. UI Design for Pressure Event Collection (Pressure Analysis Feature)

*   **Status: Implemented (Fast Input via Modifiers; Modal for Editing)**
*   **Note:** The primary method for live recording of pressure outcomes is the "post-tap modifier" system in `TrackerPianoInput.tsx`. The `PressureDetailModal.tsx` is now primarily for **editing the last recorded pressure event** via the "Edit Last Event" button.

### 13.1. Design Goals (Achieved via combined approach)
(Content as before)

### 13.2. Implemented UI Flow and Components
1.  **Fast Input via `TrackerPianoInput.tsx` (Primary Flow):**
    *   User taps the 'Pressure' button for the `focusedPlayer`.
    *   `recordEvent` logs a pressure event with default `PressureEventData ({ outcome: 'no_effect' })`.
    *   Modifier buttons (e.g., "Regain", "Turnover", "No Effect") appear.
    *   Tapping a modifier calls `handlePressureOutcomeModifier` to update the `outcome` field of the logged event.
2.  **Pressure Detail Modal (`src/components/modals/PressureDetailModal.tsx`) (Secondary/Edit Flow):**
    *   Triggered by the "Edit Last Event" button if the last event was a pressure event.
    *   Opens pre-filled with pressure data.
    *   Allows editing of `outcome` and any other relevant fields.
    *   Submission calls `handleModalSubmit` to update the event.

### 13.3. Data Flow Summary for Pressure Events (Implemented with Fast Modifiers & Edit Modal)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer` (the pressurer).
2.  User taps the "Pressure" button.
3.  `handleEventTypeClick` calls `recordEvent` immediately with default `PressureEventData ({ outcome: 'no_effect' })`. The ID of this new event is stored.
4.  Modifier buttons for various outcomes (e.g., "Regain", "Turnover", "No Effect", "Foul Won") appear temporarily (e.g., 3.5 seconds).
5.  If the user taps a modifier:
    *   `handlePressureOutcomeModifier` is called.
    *   This updates `PressureEventData.outcome` for the event in Supabase.
6.  If no modifier is tapped, the event remains with `outcome: 'no_effect'`.
7.  The `PressureDetailModal.tsx` can be used via an "Edit" button.

## 14. Refined UI Design for TrackerPianoInput.tsx (Context-Aware Workflow)

*   **Status: Implemented**
*   Based on crucial user feedback, `src/components/TrackerPianoInput.tsx` has been redesigned for speed and contextual awareness, focusing on a single assigned player and utilizing a "post-tap modifier" system for rapid detail input for key events.

### 14.1. Core Principles of the Redesign (Achieved)
(Content as before)

### 14.2. UI Changes Implemented in `TrackerPianoInput.tsx`
(Content as before)

### 14.3. Data Fetching and State Management Changes (`fetchAssignments` and component state):**
(Content as before)

### 14.4. Impact on Event Recording (`recordEvent` function and modal triggers):**
(Content as before, with clarification that modals are secondary to fast modifiers)

### 14.5. Fast Detail Input Design (Post-Tap Modifiers)

*   **Status: Implemented**
*   To maximize speed and efficiency for live event logging in `TrackerPianoInput.tsx`, the primary method for capturing critical event details for 'shot', 'pass', and 'pressure' events now uses a system of "post-tap modifier buttons."

**General Principle (Implemented):**
1.  The tracker first taps the main event type button (e.g., "Shot", "Pass", "Pressure") associated with their `focusedPlayer`. This logs the event immediately via `recordEvent` with comprehensive default values for its `event_data`. The ID of this new event is captured.
    *   Example 'Shot' defaults: `{ on_target: false, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' }`.
    *   Example 'Pass' defaults: `{ success: true }`.
    *   Example 'Pressure' defaults: `{ outcome: 'no_effect' }`.
2.  Immediately after this initial tap, a contextual set of modifier buttons appears (controlled by `modifierContext` state, typically for 3.5 seconds).
3.  A second, quick tap on one of these modifier buttons calls a specific handler (e.g., `handleShotOutcomeModifier`) which updates the relevant fields in the `event_data` of the just-logged event in Supabase using its stored ID.
4.  If no modifier is tapped within the timeout, the `modifierContext` is cleared, and the event remains logged with its initial default details. The `lastRecordedEventDisplay` shows the state of the event after any modifier interaction.

**Specific Designs by Event Type (Implemented):**

*   **'Shot' Events:**
    *   **Initial Tap Defaults (Comprehensive):** `{ on_target: false, is_goal: false, situation: 'open_play', body_part_used: 'right_foot', shot_type: 'normal', assist_type: 'none' }`.
    *   **Post-Tap Modifier Buttons:** "Goal", "On Target", "Off Target/Block".
    *   **Action:** Updates `on_target` and `is_goal` fields in `ShotEventData`, preserving other defaults.
*   **'Pass' Events:**
    *   **Initial Tap Defaults:** `{ success: true }`. `recipient_player_id` and `end_coordinates` remain `undefined` in this fast flow.
    *   **Post-Tap Modifier Buttons:** "Pass Succeeded", "Pass Failed".
    *   **Action:** Updates `PassEventData.success`.
*   **'Pressure' Events:**
    *   **Initial Tap Defaults:** `{ outcome: 'no_effect' }`.
    *   **Post-Tap Modifier Buttons:** "Regain", "Turnover", "No Effect", "Foul Won".
    *   **Action:** Updates `PressureEventData.outcome`.

**UI for Modifier Buttons (Implemented):**
*   Rendered conditionally based on `modifierContext`.
*   Appear in a dedicated `div`.
*   Disappear automatically after a timeout or when another main event/modifier is pressed, or when the "Edit Last Event" modal is opened.

**Modal Usage - Shift in Role (Implemented):**
*   Detailed modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, `PressureDetailModal.tsx`) are no longer part of the primary, live event logging workflow for initial data capture of shots, passes, or pressures.
*   They are now triggered by an "Edit Last Event" button, which becomes active after an event is logged (and potentially modified by a fast-tap).
*   The modal opens pre-filled with the (potentially modified) data of the last event, allowing for more comprehensive editing or addition of details (e.g., `recipient_player_id` for a pass, detailed `shot_type` for a shot) without slowing down the initial live logging.
```
