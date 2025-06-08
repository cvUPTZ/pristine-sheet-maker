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
- **Description:** Continuous tracking of the ball's position when ball tracking mode is active.
- **Data Points Captured (per point):**
    - `x`: x-coordinate of the ball.
    - `y`: y-coordinate of the ball.
    - `timestamp`: Time of the data point.
    - `player_id`: (Potentially) Player in possession or last to touch the ball.
    - `team`: (Potentially) Team in possession.
- **Storage:** `ball_tracking_data` JSON field in the `matches` table in Supabase.

### 2.3. Match Timer State
- **Description:** Tracks the official match time.
- **Data Points Captured:**
    - `timer_current_value`: Elapsed time in seconds.
    - `timer_status`: 'stopped', 'running', or 'paused'.
    - `timer_last_started_at`: Timestamp when the timer was last started.
- **Storage:** `matches` table in Supabase.

### 2.4. Match Setup Data
- **Description:** Team names, formations, and player rosters for each match.
- **Data Points Captured:**
    - `home_team_name`, `away_team_name`
    - `home_team_formation`, `away_team_formation`
    - `home_team_players`, `away_team_players` (arrays of player objects)
- **Storage:** `matches` table in Supabase.

## 3. Data Processing

### 3.1. Real-time Statistics (Client-Side)
- **Hook:** `useMatchState` (likely in `src/hooks/useMatchState.ts`)
    - Manages and updates match state in real-time during a match.
    - Calculates some basic statistics on the fly based on events as they are recorded. Event creation now uses typed `event_data`.
- **Hook:** `useMatchCollaboration` (likely in `src/hooks/useMatchCollaboration.ts`)
    - Handles real-time synchronization of events and data across multiple users/trackers.

### 3.2. Post-Match/Aggregated Statistics
- **Primary Logic:** `src/lib/analytics/eventAggregator.ts`
    - Function: `aggregateMatchEvents`
    - Takes raw `MatchEvent[]`, `homePlayers[]`, `awayPlayers[]` as input.
    - Aggregates events to calculate team-level and player-level statistics.
    - **Team Stats Calculated:** Shots, shots on target, goals, assists, passes (attempted/completed), fouls, cards, corners, offsides, tackles, interceptions, crosses, clearances, blocks, `totalXg`.
    - **Player Stats Calculated:** Similar to team stats but for individual players, including `totalXg`, `progressivePasses`, `passesToFinalThird`, and `passNetworkSent` (player-to-player pass details).
    - xG calculation is performed using `calculateXg` from `src/lib/analytics/xgCalculator.ts` for each shot event.
    - Detailed pass statistics (progressive, final third, network) are calculated based on `PassEventData` including `recipient_player_id`, `success`, and coordinates.
- **Page Logic:** `src/pages/Statistics.tsx`
    - Fetches match data (including events) from Supabase.
    - Now primarily uses `aggregateMatchEvents` from `src/lib/analytics/eventAggregator.ts` to process `formattedEvents` and derive both team and player statistics (including `totalXg`, `progressivePasses`, etc.). The local calculation functions for statistics previously in this file have been removed in favor of the centralized aggregator.
    - Stores the comprehensive aggregated stats (team and player) in the component's state.

## 4. Data Display and Visualizations

### 4.1. Core Statistics Display Components
- **`src/components/StatisticsDisplay.tsx`**
    - Shows: Ball Possession, Passing Statistics (successful/attempted, accuracy), Shot Statistics (on target/total, totalXg), Fouls, Corners, Offsides.
    - Compares Home vs. Away.
- **`src/components/DetailedStatsTable.tsx`**
    - Shows: Possession, Total Shots, Shots on Target, totalXg, Passes, Pass Accuracy, Balls Played, Balls Lost.
    - Tabular comparison of Home vs. Away.

