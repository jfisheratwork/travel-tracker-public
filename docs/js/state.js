/**
 * --- STATE MANAGEMENT ---
 * Declare and initialize application state variables and local storage syncing.
 */

// Node.js support: import helpers first if running in tests
if (typeof require !== 'undefined') {
    const helpers = require('./helpers.js');
    Object.assign(global, helpers);
}

// State variables track the current view and data
let currentTab = 'parks';
let sortColumn = 1;
let sortDirection = 'asc';
let worldMap = null;
let mapMarkers = [];
let hometownMarkers = [];
let roadPolylines = [];
let mapMode = 'parks';
let statsMode = 'parks';
let searchTerm = '';
let currentMemberFilter = 'all';
let editTarget = null;
let routeEditTargetIndex = null;
let selectedRouteIndex = null;

// Palette for family progress color variety
const palette = ['blue', 'pink', 'orange', 'purple', 'teal', 'red', 'green', 'yellow', 'indigo', 'cyan'];

// Load Settings & Data from LocalStorage
let rawSettings = JSON.parse(localStorage.getItem('np_travel_settings')) || {
    showUSA: true, showCanada: true, showUSAParks: true, showCanadianParks: true,
    familyMembers: [],
    hometowns: []
};

let rawVisitData = JSON.parse(localStorage.getItem('np_travel_tracker_v3'));

const migrated = migrateData(rawSettings, rawVisitData);
let settings = migrated.settings;
let visitData = migrated.visitData;

localStorage.setItem('np_travel_settings', JSON.stringify(settings));
localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData));

function save() {
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData));
}

// Node.js testing environment getters, setters, and exports
if (typeof module !== 'undefined' && module.exports) {
    // Define getters and setters on global so that modifications to state variables
    // in one file are automatically seen in all other files in Node.
    const stateVars = {
        currentTab, sortColumn, sortDirection, worldMap, mapMarkers,
        hometownMarkers, roadPolylines, mapMode, statsMode, searchTerm,
        currentMemberFilter, editTarget, routeEditTargetIndex, selectedRouteIndex,
        palette, settings, visitData
    };

    Object.keys(stateVars).forEach(key => {
        let internalVal = stateVars[key];
        Object.defineProperty(global, key, {
            get() { return internalVal; },
            set(val) { internalVal = val; },
            configurable: true
        });
    });

    global.save = save;

    module.exports = {
        save
    };
}
