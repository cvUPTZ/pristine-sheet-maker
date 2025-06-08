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
        - Event recording interfaces (`TrackerPianoInput.tsx`, pitch interaction). `TrackerPianoInput.tsx` has been redesigned for a context-aware, single-player focus (Section 14), with event details collected via context-specific modals (Sections 11-13) or potentially faster post-tap modifiers (Section 14.5).
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
    - UI interactions trigger event creation. For shots, passes, and pressures, the current design uses modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, `PressureDetailModal.tsx`) to collect detailed attributes within this focused player context. A future refinement (Section 14.5) proposes replacing these with faster post-tap modifiers for live tracking efficiency.
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
    1.  **Data Collection (Implemented):** `TrackerPianoInput.tsx` (now redesigned for single-player focus, see Section 14) uses `PressureDetailModal.tsx` to capture `outcome`. The input method may be further refined (Section 14.5).
    2.  **Processing (Implemented - Player Level):** (Content as before)
    3.  **Visualization (Pending):** (Content as before)
*   **UI Integration (Partially Implemented):** (Content as before)

## 10. Summary of Findings and Recommendations
(Content as before)

## 11. UI Design for Enhanced Shot Data Collection (xG Feature)

*   **Status: Implemented**
*   The UI for recording shot events was enhanced. `TrackerPianoInput.tsx` (now operating in a single-player context, see Section 14) triggers `ShotDetailModal.tsx` when a 'shot' event is selected for the `focusedPlayer`, allowing collection of detailed `ShotEventData`.
*   **Note:** The current primary input method uses this modal. A future refinement (Section 14.5) aims to replace/augment this with faster post-tap modifiers for live tracking.

### 11.1. Design Goals (Achieved)
(Content as before)

### 11.2. Implemented UI Flow and Components (Adapted to Single-Player Context)
(Content as before)

### 11.3. Data Flow Summary for Shots (Implemented)
(Content as before)

This implementation successfully allows for the collection of detailed shot attributes.

## 12. UI Design for Detailed Pass Data Collection (Passing Network Feature)

*   **Status: Implemented**
*   The UI for recording pass events was enhanced. `TrackerPianoInput.tsx` (now operating in a single-player context) triggers `PassDetailModal.tsx` when a 'pass' event is selected for the `focusedPlayer`.
*   **Note:** The current primary input method uses this modal. A future refinement (Section 14.5) aims to replace/augment this with faster post-tap modifiers for live tracking.

### 12.1. Design Goals (Achieved)
(Content as before)

### 12.2. Implemented UI Flow and Components for `TrackerPianoInput.tsx` (Adapted to Single-Player Context)
(Content as before)

### 12.3. Data Flow Summary for Passes (via Piano Input - Implemented)
(Content as before)

This implementation captures the essential pass linkage (passer to recipient) and success status.

## 13. UI Design for Pressure Event Collection (Pressure Analysis Feature)

*   **Status: Implemented**
*   The UI for recording pressure events was implemented. `TrackerPianoInput.tsx` (now operating in a single-player context) triggers `PressureDetailModal.tsx` when a 'pressure' event is selected for the `focusedPlayer`.
*   **Note:** The current primary input method uses this modal. A future refinement (Section 14.5) aims to replace/augment this with faster post-tap modifiers for live tracking.

### 13.1. Design Goals (Achieved for V1 with Modal)
(Content as before)

### 13.2. Implemented UI Flow and Components for `TrackerPianoInput.tsx` (Adapted to Single-Player Context)
(Content as before)

### 13.3. Data Flow Summary for Pressure Events (via Piano Input - Implemented)
(Content as before)

This implementation captures the essential `outcome` of a pressure event.

## 14. Refined UI Design for TrackerPianoInput.tsx (Context-Aware Workflow)

*   **Status: Implemented**
*   Based on crucial user feedback that trackers are assigned to a single player for specific event types, the UI and workflow of `src/components/TrackerPianoInput.tsx` have been redesigned for speed and contextual awareness.

### 14.1. Core Principles of the Redesign (Achieved)
(Content as before)

### 14.2. UI Changes Implemented in `TrackerPianoInput.tsx`
(Content as before)

### 14.3. Data Fetching and State Management Changes (`fetchAssignments` and component state):**
(Content as before)

### 14.4. Impact on Event Recording (`recordEvent` function and modal triggers):**
(Content as before)

