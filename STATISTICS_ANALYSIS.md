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
    - `event_type`: Type of event (e.g., 'pass', 'shot', 'goal').
    - `player_id`: Identifier for the player involved.
    - `team_id` (or `team`): Identifier for the team involved ('home' or 'away').
    - `coordinates`: (x, y) position on the pitch where the event occurred.
    - `event_data`: JSON field for additional event-specific details (e.g., `success` for passes, `on_target` for shots).
    - `created_by`: User ID of the tracker who recorded the event.
- **Storage:** `match_events` table in Supabase.

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
    - Calculates some basic statistics on the fly based on events as they are recorded.
- **Hook:** `useMatchCollaboration` (likely in `src/hooks/useMatchCollaboration.ts`)
    - Handles real-time synchronization of events and data across multiple users/trackers.

### 3.2. Post-Match/Aggregated Statistics
- **Primary Logic:** `src/lib/analytics/eventAggregator.ts`
    - Function: `aggregateMatchEvents`
    - Takes raw `MatchEvent[]`, `homePlayers[]`, `awayPlayers[]` as input.
    - Aggregates events to calculate team-level and player-level statistics.
    - **Team Stats Calculated:** Shots, shots on target, goals, assists, passes (attempted/completed), fouls, cards, corners, offsides, tackles, interceptions, crosses, clearances, blocks.
    - **Player Stats Calculated:** Similar to team stats but for individual players.
- **Page Logic:** `src/pages/Statistics.tsx`
    - Fetches match data (including events and pre-calculated `match_statistics` if available) from Supabase.
    - If `match_statistics` are not present or need recalculation, it calls `calculateStatisticsFromEvents` (within the page) and `calculatePlayerStatistics` (within the page) which seem to be precursors or page-specific versions of the `eventAggregator.ts` logic.
    - Stores fetched/calculated stats in the component's state.

## 4. Data Display and Visualizations

### 4.1. Core Statistics Display Components
- **`src/components/StatisticsDisplay.tsx`**
    - Shows: Ball Possession, Passing Statistics (successful/attempted, accuracy), Shot Statistics (on target/total), Fouls, Corners, Offsides.
    - Compares Home vs. Away.
- **`src/components/DetailedStatsTable.tsx`**
    - Shows: Possession, Total Shots, Shots on Target, Passes, Pass Accuracy, Balls Played, Balls Lost.
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
            - **Advanced:** `MatchHeatMap`, `AdvancedStatsTable`.
            - **Players:** Table of individual player stats (passes, accuracy, shots, goals, assists, fouls, cards).
            - **Passes:** `PassMatrixTable`.
            - **Ball Flow:** `BallFlowVisualization`.
- **`src/pages/MatchAnalysis.tsx` & `src/pages/MatchAnalysisV2.tsx`**
    - **Purpose:** Primarily for real-time match event tracking and input.
    - **Features:**
        - Team setup, player selection.
        - Event recording interfaces (`TrackerPianoInput.tsx`, pitch interaction).
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
    - **`Statistics`:** (as defined in `StatisticsDisplay.tsx` and `Statistics.tsx`)
        - `possession: { home: number; away: number }`
        - `passes: { home: TeamPassStats; away: TeamPassStats }` (where `TeamPassStats` = `{ successful: number; attempted: number }`)
        - `shots: { home: TeamShotStats; away: TeamShotStats }` (where `TeamShotStats` = `{ onTarget: number; offTarget: number }`)
        - `fouls: { home: number; away: number }`
        - `corners: { home: number; away: number }`
        - `offsides: { home: number; away: number }`
        - `ballsPlayed: { home: number; away: number }`
        - `ballsLost: { home: number; away: number }`
        - `duels: { home: TeamDuelStats; away: TeamDuelStats }`
        - `crosses: { home: TeamCrossStats; away: TeamCrossStats }`
    - **`PlayerStatistics`:** (as defined in `Statistics.tsx`)
        - `playerId: string | number`
        - `playerName: string`
        - `team: 'home' | 'away'`
        - `events: { passes: { successful: number, attempted: number }, shots: { onTarget: number, offTarget: number }, ... }`
    - **`Player`:** Basic player information (id, name, number, etc.).
    - **`Team`:** Team information (id, name, players, formation).
    - **`BallTrackingPoint`:** Structure for individual ball position data.