### 4.2. Analytics Pages
- **`src/pages/Statistics.tsx`**
    - **Purpose:** Main dashboard for viewing comprehensive statistics and analytics for a selected match.
    - **Features:**
        - Match selector.
        - Key metrics overview cards (Total Events, Total Passes, Total Shots, Ball Tracking Points).
        - Tabbed interface for different views:
            - **Overview:** `MatchRadarChart`, `StatisticsDisplay`, `EventTimelineChart`.
            - **Detailed:** `DetailedStatsTable`.
            - **Performance:** `PlayerPerformanceChart`, `TeamPerformanceRadar`.
            - **Shot Map / xG (New Tab):** Contains the `ShotMap.tsx` component for visualizing shot locations and xG values, along with cards displaying team total xG.
            - **Passing Network (New Tab):** Contains the `PassingNetworkMap.tsx` component for visualizing pass connections.
            - **Advanced:** `MatchHeatMap`, `AdvancedStatsTable`.
            - **Players:** Table of individual player stats (passes, accuracy, progressive passes, passes to final third, shots, goals, assists, totalXg, fouls, cards).
            - **Passes:** `PassMatrixTable` (displays pass combinations).
            - **Ball Flow:** `BallFlowVisualization`.
- **`src/pages/MatchAnalysis.tsx` & `src/pages/MatchAnalysisV2.tsx`**
    - **Purpose:** Primarily for real-time match event tracking and input.
    - **Features:**
        - Team setup, player selection.
        - Event recording interfaces (`TrackerPianoInput.tsx`, pitch interaction), with `TrackerPianoInput.tsx` now including modals for detailed shot and pass data entry.
        - Real-time display of some basic stats.
        - `MatchAnalysisV2.tsx` includes role-based views, voice collaboration, and tracker assignment features.

### 4.3. Visualization Components
- **Located in:** `src/components/analytics/` and `src/components/visualizations/`
    - `AdvancedStatsTable.tsx`: Displays a table of more advanced or aggregated stats.
    - `BallFlowVisualization.tsx`: Visualizes ball movement patterns.
    - `EventTimelineChart.tsx`: Shows events chronologically.
    - `MatchHeatMap.tsx`: Displays heatmaps based on event locations.
    - `MatchRadarChart.tsx`: Radar chart for comparing team stats.
    - `PassMatrixTable.tsx`: Table showing pass combinations between players.
    - `PlayerPerformanceChart.tsx`: Charts for visualizing player performance metrics.
    - `TeamPerformanceRadar.tsx`: Radar chart for team performance profile.
    - **`ShotMap.tsx` (New Component):** Visualizes shot locations on a football pitch. Shots are color-coded by outcome (goal, on-target, off-target) and their radius can be scaled by xG value. Tooltips provide detailed information for each shot. Includes team-based filtering.
    - **`PassingNetworkMap.tsx` (New Component):** Visualizes pass connections between players on a football pitch. Links can be styled by pass count/success rate, and nodes by player involvement. Includes team and player filters.
    - *(Other components as listed in initial file exploration)*

## 5. Key Data Structures (Types/Interfaces)

- **`src/types/index.ts` (and potentially `src/types/matchForm.ts`, `src/integrations/supabase/types.ts`)**
    - **`Match`:** Represents a match with all its details (teams, players, score, status, stats, etc.).
    - **`MatchEvent`:**
        - `id: string | number`
        - `match_id: string`
        - `timestamp: number`
        - `type: EventTypeKey` (maps to `EventTypeKey` from `eventTypes.ts`, this is the standardized field for event type within the application code)
        - `event_data?: MatchSpecificEventData | null` (typed based on `type`, see `src/types/eventData.ts`)
        - `player_id?: number | string`
        - `team?: 'home' | 'away'`
        - `coordinates?: { x: number; y: number }`
        - `created_by?: string` (user ID)
    - **`Statistics`:** (as defined in `StatisticsDisplay.tsx` and `Statistics.tsx`, now primarily derived from `AggregatedStats` in `eventAggregator.ts`)
        - `possession: { home: number; away: number }`
        - `passes: { home: TeamPassStats; away: TeamPassStats }` (where `TeamPassStats` = `{ successful: number; attempted: number }`)
        - `shots: { home: TeamShotStats; away: TeamShotStats }` (where `TeamShotStats` = `{ onTarget: number; offTarget: number; total?: number; totalXg?: number; }`)
        - `fouls: { home: number; away: number }`
        - `corners: { home: number; away: number }`
        - `offsides: { home: number; away: number }`
        - `ballsPlayed: { home: number; away: number }`
        - `ballsLost: { home: number; away: number }`
        - `duels: { home: TeamDuelStats; away: TeamDuelStats }`
        - `crosses: { home: TeamCrossStats; away: TeamCrossStats }`
    - **`PlayerStatistics`:** (as defined in `Statistics.tsx`, now aligning with `PlayerStatSummary` from `eventAggregator.ts`)
        - `playerId: string | number`
        - `playerName: string`
        - `team: 'home' | 'away'`
        - `events: { passes: { successful: number, attempted: number }, shots: { onTarget: number, offTarget: number }, ... }` // This specific structure is used for parts of the player table.
        - `totalXg?: number;`
        - `progressivePasses?: number;`
        - `passesToFinalThird?: number;`
        - `passNetworkSent?: Array<{ toPlayerId: string | number, count: number, successfulCount: number }>;`
    - **`Player`:** Basic player information (id, name, number, etc.).
    - **`Team`:** Team information (id, name, players, formation).
    - **`BallTrackingPoint`:** Structure for individual ball position data.

