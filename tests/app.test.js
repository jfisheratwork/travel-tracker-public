const test = require('node:test');
const assert = require('node:assert');

// 1. Mock browser globals before requiring docs/js/app.js
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

// Require the refactored module
const {
    formatDistance,
    formatDuration,
    groupRoutesByYearOrStatus,
    migrateData
} = require('../docs/js/app.js');

// 2. Unit Tests

test('formatDistance', async (t) => {
    await t.test('converts meters to miles and formats to 2 decimal places', () => {
        assert.strictEqual(formatDistance(1609.344), '1.00 mi');
        assert.strictEqual(formatDistance(1000), '0.62 mi');
        assert.strictEqual(formatDistance(0), '0.00 mi');
    });

    await t.test('handles invalid, negative, or non-numeric inputs gracefully', () => {
        assert.strictEqual(formatDistance(-500), '0.00 mi');
        assert.strictEqual(formatDistance(NaN), '0.00 mi');
        assert.strictEqual(formatDistance(null), '0.00 mi');
        assert.strictEqual(formatDistance(undefined), '0.00 mi');
        assert.strictEqual(formatDistance('1609'), '0.00 mi');
    });
});

test('formatDuration', async (t) => {
    await t.test('converts seconds to readable minutes, hours, and days', () => {
        assert.strictEqual(formatDuration(0), '0m');
        assert.strictEqual(formatDuration(45), '0m');
        assert.strictEqual(formatDuration(60), '1m');
        assert.strictEqual(formatDuration(3540), '59m');
        assert.strictEqual(formatDuration(3600), '1h');
        assert.strictEqual(formatDuration(3660), '1h 1m');
        assert.strictEqual(formatDuration(86400), '1d');
        assert.strictEqual(formatDuration(90060), '1d 1h 1m');
    });

    await t.test('handles invalid, negative, or non-numeric inputs gracefully', () => {
        assert.strictEqual(formatDuration(-120), '0m');
        assert.strictEqual(formatDuration(NaN), '0m');
        assert.strictEqual(formatDuration(null), '0m');
        assert.strictEqual(formatDuration(undefined), '0m');
        assert.strictEqual(formatDuration('3600'), '0m');
    });
});

test('groupRoutesByYearOrStatus', async (t) => {
    const mockRoutes = [
        { name: 'Route A', timestamp: 1656676800000, status: 'completed' }, // July 1, 2022
        { name: 'Route B', timestamp: 1688212800000, status: 'planned' },   // July 1, 2023
        { name: 'Route C', timestamp: 1719835200000, status: 'completed' }, // July 1, 2024
        { name: 'Route D', status: 'planned' }, // no timestamp
        { name: 'Route E', year: 2024, timestamp: 1609459200000 } // explicit year 2024, timestamp is 2021
    ];

    await t.test('groups by year (descending keys, newest route first)', () => {
        const grouped = groupRoutesByYearOrStatus(mockRoutes, 'year');
        const keys = Object.keys(grouped);
        
        // Expected order of keys in object (JS engines sort numeric keys ascending)
        assert.deepEqual(keys, ['2022', '2023', '2024', 'Unknown']);
        
        // 2024 should contain Route C and Route E (Route C first because timestamp is newer)
        assert.strictEqual(grouped['2024'].length, 2);
        assert.strictEqual(grouped['2024'][0].name, 'Route C');
        assert.strictEqual(grouped['2024'][1].name, 'Route E');
        
        // 2023 should contain Route B
        assert.strictEqual(grouped['2023'].length, 1);
        assert.strictEqual(grouped['2023'][0].name, 'Route B');

        // Unknown should contain Route D
        assert.strictEqual(grouped['Unknown'].length, 1);
        assert.strictEqual(grouped['Unknown'][0].name, 'Route D');
    });

    await t.test('groups by status (alphabetical keys, newest route first)', () => {
        const grouped = groupRoutesByYearOrStatus(mockRoutes, 'status');
        const keys = Object.keys(grouped);
        
        // Expected keys: 'completed', 'planned' (alphabetical)
        assert.deepEqual(keys, ['completed', 'planned']);
        
        // completed: Route A and Route C (Route C first because newer)
        assert.strictEqual(grouped['completed'].length, 2);
        assert.strictEqual(grouped['completed'][0].name, 'Route C');
        assert.strictEqual(grouped['completed'][1].name, 'Route A');
        
        // planned: Route B, Route D, Route E (default status planned)
        // Order by timestamp: Route B (1688212800000) > Route E (1609459200000) > Route D (undefined/0)
        assert.strictEqual(grouped['planned'].length, 3);
        assert.strictEqual(grouped['planned'][0].name, 'Route B');
        assert.strictEqual(grouped['planned'][1].name, 'Route E');
        assert.strictEqual(grouped['planned'][2].name, 'Route D');
    });

    await t.test('handles empty or invalid inputs gracefully', () => {
        assert.deepEqual(groupRoutesByYearOrStatus(null), {});
        assert.deepEqual(groupRoutesByYearOrStatus(undefined), {});
        assert.deepEqual(groupRoutesByYearOrStatus({}), {});
    });
});

test('migrateData', async (t) => {
    await t.test('migrates legacy hometown object to hometowns array', () => {
        const oldSettings = {
            hometown: { name: 'Seattle', lat: 47.6, lng: -122.3 }
        };
        const oldVisitData = {};
        
        const { settings, visitData } = migrateData(oldSettings, oldVisitData);
        
        assert.strictEqual(settings.hometown, undefined);
        assert.deepEqual(settings.hometowns, [{ name: 'Seattle', lat: 47.6, lng: -122.3 }]);
        assert.ok(Array.isArray(settings.savedRoutes));
    });

    await t.test('does not duplicate hometown during migration if already migrated', () => {
        const oldSettings = {
            hometown: { name: 'Seattle', lat: 47.6, lng: -122.3 },
            hometowns: [{ name: 'Seattle', lat: 47.6, lng: -122.3 }]
        };
        const { settings } = migrateData(oldSettings, {});
        assert.strictEqual(settings.hometown, undefined);
        assert.strictEqual(settings.hometowns.length, 1);
    });

    await t.test('migrates legacy savedRoutes to include Phase 3 metadata fields', () => {
        const oldSettings = {
            savedRoutes: [
                { name: 'Spokane to Seattle', route: [[47.6, -117.4], [47.6, -122.3]] }
            ]
        };
        const { settings } = migrateData(oldSettings, {});
        assert.strictEqual(settings.savedRoutes.length, 1);
        const route = settings.savedRoutes[0];
        assert.strictEqual(route.name, 'Spokane to Seattle');
        assert.strictEqual(route.date, '');
        assert.deepEqual(route.members, []);
        assert.strictEqual(route.description, '');
        assert.strictEqual(route.distance, 0);
        assert.strictEqual(route.duration, 0);
        assert.strictEqual(route.status, 'completed');
    });

    await t.test('handles empty, null, or undefined inputs gracefully and returns defaults', () => {
        const { settings, visitData } = migrateData(null, null);
        
        assert.ok(settings);
        assert.ok(visitData);
        assert.deepEqual(settings.familyMembers, []);
        assert.deepEqual(settings.hometowns, []);
        assert.strictEqual(settings.routingEngine, 'osrm');
        assert.strictEqual(settings.routeReduction, '0.001');
        assert.deepEqual(settings.savedRoutes, []);
        assert.deepEqual(visitData.parks, {});
        assert.deepEqual(visitData.states, {});
        assert.deepEqual(visitData.meta, { parks: {}, states: {} });
    });
});
