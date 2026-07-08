# Next Session Goals

## 1. Step 05: Road Trips & Route Builder Component
Our next major milestone from `openspec` is implementing `05-road-trips.md`. 
We need to build a comprehensive tool for planning, editing, and saving road trips.

**Key Requirements:**
- **RoutingService:** Abstract API calls (Mapbox/OSRM) into a shared `RoutingService` that returns standardized `RouteObject`s.
- **Route Builder UI:** Create a component for managing the "Road Trips" tab, listing saved road trips, and providing inputs for waypoints and start/end points.
- **Map Interaction:** Ensure the map view can receive and visually differentiate selected route polylines.
- **Persistence:** Save calculated distance, duration, and coordinates to local storage using our new `LocalStorageService`.

## 2. Future Steps (Later)
- Step 06: Stats Widget
- Step 07: Data Tables
- Backend integration and caching
- Add E2E tests for Settings and Search (missed in previous session)