## 6. Data Flow Summary

1.  **Match Setup:** Admin/user sets up match details, including teams and players (`MatchAnalysis.tsx` or an admin interface).
2.  **Event Recording (Real-time):**
    - Trackers use `MatchAnalysisV2.tsx` (or `MatchAnalysis.tsx`).
    - UI interactions (e.g., `TrackerPianoInput.tsx`, pitch clicks) trigger event creation.
    - `useMatchState` and `useMatchCollaboration` manage local state and synchronize events.
    - Events are sent to Supabase (`match_events` table) and potentially broadcast to other connected clients via Supabase real-time features.
3.  **Ball Tracking (Real-time):**
    - If active, ball coordinates are captured and added to `ball_tracking_data` via `useMatchState` and saved with the match.
4.  **Statistics Calculation & Display:**
    - **Real-time (Basic):** `MatchAnalysis.tsx` might show some live stats derived directly from `useMatchState`.
    - **Comprehensive (Post-match or On-demand):**
        - User navigates to `src/pages/Statistics.tsx`.
        - Page fetches match details, `match_events` (where `event_data` is now typed), and any pre-existing `match_statistics` from Supabase.
        - If stats need calculation:
            - `eventAggregator.ts` (or similar logic within `Statistics.tsx`) processes the `match_events` array.
            - It iterates through events, updating counts for teams and players based on `event.type` and the strongly-typed `event.event_data` (e.g., `(event.event_data as ShotEventData).on_target`). This provides better type safety and clarity.
        - Calculated/fetched statistics are passed to various display components (`StatisticsDisplay`, `DetailedStatsTable`) and visualization components (`MatchRadarChart`, `PlayerHeatmap`, etc.).
5.  **Data Persistence:**
    - Match details, events, and calculated statistics (optional, can be re-calculated) are stored in Supabase tables (`matches`, `match_events`).

## 7. Identified Gaps and Areas for Advanced Analytics

Based on the current implementation and common advanced football analytics practices, the following areas represent opportunities for deeper statistical insight:

### 7.1. Advanced Offensive Metrics

*   **Expected Goals (xG) and Expected Assists (xA):**
    *   **Gap:** The current system tracks shots and goals, but not the quality of chances created or taken. xG models estimate the probability of a shot resulting in a goal based on factors like shot distance, angle, type of assist, game state, etc. xA measures the likelihood that a pass would become a goal assist.
    *   **Opportunity:** Implementing xG/xA would provide a more accurate measure of attacking performance, beyond simple shot/goal counts. It helps identify teams/players over or under-performing their underlying chance creation.
*   **Shot Maps and Detailed Shot Analysis:**
    *   **Gap:** While event coordinates are stored, there isn't a dedicated, interactive shot map visualization that details shot types (e.g., header, foot), outcomes (goal, saved, blocked, off-target), and associated xG values.
    *   **Opportunity:** Provide visual tools to analyze shot locations, effectiveness from different areas, and player shooting patterns.
*   **Passing Network Analysis:**
    *   **Gap:** `PassMatrixTable.tsx` provides a basic table of pass combinations. However, more advanced visualizations (e.g., network graphs showing pass flow, centrality of players in build-up) are missing.
    *   **Opportunity:** Visualize team build-up play, identify key passing links, and understand how teams progress the ball. Metrics like player centrality in passing networks could be derived.
*   **Play Type Analysis (e.g., Counter Attacks, Set Pieces):**
    *   **Gap:** Statistics are generally aggregated, without specific breakdowns for different phases or types of play (e.g., effectiveness of counter-attacks, success rates from set pieces).
    *   **Opportunity:** Tagging sequences of events or specific event types (e.g., corner kicks leading to shots) to analyze their effectiveness.

### 7.2. Advanced Defensive Metrics

*   **Pressure Events and Effectiveness:**
    *   **Gap:** No explicit tracking of defensive pressures applied to opponents.
    *   **Opportunity:** Implementing a way to log pressure events (who, where, outcome - e.g., regain possession, forced error) would allow for analysis of defensive intensity and effectiveness.
*   **Advanced Tackling/Interception Stats:**
    *   **Gap:** Basic counts of tackles/interceptions exist. More detail on tackle success rates, location of defensive actions, and outcomes (e.g., ball recovery) would be beneficial.
    *   **Opportunity:** Deeper insight into individual and team defensive capabilities.
