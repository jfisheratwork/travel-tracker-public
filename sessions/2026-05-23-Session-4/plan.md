# Fix Road Trip Statistics Panel

## Problem
When the user switches to the "Road Trips" tab, the statistics panel shows National Parks data instead of road trip-specific metrics. This is because `updateStats()` in `ui.js` uses `let target = (mapMode === 'states') ? 'states' : 'parks'` — it never handles the `roads` case.

## Proposed Changes

### UI Module
#### [MODIFY] [ui.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/ui.js)
- Add early return in `updateStats()` that delegates to `updateRoadTripStats()` when `mapMode === 'roads'`
- Create new `updateRoadTripStats()` function showing: total trips, completed vs planned, aggregate distance/duration, per-member trip participation
- Export new function for Node.js testing

### HTML Template
#### [MODIFY] [index.html](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/index.html)
- Add `id="remaining-label"` to the "Remaining" span so JS can change it to "Planned" in road trip mode

## Verification
- Run `node tests/app.test.js` — all 20 tests should pass

---
*Written with the assistance of Google Gemini*
