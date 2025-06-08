# Statistics and Analytics Feature Analysis

## 1. Overview

This document provides a deep dive into the statistics and analytics features currently implemented in the web application. It covers data collection, processing, display, and underlying data structures.

## 2. Data Collection and Storage

### 2.1. Match Events
- **Description:** User actions (clicks, inputs) on the match interface trigger event recording. Events include passes, shots, goals, fouls, cards, corners, offsides, etc.
- **Data Points Captured (per event):**
    - `id`: Unique event identifier.
    - `match_id`: Identifier for the match.
    - `timestamp`: Time of the event.
    - `type`: (Formerly `event_type`) Type of event (e.g., 'pass', 'shot', 'goal'), mapped from the database `event_type` column.
    - `player_id`: Identifier for the player involved.
    - `team_id` (or `team`): Identifier for the team involved ('home' or 'away').
    - `coordinates`: (x, y) position on the pitch where the event occurred.
    - `event_data`: JSON field for additional event-specific details, now typed using `MatchSpecificEventData` (e.g., `ShotEventData`, `PassEventData`).
    - `created_by`: User ID of the tracker who recorded the event.
- **Storage:** `match_events` table in Supabase (with `event_type` and `event_data` columns).

### 2.2. Ball Tracking Data
(Content as before)

### 2.3. Match Timer State
(Content as before)

### 2.4. Match Setup Data
(Content as before)

## 3. Data Processing

### 3.1. Real-time Statistics (Client-Side)
(Content as before)

### 3.2. Post-Match/Aggregated Statistics
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
        - Event recording interfaces (`TrackerPianoInput.tsx`, pitch interaction). `TrackerPianoInput.tsx` has been redesigned for a context-aware, single-player focus (see Section 14). Modals for detailed event data (Sections 11-13) are still used but triggered within this new focused context.
        - Real-time display of some basic stats.
        - `MatchAnalysisV2.tsx` includes role-based views, voice collaboration, and tracker assignment features.

### 4.3. Visualization Components
(Content as before)

## 5. Key Data Structures (Types/Interfaces)
(Content as before)

## 6. Data Flow Summary
1.  **Match Setup:** (Content as before)
2.  **Event Recording (Real-time):**
    - Trackers use `MatchAnalysisV2.tsx` (or `MatchAnalysis.tsx`).
    - `TrackerPianoInput.tsx` now operates with a single `focusedPlayer` and their assigned `focusedAssignedEventTypes`.
    - UI interactions trigger event creation. For shots, passes, and pressures, modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, `PressureDetailModal.tsx`) are used to collect detailed attributes within this focused player context.
    - `useMatchState` and `useMatchCollaboration` manage local state and synchronize events. Event creation logic populates `event_data` with strongly-typed objects.
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
    1.  **Data Collection (Implemented):** `TrackerPianoInput.tsx` (now redesigned for single-player focus) uses `PressureDetailModal.tsx` to capture `outcome`.
    2.  **Processing (Implemented - Player Level):** (Content as before)
    3.  **Visualization (Pending):** (Content as before)
*   **UI Integration (Partially Implemented):** (Content as before)

## 10. Summary of Findings and Recommendations
(Content as before)

## 11. UI Design for Enhanced Shot Data Collection (xG Feature)

*   **Status: Implemented**
*   The UI for recording shot events was enhanced. `TrackerPianoInput.tsx` now triggers `ShotDetailModal.tsx` when a 'shot' event is selected for the focused player, allowing collection of detailed `ShotEventData`.
*   **Note:** The core principles of contextual input via a modal remain, adapted to the new single-player focus of `TrackerPianoInput.tsx` (Section 14).

### 11.1. Design Goals (Achieved)
(Content as before)

### 11.2. Implemented UI Flow and Components (Adapted to Single-Player Context)
1.  **State Management in `TrackerPianoInput.tsx`:** (Content as before, now operates within focused player context)
2.  **Triggering Shot Detail Collection:**
    *   The `handleEventTypeClick` function in `TrackerPianoInput.tsx`, when `'shot'` is the event type for the `focusedPlayer`, sets `pendingEventTrigger` (with `focusedPlayer` info) and opens the `ShotDetailModal.tsx`.