*   **Defensive Line Height and Team Compactness:**
    *   **Gap:** These require analysis of player position data over time, which might be derivable from ball tracking or event coordinates if player positions are consistently logged.
    *   **Opportunity:** Understand team tactical setups and defensive solidity.

### 7.3. Player-Specific Advanced Analytics

*   **Player Profiles with Advanced Metrics:**
    *   **Gap:** Player statistics are somewhat basic. Integrating xG, xA, pressure stats, detailed passing metrics (e.g., progressive passes, passes into final third) per player would be valuable.
    *   **Opportunity:** Create comprehensive player performance dashboards.
*   **Player Role Analysis:**
    *   **Gap:** Current stats don't easily differentiate performance based on player roles or positions.
    *   **Opportunity:** Comparing players within specific roles or analyzing how well they fulfill tactical instructions.

### 7.4. Team-Level Tactical Analysis

*   **Possession Sequences and Outcomes:**
    *   **Gap:** Possession is a percentage. Analyzing the quality of possession (e.g., number of passes per possession, territory gained, shots generated per possession sequence) is missing.
    *   **Opportunity:** Understand how effectively teams use their possession.
*   **Transition Play Analysis (Attack to Defense, Defense to Attack):**
    *   **Gap:** No specific metrics to analyze the speed and effectiveness of transitions.
    *   **Opportunity:** Quantify how quickly teams react to losing or winning the ball and the outcomes of these transitions.
*   **High-Value Touches:**
    *   **Gap:** Not all touches are equal. Identifying touches in dangerous areas (e.g., penalty box, final third) and their outcomes.
    *   **Opportunity:** Highlight players who are most effective in critical offensive zones.

### 7.5. Data Richness for Advanced Analytics

*   **Event Qualifiers:**
    *   **Gap:** The `event_data` field is generic. To support many advanced metrics, more specific qualifiers are needed (e.g., for shots: body part, assist type; for passes: progressive, to final third, type of pass like cross/throughball).
    *   **Opportunity:** Enriching the data captured at the source (`TrackerPianoInput.tsx` or other input methods) to enable more sophisticated calculations.

## 8. Data Structure Analysis for Advanced Metrics

This section analyzes the suitability of existing data structures, primarily `MatchEvent` and its `event_data` field, for supporting the advanced metrics identified in Section 7. It also proposes necessary modifications.

### 8.1. Current `MatchEvent` Structure Review

As documented in Section 5:
- **`MatchEvent`**:
    - `id: string | number`
    - `match_id: string`
    - `timestamp: number`
    - `type: EventTypeKey` (Standardized field for event type in the application. Data from the database column `event_type` is mapped to this field.)
    - `event_data?: MatchSpecificEventData | null` (typed based on `type`, see `src/types/eventData.ts`)
    - `player_id?: number | string`
    - `team?: 'home' | 'away'`
    - `coordinates?: { x: number; y: number }`
    - `created_by?: string` (user ID)

The `event_data` field is the primary mechanism for capturing event-specific details. Currently, it's a generic `Record<string, any>`, allowing flexibility but lacking standardization for advanced metrics.

### 8.2. Data Requirements for Identified Advanced Metrics

Let's map some of the desired advanced metrics to the data points they would require:

*   **Expected Goals (xG) / Expected Assists (xA):**
    *   **Shot Event (`event_type: 'shot'`):**
        *   `coordinates`: Essential for shot distance/angle.
        *   `body_part_used`: (Missing) e.g., 'right_foot', 'left_foot', 'head'.
        *   `assist_type`: (Missing) e.g., 'through_ball', 'cross', 'pull_back', 'set_piece_assist'.
        *   `situation`: (Missing) e.g., 'open_play', 'fast_break', 'corner', 'free_kick_direct', 'penalty'.
        *   `shot_type`: (Missing) e.g., 'normal', 'volley', 'half_volley', 'lob'.
        *   (Potentially) Number of defenders between shooter and goal, goalkeeper position (very advanced, likely out of scope for manual tracking).
    *   **Pass Event (leading to a shot - for xA):**
        *   `coordinates`: Start and end coordinates of the pass.
        *   `pass_type`: (Missing) e.g., 'through_ball', 'cross', 'cut_back', 'long_ball'.
        *   `pass_length`: (Calculable from coordinates).
        *   `pass_angle`: (Calculable from coordinates).

