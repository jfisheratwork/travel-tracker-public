# Legacy Code Model Architecture

This document maps out the legacy data model and its usages across the `docs/js/` codebase.

## 1. Global `settings` Object
The core configuration object stored in `localStorage` under `np_travel_settings`.

### `settings.familyMembers` (Array of Strings)
- **Data Model:** Simple string array (e.g. `['Jake', 'Lisa']`).
- **Usage (`ui.js`):** 
  - Drives the `<select>` dropdowns for filtering map/table views by specific family members.
  - Used to build table columns (one column per member).
  - Used heavily in loop iterations to check if a member has visited a location (e.g., `dataStore[${item.name}_${familyMember}]`).
- **Usage (`map.js`):** 
  - Determines if a map marker is "fully visited" (green), "partially visited" (yellow), or "not visited" (gray).
- **Usage (`app.js`):**
  - Manages adding and removing members via `addFamilyMember()` and `removeFamilyMember()`.

### `settings.hometowns` (Array of Objects)
- **Data Model:** `{ name: string, lat: number, lng: number }`.
- **Usage (`map.js`):** Iterated over to plot home icons (house markers) on the Leaflet map.
- **Usage (`app.js` / `ui.js`):** 
  - Managed via UI inputs and Nominatim queries (`searchHometown()`).
  - Added sequentially; currently lacks explicit reordering or date-range logic.
  
### `settings.savedRoutes` (Array of Objects)
- **Data Model:** `{ name, engine, route: [[lat, lng], ...], waypoints, startQuery, endQuery, timestamp }`.
- **Usage (`app.js`):**
  - Read during initialization to migrate legacy route shapes via `migrateLocalStorageRoutes()`.
  - Stored in a cache (`routeCoordinatesCache`) for quick plotting.
  - Used to draw polylines on the map.
  - Edited, removed, and renamed through `ui.js` interactions.

### `settings.routingEngine`, `settings.mapboxKey`, `settings.routeReduction`
- **Data Model:** Strings and Numbers representing routing preferences.
- **Usage (`app.js`):** 
  - Read when executing `getRouteOSRM()` or `getRouteMapbox()`.
  - Route reduction is parsed as a float and applied to polyline simplification algorithms to reduce storage usage.

### `settings.showUSA`, `showCanada`, `showUSAParks`, `showCanadianParks` (Booleans)
- **Data Model:** Simple boolean flags.
- **Usage (`map.js` & `ui.js`):** 
  - Hard filters applied to `dataset.filter(...)` to hide entire countries or subregions from the UI (Tables, Stats, and Map Markers).
  - *Note: OpenSpec 04 dictates these should be removed in the new Angular architecture.*

## 2. Global `visitData` Object
Stored in `localStorage` under `np_travel_tracker_v3`.
- **Data Model:** A flat key-value object representing the visit status.
- **Format:** `{"LocationName_FamilyMemberName": true}` (e.g., `{"Yellowstone_Jake": true}`).
- **Usage:** Read across all modules to determine progress, color markers, and render checkmarks in data tables.

## 3. Global Transient State (`state.js`)
In-memory variables tracking the current user session context:
- `currentTab` (world, parks, states)
- `searchTerm` (string)
- `parksMemberFilter`, `statesMemberFilter` (string: "all" or specific member name)
- `collapsedYears` (object: tracking which years in the stats widget are folded)