3.  **Shot Detail Modal (`src/components/modals/ShotDetailModal.tsx`):** (Content as before)
4.  **Modifications to `recordEvent` in `TrackerPianoInput.tsx`:** (Content as before)

### 11.3. Data Flow Summary for Shots (Implemented)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer`.
2.  User taps the "Shot" button (which is one of the `focusedAssignedEventTypes`).
3.  `handleEventTypeClick` sets `pendingEventTrigger` (with `focusedPlayer` info) and opens the "Shot Detail Modal".
4.  User fills in shot details in the modal.
5.  User clicks "Record Shot" in the modal.
6.  The modal calls `handleRecordShotWithDetails` in `TrackerPianoInput.tsx`.
7.  `handleRecordShotWithDetails` calls the main `recordEvent` function with the `focusedPlayer` and detailed `ShotEventData`.
8.  `recordEvent` sends data to Supabase.

## 12. UI Design for Detailed Pass Data Collection (Passing Network Feature)

*   **Status: Implemented**
*   The UI for recording pass events was enhanced. `TrackerPianoInput.tsx` now triggers `PassDetailModal.tsx` when a 'pass' event is selected for the `focusedPlayer`, allowing collection of `recipient_player_id` and other pass details.
*   **Note:** The core principles of contextual input via a modal remain, adapted to the new single-player focus of `TrackerPianoInput.tsx` (Section 14).

### 12.1. Design Goals (Achieved)
(Content as before)

### 12.2. Implemented UI Flow and Components for `TrackerPianoInput.tsx` (Adapted to Single-Player Context)
1.  **State Management in `TrackerPianoInput.tsx`:** (Content as before, now operates within focused player context)
2.  **Triggering Pass Detail Collection:**
    *   The `handleEventTypeClick` function, when `'pass'` is the event type for the `focusedPlayer`, sets `pendingEventTrigger` (with `focusedPlayer` as passer) and opens `PassDetailModal.tsx`.
3.  **Pass Detail Modal (`src/components/modals/PassDetailModal.tsx`):** (Content as before)
4.  **Modifications to `recordEvent` in `TrackerPianoInput.tsx`:** (Content as before)

### 12.3. Data Flow Summary for Passes (via Piano Input - Implemented)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer` (the passer).
2.  User taps the "Pass" button (one of the `focusedAssignedEventTypes`).
3.  `handleEventTypeClick` opens "Pass Detail Modal" with passer info.
4.  User selects recipient and other details in the modal.
5.  User clicks "Record Pass".
6.  Modal calls `handleRecordPassWithDetails`.
7.  `handleRecordPassWithDetails` calls main `recordEvent` with `focusedPlayer` and `PassEventData`.
8.  `recordEvent` sends data to Supabase.

## 13. UI Design for Pressure Event Collection (Pressure Analysis Feature)

*   **Status: Implemented**
*   The UI for recording pressure events was implemented. `TrackerPianoInput.tsx` now triggers `PressureDetailModal.tsx` when a 'pressure' event is selected for the `focusedPlayer`.
*   **Note:** The core principles of contextual input via a modal remain, adapted to the new single-player focus of `TrackerPianoInput.tsx` (Section 14).

### 13.1. Design Goals (Achieved for V1 with Modal)
(Content as before)

### 13.2. Implemented UI Flow and Components for `TrackerPianoInput.tsx` (Adapted to Single-Player Context)
1.  **New "Pressure" Event Button:** (Available if assigned to focused player)
2.  **State Management in `TrackerPianoInput.tsx`:** (Content as before, now operates within focused player context)
3.  **Triggering Pressure Detail Collection:**
    *   `handleEventTypeClick`, when `'pressure'` is the event type for the `focusedPlayer`, sets `pendingEventTrigger` (with `focusedPlayer` as pressurer) and opens `PressureDetailModal.tsx`.
