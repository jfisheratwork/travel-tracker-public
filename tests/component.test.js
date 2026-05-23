const test = require('node:test');
const assert = require('node:assert');

// 1. Mock Browser DOM Tree
const domTree = {
    'member-filter': { value: 'all', classList: { add: () => {}, remove: () => {} } },
    'parks-member-filter': { value: 'all' },
    'states-member-filter': { value: 'all' },
    'parks-region-filter': { value: 'all' },
    'states-region-filter': { value: 'all' },
    'stats-label': { innerText: '' },
    'total-visited': { innerText: '' },
    'total-remaining': { innerText: '' },
    'progress-bar': { style: {} },
    'group-percent': { innerText: '' },
    'remaining-box': { classList: { add: () => {}, remove: () => {}, contains: () => false } },
    'remaining-label': { innerText: '' },
    'regional-stats': { classList: { add: () => {}, remove: () => {}, contains: () => false } },
    'us-stat-label': { innerText: '' },
    'us-stat-count': { innerText: '' },
    'us-stat-bar': { style: {} },
    'ca-stat-label': { innerText: '' },
    'ca-stat-count': { innerText: '' },
    'ca-stat-bar': { style: {} },
    'family-progress-grid': { innerHTML: '' },
    'search-input': { value: '' },
    'search-clear-btn': { classList: { add: () => {}, remove: () => {} } },
    'search-result-count': { innerText: '', classList: { add: () => {}, remove: () => {} } },
    'parks-visited-ui': { classList: { add: () => {}, remove: () => {} } },
    'visited-parks-list': { innerHTML: '' },
    'states-visited-ui': { classList: { add: () => {}, remove: () => {} } },
    'visited-states-list': { innerHTML: '' },
    'route-builder-ui': { classList: { add: () => {}, remove: () => {} }, scrollIntoView: () => {} },
    'route-builder-title': { innerText: '' },
    'route-edit-choice-modal': { classList: { add: () => {}, remove: () => {} } },
    'route-start': { value: '' },
    'route-end': { value: '' },
    'route-stops-container': { innerHTML: '', appendChild: () => {} },
    'route-status': { innerText: '', classList: { add: () => {}, remove: () => {} } },
    'saved-routes-list': { innerHTML: '' },
    'alt-routes-selector': { classList: { add: () => {}, remove: () => {} } },
    'alt-routes-list': { innerHTML: '', appendChild: () => {} },
    'parks-data-list': { innerHTML: '', appendChild: () => {} },
    'states-data-list': { innerHTML: '', appendChild: () => {} }
};

global.document = {
    getElementById(id) {
        return domTree[id] || {
            value: '',
            innerText: '',
            innerHTML: '',
            style: {},
            classList: { add: () => {}, remove: () => {}, replace: () => {}, contains: () => false },
            appendChild: () => {}
        };
    },
    querySelectorAll(selector) {
        return [];
    },
    createElement(tag) {
        return {
            className: '',
            innerHTML: '',
            appendChild: () => {}
        };
    }
};

global.localStorage = {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, value) { this._store[key] = String(value); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
};

global.window = global;

// Mock map object supporting method chaining
const mapMock = {
    setView() { return this; },
    addTo() { return this; },
    removeLayer: () => {},
    fitBounds: () => {},
    invalidateSize: () => {}
};

// Mock Leaflet L
global.L = {
    map: () => mapMock,
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({
        addTo: () => ({
            bindPopup: () => {},
            on: () => {}
        })
    }),
    divIcon: (options) => options,
    polyline: () => ({
        addTo: () => ({
            bindPopup: () => {},
            on: () => {}
        })
    }),
    featureGroup: () => ({
        getBounds: () => {}
    })
};

// Mock setTimeout and requestAnimationFrame to run immediately in tests to avoid async leakage
global.setTimeout = (callbackFn, delay) => callbackFn();
global.requestAnimationFrame = (callbackFn) => callbackFn();

// 2. Load the App Modules in dependency order
const helpers = require('../docs/js/helpers.js');
const state = require('../docs/js/state.js');
const map = require('../docs/js/map.js');
const ui = require('../docs/js/ui.js');
const app = require('../docs/js/app.js');

// Merge exports to global
Object.assign(global, helpers, state, map, ui, app);

// Setup preloaded data constants
global.parks = [
    { name: 'Yosemite', country: 'USA', sub: 'CA', lat: 37, lng: -119 },
    { name: 'Yellowstone', country: 'USA', sub: 'WY', lat: 44, lng: -110 },
    { name: 'Banff', country: 'Canada', sub: 'AB', lat: 51, lng: -115 }
];
global.states = [
    { name: 'California', sub: 'USA', capital: 'Sacramento', lat: 38, lng: -121 },
    { name: 'Alberta', sub: 'Canada', capital: 'Edmonton', lat: 53, lng: -113 }
];

