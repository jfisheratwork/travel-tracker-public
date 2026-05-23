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

// Mock DOM
const elementMock = {
    value: '',
    innerText: '',
    innerHTML: '',
    style: {},
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
    appendChild: () => {}
};

global.document = {
    getElementById(id) {
        return elementMock;
    },
    querySelectorAll() {
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

// Mock state and global variables
global.mapMode = 'parks';
global.parks = [{ name: 'Yosemite', country: 'USA', sub: 'CA', lat: 37, lng: -119 }];
global.states = [];
global.palette = ['blue', 'pink'];

// Mock save
global.save = () => {};

// Require UI.js
const {
    toggleVisit,
    toggleAllRow,
    openRouteEditModal,
    saveRouteEditDetails,
    selectAllRouteMembers
} = require('../docs/js/ui.js');

// Override settings familyMembers after state.js has loaded
settings.familyMembers = ['Jake'];

test('ui.js visit toggling', async (testContext) => {
    await testContext.test('toggleVisit toggles single visit state', () => {
        global.visitData.parks['Yosemite_Jake'] = false;
        
        // Mock rendering functions called inside toggleVisit
        global.renderParksTable = () => {};
        global.renderVisitedList = () => {};

        toggleVisit('Yosemite', 'Jake', 'parks');
        
        assert.strictEqual(global.visitData.parks['Yosemite_Jake'], true);
    });

    await testContext.test('toggleAllRow sets bulk visits', () => {
        global.visitData.parks['Yosemite_Jake'] = false;
        
        global.renderParksTable = () => {};
        global.renderVisitedList = () => {};

        toggleAllRow('Yosemite', true, 'parks');
        
        assert.strictEqual(global.visitData.parks['Yosemite_Jake'], true);
    });
});

test('Route Edit Modal metadata and select all', async (testContext) => {
    // Set up mock DOM elements
    const mockElements = {
        'route-edit-distance': { innerText: '' },
        'route-edit-duration': { innerText: '' },
        'route-edit-name': { value: '' },
        'route-edit-start-date': { value: '' },
        'route-edit-end-date': { value: '' },
        'route-edit-status': { value: '' },
        'route-edit-description': { value: '' },
        'route-char-count': { innerText: '' },
        'route-edit-members': { innerHTML: '' },
        'route-edit-modal': { classList: { add: () => {}, remove: () => {}, replace: () => {} } }
    };

    const originalGetElementById = global.document.getElementById;
    global.document.getElementById = (idVal) => {
        return mockElements[idVal] || {
            value: '',
            innerText: '',
            innerHTML: '',
            style: {},
            classList: { add: () => {}, remove: () => {}, replace: () => {}, contains: () => false },
            appendChild: () => {}
        };
    };

    // Save settings and global variables
    const originalSavedRoutes = global.settings.savedRoutes;
    global.settings.savedRoutes = [
        {
            name: 'Road trip A',
            distance: 500,
            duration: 1000,
            startDate: '2026-05-01',
            endDate: '2026-05-10',
            status: 'planned',
            description: 'My description',
            members: ['Jake']
        }
    ];

    await testContext.test('openRouteEditModal populates the fields correctly', () => {
        openRouteEditModal(0);
        assert.strictEqual(mockElements['route-edit-name'].value, 'Road trip A');
        assert.strictEqual(mockElements['route-edit-start-date'].value, '2026-05-01');
        assert.strictEqual(mockElements['route-edit-end-date'].value, '2026-05-10');
        assert.strictEqual(mockElements['route-edit-status'].value, 'planned');
        assert.strictEqual(mockElements['route-edit-description'].value, 'My description');
    });

    await testContext.test('saveRouteEditDetails saves updated metadata', () => {
        // Prepare mock elements to return inputs
        mockElements['route-edit-name'].value = 'Road trip A (updated)';
        mockElements['route-edit-start-date'].value = '2026-05-02';
        mockElements['route-edit-end-date'].value = '2026-05-12';
        mockElements['route-edit-status'].value = 'completed';
        mockElements['route-edit-description'].value = 'My description (updated)';

        // Mock document.querySelectorAll to return checkboxes
        const checkboxItem = { checked: true, value: 'Alice' };
        const originalQuerySelectorAll = global.document.querySelectorAll;
        global.document.querySelectorAll = (selVal) => {
            if (selVal.includes('#route-edit-members')) {
                return [checkboxItem];
            }
            return [];
        };

        // Mock refresh/update functions
        global.renderSavedRoutes = () => {};
        global.updateMapMarkers = () => {};
        global.toggleRouteEditModal = () => {};

        saveRouteEditDetails();

        const updatedRoute = global.settings.savedRoutes[0];
        assert.strictEqual(updatedRoute.name, 'Road trip A (updated)');
        assert.strictEqual(updatedRoute.startDate, '2026-05-02');
        assert.strictEqual(updatedRoute.endDate, '2026-05-12');
        assert.strictEqual(updatedRoute.date, '2026-05-02');
        assert.strictEqual(updatedRoute.status, 'completed');
        assert.strictEqual(updatedRoute.description, 'My description (updated)');
        assert.deepEqual(updatedRoute.members, ['Alice']);

        global.document.querySelectorAll = originalQuerySelectorAll;
    });

    await testContext.test('selectAllRouteMembers checks all checkboxes', () => {
        const checkbox1 = { checked: false };
        const checkbox2 = { checked: false };
        
        const originalQuerySelectorAll = global.document.querySelectorAll;
        global.document.querySelectorAll = (selVal) => {
            if (selVal.includes('#route-edit-members')) {
                return [checkbox1, checkbox2];
            }
            return [];
        };

        selectAllRouteMembers();

        assert.strictEqual(checkbox1.checked, true);
        assert.strictEqual(checkbox2.checked, true);

        global.document.querySelectorAll = originalQuerySelectorAll;
    });

    // Restore globals
    global.document.getElementById = originalGetElementById;
    global.settings.savedRoutes = originalSavedRoutes;
});
