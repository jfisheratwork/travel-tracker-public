# Implementation Plan - Refactor app.js into Modular Components

Refactor the 1,562-line `docs/js/app.js` into five separate, logical files to make concurrent development and unit testing easier, while maintaining browser compatibility for GitHub Pages (zero-dependency static hosting) and full test suite compatibility with Node.js.

## Proposed Changes

### File Structure & Split Map

The monolithic `docs/js/app.js` will be split into the following files:

1. **[NEW] [state.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/state.js)**:
   - Declares global state variables (`currentTab`, `sortColumn`, `sortDirection`, `worldMap`, `mapMarkers`, `hometownMarkers`, `roadPolylines`, `mapMode`, `statsMode`, `searchTerm`, `currentMemberFilter`, `editTarget`, `routeEditTargetIndex`, `selectedRouteIndex`).
   - Declares the dynamic colors palette.
   - Loads and parses initial settings/visitData from `localStorage`.
   - Runs `migrateData()` and persists back to `localStorage`.
   - Holds state persistence methods: `save()`.

2. **[NEW] [helpers.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/helpers.js)**:
   - Pure utility functions:
     - `escapeHTML(str)`
     - `formatDistance(meters)`
     - `formatDuration(seconds)`
     - `groupRoutesByYearOrStatus(routes, groupBy)`
     - `migrateData(settingsObj, visitDataObj)`
     - `getWikiLink(item, type)`
     - `getMemberColor(index)`

3. **[NEW] [map.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/map.js)**:
   - Leaflet map initialization and markers layout:
     - `initWorldMap()`
     - `setMapMode(mode)`
     - `updateMapMarkers()`

4. **[NEW] [ui.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/ui.js)**:
   - Modal management, DOM rendering, and event-triggered layouts:
     - `toggleEditModal()`, `toggleRouteEditModal()`, `toggleInfoModal()`, `toggleSettingsModal()`, `toggleExportModal()`
     - `switchTab()`, `sortTable()`, `updateSortIndicators()`, `renderData()`, `toggleVisit()`, `toggleAllRow()`
     - `renderHometownUI()`, `renderSettingsFamilyList()`, `renderMemberFilterOptions()`, `updateMemberFilter()`
     - `openEditModal()`, `saveMetaData()`, `openRouteEditModal()`, `saveRouteEditDetails()`, `deleteRouteFromEditModal()`

5. **[MODIFY] [app.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/js/app.js)**:
   - Orchestration, import/backups, input helpers, and testing compatibility:
     - `handleSearch()`, `updateCharCount()`
     - `addFamilyMember()`, `removeFamilyMember()`, `removeHometown()`
     - `confirmReset()`, `cancelReset()`, `performReset()`
     - `loadSampleData()`, `showLoadConfirmation()`, `cancelLoad()`, `performLoad()`
     - `saveBackupJSON()`, `handleBackupImport()`, `cancelRestore()`, `performRestore()`
     - `getExportData()`, `saveToCSV()`, `saveToExcel()`, `handleImport()`
     - `toggleMapboxSettings()`, `getGeocode()`, `fetchOSRM()`, `fetchMapbox()`, `requestRoute()`
     - `renderSavedRoutes()`, `deleteSavedRoute()`, `focusRoute()`
     - `window.onload` handler.
     - In Node.js testing environments, it will dynamically `require` the other files and load their variables/functions into `global` to emulate the shared browser environment and preserve Node test runner compliance.

---

### Script Ingestion

#### [MODIFY] [index.html](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/docs/index.html)
- Load the scripts in dependency order:
  ```html
  <script src="js/data_constants.js?v=1.0.1"></script>
  <script src="js/helpers.js?v=1.0.1"></script>
  <script src="js/state.js?v=1.0.1"></script>
  <script src="js/map.js?v=1.0.1"></script>
  <script src="js/ui.js?v=1.0.1"></script>
  <script src="js/demo_route.js?v=1.0.1"></script>
  <script src="js/app.js?v=1.0.1"></script>
  ```

---

### Node.js Emulation Design

To avoid breaking [tests/app.test.js](file:///Users/jacobfisher/coding/traveltracker/travel-tracker-public/tests/app.test.js), the files will export their items if `module.exports` exists.
In `docs/js/app.js`:
```javascript
if (typeof module !== 'undefined' && module.exports) {
    const state = require('./state.js');
    const helpers = require('./helpers.js');
    const map = require('./map.js');
    const ui = require('./ui.js');
    
    // Mix everything into node global scope so they function as shared globals
    Object.assign(global, state, helpers, map, ui);
    
    module.exports = {
        formatDistance: global.formatDistance,
        formatDuration: global.formatDuration,
        groupRoutesByYearOrStatus: global.groupRoutesByYearOrStatus,
        migrateData: global.migrateData,
        escapeHTML: global.escapeHTML,
        focusRoute: global.focusRoute,
        getSelectedRouteIndex: () => global.selectedRouteIndex,
        setSelectedRouteIndex: (val) => { global.selectedRouteIndex = val; }
    };
}
```

---

## Verification Plan

### Automated Tests
- Run `node tests/app.test.js` to ensure the modularized structures are imported and evaluated correctly without regression.

### Manual Verification
- Verify in browser that tabs, map markers, settings configuration, and road trip calculations continue to operate correctly with the split files.

---

# Addendum - High-Level Documentation (Added 2026-05-23)

## Proposed Changes
- Create `architecture.md` to document components flow, initialization sequencing, routing point simplification details, and Node.js testing setup.
- Update `README.md` to list file structural splits, instructions on testing runner setup, and a link to the architecture guide.