// Initialize app settings
global.settings = {
    familyMembers: ['Jake', 'Alice'],
    hometowns: [{ name: 'Seattle', lat: 47, lng: -122 }],
    showUSA: true,
    showCanada: true,
    showUSAParks: true,
    showCanadianParks: true,
    savedRoutes: []
};
global.visitData = {
    parks: {},
    states: {},
    meta: { parks: {}, states: {} }
};

test('E2E Component Integration Flow', async (testContext) => {
    // Initialize map
    initWorldMap();

    await testContext.test('Initial rendering displays zero visits', () => {
        updateStats();
        assert.strictEqual(domTree['total-visited'].innerText, '0 / 3');
        assert.strictEqual(domTree['total-remaining'].innerText, 3);
    });

    await testContext.test('Toggling a visit updates stats and lists', () => {
        toggleVisit('Yosemite', 'Jake', 'parks');
        
        // Yosemite visited by Jake -> stats count should now be 1 / 3
        updateStats();
        assert.strictEqual(domTree['total-visited'].innerText, '1 / 3');
        
        // Jake's progress card should reflect 1 visited park
        // Verify Yosemite shows up in the visited parks list below the map
        renderVisitedList('parks');
        assert.ok(domTree['visited-parks-list'].innerHTML.includes('Yosemite'));
        assert.ok(domTree['visited-parks-list'].innerHTML.includes('Jake'));
    });

    await testContext.test('Adding comments/metadata saves correctly', () => {
        // Save comment
        visitData.meta.parks['Yosemite'] = { date: '2026-05-23', comment: 'Stunning waterfalls!' };
        
        renderVisitedList('parks');
        assert.ok(domTree['visited-parks-list'].innerHTML.includes('Stunning waterfalls!'));
        assert.ok(domTree['visited-parks-list'].innerHTML.includes('2026-05-23'));
    });

    await testContext.test('Search filter matches and updates count badge', () => {
        handleSearch('Banff');
        
        // Map markers search result count should reflect 1 match (Banff)
        assert.strictEqual(domTree['search-result-count'].innerText, '1 result');
    });

    await testContext.test('Switching to roads tab shows saved routes and maps roads', () => {
        settings.savedRoutes = [
            {
                name: 'Seattle to Portland',
                route: [[47.6, -122.3], [45.5, -122.6]],
                engine: 'osrm',
                timestamp: Date.now(),
                date: '2026-05-23',
                members: ['Jake'],
                description: 'First road trip!',
                distance: 280000,
                duration: 10800,
                status: 'completed'
            }
        ];

        // Clear search state to avoid filter leakage from previous tests
        clearSearch();

        // Trigger tab transition
        switchTab('roads');

        assert.strictEqual(mapMode, 'roads');
        assert.ok(domTree['saved-routes-list'].innerHTML.includes('Seattle to Portland'));
        assert.ok(domTree['saved-routes-list'].innerHTML.includes('First road trip!'));
        assert.ok(domTree['saved-routes-list'].innerHTML.includes('Jake'));
    });

    await testContext.test('Editing a route loads inputs, runs routing, and overwrites existing route on save', async () => {
        const originalFetch = global.fetch;
        const originalDateNow = Date.now;
        
        let mockTime = originalDateNow();
        global.Date.now = () => {
            mockTime += 35000;
            return mockTime;
        };

        global.fetch = async (url) => {
            if (url.includes('nominatim.openstreetmap.org')) {
                return {
                    json: async () => [
                        {
                            lat: '47.6062',
                            lon: '-122.3321',
                            display_name: 'Seattle, Washington, USA'
                        }
                    ]
                };
            }
            if (url.includes('router.project-osrm.org')) {
                return {
                    json: async () => ({
                        code: 'Ok',
                        routes: [
                            {
                                geometry: {
                                    coordinates: [
                                        [-122.3321, 47.6062],
                                        [-122.6765, 45.5231]
                                    ]
                                },
                                distance: 280000,
                                duration: 10800
                            }
                        ]
                    })
                };
            }
            throw new Error(`Unexpected fetch URL: ${url}`);
        };

        assert.strictEqual(settings.savedRoutes.length, 1);
        
        let modalShown = false;
        domTree['route-edit-choice-modal'].classList.remove = (classVal) => {
            if (classVal === 'hidden') {
                modalShown = true;
            }
        };
        
        openRouteEditChoice(0);
        assert.strictEqual(routeEditTargetIndex, 0);
        assert.strictEqual(modalShown, true);

        handleEditChoice('route');
        
        assert.strictEqual(domTree['route-start'].value, '47.6,-122.3');
        assert.ok(domTree['route-builder-title'].innerText.includes('Edit Road Trip'));

        settings.routingEngine = 'osrm';
        await requestRoute();

        assert.strictEqual(getTempAlternatives().length, 1);

        saveSelectedRoute();

        assert.strictEqual(routeEditTargetIndex, null);
        assert.strictEqual(domTree['route-builder-title'].innerText, 'Add New Road Trip');
        assert.strictEqual(settings.savedRoutes.length, 1);

        global.fetch = originalFetch;
        global.Date.now = originalDateNow;
    });
});
