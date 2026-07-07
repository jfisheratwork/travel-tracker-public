# OpenSpec: 03 Global Search Component

## Overview
A unified search interface that filters all visible data across the application simultaneously (Map markers, Visited list, Data tables).

## High-Level Architecture (Cross-Platform / iOS Ready)
The search component is a purely presentational input that dispatches its value to the centralized `StateService`.
- **State Driven**: The component itself does not perform filtering. It updates a global `searchTerm` state. Other components (Map, Visited List) react to this state change and filter their own views. This pattern easily translates to iOS (e.g., a `UISearchBar` updating a global `@Observable` state).

## Detailed Claim
The `SearchComponent` shall provide a sticky, accessible search input.
- **Debouncing**: Input must be debounced (e.g., 300ms) to prevent excessive state updates and rendering cycles.
- **Badge Indicator**: It must dynamically query the `StateService` to show a "X results" badge based on matches in the currently active tab (filtering the Visited List and the Map Markers simultaneously).
- **Clear Action**: It must provide an "x" clear button that clears the term and resets the view instantly.

## Future Scope: Auth & Backend Storage
- **Server-Side Search**: Currently, search is entirely client-side against the local dataset. If the dataset grows massively (e.g., user-generated public trips on a backend), this component may need to dispatch a server-side query if the local cache misses. The debouncing implemented now is critical for this future capability.