## 6. Data Flow Summary

1.  **Match Setup:** Admin/user sets up match details, including teams and players (`MatchAnalysis.tsx` or an admin interface).
2.  **Event Recording (Real-time):**
    - Trackers use `MatchAnalysisV2.tsx` (or `MatchAnalysis.tsx`).
    - UI interactions (e.g., `TrackerPianoInput.tsx`, pitch clicks) trigger event creation. For shots and passes, modals (`ShotDetailModal.tsx`, `PassDetailModal.tsx`) allow for detailed attribute input.
    - `useMatchState` and `useMatchCollaboration` manage local state and synchronize events. Event creation logic now populates `event_data` with strongly-typed objects (e.g., `ShotEventData`, `PassEventData`).
    - Events are sent to Supabase (`match_events` table) and potentially broadcast to other connected clients via Supabase real-time features.
3.  **Ball Tracking (Real-time):**
    - If active, ball coordinates are captured and added to `ball_tracking_data` via `useMatchState` and saved with the match.
4.  **Statistics Calculation & Display:**
    - **Real-time (Basic):** `MatchAnalysis.tsx` might show some live stats derived directly from `useMatchState`.
    - **Comprehensive (Post-match or On-demand):**
        - User navigates to `src/pages/Statistics.tsx`.
        - Page fetches match details and `match_events` (where `event_data` is now typed).
        - `aggregateMatchEvents` from `src/lib/analytics/eventAggregator.ts` processes the `match_events` array.
        - This function iterates through events, updating counts for teams and players based on `event.type` and the strongly-typed `event.event_data`. Expected Goals (xG), progressive passes, passes to final third, and pass networks are calculated here.
        - Calculated/fetched statistics are passed to various display components (`StatisticsDisplay`, `DetailedStatsTable`) and visualization components (`MatchRadarChart`, `PlayerHeatmap`, `ShotMap`, `PassingNetworkMap`, etc.).
5.  **Data Persistence:**
    - Match details, events (including typed `event_data`), and calculated statistics (optional, can be re-calculated) are stored in Supabase tables (`matches`, `match_events`).

## 7. Identified Gaps and Areas for Advanced Analytics

### 7.1. Advanced Offensive Metrics

*   **Expected Goals (xG) and Expected Assists (xA):**
    *   **Gap:** The current system tracks shots and goals, but not the quality of chances created or taken. xG models estimate the probability of a shot resulting in a goal based on factors like shot distance, angle, type of assist, game state, etc. xA measures the likelihood that a pass would become a goal assist.
    *   **Opportunity:** Implementing xG/xA would provide a more accurate measure of attacking performance, beyond simple shot/goal counts. It helps identify teams/players over or under-performing their underlying chance creation. (xG partially implemented).
