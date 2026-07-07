# OpenSpec: 02 Map View Component

## Overview
The Map View is the primary visual interface of the Travel Tracker. It displays an interactive map with pins for Parks and States, as well as polylines for saved road trips.

## High-Level Architecture (Cross-Platform / iOS Ready)
The map rendering logic should be isolated from the data layer. 
- **Data Input**: The component accepts an array of map markers and polylines to render. It does not fetch data directly; it observes the `StateService`.
- **Platform Agnostic**: In Angular, this will wrap Leaflet.js. In iOS, a similar component would wrap MapKit. The data contracts (Coordinates, Marker Types, Colors) must remain generic.

## Detailed Claim
The `MapComponent` shall initialize a map with boundaries centered appropriately depending on selected filters (US vs Canada vs Both).
- **Markers**: It shall dynamically render custom colored pins for Parks and States based on whether a family member has visited.
- **Polylines**: It must render polylines for saved road trips using Mapbox or OSRM data.
- **Tooltips/Popups**: It must override default tooltip CSS for larger widths and readability.
- **Interactivity**: Clicking a pin must trigger a global event stream (via `StateService` or a dedicated Event Bus) that opens the Edit Modal directly, passing the location identifier.

## Future Scope: Auth & Backend Storage
- **Collaborative Mapping**: In a future authenticated state, map markers could visually indicate if a location was visited by a "friend" or shared family group synced from the backend. 
- **Performance**: As the dataset grows with backend data, the map should implement marker clustering.
