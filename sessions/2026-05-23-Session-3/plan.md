# Implementation Plan - Layout Enhancements & Advanced Routing Features

This plan introduces:
1. **Layout Simplification & Tab Memory**: Restructure navigation to focus entirely on the World Map and Road Trips. Persist active tabs across page reloads.
2. **Modals for Tracking Lists**: Turn National Parks and States/Provinces tracking screens into overlay modals, enabling users to log visits without navigating away from the map.
3. **Toggleable Stats Widget**: Display statistics as a collapsible widget sitting directly above the map.
4. **Saved Trip Year Accordions**: Group completed road trips by year and default previous years' trips to a collapsed state.
5. **Multi-Stop & Alternative Routing**: Enable users to add intermediate stops to routes and preview/select alternative routes.

---

## Proposed Changes

### UI & Layout

#### [MODIFY] [index.html](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/index.html)
- Update navigation header (`<nav>`):
  - Replace current four-tab layout with two tabs: **World Map** (`#tab-world`) and **Road Trips** (`#tab-roads`).
  - Add action buttons next to or below the tabs: **🌲 Log Parks** and **⭐ Log States**.
- Restructure stats layout:
  - Move the `#stats-view-container` into the `#world-map-container` as a toggleable `#stats-widget` panel.
  - Add a button **📊 Show/Hide Statistics** above the map to toggle this widget.
- Add Parks Modal (`#parks-modal`) and States Modal (`#states-modal`) containers:
  - Copy table scroll areas inside these modals.
  - Implement backdrop blur and standard modal entry animation classes.
- Update Route Builder:
  - Add a container `#route-stops-container` between Start and Destination to hold intermediate waypoint inputs.
  - Add an **➕ Add Stop** button.
  - Add an alternative routes selection list `#alt-routes-list` to choose from before saving.

#### [NEW] [docs/js/state.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/state.js) (or modify)
- Load active tab on init: read `np_travel_active_tab` from `localStorage`, defaulting to `world`.
- Manage collapsed/expanded states for completed route years.

#### [MODIFY] [docs/js/ui.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/ui.js)
- Modify modal toggles:
  - Add `toggleParksModal(show)` and `toggleStatesModal(show)`.
- Split `renderData()` into modular table renderers:
  - `renderParksTable()` and `renderStatesTable()` rendering into their respective modals.
- Update `switchTab(tab)`:
  - Persist tab selection to `localStorage`.
  - Toggle map controls and forms depending on active tab (`world` or `roads`).
- Update `updateStats()` to compute stats for the widget.

#### [MODIFY] [docs/js/app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)
- Update saved routes list layout (`renderSavedRoutes()`):
  - Group completed road trips by year.
  - Build collapsible accordions for each year with toggle icons and trip counters.
  - Default previous years to collapsed.
- Implement stops management:
  - Add functions `addStopInput()` and `removeStopInput()`.
- Update OSRM / Mapbox integrations to support waypoints and alternatives:
  - Map geocodes to an array of coordinate endpoints.
  - Request routes with `alternatives=true` parameter.
  - Render alternative paths as temporary gray polylines on the map.
  - Render an option list for the user to select their preferred alternative path before clicking **Save**.

---

## Verification Plan

### Automated Tests
- Run `node tests/app.test.js` to ensure zero regressions in distance/duration calculators, data migrations, or routing logic.

### Manual Verification
- Deploy to local server:
  1. Confirm page defaults to **World Map** on load, and refreshing preserves active tab selection.
  2. Toggle stats panel visibility above the map.
  3. Open Parks and States modals, toggle visits, search, and verify changes reflect on the map in real-time.
  4. Build a route with 3 stops, preview alternative routes on the map, select one, and verify it saves.
  5. Check that previous years' road trips are collapsed by default in the sidebar.
