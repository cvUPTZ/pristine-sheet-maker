# Application Description

This web application is a comprehensive platform for football (soccer) match analysis. It allows users to record, analyze, and visualize match data, providing valuable insights for coaches, analysts, and enthusiasts.

## Key Features

*   **Match Data Input & Event Tracking:** Users can meticulously record match events, including goals, assists, fouls, substitutions, and player actions. The system likely supports tracking ball movement and player positioning on a virtual pitch.
*   **Video Analysis:** The application integrates video analysis capabilities, potentially allowing users to link or upload match footage (e.g., from YouTube, given the `analyze-youtube-video` backend function) and synchronize it with event data.
*   **Team and Player Management:** Users can define and manage teams, including player rosters and tactical formations. This allows for detailed setup before analyzing a match.
*   **Advanced Statistical Visualization:** The platform offers a rich suite of tools for visualizing statistics. This includes:
    *   Dashboards with key performance indicators (KPIs).
    *   Detailed statistical tables.
    *   Charts for various metrics (e.g., radar charts for player/team performance).
    *   Player heatmaps to visualize on-field activity.
*   **User Authentication & Roles:** The system includes user authentication to secure access. It may also support different user roles (e.g., admin, analyst) with varying permissions.
*   **Collaboration (Potential):** Hooks like `useMatchCollaboration.ts` suggest that the application might support real-time collaboration, allowing multiple users to work together on analyzing a single match.

### Collaborative Event Tracking & Assignments

*   **Real-time Collaboration:** The platform now supports multiple users ("trackers") working simultaneously on the same match analysis.
*   **Admin-Managed Event Assignments:** Administrators can assign specific event types (e.g., "Passes", "Shots", "Defensive Actions") to individual users. This allows for distributing the workload and focusing expertise.
*   **Guided Event Logging:** In the match analysis interface, users receive visual cues for the event types specifically assigned to them. This helps guide their attention and streamline data entry, while still allowing them to record any event type if necessary.
*   **User-Specific Event Tracking:** Each event logged in the system is associated with the user who recorded it, enhancing accountability and traceability in collaborative sessions. (This assumes the backend `user_id` storage is in place).

## Technology Stack

The application is built using a modern web technology stack:

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui (for UI components)
*   **Backend:** Supabase (including Supabase Functions for serverless logic)

## Target Users

This application is designed for:

*   **Football Coaches:** To analyze team performance, opponent strategies, and individual player contributions.
*   **Sports Analysts:** To conduct in-depth statistical analysis and generate reports.
*   **Football Enthusiasts:** To explore match data and gain a deeper understanding of the game.
