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
let currentTab = 'world';
try {
    currentTab = localStorage.getItem('np_travel_active_tab') || 'world';
} catch(loadTabError) {}

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
let routeCoordinatesCache = {};

let parksSearchTerm = '';
let statesSearchTerm = '';
let parksMemberFilter = 'all';
let statesMemberFilter = 'all';
let collapsedYears = {};
try {
    collapsedYears = JSON.parse(localStorage.getItem('np_travel_collapsed_years')) || {};
} catch(loadCollapsedError) {}

// Palette for family progress color variety
const palette = ['blue', 'pink', 'orange', 'purple', 'teal', 'red', 'green', 'yellow', 'indigo', 'cyan'];

// Load Settings & Data from LocalStorage
let rawSettings = null;
try {
    rawSettings = JSON.parse(localStorage.getItem('np_travel_settings'));
} catch(loadSettingsError) {}
if (!rawSettings) {
    rawSettings = {
        showUSA: true, showCanada: true, showUSAParks: true, showCanadianParks: true,
        familyMembers: [],
        hometowns: []
    };
}

let rawVisitData = null;
try {
    rawVisitData = JSON.parse(localStorage.getItem('np_travel_tracker_v3'));
} catch(loadVisitError) {}

const migrated = migrateData(rawSettings, rawVisitData);
let settings = migrated.settings;
let visitData = migrated.visitData;

try {
    localStorage.setItem('np_travel_settings', JSON.stringify(settings));
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData));
} catch(saveSettingsError) {}

function save() {
    try {
        localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData));
    } catch(saveVisitError) {}
}

function saveCollapsedYears() {
    try {
        localStorage.setItem('np_travel_collapsed_years', JSON.stringify(collapsedYears));
    } catch(saveCollapsedError) {}
}

// Node.js testing environment getters, setters, and exports
if (typeof module !== 'undefined' && module.exports) {
    // Define getters and setters on global so that modifications to state variables
    // in one file are automatically seen in all other files in Node.
    const stateVars = {
        currentTab, sortColumn, sortDirection, worldMap, mapMarkers,
        hometownMarkers, roadPolylines, mapMode, statsMode, searchTerm,
        currentMemberFilter, editTarget, routeEditTargetIndex, selectedRouteIndex,
        palette, settings, visitData,
        parksSearchTerm, statesSearchTerm, parksMemberFilter, statesMemberFilter, collapsedYears,
        routeCoordinatesCache
    };

    Object.keys(stateVars).forEach(stateKey => {
        let internalVal = stateVars[stateKey];
        Object.defineProperty(global, stateKey, {
            get() { return internalVal; },
            set(stateValue) { internalVal = stateValue; },
            configurable: true
        });
    });

    global.save = save;
    global.saveCollapsedYears = saveCollapsedYears;

    module.exports = {
        save
    };
}