*   **Shot Maps and Detailed Shot Analysis:**
    *   **Gap:** While event coordinates are stored, there isn't a dedicated, interactive shot map visualization that details shot types (e.g., header, foot), outcomes (goal, saved, blocked, off-target), and associated xG values.
    *   **Opportunity:** Provide visual tools to analyze shot locations, effectiveness from different areas, and player shooting patterns. (Partially addressed by `ShotMap.tsx` integration).
*   **Passing Network Analysis:**
    *   **Gap:** `PassMatrixTable.tsx` provides a basic table of pass combinations. While `eventAggregator.ts` now calculates player-to-player pass networks (`passNetworkSent`), progressive passes, and passes to final third, visualization of this data as a network graph is still pending. (Partially addressed by `PassingNetworkMap.tsx` integration).
    *   **Opportunity:** Visualize team build-up play, identify key passing links, and understand how teams progress the ball. Metrics like player centrality in passing networks could be derived.
*   **Play Type Analysis (e.g., Counter Attacks, Set Pieces):**
    *   **Gap:** Statistics are generally aggregated, without specific breakdowns for different phases or types of play (e.g., effectiveness of counter-attacks, success rates from set pieces).
    *   **Opportunity:** Tagging sequences of events or specific event types (e.g., corner kicks leading to shots) to analyze their effectiveness.

### 7.2. Advanced Defensive Metrics
(Content as before)

### 7.3. Player-Specific Advanced Analytics
(Content as before)

### 7.4. Team-Level Tactical Analysis
(Content as before)

### 7.5. Data Richness for Advanced Analytics
(Content as before)

## 8. Data Structure Analysis for Advanced Metrics

### 8.1. Current `MatchEvent` Structure Review
(Content as before, reflecting `event_data?: MatchSpecificEventData | null`)

### 8.2. Data Requirements for Identified Advanced Metrics
(Content as before, references to `event_type` in this section mean the conceptual event type, not the old field name)

### 8.3. Proposed Modifications to Data Structures
(Content as before, reflecting completed and partially implemented changes)

### 8.4. Impact on Data Collection UI
(Content as before, reflecting implemented changes for shot and pass data collection)

### 8.5. Conclusion of Data Structure Analysis
(Content as before, reflecting implemented changes)

## 9. Proposed New Analytics Features

### 9.1. Feature 1: Expected Goals (xG) and Shot Map Visualization

*   **Status: Implemented (Initial Version)**
*   **Description:**
    *   Calculates and displays Expected Goals (xG) for each shot taken during a match.
    *   Provides an interactive shot map visualization showing all shots, filterable by team and player. Each shot point on the map is color-coded by outcome and sized by its xG value.
    *   Displays cumulative xG for each team and individual players.
*   **Data Required (from enhanced `MatchEvent` with `ShotEventData`):**
    *   `type: 'shot'`
    *   `coordinates` (for shot location, distance, angle calculation)
    *   `event_data.body_part_used`
    *   `event_data.assist_type`
    *   `event_data.situation`
    *   `event_data.shot_type`
    *   `event_data.on_target`, `event_data.is_goal`
*   **Calculation/Generation:**
    1.  **Data Collection:** `TrackerPianoInput.tsx` now uses `ShotDetailModal.tsx` to capture detailed `ShotEventData`.
    2.  **xG Model:** An initial rule-based xG model is implemented in `src/lib/analytics/xgCalculator.ts`.
    3.  **Processing:** `src/lib/analytics/eventAggregator.ts` now calls `calculateXg` for each shot event.
    4.  **Aggregation:** The xG value is aggregated into `totalXg` at both team and player levels by `eventAggregator.ts`.
*   **UI Integration:**
    *   **Shot Map:** The `ShotMap.tsx` component is created and integrated into a new "Shot Map / xG" tab within `src/pages/Statistics.tsx`.
    *   **xG Stats:** Displayed in the "Shot Map / xG" tab, "Players" table, `StatisticsDisplay.tsx`, and `DetailedStatsTable.tsx`.

### 9.2. Feature 2: Enhanced Passing Network Analysis & Visualization

*   **Status: Implemented (Initial Version)**
*   **Description:**
    *   Visualizes passing networks for each team, showing players as nodes and passes between them as weighted edges.
    *   Calculates and displays key passing metrics per player: progressive passes, passes to the final third.
    *   Identifies key passers and common passing patterns through visualization.
