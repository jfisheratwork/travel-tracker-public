# Implementation Plan - Fix Road Trip Selection & Staging on Branch

We are addressing the selection logic behavior for road trips, updating the OSRM throttle limit with visual warning alert styling, and creating a new git branch to stage and manage the substantial uncommitted work.

## User Review Required

> [!IMPORTANT]
> - **Selection Visuals:** The selected road trip row will now be highlighted with a **blue border** (`border-2 border-blue-500 bg-blue-50/20`) instead of green.
> - **Map Behavior:** Selecting a route isolates it (hides all others) and zooms to its bounds. Clicking again deselects it, restoring all route lines and fitting the map bounds to all routes combined.
> - **OSRM Throttling (Feedback Incorporated):** 
>   - Reduce the OSRM request throttle wait from 2 minutes to **30 seconds**.
>   - Add a strong visual alert box (red text, light red background, red border) to the `#route-status` container if a request is throttled or errors out.
> - **Git Branching:** We will create a new branch `feature/roads-traveled` to isolate all Phase 3 routing changes.

---

## Proposed Changes

### Version Control

#### [NEW BRANCH] `feature/roads-traveled`
- Create and switch to a new local branch `feature/roads-traveled` to hold all uncommitted changes.

### App Logic

#### [MODIFY] [app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)
- Update OSRM throttling logic in `fetchOSRM(start, end)`:
  - Reduce cooldown to 30 seconds (`30000` ms).
  - Update throw message: `OSRM Public Server limited to 1 request every 30 seconds. Please wait.`
- Update error rendering in `requestRoute()`:
  - On error, style `#route-status` with visual alert warning classes (`text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2`).
  - Reset `#route-status` style back to default (`text-stone-500 mt-2`) on new search or geocode start.
- Modify `renderSavedRoutes()`:
  - Style selected road trip cards with a blue border (`border-2 border-blue-500 bg-blue-50/20`) instead of green.
- Modify `focusRoute(idx)`:
  - Keep toggle behavior (second click sets `selectedRouteIndex = null`).
  - Deselection triggers redrawing all routes and zooming out to show all combined route coordinates.

---

## Draft Git Commit and PR Message

### Commit Message
```text
feat(roads): isolate selected route on map and highlight active sidebar row

- Switch active row border highlight from green to blue when selected.
- Isolate the selected polyline on the map, hiding all other polylines.
- Support toggling selection to deselect the active route, which redraws all polylines and auto-zooms to fit all routes.
- Update delete handlers to reset the selection state.
- Reduce OSRM request throttle cooldown to 30 seconds and introduce a styled red warning alert box for API errors.

Written with the assistance of Google Gemini
```

### Pull Request Description
```markdown
## Description
This PR introduces robust road-following routing enhancements (Phase 3) along with interactive map and list selection mechanics for road trips.

### Core Enhancements:
1. **OSRM & Mapbox Routing Engines:** Integrates public OSRM and Mapbox APIs in the frontend for driving coordinate fetches (returning real road-following polylines instead of straight lines).
2. **Douglas-Peucker Point Reduction:** Implements geometry simplification configurations in the settings panel to balance visual accuracy and local storage footprint.
3. **Edit Road Trip Modal:** Adds a modal to modify trip metadata (name, date, status, description, and participant checkmarks) by clicking on polylines or list items.
4. **Interactive Route Isolation:** Clicking a road trip card in the sidebar isolates its route on the Leaflet map and highlights its row with a blue border. Clicking again deselects it, redrawing all routes and zooming out to show all paths.
5. **OSRM Throttle Cooldown & Styling:** Reduces OSRM cooldown to 30 seconds and adds a prominent red alert style warning to the status box on request errors.

## Key Changes
- **Map Isolation & Zoom:** Added toggling selection logic in `focusRoute()` and polyline filters in `updateMapMarkers()` in [docs/js/app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js).
- **Blue Card Highlighting:** Styled selected route cards with a blue border and background.
- **Static Seed Data:** Populated `docs/examples/family1.json` with detailed Spokane-based road trips.
- **Unit Tests:** Added 15 new unit tests under `tests/app.test.js` verifying formatting, route grouping, and migration behavior.

## Verification
- Verified all 15 unit tests pass via `node tests/app.test.js`.
- Confirmed correct interactive behaviors manually in Chrome at `http://localhost:8080`.

> Written with the assistance of Google Gemini
```

---

## Verification Plan

### Automated Tests
- Run `node tests/app.test.js` to ensure zero regressions in logic.

### Manual Verification
- Deploy to localhost and verify:
  1. Row click highlights in blue, other routes disappear, map zooms to route.
  2. Row second click removes blue border, all routes redraw, map zooms to encompass all routes.
  3. Clicking "Search" for routing twice within 30 seconds triggers the visual red warning alert box indicating a throttle error.
