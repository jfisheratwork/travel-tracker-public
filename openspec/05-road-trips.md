# OpenSpec: 05 Road Trips & Route Builder Component

## Overview
A comprehensive tool for planning, editing, and saving road trips, complete with waypoint routing and distance calculations.

## High-Level Architecture (Cross-Platform / iOS Ready)
The Route Builder requires complex interactions (drag-and-drop waypoints, async API calls for routes). 
- **Service Layer Abstraction**: The actual API calls to Mapbox or OSRM must be abstracted into a `RoutingService`. The UI component simply calls `routingService.getRoute(waypoints)` and receives a standardized `RouteObject`.
- **Platform Agnostic UI**: The UI list of routes and the waypoint input fields are standard forms. On iOS, this translates cleanly to a `List` and `TextField` views interacting with a shared routing service layer.

## Detailed Claim
This component manages the entire "Road Trips" tab.
- **List View**: Display the list of saved road trips, allowing users to view, edit, or delete them.
- **Route Builder**: Provide input for start/end points and waypoints, perform geocoding, fetch alternative routes from Mapbox/OSRM, and allow the user to select and save a route.
- **Map Interaction**: It must visually differentiate the selected route polyline on the map.
- **Persistence**: Parse and save the distance, duration, and coordinate arrays into `localStorage` via the `StorageService`.

## Future Scope: Auth & Backend Storage
- **Trip Sharing**: With a backend, saved road trips become standalone entities in a database that can be shared via public links or directly with other authenticated users.
- **Backend Routing Cache**: To save on Mapbox API limits, the backend could cache frequently calculated routes between popular national parks.