4.  **Pressure Detail Modal (`src/components/modals/PressureDetailModal.tsx`):** (Content as before)
5.  **Modifications to `recordEvent` in `TrackerPianoInput.tsx`:** (Content as before)

### 13.3. Data Flow Summary for Pressure Events (via Piano Input - Implemented)
1.  `TrackerPianoInput.tsx` operates with a `focusedPlayer` (the pressurer).
2.  User taps the "Pressure" button (one of the `focusedAssignedEventTypes`).
3.  `handleEventTypeClick` opens "Pressure Detail Modal" with pressurer info.
4.  User selects the outcome in the modal.
5.  User clicks "Record Pressure".
6.  Modal calls `handleRecordPressureWithDetails`.
7.  `handleRecordPressureWithDetails` calls main `recordEvent` with `focusedPlayer` and `PressureEventData`.
8.  `recordEvent` sends data to Supabase.

## 14. Refined UI Design for TrackerPianoInput.tsx (Context-Aware Workflow)

*   **Status: Implemented (Core Logic)**
*   Based on crucial user feedback that trackers are assigned to a single player for specific event types, the UI and workflow of `src/components/TrackerPianoInput.tsx` have been redesigned for speed and contextual awareness.

### 14.1. Core Principles of the Redesign (Achieved)

*   **Single Player Focus:** The interface now assumes the tracker is working on one specific, programmatically determined `focusedPlayer` based on their assignments.
*   **Contextual Event Types:** Only the event types assigned to the tracker for the `focusedPlayer` are displayed and active.
*   **Speed and Efficiency:** Clicks are reduced by removing manual player selection within this component. Modals are still used for detail collection for specific events (shot, pass, pressure) but are triggered in the context of the `focusedPlayer`.

### 14.2. UI Changes Implemented in `TrackerPianoInput.tsx`

1.  **Removal of General Player Selection UI:**
    *   The `Card` component that previously allowed manual selection of Home/Away teams and players has been removed.
2.  **Display of Focused Player Information:**
    *   A new `Card` is displayed at the top, showing the `focusedPlayer`'s name, jersey number, and team name (derived from `fullMatchRoster` and assignment).
3.  **Dynamic and Focused Event Type Buttons:**
    *   The event type buttons grid now maps over `focusedAssignedEventTypes`, ensuring only relevant event buttons are shown.

### 14.3. Data Fetching and State Management Changes (`fetchAssignments` and component state):**

*   The `fetchAssignments` function was refactored to:
    *   Identify the first valid assignment (with `player_id` and `assigned_event_types`) for the current user/match.
    *   Set `focusedPlayer` (with details from `fullMatchRoster`), `focusedPlayerTeam`, and `focusedAssignedEventTypes` based on this single assignment.
    *   An error message is displayed if no valid/specific assignment is found.
*   State variables `selectedPlayer`, `selectedTeam`, and `assignedEventTypes` were repurposed or replaced by `focusedPlayer`, `focusedPlayerTeam`, and `focusedAssignedEventTypes`. The `assignedPlayers` state (for lists) was removed.

### 14.4. Impact on Event Recording (`recordEvent` function):**

*   When an event button is tapped, the `player` argument passed to `recordEvent` is now always the `focusedPlayer`.
*   The `teamContext` is derived from `focusedPlayerTeam`.
*   Modals for 'shot', 'pass', and 'pressure' events are triggered using the `focusedPlayer` context.
*   The `PassDetailModal`'s `teamPlayers` prop is populated with teammates of the `focusedPlayer` from the `fullMatchRoster`.

This redesign makes `TrackerPianoInput.tsx` a specialized tool for trackers focusing on their specific assignments. While modals are still used for collecting detailed attributes, the primary interaction is streamlined around the assigned player and their allowed event types. Future iterations might explore replacing modals with even faster inline input methods for these attributes.
```
