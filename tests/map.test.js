const test = require('node:test');
const assert = require('node:assert');

// Mock state and dependencies
global.currentTab = 'world';
global.mapMode = 'parks';
global.searchTerm = '';
global.selectedRouteIndex = null;
global.settings = { hometowns: [], familyMembers: [] };
global.visitData = { parks: {}, states: {}, meta: {} };
global.parks = [];
global.states = [];
global.mapMarkers = [];
global.hometownMarkers = [];
global.roadPolylines = [];

// Mock map object that supports method chaining
const mapMock = {
    setView() { return this; },
    addTo() { return this; },
    removeLayer: () => {},
    fitBounds: () => {},
    invalidateSize: () => {}
};

// Mock Leaflet
global.L = {
    map: () => mapMock,
    tileLayer: () => ({
        addTo: () => {}
    }),
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

// Mock UI function
global.switchTab = (tab) => {
    global.currentTab = tab;
};

// Require map.js
const { setMapMode, updateMapMarkers } = require('../docs/js/map.js');

test('map.js mode and markers', async (testContext) => {
    await testContext.test('setMapMode tab transition', () => {
        global.currentTab = 'world';
        setMapMode('parks');
        assert.strictEqual(global.currentTab, 'parks');
    });

    await testContext.test('updateMapMarkers clears layers and plots correctly', () => {
        global.worldMap = L.map();
        global.mapMarkers = [{}];
        
        updateMapMarkers();
        
        // Assert markers array was reset and cleared
        assert.strictEqual(global.mapMarkers.length, 0);
    });
});
