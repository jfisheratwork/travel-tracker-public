const test = require('node:test');
const assert = require('node:assert');

// Mock localStorage
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

// Mock migrateData since state.js requires it
global.migrateData = (settings, visitData) => {
    return {
        settings: settings || { familyMembers: [], hometowns: [], savedRoutes: [] },
        visitData: visitData || { parks: {}, states: {}, meta: {} }
    };
};

// Require state.js
const { save } = require('../docs/js/state.js');

test('state management operations', async (testContext) => {
    await testContext.test('saves visitData to localStorage', () => {
        // Mutate the existing visitData object instead of replacing it
        global.visitData.parks['Yosemite_Jake'] = true;
        save();
        
        const stored = JSON.parse(localStorage.getItem('np_travel_tracker_v3'));
        assert.ok(stored.parks['Yosemite_Jake']);
    });
});
