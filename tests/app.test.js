const test = require('node:test');
const assert = require('node:assert');

// 1. Mock browser globals and state
global.localStorage = {
    _store: {},
    getItem(key) {
        return this._store[key] || null;
    },
    setItem(key, value) {
        this._store[key] = String(value);
    },
    removeItem(key) {
        delete this._store[key];
    },
    clear() {
        this._store = {};
    }
};

global.window = global;
global.document = {
    getElementById(id) {
        return {
            value: '',
            innerText: '',
            innerHTML: '',
            classList: {
                add: () => {},
                remove: () => {},
                replace: () => {},
                contains: () => false
            },
            parentElement: {
                classList: {
                    add: () => {},
                    remove: () => {}
                }
            },
            appendChild: () => {},
            checked: false
        };
    },
    querySelectorAll() {
        return [];
    }
};

global.parks = [];
global.states = [];
global.settings = {
    savedRoutes: [
        { name: 'Route 1', route: [[45, -120], [46, -121]] },
        { name: 'Route 2', route: [[35, -110], [36, -111]] }
    ]
};
global.selectedRouteIndex = null;
global.worldMap = {
    fitBounds: () => {}
};
global.L = {
    polyline: () => ({
        getBounds: () => {}
    })
};

// Functions mock
global.renderSavedRoutes = () => {};
global.updateMapMarkers = () => {};

// Require app.js
const {
    focusRoute,
    getSelectedRouteIndex,
    setSelectedRouteIndex,
    updateSetting,
    saveBackupJSON,
    performRestore,
    setImportedData,
    populateExamplesDropdown
} = require('../docs/js/app.js');

test('focusRoute in app.js', async (testContext) => {
    await testContext.test('selects a route when none is selected', () => {
        setSelectedRouteIndex(null);
        focusRoute(0);
        assert.strictEqual(getSelectedRouteIndex(), 0);
    });

    await testContext.test('toggles/deselects a route when clicking it again', () => {
        setSelectedRouteIndex(0);
        focusRoute(0);
        assert.strictEqual(getSelectedRouteIndex(), null);
    });

    await testContext.test('switches selection to a new route when clicking a different one', () => {
        setSelectedRouteIndex(0);
        focusRoute(1);
        assert.strictEqual(getSelectedRouteIndex(), 1);
    });
});

test('Settings and Backup Security in app.js', async (testContext) => {
    // Save original globals
    const originalURL = global.URL;
    const originalDocumentCreateElement = global.document.createElement;
    const originalLocation = global.location;

    await testContext.test('updateSetting updates settings and triggers side-effects', () => {
        // Mock required UI functions
        let hometownUIRendered = false;
        let settingsFamilyListRendered = false;
        let tabSwitched = false;
        let mapMarkersUpdated = false;

        global.renderHometownUI = () => { hometownUIRendered = true; };
        global.renderSettingsFamilyList = () => { settingsFamilyListRendered = true; };
        global.switchTab = () => { tabSwitched = true; };
        global.updateMapMarkers = () => { mapMarkersUpdated = true; };
        global.checkFamilyStatus = () => {};

        // 1. Update hometowns
        global.currentTab = 'world';
        updateSetting('hometowns', [{ name: 'Seattle', lat: 47, lng: -122 }]);
        assert.deepEqual(global.settings.hometowns, [{ name: 'Seattle', lat: 47, lng: -122 }]);
        assert.strictEqual(hometownUIRendered, true);
        assert.strictEqual(mapMarkersUpdated, true);

        // Reset indicators
        hometownUIRendered = false;
        mapMarkersUpdated = false;

        // 2. Update familyMembers
        updateSetting('familyMembers', ['Jake', 'Alice']);
        assert.deepEqual(global.settings.familyMembers, ['Jake', 'Alice']);
        assert.strictEqual(settingsFamilyListRendered, true);
        assert.strictEqual(tabSwitched, true);
    });

    await testContext.test('saveBackupJSON exports settings without mapboxKey', async () => {
        global.settings.mapboxKey = 'sensitive-api-key-12345';
        global.settings.routingEngine = 'mapbox';

        let exportedText = '';
        global.URL = {
            createObjectURL(blobParam) {
                return 'blob:mock-url';
            },
            revokeObjectURL() {}
        };

        const originalBlob = global.Blob;
        global.Blob = class MockBlob {
            constructor(partsParam, optionsParam) {
                exportedText = partsParam[0];
            }
        };

        let clickInvoked = false;
        global.document.createElement = (tagParam) => {
            return {
                href: '',
                download: '',
                click() { clickInvoked = true; }
            };
        };

        saveBackupJSON();

        assert.strictEqual(clickInvoked, true);
        
        const parsedBackup = JSON.parse(exportedText);
        assert.strictEqual(parsedBackup.settings.mapboxKey, undefined);
        assert.strictEqual(parsedBackup.settings.routingEngine, 'mapbox');

        // Restore Blob
        global.Blob = originalBlob;
    });

    await testContext.test('performRestore preserves mapboxKey if existing', () => {
        global.settings.mapboxKey = 'local-api-key-999';
        
        global.location = {
            reload() {}
        };

        // Set up imported data without mapboxKey
        setImportedData({
            settings: {
                showUSA: true,
                routingEngine: 'osrm'
            },
            visitData: {
                parks: {},
                states: {}
            }
        });

        performRestore();

        const storedSettings = JSON.parse(global.localStorage.getItem('np_travel_settings'));
        assert.strictEqual(storedSettings.mapboxKey, 'local-api-key-999');
        assert.strictEqual(storedSettings.routingEngine, 'osrm');

        // Reset imported data
        setImportedData(null);
    });

    // Restore original globals
    global.URL = originalURL;
    global.document.createElement = originalDocumentCreateElement;
    global.location = originalLocation;
});

test('populateExamplesDropdown in app.js', async (testContext) => {
    await testContext.test('populates the example select element with both JSON files', async () => {
        const mockSelect = { innerHTML: '' };
        const originalGetElementById = global.document.getElementById;
        global.document.getElementById = (id) => {
            if (id === 'example-select') {
                return mockSelect;
            }
            return null;
        };

        await populateExamplesDropdown();

        assert.ok(mockSelect.innerHTML.includes('family1.json'));
        assert.ok(mockSelect.innerHTML.includes('travel_tracker_backup_2026-05-23.json'));

        global.document.getElementById = originalGetElementById;
    });
});
