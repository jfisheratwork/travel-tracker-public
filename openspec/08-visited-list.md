# OpenSpec: 08 Visited List Component

## Overview
A visually appealing card layout summarizing locations that have been visited, positioned below the map.

## High-Level Architecture (Cross-Platform / iOS Ready)
This component consumes a filtered subset of the global state.
- **Derived State**: A selector in the `StateService` should yield `visitedLocationsOnly`. The component blindly renders this stream. On iOS, this would be a computed property or a filtered FetchRequest.

## Detailed Claim
The `VisitedListComponent` shall render a masonry or flex card layout below the map.
- **Conditional Rendering**: It must display only locations marked as "visited" by at least one family member.
- **Card Content**: Each card must show: Location Name, Region, a badge for each member who visited, the visit date (if present in metadata), and a truncated comment.
- **Reactive Filtering**: It must dynamically filter these cards based on the global `searchTerm`.

## Future Scope: Auth & Backend Storage
- **Rich Media**: When backed by cloud storage (e.g., Firebase Storage), these cards could display user-uploaded photos for each visit instead of just text metadata.
- **Social Feed**: This list could evolve into a timeline or social feed format, where visits are ordered chronologically based on backend timestamps.