*   **Passing Network Analysis:**
    *   **Pass Event (`event_type: 'pass'`):**
        *   `player_id` (passer).
        *   `recipient_player_id`: (Missing) Crucial for building player-to-player links.
        *   `coordinates` (start of pass).
        *   `end_coordinates`: (Missing) Essential for pass direction, length, and visualizing networks.
        *   `success`: (Currently in `event_data`) Boolean.

*   **Pressure Events:**
    *   **New Event Type (`event_type: 'pressure'`):**
        *   `player_id` (pressuring player).
        *   `team` (pressuring player's team).
        *   `coordinates` (location of pressure).
        *   `pressure_outcome`: (Missing) e.g., 'regain_possession', 'forced_turnover', 'pass_forced_backwards', 'no_effect'.
        *   `target_player_id`: (Missing, optional) Player being pressured.

*   **Advanced Tackling/Interception Stats:**
    *   **Tackle Event (`event_type: 'tackle'`):**
        *   `success`: (Missing or needs standardization in `event_data`) Boolean.
        *   `outcome`: (Missing) e.g., 'regain_possession', 'ball_out_of_play', 'foul_committed'.
    *   **Interception Event (`event_type: 'interception'`):**
        *   `outcome`: (Missing) e.g., 'regain_possession_controlled', 'clearance'.

*   **Play Type Analysis (e.g., Counter Attacks, Set Pieces):**
    *   Requires sequence analysis or specific tagging. For set pieces:
    *   **Corner/Free Kick Event (`event_type: 'corner'` or `'freeKick'`):**
        *   `subsequent_event_id`: (Missing, complex) ID of the first significant event following the set piece (e.g., shot, header). This is hard to capture manually without a dedicated UI flow.
        *   Alternatively, a `set_piece_origin_id` on shot/goal events.

### 8.3. Proposed Modifications to Data Structures

To support these advanced metrics, the following changes are recommended:

1.  **Standardize Event Type Field (Completed):**
    *   The `MatchEvent` interface has been standardized to use the `type: EventTypeKey` field as the sole source of truth for the event's type. The redundant `event_type: string` field has been removed from the interface. Data fetched from the database (where the column might be named `event_type`) is mapped to this `type` field.

2.  **Introduce Specific `event_data` Interfaces for Key Event Types:**
    *   Instead of a generic `Record<string, any>`, define typed interfaces for the `event_data` of common and important event types. This improves data integrity, discoverability, and ease of use for developers. A new file `src/types/eventData.ts` has been created for this purpose.

    ```typescript
    // src/types/eventData.ts (Excerpt - see file for full definitions)

    export interface ShotEventData {
      on_target: boolean;
      is_goal?: boolean;
      body_part_used?: 'right_foot' | 'left_foot' | 'head' | 'other';
      assist_type?: 'through_ball' | 'cross' | 'pull_back' | 'set_piece' | 'rebound' | 'none' | string;
      situation?: 'open_play' | 'fast_break' | 'corner_related' | 'free_kick_related' | 'penalty' | string;
      shot_type?: 'normal' | 'volley' | 'half_volley' | 'lob' | 'header' | string;
      xg_value?: number;
    }

    export interface PassEventData {
      success: boolean;
      recipient_player_id?: number | string;
      end_coordinates?: { x: number; y: number };
      pass_type?: 'short' | 'long' | 'cross' | 'through_ball' | 'cut_back' | 'header' | 'switch' | string;
      is_progressive?: boolean;
      to_final_third?: boolean;
      length?: number;
      angle?: number;
    }

    // ... (other interfaces like TackleEventData, InterceptionEventData, etc.)

    export type MatchSpecificEventData =
      | ShotEventData
      | PassEventData
      // ... | other specific event data types
      | GenericEventData;

    // In src/types/index.ts
    // import { MatchSpecificEventData } from './eventData'; // Added import

    export interface MatchEvent {
      // ... other fields
      type: EventTypeKey; // Standardized
      event_data?: MatchSpecificEventData | null; // Updated to use the union type
      // ... other fields
    }
    ```

3.  **Consider New Event Types (Partially Implemented):**
    *   The event types `'pressure'`, `'dribble_attempt'`, and `'ball_recovery'` have been added to the `EventType` union in `src/types/index.ts` and to constants in `src/constants/eventTypes.ts`.
    *   Corresponding `event_data` interfaces (`PressureEventData`, `DribbleAttemptEventData`, `BallRecoveryEventData`) have been defined in `src/types/eventData.ts` and included in the `MatchSpecificEventData` union type.
    *   Full implementation (UI for capture, specific processing logic) for these events is pending future feature development.

4.  **Linking Events (for sequence analysis):**
    *   This is complex. For simpler cases like assists, the `assist_type` on a `ShotEventData` can help.
    *   For true sequence analysis (e.g., "passes leading to a shot"), this typically involves post-processing events based on timestamps, player possession, and team possession.
    *   Adding a `possession_sequence_id` to each event, generated during real-time processing, could be a robust solution but requires significant logic changes in `useMatchState` or a similar real-time processor.

### 8.4. Impact on Data Collection UI

*   The UI for event input (e.g., `TrackerPianoInput.tsx`, future pitch-side tagging tools) will need to be updated to capture these new data points. The initial refactoring of event creation logic ensures that `event_data` is structured according to the new typed interfaces (e.g., `ShotEventData`, `PassEventData`), even if many of the new specific fields are initially populated with defaults or remain optional.
*   Future UI enhancements will be required to allow users to input the detailed attributes for each event type (e.g., body part for a shot, pass end coordinates).
*   This might involve:
    *   More detailed options in dropdowns or selection menus.
    *   Contextual input fields appearing based on the selected event type.
    *   Potentially a more guided workflow for complex events (e.g., "Pass -> Shot -> Goal" sequence tagging).

### 8.5. Conclusion of Data Structure Analysis

The current `MatchEvent` structure, with the introduction of typed `event_data` (via `MatchSpecificEventData` in `src/types/eventData.ts`), is now well-prepared for more specific and structured data. Event creation logic in hooks and components like `useMatchState`, `TrackerPianoInput`, and `MatchAnalysisV2` has been updated to construct these typed `event_data` objects. Furthermore, event consumption logic, such as in `src/lib/analytics/eventAggregator.ts` and `src/pages/Statistics.tsx`, has been refactored to correctly access data from these typed structures, enhancing type safety and code clarity. This foundational work significantly improves data quality and makes the development of advanced analytical features more straightforward and reliable.

## 9. Proposed New Analytics Features

This section proposes three specific new analytics features that build upon the identified gaps and data structure enhancements. These features aim to provide a significantly deeper dive into match statistics.

### 9.1. Feature 1: Expected Goals (xG) and Shot Map Visualization

*   **Description:**
    *   Calculate and display Expected Goals (xG) for each shot taken during a match.
    *   Provide an interactive shot map visualization showing all shots, filterable by team and player. Each shot point on the map would be color-coded or sized by its xG value and visually distinct based on outcome (goal, saved, off-target, blocked).
    *   Display cumulative xG for each team and individual players.
*   **Data Required (from enhanced `MatchEvent` with `ShotEventData`):**
    *   `event_type: 'shot'`
    *   `coordinates` (for shot location, distance, angle calculation)
    *   `body_part_used` (e.g., 'right_foot', 'left_foot', 'head')
    *   `assist_type` (e.g., 'through_ball', 'cross', 'set_piece')
    *   `situation` (e.g., 'open_play', 'fast_break', 'corner', 'penalty')
    *   `outcome` (derived from `on_target`, `is_goal` flags)
*   **Calculation/Generation:**
    1.  **Data Collection:** Enhance `TrackerPianoInput.tsx` or other event input UIs to capture the new `ShotEventData` fields.
    2.  **xG Model:**
        *   **Short-term:** Start with a simple xG model based on shot distance and angle. A lookup table or a basic logistic regression model can be implemented.
        *   **Long-term:** Develop or integrate a more sophisticated xG model that incorporates `body_part_used`, `assist_type`, and `situation`. This might involve training a model on a larger dataset or using an existing open-source model.
    3.  **Processing:**
        *   A new function, possibly in `eventAggregator.ts` or a dedicated `xgCalculator.ts`, would take a `ShotEventData` object and return an xG value.
        *   This xG value could be stored back into the `event_data` for the shot or calculated on-the-fly during analysis.
    4.  **Aggregation:** Sum xG values for teams and players.
*   **UI Integration:**
    *   **Shot Map:** A new tab or component within `src/pages/Statistics.tsx` or `src/pages/MatchAnalysisV2.tsx`. Could use a library like D3.js or a charting library that supports scatter plots on a pitch background.
    *   **xG Stats:** Display team and player xG in `StatisticsDisplay.tsx`, `DetailedStatsTable.tsx`, and player stats tables.
    *   Tooltips on the shot map would show detailed info for each shot (player, xG value, outcome, etc.).

### 9.2. Feature 2: Enhanced Passing Network Analysis & Visualization

*   **Description:**
    *   Visualize passing networks for each team, showing players as nodes and passes between them as weighted edges (weight based on pass count or completion percentage).
    *   Calculate and display key passing metrics per player: progressive passes, passes to the final third, pass completion rates by zone/direction.
    *   Identify key passers and common passing patterns.
*   **Data Required (from enhanced `MatchEvent` with `PassEventData`):**
    *   `event_type: 'pass'`
    *   `player_id` (passer)
    *   `recipient_player_id` (pass recipient)
    *   `coordinates` (pass start)
    *   `end_coordinates` (pass end)
    *   `success` (boolean)
    *   `pass_type` (optional, for more detailed analysis)
*   **Calculation/Generation:**
    1.  **Data Collection:** Update input UI to capture `recipient_player_id` and `end_coordinates` for passes.
    2.  **Processing:**
        *   Aggregate passes between each pair of players (e.g., Player A to Player B: count, successful count).
        *   Calculate progressive passes: Based on start/end coordinates, determine if a pass moves the ball significantly towards the opponent's goal (e.g., >10 meters forward and within certain pitch zones).
        *   Calculate passes to the final third: Identify passes that originate outside the final third and end inside it.
    3.  **Visualization:**
        *   Use a graph visualization library (e.g., D3.js, VisNetwork, Cytoscape.js) to render the passing network on a pitch background. Node positions could correspond to average player positions or a formation layout.
        *   Edge thickness/color could represent pass volume/success rate.
*   **UI Integration:**
    *   A new "Passing Networks" tab in `src/pages/Statistics.tsx`.
    *   Display new player passing metrics in the "Players" tab and potentially in `AdvancedStatsTable.tsx`.
    *   Allow filtering by team and time segments.

### 9.3. Feature 3: Pressure Event Tracking and Analysis

*   **Description:**
    *   Introduce a new event type for "pressure" to track defensive actions where a player actively pressures an opponent in possession.
    *   Analyze pressure event frequency, location, and effectiveness (e.g., successful pressures leading to turnovers or regaining possession).
    *   Visualize pressure hotspots on the pitch.
*   **Data Required (from new `MatchEvent` with `PressureEventData`):**
    *   `event_type: 'pressure'`
    *   `player_id` (pressuring player)
    *   `team` (pressuring player's team)
    *   `coordinates` (location of pressure)
    *   `outcome`: ('regain_possession', 'forced_turnover_error', 'forced_pass_backwards', 'no_effect', 'foul_won')
    *   `target_player_id` (optional, player being pressured)
*   **Calculation/Generation:**
    1.  **Data Collection:** Add a new input mechanism in `TrackerPianoInput.tsx` or a pitch-side tool for logging "pressure" events and their outcomes.
    2.  **Processing:**
        *   Aggregate pressure events per player and team.
        *   Calculate pressure success rate (e.g., (regain_possession + forced_turnover_error) / total_pressures).
        *   Generate data for heatmaps based on pressure event coordinates.
*   **UI Integration:**
    *   Add "Pressures" and "Pressure Success Rate" to team and player statistics tables.
    *   A new "Pressure Analysis" tab in `src/pages/Statistics.tsx` could show:
        *   Leaderboards for pressure events.
        *   Heatmaps of pressure locations.
        *   Team pressure effectiveness over time.

These three features provide a mix of advanced offensive, build-up, and defensive analytics, leveraging the proposed data structure enhancements. They offer tangible new insights beyond the current capabilities.

## 10. Summary of Findings and Recommendations

This document has conducted a deep dive into the statistics and analytics capabilities of the web application. The key findings and recommendations are summarized below:

### 10.1. Current State (Strengths)

*   **Solid Foundation:** The application has a robust system for collecting and storing basic match events (shots, passes, goals, fouls, etc.) and ball tracking data using Supabase.
*   **Comprehensive Basic Stats:** A good range of fundamental statistics are calculated and displayed, including possession, shots, passes, fouls, corners, and player-specific tallies.
*   **Variety of Visualizations:** Numerous components exist for visualizing data, such as `StatisticsDisplay`, `DetailedStatsTable`, `MatchRadarChart`, `EventTimelineChart`, `MatchHeatMap`, `BallFlowVisualization`, and `PassMatrixTable`.
*   **Real-time Capabilities:** Hooks like `useMatchState` and `useMatchCollaboration` provide a basis for real-time data handling and updates.
*   **Dedicated Analytics Page:** `src/pages/Statistics.tsx` serves as a central hub for users to explore match analytics through various tabs and visualizations.
*   **Event Aggregation Logic:** `src/lib/analytics/eventAggregator.ts` provides a starting point for processing raw events into meaningful statistics.

### 10.2. Identified Gaps and Opportunities

Despite the solid foundation, significant opportunities exist to enhance the analytical depth:

*   **Lack of Advanced Metrics:** Key modern football metrics like Expected Goals (xG), Expected Assists (xA), detailed passing network insights, and specific defensive pressure metrics are currently missing.
*   **Limited Tactical Analysis:** Capabilities for analyzing specific play types (e.g., counter-attacks, set-piece effectiveness), possession quality, and transitions are underdeveloped.
*   **Data Richness for Deeper Insights:** The current `event_data` field, while flexible, lacks the standardized, granular detail (e.g., shot body part, pass recipient, pressure outcome) required for many advanced calculations.

### 10.3. Data Structure Enhancements (Recommendations)

To enable the identified advanced analytics, the following data structure modifications are crucial:

*   **Standardize Event Identifiers (Completed):** The `MatchEvent` interface now consistently uses the `type` field for the event's type, with the previous `event_type` field removed.
*   **Typed `event_data` (Implemented):** Specific TypeScript interfaces for `event_data` (e.g., `ShotEventData`, `PassEventData`) have been defined in `src/types/eventData.ts` and integrated into the `MatchEvent` interface via the `MatchSpecificEventData` union type. This is a critical step for improving data quality and developer experience.
*   **New Event Types:** Consider adding new event types like `pressure`, `dribble_attempt` (with outcome), and `ball_recovery` to capture more nuanced actions.
*   **Data for Linking Events:** For pass networks, ensure `recipient_player_id` and `end_coordinates` are captured for passes. For sequence analysis, more complex solutions like `possession_sequence_id` could be explored long-term.

### 10.4. Proposed New Features (Recommendations)

Three specific features were proposed to significantly enhance the "deep dive" capabilities:

1.  **Expected Goals (xG) and Shot Map Visualization:** To provide a better measure of chance quality and attacking performance.
2.  **Enhanced Passing Network Analysis & Visualization:** To offer deeper insights into team build-up play and player connectivity.
3.  **Pressure Event Tracking and Analysis:** To quantify defensive activity and effectiveness.

Implementing these features, supported by the recommended data structure enhancements, would elevate the application's analytical power substantially.

### 10.5. General Recommendations

*   **Iterative Approach:** Implement new features and data structure changes iteratively. Start with the foundational data enhancements (like the now-typed `event_data`) and one or two high-impact advanced metrics.
*   **Phased `event_data` Population:** The `event_data` field is now structurally typed. The next phase involves updating the UI to capture the detailed attributes for each specific event data type. This allows the backend and data structure to be ready before the UI is fully capable of providing all data points.
*   **UI/UX for Data Input:** Carefully design the UI for capturing richer event data to ensure it remains user-friendly and efficient for trackers.
*   **Backend Processing:** For more complex calculations (e.g., sophisticated xG models, sequence analysis), consider moving some processing to the backend (Supabase Edge Functions or dedicated services) to avoid overloading the client.
*   **User Feedback:** Involve end-users (coaches, analysts) in prioritizing and refining new analytical features.

By addressing these recommendations, the application can evolve into a more powerful and insightful tool for football analysis.