This redesign makes `TrackerPianoInput.tsx` a specialized tool for trackers focusing on their specific assignments. While modals are still used for collecting detailed attributes for shots, passes, and pressures, the overall interaction flow is more direct and context-aware.

### 14.5. Fast Detail Input Design (Post-Tap Modifiers)

To maximize speed and efficiency for live event logging in `TrackerPianoInput.tsx` (now operating in a single `focusedPlayer` context), the primary method for capturing critical event details will shift from opening a modal for each event to a system of "post-tap modifier buttons."

**General Principle:**
1.  The tracker first taps the main event type button (e.g., "Shot", "Pass", "Pressure") associated with their `focusedPlayer`. This logs the event immediately with sensible default values for its `event_data`.
2.  Immediately after this initial tap, a small, contextual set of modifier buttons appears briefly (e.g., for 2-3 seconds or until another action is taken).
3.  A second, quick tap on one of these modifier buttons updates the `event_data` of the just-logged event with the selected detail.
4.  If no modifier is tapped within the timeout, the event remains logged with its initial default details.

**Specific Designs by Event Type:**

*   **'Shot' Events:**
    *   **Initial Tap on "Shot" button:**
        *   Logs a 'shot' event.
        *   `ShotEventData` defaults: `on_target: false`, `is_goal: false`. Other fields like `body_part_used`, `shot_type`, `situation`, `assist_type` default to generic values (e.g., 'unknown', 'other', 'open_play', 'none') or are omitted if fully optional. `xg_value` is calculated based on these defaults (and coordinates if available).
    *   **Post-Tap Modifier Buttons (Appear temporarily):**
        *   `[ Goal ]`
        *   `[ On Target (Saved/Blocked) ]`
        *   `[ Off Target / Blocked Wide ]`
        *   (Alternative: Separate "Off Target" and "Blocked")
    *   **Action:** Tapping a modifier updates the `ShotEventData` of the last shot event (e.g., sets `is_goal: true, on_target: true` for "Goal").

*   **'Pass' Events:**
    *   **Initial Tap on "Pass" button:**
        *   Logs a 'pass' event from the `focusedPlayer`.
        *   `PassEventData` defaults: `success: true`.
        *   `recipient_player_id`: Remains `undefined` for this fast piano input method. This detail is expected to be enriched via other means (e.g., video analysis, a separate detailed editing UI).
        *   `end_coordinates`: Remains `undefined`.
        *   `pass_type`: Defaults to a generic value (e.g., 'short' or 'unknown').
    *   **Post-Tap Modifier Buttons (Appear temporarily):**
        *   `[ Pass Failed ]`
    *   **Action:** Tapping "Pass Failed" updates `PassEventData.success` to `false` for the last pass.

*   **'Pressure' Events:**
    *   **Initial Tap on "Pressure" button:**
        *   Logs a 'pressure' event by the `focusedPlayer`.
        *   `PressureEventData` defaults: `outcome: 'no_effect'`.
    *   **Post-Tap Modifier Buttons (Appear temporarily):**
        *   `[ Regain Possession ]`
        *   `[ Forced Turnover ]` (maps to `forced_turnover_error`)
        *   `[ Foul Won ]`
        *   (Possibly) `[ Forced Back/Side ]` (maps to `forced_pass_backwards`)
    *   **Action:** Tapping a modifier updates `PressureEventData.outcome` for the last pressure event.

**UI for Modifier Buttons:**
*   These should appear in a consistent, easily accessible location (e.g., a small horizontal panel above or below the main event buttons).
*   They should be clearly labeled and sufficiently large.
*   They disappear automatically after a short timeout or when another main event type button is pressed.

**Modal Usage - Shift in Role:**
*   The existing detailed modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`, `PressureDetailModal.tsx`) will **no longer be part of the primary, live event logging workflow** in `TrackerPianoInput.tsx` for these core attributes.
*   They may be repurposed for:
    *   An "Edit Last Event" feature, allowing more comprehensive changes to the last logged event.
    *   A separate, slower "Detailed Input Mode" if such a mode is deemed necessary by users.
    *   Use by admin interfaces for post-match data correction or enrichment.
    *   Collecting *additional, less frequent* attributes for an event if a "More Details..." button is provided after a primary event + post-tap modifier.
```