*   **Data Required (from enhanced `MatchEvent` with `PassEventData`):**
    *   `type: 'pass'`
    *   `player_id` (passer)
    *   `event_data.recipient_player_id` (pass recipient)
    *   `coordinates` (pass start)
    *   `event_data.end_coordinates` (pass end) - *Note: Currently not captured by `TrackerPianoInput` modal, would require pitch-based input for full accuracy.*
    *   `event_data.success` (boolean)
    *   `event_data.pass_type` (optional, for more detailed analysis)
*   **Calculation/Generation:**
    1.  **Data Collection (Partially Implemented):** `TrackerPianoInput.tsx` now uses `PassDetailModal.tsx` to capture `recipient_player_id`, `success`, and `pass_type`.
    2.  **Processing (Implemented):** `src/lib/analytics/eventAggregator.ts` now calculates:
        *   Player-to-player pass networks (`passNetworkSent`).
        *   Progressive passes for each player.
        *   Passes into the final third for each player.
    3.  **Visualization (Implemented - Initial Version):** The `PassingNetworkMap.tsx` component provides an initial visualization of the pass network.
*   **UI Integration (Implemented - Initial Version):**
    *   A new "Passing Network" tab has been added to `src/pages/Statistics.tsx`, integrating the `PassingNetworkMap.tsx` component.
    *   The "Players" tab in `Statistics.tsx` now displays "Prog. Passes" and "Passes Final 1/3" columns in the player statistics table.
    *   Team and player filters are available on the `PassingNetworkMap`.

### 9.3. Feature 3: Pressure Event Tracking and Analysis
(Content as before)

## 10. Summary of Findings and Recommendations
(Content as before)

## 11. UI Design for Enhanced Shot Data Collection (xG Feature)

*   **Status: Implemented**
*   To implement the Expected Goals (xG) and Shot Map feature, the UI for recording shot events was enhanced to capture more detailed information. The primary component for this, `src/components/TrackerPianoInput.tsx`, was modified, and a new `src/components/modals/ShotDetailModal.tsx` was created.

### 11.1. Design Goals (Achieved)

*   **Contextual Input:** Additional input fields for shot details now appear only when a 'shot' event is being recorded, via the `ShotDetailModal.tsx`.
*   **User-Friendly Input:** UI elements like `Select` dropdowns and `Checkbox` are used for ease of selection within the modal.
*   **Minimal Clutter:** The main event input interface remains uncluttered, with detailed shot attributes collected in the modal.

### 11.2. Implemented UI Flow and Components

1.  **State Management in `TrackerPianoInput.tsx`:**
    *   New state variables were introduced:
        *   `showShotDetailModal: boolean`
        *   `currentShotInitialData: Partial<ShotEventData>`
        *   `pendingEventTrigger: { eventType: EnhancedEventType, player?: PlayerForPianoInput, coordinates?: {x: number, y: number} } | null`
2.  **Triggering Shot Detail Collection:**
    *   The `handleEventTypeClick` function in `TrackerPianoInput.tsx` was modified:
        *   If `eventType.key === 'shot'`, it sets `pendingEventTrigger`, initializes `currentShotInitialData` with defaults, and sets `showShotDetailModal = true`.
        *   Other event types call `recordEvent` directly.
3.  **Shot Detail Modal (`src/components/modals/ShotDetailModal.tsx`):**
    *   This new component was created.
    *   **Contents:** Includes form fields for "On Target?", "Goal Scored?", "Body Part Used", "Shot Type", "Situation", and "Assist Type".
    *   **Buttons:** "Record Shot" calls an `onSubmit` prop (which is `handleRecordShotWithDetails` in the parent), and "Cancel" closes the modal.
4.  **Modifications to `recordEvent` in `TrackerPianoInput.tsx`:**
    *   The `details` parameter was updated to `details?: { coordinates?: {x: number, y: number}, event_data?: Partial<MatchSpecificEventData> }`.
    *   When `eventType.key === 'shot'`, if `details.event_data` (from the modal) is provided, it's used directly. Otherwise, a minimal default `ShotEventData` object is created.

