# Application Architecture

The Family Travel Tracker is a client-side static web application that enables families to track national parks, states, and road trips. It executes entirely in the user's browser (serverless static hosting) and persists preferences and trip coordinates locally.

---

## 1. Component Architecture

Following the modularization refactor, the application logic is divided into five logical layers loaded sequentially in `docs/index.html`. This ensures a clear separation of concerns:

```mermaid
graph TD
    HTML["docs/index.html<br>(Tailwind CSS Layout)"]
    CSS["docs/css/style.css<br>(Custom Animations & Print Styles)"]
    Const["docs/js/data_constants.js<br>(Static Parks & States List)"]
    Helpers["docs/js/helpers.js<br>(Formatting, Escaping, Sorting, Migrations)"]
    State["docs/js/state.js<br>(Global variables, LocalStorage Sync)"]
    Map["docs/js/map.js<br>(Leaflet Initialization, Marker/Polyline Plotting)"]
    UI["docs/js/ui.js<br>(Modals Toggles, Table Drawings, Stats Grid)"]
    App["docs/js/app.js<br>(Search events, Routing engines, Backup Imports)"]

    HTML --> CSS
    HTML --> Const
    HTML --> Helpers
    HTML --> State
    HTML --> Map
    HTML --> UI
    HTML --> App
    
    State -->|Calls| Helpers
    Map -->|Reads State & Calls| Helpers
    UI -->|Reads/Writes State & Calls| Helpers
    App -->|Orchestrates| State
    App -->|Orchestrates| Map
    App -->|Orchestrates| UI
```

### Module Descriptions
*   **[docs/js/helpers.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/helpers.js)**: Holds pure mathematical and formatting functions (e.g. converting geodetic coordinates to distances/times, HTML-escaping to prevent XSS, grouping trip dates, and JSON schema version migration).
*   **[docs/js/state.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/state.js)**: Manages reactive application state. Loads settings and visit records from `localStorage` on startup, invokes migrations, and writes back state changes via the `save()` helper.
*   **[docs/js/map.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/map.js)**: Orchestrates the Leaflet map layer, custom icon layouts (visited vs unvisited visual states), custom popup HTML, and coordinate plotting.
*   **[docs/js/ui.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/ui.js)**: Controls interactive DOM rendering (modals, settings checklists, member filter selectors, table sorts, and stats grids).
*   **[docs/js/app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)**: Serves as the central controller. Glues input event listeners, processes OSRM/Mapbox REST requests, geocodes input queries using Nominatim, and manages spreadsheet exports/backup JSON restorations.

---

## 2. Core Workflows

### A. Initialization & Data Migration
When the application starts, it retrieves `localStorage` schemas and normalizes old formats to ensure continuous backward compatibility:

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Client Browser
    participant HTML as index.html
    participant State as state.js
    participant Helpers as helpers.js
    participant UI as ui.js

    Browser->>HTML: Load Application Page
    HTML->>State: Evaluate Script
    State->>Browser: Read 'np_travel_tracker_v3' & 'np_travel_settings'
    State->>Helpers: Call migrateData(settings, visitData)
    Note over Helpers: Normalizes legacy single hometowns to array<br/>Injects empty list for new family routing attributes
    Helpers-->>State: Return Clean Settings & Visit Objects
    State->>Browser: Write back migrated state to localStorage
    HTML->>UI: Trigger switchTab('parks') on window.onload
    UI->>Browser: Draw park tracking lists & compute stats
```

### B. Routing & Point Simplification
The application fetches road-following coordinate geometries from CDNs and simplifies them locally using the Douglas-Peucker algorithm to save storage bandwidth:

```mermaid
sequenceDiagram
    autonumber
    participant UI as ui.js
    participant App as app.js
    participant Nominatim as OS Nominatim API
    participant Routing as OSRM / Mapbox CDN
    participant Storage as LocalStorage

    UI->>App: User triggers requestRoute() (Start -> End)
    App->>Nominatim: Fetch coordinates for Start and End queries
    Nominatim-->>App: Return Lat/Lng coordinates
    App->>Routing: Fetch driving route polyline
    Routing-->>App: Return full GPS coordinate array, distance, and duration
    Note over App: Apply Douglas-Peucker point simplification<br/>based on tolerance settings (e.g. 0.001)
    App->>Storage: Append simplified road trip record to settings.savedRoutes
    App->>UI: Trigger renderSavedRoutes() and updateMapMarkers()
```

---

## 3. Testing Architecture

Since the code is modularized to run natively in static web CDNs via shared global window variables, unit tests in Node.js are emulated using Node's `global` namespace.

*   **Test File**: [tests/app.test.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/tests/app.test.js)
*   **Emulation Hook**:
    Inside [docs/js/app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js), Node.js environment detection loads all dependency files (`state.js`, `helpers.js`, `map.js`, `ui.js`) using `require` and mixes their exports into the Node `global` object.
    ```javascript
    if (typeof module !== 'undefined' && module.exports) {
        const state = require('./state.js');
        const helpers = require('./helpers.js');
        const map = require('./map.js');
        const ui = require('./ui.js');
        Object.assign(global, state, helpers, map, ui);
    }
    ```
    This mimics the browser's global scope environment, letting developers write fast local unit tests using the native `node:test` runner.
