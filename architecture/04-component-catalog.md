# 04. UI Component Catalog

All components in Traveled Roads Tracker are built as **Angular Standalone Components** (`standalone: true`).

---

## 1. Primary Feature Views

### [MapViewComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/map-view/map-view.component.ts)
- **Selector**: `app-map-view`
- **Role**: Coordinates the interactive Leaflet map canvas, overlay legends, and delegates to layer services.
- **Outputs**:
  - `settingsClick: EventEmitter<void>`: Fired when clicking the settings trigger.

### [RouteBuilderComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/route-builder/route-builder.ts)
- **Selector**: `app-route-builder`
- **Role**: Interactive road trip planner. Manages waypoints, calculates routes via OSRM/Mapbox, displays elevation profiles, distance/duration stats, and saves routes to state.

### [LocationsTrackerComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/locations-tracker/locations-tracker.ts)
- **Selector**: `app-locations-tracker`
- **Role**: Tabular checklist of all national parks and states with multi-member checkmarks, visit dates, and notes. Embedded inside the bottom slide-up drawer.

---

## 2. Map Overlay Sub-Components

### [MapStatsLegendComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/map-view/components/map-stats-legend/map-stats-legend.component.ts)
- **Selector**: `app-map-stats-legend`
- **Role**: Bottom-left glassmorphic overlay displaying US States, CA Provinces, US Parks, and CA Parks visited counts against totals.
- **Inputs**:
  - `theme: ColorThemeDefinition` (Required)
  - `visitedUSStatesCount: number`
  - `visitedCAProvincesCount: number`
  - `visitedUSParksCount: number`
  - `visitedCAParksCount: number`

### [MapVisitedLegendComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/map-view/components/map-visited-legend/map-visited-legend.component.ts)
- **Selector**: `app-map-visited-legend`
- **Role**: Bottom-right status swatches overlay ("Everyone", "Some of us", "Not yet", "Want to visit").
- **Inputs**:
  - `theme: ColorThemeDefinition` (Required)
  - `wantToVisitColor: string`

---

## 3. Modal Dialogs

| Component | Selector | Purpose & Primary Triggers |
| :--- | :--- | :--- |
| **[SettingsModal](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/settings-modal/settings-modal.ts)** | `app-settings-modal` | Manages family member list (names/colors), hometowns (active/previous dates), API keys (Mapbox/Carto), and JSON backup export/import. |
| **[StatsModal](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/stats-modal/stats-modal.ts)** | `app-stats-modal` | Full-screen statistical breakdown by member, national park visit percentages, and state charts. |
| **[ParksStatesModal](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/parks-states-modal/parks-states-modal.ts)** | `app-parks-states-modal` | Quick-entry checklist modal for checking off visited parks or states by member. |
| **[LocationDetailModal](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/location-detail-modal/location-detail-modal.ts)** | `app-location-detail-modal` | Detailed trip log modal triggered by clicking "✏️ Details" on any map popup or table row. Enables adding dates, comments, and member attendance. |
| **[WelcomeModalComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/welcome-modal/welcome-modal.component.ts)** | `app-welcome-modal` | Onboarding wizard displayed on first application visit or via the header "Quick Setup Wizard" button. |
| **[HelpModalComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/help-modal/help-modal.component.ts)** | `app-help-modal` | Keyboard shortcuts, feature descriptions, and FAQ. |

---

## 4. Shared & Search Inputs

- **[GlobalSearchComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/global-search/global-search.component.ts)** (`app-global-search`): Header search bar emitting search strings into `StateService.searchTerm$`.
- **[LocationAutocompleteComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/components/location-autocomplete/location-autocomplete.component.ts)** (`app-location-autocomplete`): Debounced typeahead geocoding input backed by OpenStreetMap Nominatim.
- **[ToastContainerComponent](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/src/app/core/components/toast-container/toast-container.component.ts)** (`app-toast-container`): Floating alert notifications managed by `ToastService`.
