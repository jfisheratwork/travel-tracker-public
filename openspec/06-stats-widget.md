# OpenSpec: 06 Stats Widget Component

## Overview
A dashboard widget displaying progress metrics for visited Parks, States, and Road Trips.

## High-Level Architecture (Cross-Platform / iOS Ready)
Stats calculation should be handled by a dedicated pure function or service, not inside the UI component.
- **Calculation Engine**: A `StatsCalculationService` takes the raw application state and outputs computed metrics (percentages, counts).
- **Dumb UI**: The widget itself simply renders these computed numbers into progress bars. This ensures the complex math is easily testable and identical across web and iOS implementations.

## Detailed Claim
The `StatsWidgetComponent` shall conditionally render progress bars based on the active tab (Parks/States/Roads).
- **Parks & States**: Calculate unique visit counts against the total dataset, break down stats regionally (US vs Canada), and show individualized completion bars per family member.
- **Road Trips**: Show total distance, duration, completed vs planned trips, and per-member participation metrics.

## Future Scope: Auth & Backend Storage
- **Global Leaderboards**: With backend storage, the stats engine could compare a user's progress against global averages or friends' leaderboards.
- **Historical Snapshots**: The backend could store historical snapshots of stats to show a user's travel progress over time (e.g., "You visited 5 new parks this year").
