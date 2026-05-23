# Plan: Waypoint-Based Route Storage & Direct Edit Modal Popups

We will transition the application from storing full coordinate arrays in localStorage to storing only key points (waypoints) and retrieving them on demand, while preserving alternate route choices via forcing waypoints and adding a progressive background loader. We also add direct access to the edit modal from park/state map markers.

## Proposed Changes

### Component: State & Helpers
- **[state.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/state.js)**:
  - Initialize `routeCoordinatesCache` as an empty object `let routeCoordinatesCache = {};`.
  - Add `routeCoordinatesCache` to the global state variables list for Node.js testing environment.

### Component: Map & Popups
- **[map.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/map.js)**:
  - **Direct Edit Access:** Add an "✏️ Edit Details" button/link inside the Leaflet popup for national parks and states, calling the global `openEditModal(name, mapMode)`.
  - **Road Trips Polyline Rendering:**
    - Update `updateMapMarkers` in `mapMode === 'roads'` to check if the route coordinates are in `routeCoordinatesCache`.
    - Only draw the polyline on the map if the route is selected or currently loaded in the background cache.
    - Do not render unselected, uncached routes by default.

### Component: App Controller & Route Builder
- **[app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)**:
  - **getGeocode Update:** Add a regex check to immediately parse input strings matching coordinate format (e.g. `45.678, -121.234`) without calling Nominatim, preventing map API spam.
  - **Dynamic Forcing Waypoints:**
    - Write a helper `findForcingWaypoint(altCoords, recCoords, waypoints)` that detects where alternate route coordinates diverge from the recommended path.
    - Find the point of maximum deviation, reverse-geocode it *once* on save to obtain a clean city name (falling back to a coordinate name if needed), and insert it into the route's waypoints list at the correct sequential index.
  - **Save Selected Route:**
    - Update `saveSelectedRoute()` to save the geocoded `waypoints` and *exclude* the detailed `route` coordinates unless the opt-in checkbox is checked.
    - Automatically cache the detailed coordinates of the newly saved route in `routeCoordinatesCache`.
  - **On-demand Loading:**
    - Update `focusRoute()` to check if the selected route has coordinates in `routeCoordinatesCache`. If not, fetch them asynchronously, save them to the cache, and then trigger rendering and bounds fitting.
  - **Asynchronous Background Loader:**
    - Implement `loadAllRoutes()` which loops through all saved routes, fetches their coordinates progressively, and updates the progress bar.
    - Implement a 15-second countdown timer delay between calls if the engine is OSRM. If Mapbox, use a minimal 200ms delay.
    - Handle pause/resume/cancellation.
  - **Initial Migration:**
    - On application startup, perform a one-time migration: for any saved route that contains `route` coordinates in localStorage, move them into `routeCoordinatesCache`, ensure `waypoints` are generated, and delete the coordinates from localStorage.

### Component: User Interface HTML & CSS
- **[index.html](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/index.html)**:
  - Add a checkbox in the Route Builder:
    `[ ] Store detailed path coordinates locally (faster loads, high storage usage)`
    with a helper tooltip warning:
    `⚠️ Storing full coordinates consumes significant local storage. Not recommended for long or multiple routes.`
  - Add the "Load All Routes" button and progress bar container right above the saved routes list.
    - Container should show loading status, percentage, and a progress bar.

## Verification Plan

### Automated Tests
- Run `npm test` or `node --test tests/app.test.js` to ensure state changes and existing tests continue to pass.
- Add new test cases in `tests/app.test.js` for waypoint-based `focusRoute()` fetching and coordinates regex parsing.

### Manual Verification
1. Create a route using coordinates directly in the inputs to confirm Nominatim is not called.
2. Select Option 2 (alternative route) and save. Verify that a dynamic forcing waypoint is injected and successfully forces the alternate path.
3. Reload the page and verify that the route coordinates are migrated out of localStorage and loaded on demand.
4. Click the "Load All Routes" button and verify the progress bar, progressive rendering, and OSRM rate limit delay logic.
5. Click a map marker for a park/state and verify the edit modal opens directly when clicking the edit button inside the popup.