### 11.3. Data Flow Summary for Shots (Implemented)

1.  User selects a player (optional).
2.  User taps "Shot" button in `TrackerPianoInput.tsx`.
3.  `handleEventTypeClick` sets `pendingEventTrigger` and opens the "Shot Detail Modal" with default values.
4.  User fills in shot details in the modal, updating the modal's internal state.
5.  User clicks "Record Shot" in the modal.
6.  The modal calls `onSubmit` (i.e., `handleRecordShotWithDetails` in `TrackerPianoInput.tsx`) with the collected `ShotEventData`.
7.  `handleRecordShotWithDetails` calls the main `recordEvent` function, passing the base event info and the complete `ShotEventData` object within the `details.event_data` field.
8.  `recordEvent` packages this into the structure expected by Supabase (including the rich `event_data` JSON field) and sends it.

This implementation successfully allows for the collection of detailed shot attributes.

## 12. UI Design for Detailed Pass Data Collection (Passing Network Feature)

*   **Status: Implemented**
*   To implement the Enhanced Passing Network Analysis & Visualization feature, the UI for recording 'pass' events was enhanced to capture additional details, primarily the recipient of the pass. The `src/components/TrackerPianoInput.tsx` component was modified and a new `src/components/modals/PassDetailModal.tsx` was created.

### 12.1. Design Goals (Achieved)

*   **Capture Pass Recipient:** Accurately identify the player who received the pass.
*   **Maintain Workflow Efficiency:** Ensure the process of logging a pass remains quick for the tracker.
*   **Contextual Input:** Additional input for pass details should appear only when a 'pass' event is initiated.

### 12.2. Implemented UI Flow and Components for `TrackerPianoInput.tsx`

1.  **State Management in `TrackerPianoInput.tsx`:**
    *   New state variables were introduced:
        *   `showPassDetailModal: boolean`
        *   `currentPassInitialData: Partial<PassEventData>` (defaults to `{ success: true, pass_type: 'short' }`)
        *   The `pendingEventTrigger` state was reused.
2.  **Triggering Pass Detail Collection:**
    *   The `handleEventTypeClick` function in `TrackerPianoInput.tsx` was modified:
        *   If `eventType.key === 'pass'`, it first checks if a `selectedPlayer` (passer) is active.
        *   It then sets `pendingEventTrigger`, initializes `currentPassInitialData`, and sets `showPassDetailModal = true`.
3.  **Pass Detail Modal (`src/components/modals/PassDetailModal.tsx`):**
    *   This new component was created.
    *   **Props:** `isOpen`, `onClose`, `onSubmit`, `initialDetails`, `passer`, `teamPlayers`.
    *   **Contents:** Displays the passer's name. Form fields include "Recipient Player" (Select dropdown of teammates, excluding passer), "Pass Successful?" (Checkbox), and "Pass Type" (Select dropdown).
    *   **Note on `end_coordinates`**: This implementation omits `end_coordinates` input via this modal.
    *   **Buttons:** "Record Pass" (validates recipient, calls `onSubmit`), "Cancel".
4.  **Modifications to `recordEvent` in `TrackerPianoInput.tsx`:**
    *   The `details.event_data` parameter now receives `PassEventData` from the `PassDetailModal`.
    *   The `switch` statement for `case 'pass'` uses this provided `PassEventData`.

### 12.3. Data Flow Summary for Passes (via Piano Input - Implemented)

1.  User selects the **passer**.
2.  User taps "Pass" button.
3.  `handleEventTypeClick` opens "Pass Detail Modal" with passer info.
4.  User selects **recipient** and other details in the modal.
5.  User clicks "Record Pass".
6.  Modal calls `handleRecordPassWithDetails` in `TrackerPianoInput.tsx` with `PassEventData`.
7.  `handleRecordPassWithDetails` calls main `recordEvent`, which sends data (including `PassEventData` with `recipient_player_id`) to Supabase.

This implementation captures the essential pass linkage (passer to recipient) and success status.
```
