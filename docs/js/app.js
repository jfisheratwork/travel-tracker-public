
// --- APP STATE VARIABLES ---
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
let currentMemberFilter = 'all'; // New filter state
let editTarget = null; // Stores the currently editing location key
let routeEditTargetIndex = null; // Stores the currently editing route index
let selectedRouteIndex = null; // Stores the currently selected route index for map isolation

// Palette for dynamic family colors
const palette = ['blue', 'pink', 'orange', 'purple', 'teal', 'red', 'green', 'yellow', 'indigo', 'cyan'];

// Load Settings & Data from LocalStorage
// Reference: Window.localStorage - https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
// Settings defaults if no storage exists
let rawSettings = JSON.parse(localStorage.getItem('np_travel_settings')) || {
    showUSA: true, showCanada: true, showUSAParks: true, showCanadianParks: true,
    familyMembers: [], // Start empty
    hometowns: []
};

// visitData structure: { parks: {}, states: {}, meta: { parks: {}, states: {} } }
let rawVisitData = JSON.parse(localStorage.getItem('np_travel_tracker_v3'));

const migrated = migrateData(rawSettings, rawVisitData);
let settings = migrated.settings;
let visitData = migrated.visitData;

localStorage.setItem('np_travel_settings', JSON.stringify(settings));
localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData));

// --- HELPER FUNCTIONS ---

/**
 * Escapes characters in a string to prevent XSS in HTML contexts.
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Converts meters to miles.
 */
function formatDistance(meters) {
    if (typeof meters !== 'number' || isNaN(meters) || meters < 0) {
        return '0.00 mi';
    }
    const miles = meters * 0.000621371;
    return `${miles.toFixed(2)} mi`;
}

/**
 * Converts seconds to readable duration.
 */
function formatDuration(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '0m';
    }
    const days = Math.floor(seconds / (24 * 3600));
    let remaining = seconds % (24 * 3600);
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}m`);

    return parts.join(' ');
}

/**
 * Groups and sorts saved routes by year or status (planned vs completed).
 */
function groupRoutesByYearOrStatus(routes, groupBy = 'year') {
    if (!Array.isArray(routes)) return {};
    const groups = {};
    routes.forEach(route => {
        let key;
        if (groupBy === 'status') {
            key = route.status || 'planned';
        } else {
            if (route.year) {
                key = String(route.year);
            } else if (route.timestamp) {
                try {
                    key = String(new Date(route.timestamp).getFullYear());
                } catch (e) {
                    key = 'Unknown';
                }
            } else {
                key = 'Unknown';
            }
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(route);
    });

    const sortedGroups = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (groupBy === 'year') {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return b.localeCompare(a); // descending
        }
        return a.localeCompare(b); // alphabetical (completed, then planned)
    });

    sortedKeys.forEach(key => {
        sortedGroups[key] = groups[key].sort((a, b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeB - timeA; // newer first
        });
    });

    return sortedGroups;
}

/**
 * Migration helper function to clean and validate settings and visit data.
 */
function migrateData(settingsObj, visitDataObj) {
    const migratedSettings = settingsObj ? JSON.parse(JSON.stringify(settingsObj)) : {
        showUSA: true, showCanada: true, showUSAParks: true, showCanadianParks: true,
        familyMembers: [],
        hometowns: []
    };

    const migratedVisitData = visitDataObj ? JSON.parse(JSON.stringify(visitDataObj)) : {
        parks: {}, states: {}, meta: { parks: {}, states: {} }
    };

    if (!migratedVisitData.parks) migratedVisitData.parks = {};
    if (!migratedVisitData.states) migratedVisitData.states = {};
    if (!migratedVisitData.meta) {
        migratedVisitData.meta = { parks: {}, states: {} };
    } else {
        if (!migratedVisitData.meta.parks) migratedVisitData.meta.parks = {};
        if (!migratedVisitData.meta.states) migratedVisitData.meta.states = {};
    }

    if (!migratedSettings.familyMembers) {
        migratedSettings.familyMembers = [];
    }

    if (migratedSettings.hometown !== undefined) {
        if (migratedSettings.hometown) {
            if (!migratedSettings.hometowns) migratedSettings.hometowns = [];
            const alreadyExists = migratedSettings.hometowns.some(h => 
                h.lat === migratedSettings.hometown.lat && h.lng === migratedSettings.hometown.lng
            );
            if (!alreadyExists) {
                migratedSettings.hometowns.push(migratedSettings.hometown);
            }
        }
        delete migratedSettings.hometown;
    }

    if (!migratedSettings.hometowns) migratedSettings.hometowns = [];
    if (migratedSettings.routingEngine === undefined) migratedSettings.routingEngine = 'osrm';
    if (migratedSettings.mapboxKey === undefined) migratedSettings.mapboxKey = '';
    if (migratedSettings.routeReduction === undefined) migratedSettings.routeReduction = '0.001';
    
    if (!migratedSettings.savedRoutes) {
        migratedSettings.savedRoutes = [];
    } else {
        migratedSettings.savedRoutes = migratedSettings.savedRoutes.map(route => {
            return {
                name: route.name || '',
                route: route.route || [],
                engine: route.engine || 'osrm',
                timestamp: route.timestamp || Date.now(),
                date: route.date !== undefined ? route.date : '',
                members: Array.isArray(route.members) ? route.members : [],
                description: route.description !== undefined ? route.description : '',
                distance: typeof route.distance === 'number' ? route.distance : 0,
                duration: typeof route.duration === 'number' ? route.duration : 0,
                status: route.status || 'completed'
            };
        });
    }

    return { settings: migratedSettings, visitData: migratedVisitData };
}


function updateMemberFilter() {
    currentMemberFilter = document.getElementById('member-filter').value;
    switchTab(currentTab); // Re-render current view with new filter
}

function renderMemberFilterOptions() {
    const select = document.getElementById('member-filter');
    if (!select) return;

    // Save current selection to restore it if possible
    const current = select.value || 'all';

    let html = '<option value="all">All Members</option>';
    settings.familyMembers.forEach(m => {
        html += `<option value="${m}">${m}</option>`;
    });
    select.innerHTML = html;

    // Restore selection if it still exists, otherwise default to all
    if (settings.familyMembers.includes(current) || current === 'all') {
        select.value = current;
    } else {
        select.value = 'all';
        currentMemberFilter = 'all';
    }
}


/** * Returns a color from the palette based on index to ensure variety. 
 * Used for assigning consistent colors to family member progress bars.
 */
function getMemberColor(index) { return palette[index % palette.length]; }

/** * Filter list and map based on search input.
 * Triggered on input event from the search bar.
 */
function handleSearch(val) {
    searchTerm = val.toLowerCase();
    if (currentTab === 'world') updateMapMarkers();
    else if (currentTab !== 'stats') renderData();
}

/** * Shows visual warning if no family members are configured.
 * Toggles the visibility of the red warning banner.
 */
function checkFamilyStatus() {
    const prompt = document.getElementById('setup-prompt');
    const settingsBtn = document.getElementById('settings-btn');
    // Also remove old ID reference if it exists, or update if we kept it?
    // We replaced 'settings-warning' with 'setup-prompt' in HTML.

    if (settings.familyMembers.length === 0) {
        if (prompt) prompt.classList.remove('hidden');
        settingsBtn.classList.add('warning-active'); // Keep the pulsing effect on settings button
    } else {
        if (prompt) prompt.classList.add('hidden');
        settingsBtn.classList.remove('warning-active');
    }
}

/** Loads static sample data for quick setup. */
function loadSampleData() {
    const sampleMembers = ['John', 'Jane', 'Jim', 'Jess'];
    settings.familyMembers = [...sampleMembers];
    updateSetting('familyMembers', settings.familyMembers);

    // Seed some visits
    const sampleVisits = [
        { type: 'states', name: 'California' },
        { type: 'states', name: 'New York' },
        { type: 'parks', name: 'Yosemite' },
        { type: 'parks', name: 'Yellowstone' }
    ];

    sampleVisits.forEach(v => {
        settings.familyMembers.forEach((m, i) => {
            // Randomly assign visits for demo variety
            if (Math.random() > 0.3) {
                visitData[v.type][`${v.name}_${m}`] = true;
            }
        });
    });

    save();
    renderData();
    checkFamilyStatus(); // Will hide the modal
    location.reload(); // Reload to refresh all views cleanly
}


/** * Adds a new family member to the list and saves settings.
 * Triggered from the Settings modal.
 */
function addFamilyMember() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (name && !settings.familyMembers.includes(name)) {
        settings.familyMembers.push(name);
        input.value = '';
        updateSetting('familyMembers', settings.familyMembers);
    }
}

/** * Removes a family member by index.
 * Triggered from the Settings modal list.
 */
function removeFamilyMember(index) {
    settings.familyMembers.splice(index, 1);
    updateSetting('familyMembers', settings.familyMembers);
}

/**
 * Helper to generate a valid Wikipedia URL for parks and states.
 * Handles country-specific disambiguation and common Wikipedia naming patterns.
 */
function getWikiLink(item, type) {
    let query = item.name.replace(/ /g, '_');
    if (type === 'parks') {
        if (item.name === 'Glacier') {
            return item.country === 'USA'
                ? 'https://en.wikipedia.org/wiki/Glacier_National_Park_(U.S.)'
                : 'https://en.wikipedia.org/wiki/Glacier_National_Park_(Canada)';
        }
        return `https://en.wikipedia.org/wiki/${query}_National_Park`;
    } else {
        // States/Provinces
        if (item.sub === 'USA') {
            if (['Georgia', 'Washington', 'New York'].includes(item.name)) {
                return `https://en.wikipedia.org/wiki/${query}_(state)`;
            }
        }
        return `https://en.wikipedia.org/wiki/${query}`;
    }
}

// --- METADATA EDITING FUNCTIONS ---

/** Opens the Edit Metadata Modal for a specific location */
function openEditModal(name) {
    editTarget = name;
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-modal-title');
    const dateInput = document.getElementById('edit-date');
    const commentInput = document.getElementById('edit-comment');
    const charCount = document.getElementById('char-count');

    // Retrieve existing metadata or set defaults
    // Handle case where meta object might not exist for current tab yet
    if (!visitData.meta) visitData.meta = { parks: {}, states: {} };
    if (!visitData.meta[currentTab]) visitData.meta[currentTab] = {};

    const meta = visitData.meta[currentTab][name] || {};

    title.innerText = `Edit Details: ${name}`;
    // CHANGED: Removed default date fallback. Now defaults to empty string.
    dateInput.value = meta.date || '';
    commentInput.value = meta.comment || '';
    charCount.innerText = commentInput.value.length;

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
}

/** Closes the Edit Modal */
function toggleEditModal(show) {
    const modal = document.getElementById('edit-modal');
    if (show) {
        // Should use openEditModal for setup, this is just for raw toggle if needed
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

/** Updates the character counter in the text area */
function updateCharCount(textarea) {
    document.getElementById('char-count').innerText = textarea.value.length;
}

/** Saves the metadata to local storage */
function saveMetaData() {
    if (!editTarget) return;

    const date = document.getElementById('edit-date').value;
    const comment = document.getElementById('edit-comment').value;

    if (!visitData.meta[currentTab]) visitData.meta[currentTab] = {};

    visitData.meta[currentTab][editTarget] = {
        date: date,
        comment: comment
    };

    save(); // Persist to local storage
    toggleEditModal(false);
    renderData(); // Refresh table to update icon color
}

// --- HOMETOWN FUNCTIONS ---

/** * Fetches coordinates for a city name using OpenStreetMap Nominatim API.
 * Docs: https://nominatim.org/release-docs/develop/api/Search/
 * Updates the map marker and saves location to settings.
 */
async function searchHometown() {
    const input = document.getElementById('hometown-input');
    const query = input.value.trim();
    const btn = document.getElementById('hometown-btn');

    if (!query) return;

    btn.innerText = '...';
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            settings.hometowns.push({
                name: result.display_name.split(',')[0], // Use first part of name
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            });
            updateSetting('hometowns', settings.hometowns);
            input.value = '';
        } else {
            alert('Location not found. Please try a different name (e.g., "Seattle, WA")');
        }
    } catch (e) {
        console.error(e);
        alert('Error searching for location.');
    } finally {
        btn.innerText = 'Search';
    }
}

/** Removes a stored hometown. */
function removeHometown(index) {
    settings.hometowns.splice(index, 1);
    updateSetting('hometowns', settings.hometowns);
}

/** Renders the UI element showing the list of hometowns. */
function renderHometownUI() {
    const display = document.getElementById('hometown-display');
    display.innerHTML = '';
    
    if (settings.hometowns && settings.hometowns.length > 0) {
        display.classList.remove('hidden');
        settings.hometowns.forEach((home, index) => {
            const isLast = index === settings.hometowns.length - 1;
            const label = isLast ? 'Current' : 'Previous';
            const html = `
                <div class="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-stone-200">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold ${isLast ? 'text-green-700' : 'text-stone-400'}">${label}:</span> 
                        <span class="text-stone-700">${home.name}</span>
                    </div>
                    <button onclick="removeHometown(${index})" class="text-stone-400 hover:text-red-600 transition ml-2" title="Remove">✕</button>
                </div>
            `;
            display.innerHTML += html;
        });
    } else {
        display.classList.add('hidden');
    }
}

/** Renders the list of family members inside the Settings modal. */
function renderSettingsFamilyList() {
    const list = document.getElementById('settings-family-list');
    list.innerHTML = '';
    settings.familyMembers.forEach((member, i) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-2 rounded border border-stone-200";
        div.innerHTML = `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-${getMemberColor(i)}-500"></div><span class="text-sm font-medium text-stone-700">${member}</span></div><button onclick="removeFamilyMember(${i})" class="text-stone-400 hover:text-red-600 transition"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>`;
        list.appendChild(div);
    });
}

/** Attempt to fetch 'examples/' folder content to populate dropdown. */
async function populateExamplesDropdown() {
    const select = document.getElementById('example-select');
    select.innerHTML = '<option value="family1.json">family1.json</option>';
}

/** Loads a selected example JSON file. */
// New State for Load Confirmation
let selectedExampleFile = '';

function showLoadConfirmation() {
    const filename = document.getElementById('example-select').value;
    if (!filename || filename.includes('Scanning')) return;
    selectedExampleFile = filename;

    // Hide the main controls, Show confirmation
    const controls = document.getElementById('example-select').parentElement;
    controls.classList.add('hidden');
    document.getElementById('load-example-confirm').classList.remove('hidden');
}

function cancelLoad() {
    // Show main controls, Hide confirmation
    const controls = document.getElementById('example-select').parentElement;
    controls.classList.remove('hidden');
    document.getElementById('load-example-confirm').classList.add('hidden');
    selectedExampleFile = '';
}

function performLoad() {
    if (!selectedExampleFile) return;

    fetch(`examples/${selectedExampleFile}`)
        .then(r => r.json())
        .then(data => {
            if (data.settings && data.visitData) {
                localStorage.setItem('np_travel_settings', JSON.stringify(data.settings));
                localStorage.setItem('np_travel_tracker_v3', JSON.stringify(data.visitData));
                location.reload();
            } else {
                alert('Invalid example file format.');
                cancelLoad();
            }
        })
        .catch(() => {
            alert('Could not load example file.');
            cancelLoad();
        });
}

/**
 * Main navigation logic. Switches views, toggles visibility of containers,
 * updates headers, and triggers data rendering for the selected tab.
 * @param {string} tab - The ID of the tab to switch to ('parks', 'states', 'world', 'stats').
 */
function switchTab(tab) {
    let previousTab = currentTab;
    currentTab = tab;
    sortColumn = 1;
    sortDirection = 'asc';

    // Styling Tabs
    document.querySelectorAll('nav button').forEach(b => b.className = `px-6 py-3 text-lg transition-all text-stone-500 hover:text-green-700`);
    // SAFEGUARD: Ensure element exists before modifying class
    const activeTabBtn = document.getElementById(`tab-${tab}`);
    if (activeTabBtn) {
        activeTabBtn.className = `px-6 py-3 text-lg transition-all tab-active`;
    }

    const tableContainer = document.getElementById('table-container');
    const mapContainer = document.getElementById('world-map-container');
    const statsViewContainer = document.getElementById('stats-view-container');
    const controlsContainer = document.getElementById('controls-container');
    const regionFilterContainer = document.getElementById('region-filter-container');
    const filterSelect = document.getElementById('region-filter');

    // Hide all main containers first
    tableContainer.classList.add('hidden');
    mapContainer.classList.add('hidden');
    statsViewContainer.classList.add('hidden');
    controlsContainer.classList.remove('hidden');

    // Determine if dropdown filter is needed based on settings
    let options = [];
    let showDropdown = false;
    if (tab === 'parks') {
        if (settings.showUSAParks && settings.showCanadianParks) {
            options = [{ val: 'all', text: 'All Visible Locations' }, { val: 'USA', text: 'USA Parks' }, { val: 'Canada', text: 'Canada Parks' }];
            showDropdown = true;
        }
    } else if (tab === 'states') {
        if (settings.showUSA && settings.showCanada) {
            options = [{ val: 'all', text: 'All Visible Locations' }, { val: 'USA', text: 'USA States' }, { val: 'Canada', text: 'Canada Provinces' }];
            showDropdown = true;
        }
    }

    if (showDropdown) {
        filterSelect.innerHTML = options.map(o => `<option value="${o.val}">${o.text}</option>`).join('');
        regionFilterContainer.classList.remove('hidden');
    } else {
        regionFilterContainer.classList.add('hidden');
        filterSelect.value = 'all';
    }

    // Dynamically build table headers based on tab and family members
    const headerRow = document.getElementById('table-header-row');
    if (headerRow) { // Safety check
        const showAll = currentMemberFilter === 'all';
        const activeMembers = showAll ? settings.familyMembers : [currentMemberFilter];

        let headers = `<th class="p-4 border-b text-center w-12" title="Select/Deselect All">All</th>
                       <th id="col-name" onclick="sortTable(1)" class="p-4 border-b sortable">Name</th>`;

        if (tab === 'parks') {
            headers += `<th id="col-sub" onclick="sortTable(2)" class="p-4 border-b sortable">State/Prov</th>
                         <th id="col-country" onclick="sortTable(3)" class="p-4 border-b sortable">Country</th>`;
        } else {
            headers += `<th id="col-sub" onclick="sortTable(2)" class="p-4 border-b sortable">Country</th>`;
        }

        const offset = tab === 'parks' ? 4 : 3;
        activeMembers.forEach((m, i) => {
            headers += `<th onclick="sortTable(${offset + i})" class="p-4 border-b text-center sortable text-xs uppercase tracking-tighter">${m}</th>`;
        });

        if (showAll) {
            headers += `<th onclick="sortTable(${offset + activeMembers.length})" class="p-4 border-b text-center bg-stone-200/50 sortable">Family</th>`;
        }

        headerRow.innerHTML = headers;
        updateSortIndicators();
    }

    if (tab === 'world') {
        mapContainer.classList.remove('hidden');
        // Ensure default map mode is Parks unless explicitly set otherwise
        if (previousTab === 'states') setMapMode('states');
        else setMapMode('parks');
        initWorldMap();
    } else if (tab === 'stats') {
        statsViewContainer.classList.remove('hidden');
        controlsContainer.classList.add('hidden');
        if (previousTab === 'states') setStatsMode('states');
        else setStatsMode('parks');
        updateStats();
    } else {
        tableContainer.classList.remove('hidden');
        renderData();
    }
}

/** Shows/Hides the Info Modal. */
function toggleInfoModal(show) {
    const modal = document.getElementById('info-modal');
    if (show) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.remove('opacity-0'));
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

/** Shows/Hides the Settings Modal. */
function toggleSettingsModal(show) {
    const modal = document.getElementById('settings-modal');
    if (show) {
        renderSettingsFamilyList();
        renderHometownUI();
        document.getElementById('setting-usa').checked = settings.showUSA;
        document.getElementById('setting-canada').checked = settings.showCanada;
        document.getElementById('setting-usa-parks').checked = settings.showUSAParks;
        document.getElementById('setting-canada-parks').checked = settings.showCanadianParks;
        document.getElementById('setting-routing-engine').value = settings.routingEngine;
        document.getElementById('setting-mapbox-key').value = settings.mapboxKey;
        document.getElementById('setting-route-reduction').value = settings.routeReduction;
        toggleMapboxSettings();
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

/** Shows/Hides the Export/Import Modal. */
function toggleExportModal(show) {
    const modal = document.getElementById('export-modal');
    if (show) {
        populateExamplesDropdown();
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

/** * Updates a specific setting key in LocalStorage and refreshes the UI.
 *
 */
function updateSetting(key, value) {
    settings[key] = value;
    localStorage.setItem('np_travel_settings', JSON.stringify(settings));
    checkFamilyStatus();

    if (key === 'hometowns') {
        renderHometownUI();
        if (currentTab === 'world') updateMapMarkers();
    } else if (key === 'familyMembers') {
        renderSettingsFamilyList();
        renderMemberFilterOptions();
        switchTab(currentTab);
    } else {
        if (currentTab === 'world') updateMapMarkers();
        else if (currentTab === 'stats') updateStats();
        else switchTab(currentTab);
    }
}

// --- MAP LOGIC ---

/** Initializes the World Map Leaflet instance if not already created. */
function initWorldMap() {
    if (!worldMap) {
        worldMap = L.map('world-map').setView([48, -100], 3);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(worldMap);
    }
    setTimeout(() => { worldMap.invalidateSize(); updateMapMarkers(); }, 100);
}

/** Toggles map mode between 'parks' and 'states' via buttons. */
function setMapMode(mode) {
    mapMode = mode;
    const btnParks = document.getElementById('btn-map-parks');
    const btnStates = document.getElementById('btn-map-states');
    const btnRoads = document.getElementById('btn-map-roads');
    const builderUi = document.getElementById('route-builder-ui');
    
    btnParks.className = mode === 'parks' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    btnStates.className = mode === 'states' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    if (btnRoads) btnRoads.className = mode === 'roads' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    
    if (builderUi) {
        if (mode === 'roads') {
            builderUi.classList.remove('hidden');
            renderSavedRoutes();
        } else {
            builderUi.classList.add('hidden');
        }
    }
    updateMapMarkers();
}

/**
 * Clears and redraws markers on the map based on current data/filters.
 * Handles logic for styling markers (visited/not visited/selected).
 */
function updateMapMarkers() {
    if (!worldMap) return;
    mapMarkers.forEach(m => worldMap.removeLayer(m));
    hometownMarkers.forEach(m => worldMap.removeLayer(m));
    roadPolylines.forEach(l => worldMap.removeLayer(l));
    hometownMarkers = [];
    mapMarkers = [];
    roadPolylines = [];

    // Icon Factory
    const createIcon = (color, type, isSelected, hasVisits) => {
        let borderColor = 'white';
        if (isSelected) borderColor = '#2563eb'; // Blue for selected
        else if (hasVisits) borderColor = '#f97316'; // Orange if visited at all

        const border = `border: ${isSelected ? '3px' : '2px'} solid ${borderColor};`;
        const scale = isSelected ? 'transform: scale(1.15);' : 'transform: scale(1);';
        const shadow = isSelected ? 'box-shadow: 0 0 12px rgba(37, 99, 235, 0.6);' : 'box-shadow: 0 2px 4px rgba(0,0,0,0.3);';
        const zIdx = isSelected ? 'z-index: 1000;' : '';

        let content = '';
        if (type === 'parks') content = '🌲';
        else if (type === 'home') content = '🏠';
        else content = `<svg viewBox="0 0 24 24" fill="white" style="width:16px;height:16px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>`;

        return L.divIcon({
            html: `<div class="flex items-center justify-center transition-all duration-300" style="width:32px; height:32px; background-color:${color}; border-radius:50%; ${border} ${scale} ${shadow} ${zIdx} font-size:18px;">${content}</div>`,
            className: 'bg-transparent border-none',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -20]
        });
    };

    // Plot Hometowns
    if (settings.hometowns && settings.hometowns.length > 0) {
        settings.hometowns.forEach((home, index) => {
            const isLast = index === settings.hometowns.length - 1;
            const color = isLast ? '#3b82f6' : '#9ca3af';
            
            const homeIcon = createIcon(color, 'home', false, false);
            const homeIconSelected = createIcon(color, 'home', true, false);

            const marker = L.marker([home.lat, home.lng], { icon: homeIcon, zIndexOffset: isLast ? 500 : 400 }).addTo(worldMap);
            marker.bindPopup(`<strong class="text-sm font-sans">${home.name}</strong><br><span class="text-xs text-stone-500">${isLast ? 'Home Sweet Home' : 'Previous Home'}</span>`);

            marker.on('popupopen', () => { marker.setIcon(homeIconSelected); marker.setZIndexOffset(1000); });
            marker.on('popupclose', () => { marker.setIcon(homeIcon); marker.setZIndexOffset(isLast ? 500 : 400); });
            
            hometownMarkers.push(marker);
        });
    }

    if (mapMode === 'roads') {
        if (settings.savedRoutes) {
            settings.savedRoutes.forEach((routeData, idx) => {
                if (selectedRouteIndex !== null && selectedRouteIndex !== idx) {
                    return;
                }
                const line = L.polyline(routeData.route, {
                    color: palette[idx % palette.length], 
                    weight: 5,
                    opacity: 0.8,
                    smoothFactor: 1,
                    className: 'cursor-pointer'
                }).addTo(worldMap);
                line.bindPopup(`<strong>${routeData.name}</strong><br><span class="text-xs text-stone-500">${routeData.engine} engine</span>`);
                line.on('click', () => {
                    openRouteEditModal(idx);
                });
                roadPolylines.push(line);
            });
        }
        return;
    }

    let dataset = mapMode === 'parks' ? [...parks] : [...states];
    const dataStore = mapMode === 'parks' ? visitData.parks : visitData.states;
    // CHANGED: Access metadata store based on current map mode
    const metaStore = (visitData.meta && visitData.meta[mapMode]) ? visitData.meta[mapMode] : {};

    // Search Filtering
    if (searchTerm) {
        dataset = dataset.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    // Apply Visibility Settings
    if (mapMode === 'states') {
        dataset = dataset.filter(item => {
            if (item.sub === 'USA') return settings.showUSA;
            if (item.sub === 'Canada') return settings.showCanada;
            return true;
        });
    }
    if (mapMode === 'parks') {
        dataset = dataset.filter(item => {
            if (item.country === 'USA') return settings.showUSAParks;
            if (item.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    dataset.forEach(item => {
        let visitedCount = settings.familyMembers.filter(m => dataStore[`${item.name}_${m}`]).length;
        let color = (settings.familyMembers.length > 0 && visitedCount === settings.familyMembers.length) ? "#16a34a" : (visitedCount > 0 ? "#eab308" : "#9ca3af");

        const hasVisits = visitedCount > 0;
        const normalIcon = createIcon(color, mapMode, false, hasVisits);
        const selectedIcon = createIcon(color, mapMode, true, hasVisits);

        const marker = L.marker([item.lat, item.lng], { icon: normalIcon }).addTo(worldMap);
        const subtitle = mapMode === 'parks' ? 'National Park' : `Capital: ${item.capital}`;
        const wikiUrl = getWikiLink(item, mapMode);

        // CHANGED: Build Meta HTML (Date and Comments)
        const itemMeta = metaStore[item.name];
        let metaHtml = '';
        if (itemMeta) {
            if (itemMeta.date) {
                metaHtml += `<div class="mt-2 pt-2 border-t border-stone-100 flex items-center gap-1 text-stone-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span class="text-xs font-semibold">${itemMeta.date}</span>
                </div>`;
            }
            if (itemMeta.comment) {
                metaHtml += `<div class="mt-1 text-xs text-stone-500 italic border-l-2 border-stone-200 pl-2 ml-0.5">"${itemMeta.comment}"</div>`;
            }
        }

        const popupContent = `
            <div class="font-sans min-w-[160px] p-1">
                <strong class="text-sm block text-stone-800">${item.name}</strong>
                <span class="text-xs text-stone-500 block border-b pb-1 mb-1">${subtitle}</span>
                
                <div class="space-y-0.5 text-xs">
                    ${settings.familyMembers.map(m => `<div class="flex justify-between items-center"><span class="text-stone-600">${m}</span><span class="${dataStore[`${item.name}_${m}`] ? 'text-green-600 font-bold' : 'text-stone-300'}">${dataStore[`${item.name}_${m}`] ? 'Visited' : 'No'}</span></div>`).join('')}
                </div>

                ${metaHtml}

                <div class="mt-2 pt-2 border-t border-stone-100">
                    <a href="${wikiUrl}" target="_blank" class="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
                        Wikipedia Article
                    </a>
                </div>
            </div>`;
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => { marker.setIcon(selectedIcon); marker.setZIndexOffset(1000); });
        marker.on('popupclose', () => { marker.setIcon(normalIcon); marker.setZIndexOffset(0); });

        mapMarkers.push(marker);
    });
}

// --- RESET LOGIC ---
function confirmReset() {
    document.getElementById('reset-initial-prompt').classList.add('hidden');
    document.getElementById('reset-confirm').classList.remove('hidden');
}

function cancelReset() {
    document.getElementById('reset-initial-prompt').classList.remove('hidden');
    document.getElementById('reset-confirm').classList.add('hidden');
}

function performReset() {
    localStorage.removeItem('np_travel_settings');
    localStorage.removeItem('np_travel_tracker_v3');
    location.reload();
}

// --- STATS LOGIC ---
function setStatsMode(mode) {
    statsMode = mode;
    const btnParks = document.getElementById('btn-stats-parks');
    const btnStates = document.getElementById('btn-stats-states');
    btnParks.className = mode === 'parks' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    btnStates.className = mode === 'states' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    updateStats();
}

function updateStats() {
    let target = currentTab === 'stats' ? statsMode : currentTab;
    if (target !== 'parks' && target !== 'states') target = 'parks';
    let dataset = target === 'parks' ? [...parks] : [...states];
    const dataStore = visitData[target];

    if (target === 'states') dataset = dataset.filter(i => (i.sub === 'USA' && settings.showUSA) || (i.sub === 'Canada' && settings.showCanada));
    if (target === 'parks') {
        dataset = dataset.filter(i => {
            if (i.country === 'USA') return settings.showUSAParks;
            if (i.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    const unique = new Set();
    Object.keys(dataStore).forEach(k => { const name = k.split('_')[0]; if (dataStore[k] && dataset.find(i => i.name === name)) unique.add(name); });

    document.getElementById('stats-label').innerText = target === 'parks' ? 'Parks Visited' : 'Total Visited';
    document.getElementById('total-visited').innerText = `${unique.size} / ${dataset.length}`;
    document.getElementById('total-remaining').innerText = dataset.length - unique.size;
    document.getElementById('progress-bar').style.width = `${dataset.length ? (unique.size / dataset.length) * 100 : 0}%`;
    document.getElementById('group-percent').innerText = `${Math.round(dataset.length ? (unique.size / dataset.length) * 100 : 0)}%`;

    const showSplit = (target === 'states' && settings.showUSA && settings.showCanada) ||
        (target === 'parks' && settings.showUSAParks && settings.showCanadianParks);

    if (showSplit) {
        const usTotal = dataset.filter(i => (i.sub === 'USA' || i.country === 'USA')).length;
        const caTotal = dataset.filter(i => (i.sub === 'Canada' || i.country === 'Canada')).length;
        let usV = dataset.filter(i => (i.sub === 'USA' || i.country === 'USA') && settings.familyMembers.some(m => dataStore[`${i.name}_${m}`])).length;
        let caV = dataset.filter(i => (i.sub === 'Canada' || i.country === 'Canada') && settings.familyMembers.some(m => dataStore[`${i.name}_${m}`])).length;
        document.getElementById('regional-stats').classList.remove('hidden');
        document.getElementById('us-stat-label').innerText = target === 'parks' ? 'US Parks' : 'US States';
        document.getElementById('us-stat-count').innerText = `${usV}/${usTotal}`;
        document.getElementById('us-stat-bar').style.width = `${usTotal ? (usV / usTotal) * 100 : 0}%`;
        document.getElementById('ca-stat-label').innerText = target === 'parks' ? 'CA Parks' : 'CA Provinces';
        document.getElementById('ca-stat-count').innerText = `${caV}/${caTotal}`;
        document.getElementById('ca-stat-bar').style.width = `${caTotal ? (caV / caTotal) * 100 : 0}%`;
    } else {
        document.getElementById('regional-stats').classList.add('hidden');
    }

    const grid = document.getElementById('family-progress-grid'); grid.innerHTML = '';
    settings.familyMembers.forEach((m, i) => {
        let mTotal = 0, mUs = 0, mCa = 0;
        dataset.forEach(item => { if (dataStore[`${item.name}_${m}`]) { mTotal++; if (item.sub === 'USA' || item.country === 'USA') mUs++; else mCa++; } });
        const totalCap = dataset.length;
        let html = `<div class="bg-stone-50/50 p-2 rounded-lg border border-stone-100"><div class="flex justify-between text-xs font-bold"><span>${m}</span><span class="text-stone-500">${mTotal}/${totalCap}</span></div>`;
        if (showSplit) {
            const usCap = dataset.filter(i => (i.sub === 'USA' || i.country === 'USA')).length;
            const caCap = dataset.filter(i => (i.sub === 'Canada' || i.country === 'Canada')).length;
            html += `<div class="space-y-1.5 mt-2">`;
            if ((target === 'states' && settings.showUSA) || (target === 'parks' && settings.showUSAParks)) html += `<div class="flex flex-col gap-0.5"><div class="flex justify-between text-[8px] uppercase font-bold text-stone-400"><span>USA</span><span>${mUs}/${usCap}</span></div><div class="w-full bg-stone-200 h-1 rounded-full"><div class="bg-blue-500 h-full" style="width:${usCap ? (mUs / usCap) * 100 : 0}%"></div></div></div>`;
            if ((target === 'states' && settings.showCanada) || (target === 'parks' && settings.showCanadianParks)) html += `<div class="flex flex-col gap-0.5"><div class="flex justify-between text-[8px] uppercase font-bold text-stone-400"><span>CAN</span><span>${mCa}/${caCap}</span></div><div class="w-full bg-stone-200 h-1 rounded-full"><div class="bg-red-500 h-full" style="width:${caCap ? (mCa / caCap) * 100 : 0}%"></div></div></div>`;
            html += `</div>`;
        } else {
            html += `<div class="w-full bg-stone-200 rounded-full h-2 mt-1"><div class="bg-${getMemberColor(i)}-500 h-full" style="width:${totalCap ? (mTotal / totalCap) * 100 : 0}%"></div></div>`;
        }
        grid.innerHTML += html + `</div>`;
    });
}

// --- TABLE LOGIC ---
function sortTable(n) {
    if (sortColumn === n) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = n; sortDirection = 'asc'; }
    updateSortIndicators(); renderData();
}



function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    const active = document.querySelector(`th[onclick="sortTable(${sortColumn})"]`);
    if (active) active.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

function renderData() {
    if (currentTab === 'world' || currentTab === 'stats') return;
    const list = document.getElementById('data-list');
    let dataset = [...(currentTab === 'parks' ? parks : states)];
    const dataStore = visitData[currentTab];
    const metaStore = visitData.meta[currentTab] || {};

    // Search Filter
    if (searchTerm) {
        dataset = dataset.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    // Apply Settings Filters
    if (currentTab === 'states') dataset = dataset.filter(i => (i.sub === 'USA' && settings.showUSA) || (i.sub === 'Canada' && settings.showCanada));
    if (currentTab === 'parks') {
        dataset = dataset.filter(i => {
            if (i.country === 'USA') return settings.showUSAParks;
            if (i.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    // Apply Dropdown Filter
    const f = document.getElementById('region-filter').value;
    if (currentTab === 'parks') {
        if (f === 'USA') dataset = dataset.filter(i => i.country === 'USA');
        if (f === 'Canada') dataset = dataset.filter(i => i.country === 'Canada');
    } else if (currentTab === 'states') {
        if (f === 'USA') dataset = dataset.filter(i => i.sub === 'USA');
        if (f === 'Canada') dataset = dataset.filter(i => i.sub === 'Canada');
    }

    // Member Filter Logic
    const showAll = currentMemberFilter === 'all';
    const activeMembers = showAll ? settings.familyMembers : [currentMemberFilter];

    dataset.sort((a, b) => {
        let vA, vB;
        const offset = currentTab === 'parks' ? 4 : 3;
        if (sortColumn === 1) { vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); }
        else if (sortColumn === 2) { vA = a.sub.toLowerCase(); vB = b.sub.toLowerCase(); }
        else if (currentTab === 'parks' && sortColumn === 3) { vA = a.country.toLowerCase(); vB = b.country.toLowerCase(); }
        else if (sortColumn >= offset && sortColumn < offset + activeMembers.length) { let m = activeMembers[sortColumn - offset]; vA = dataStore[`${a.name}_${m}`] ? 1 : 0; vB = dataStore[`${b.name}_${m}`] ? 1 : 0; }
        else if (showAll && sortColumn === offset + activeMembers.length) { vA = settings.familyMembers.filter(m => dataStore[`${a.name}_${m}`]).length; vB = settings.familyMembers.filter(m => dataStore[`${b.name}_${m}`]).length; }
        return sortDirection === 'asc' ? (vA < vB ? -1 : 1) : (vA > vB ? -1 : 1);
    });

    list.innerHTML = '';

    dataset.forEach(i => {
        let vCount = settings.familyMembers.filter(m => dataStore[`${i.name}_${m}`]).length;
        let tr = document.createElement('tr');
        tr.className = "hover:bg-stone-50 border-b border-stone-100 " + (vCount > 0 ? "checked-row" : "");

        // Check if metadata exists for this location to style the wrench
        const hasMeta = metaStore[i.name] && (metaStore[i.name].comment || metaStore[i.name].date);
        const wrenchColor = hasMeta ? "text-blue-500 hover:text-blue-700" : "text-stone-300 hover:text-stone-500";

        let cells = `<td class="p-4 text-center border-r border-stone-100"><input type="checkbox" class="all-checkbox w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition" onchange="toggleAllRow('${i.name}', this.checked)" ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'checked' : ''}></td>
        <td class="p-4 font-medium flex items-center justify-between group">
            <a href="${getWikiLink(i, currentTab)}" target="_blank" title="View Wikipedia Article" class="flex items-center gap-2 hover:text-green-700 transition-colors">
                ${i.name}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </a>
            <button onclick="openEditModal('${i.name}')" class="${wrenchColor} transition-colors p-1 rounded hover:bg-stone-100" title="Edit Details">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </button>
        </td>
        <td class="p-4 text-sm text-stone-500">${i.sub}</td>`;

        if (currentTab === 'parks') cells += `<td class="p-4 text-sm text-stone-500">${i.country}</td>`;

        // Render only active members
        activeMembers.forEach(m => cells += `<td class="p-4 text-center"><input type="checkbox" class="park-checkbox w-5 h-5 cursor-pointer" onchange="toggleVisit('${i.name}', '${m}')" ${dataStore[`${i.name}_${m}`] ? 'checked' : ''}></td>`);

        // Show summary only if showing all
        if (showAll) {
            cells += `<td class="p-4 text-center bg-stone-100/50 font-bold ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'text-green-600' : 'text-stone-400'}">${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? '✓' : vCount + '/' + settings.familyMembers.length}</td>`;
        }

        tr.innerHTML = cells; list.appendChild(tr);
    });
    updateStats();
}

/** Toggles a single visit record. */
function toggleVisit(n, m) { visitData[currentTab][`${n}_${m}`] = !visitData[currentTab][`${n}_${m}`]; save(); renderData(); }

/** Toggles visit status for all family members for a location. */
function toggleAllRow(n, val) { settings.familyMembers.forEach(m => visitData[currentTab][`${n}_${m}`] = val); save(); renderData(); }

/** Persists visit data to LocalStorage. */
function save() { localStorage.setItem('np_travel_tracker_v3', JSON.stringify(visitData)); }

// --- EXPORT/IMPORT/BACKUP ---

/** Saves Full Backup as JSON. */
function saveBackupJSON() {
    const backup = { settings: settings, visitData: visitData, meta: { version: 'v3', date: new Date().toISOString() } };
    const url = window.URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `Travel_Tracker_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
}

// New State for Restore Confirmation
let pendingRestoreData = null;

/** Handles restoring from a JSON backup file. */
function handleBackupImport(e) {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.settings && data.visitData) {
                pendingRestoreData = data;
                document.getElementById('restore-dropzone').classList.add('hidden');
                document.getElementById('restore-confirm').classList.remove('hidden');
            } else alert('Invalid backup file.');
        } catch (err) { alert('Error parsing JSON.'); }
        e.target.value = '';
    };
    reader.readAsText(f);
}

function cancelRestore() {
    pendingRestoreData = null;
    document.getElementById('restore-dropzone').classList.remove('hidden');
    document.getElementById('restore-confirm').classList.add('hidden');
}

function performRestore() {
    if (!pendingRestoreData) return;
    localStorage.setItem('np_travel_settings', JSON.stringify(pendingRestoreData.settings));
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(pendingRestoreData.visitData));
    location.reload();
}

/** Prepares data for CSV/Excel export. */
function getExportData(targetTab) {
    let ds = targetTab === 'parks' ? [...parks] : [...states];
    const store = visitData[targetTab];
    if (targetTab === 'states') ds = ds.filter(i => (i.sub === 'USA' && settings.showUSA) || (i.sub === 'Canada' && settings.showCanada));
    if (targetTab === 'parks') ds = ds.filter(i => (i.country === 'USA' && settings.showUSAParks) || (i.country === 'Canada' && settings.showCanadianParks));
    return ds.map(i => { const r = { [targetTab === 'parks' ? 'Park' : 'State']: i.name, Region: i.sub }; if (targetTab === 'parks') r.Country = i.country; settings.familyMembers.forEach(m => r[m] = store[`${i.name}_${m}`] ? 'Visited' : ''); return r; });
}

/** Saves data as a CSV file. */
function saveToCSV(targetTab) {
    const d = getExportData(targetTab); if (!d.length) return;
    const k = Object.keys(d[0]); let csv = k.join(',') + '\n'; d.forEach(r => csv += k.map(x => `"${r[x]}"`).join(',') + '\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `Travel_Tracker_${targetTab}.csv`; a.click();
}

/** Saves data as an Excel file using SheetJS. */
function saveToExcel(targetTab) {
    const d = getExportData(targetTab); if (!d.length) return;
    const ws = XLSX.utils.json_to_sheet(d); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, targetTab); XLSX.writeFile(wb, `Family_Travel_${targetTab}.xlsx`);
}

/** Handles CSV file import (Legacy Support). */
function handleImport(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader(); reader.onload = function (ev) {
        const lines = ev.target.result.split('\n').filter(l => l.trim() !== '');
        const target = lines[0].includes('Park') ? 'parks' : 'states';
        visitData[target] = {};
        for (let i = 1; i < lines.length; i++) {
            const v = lines[i].split(',').map(s => s.replace(/"/g, ''));
            const offset = target === 'parks' ? 3 : 2;
            settings.familyMembers.forEach((m, idx) => { if (v[idx + offset] === 'Visited') visitData[target][`${v[0]}_${m}`] = true; });
        }
        save(); switchTab(target); e.target.value = ''; toggleExportModal(false);
    }; reader.readAsText(f);
}

// --- ROUTING / GPX LOGIC ---

let lastOSRMCall = 0;

function toggleMapboxSettings() {
    const engine = document.getElementById('setting-routing-engine').value;
    const container = document.getElementById('mapbox-settings-container');
    if (container) {
        if (engine === 'mapbox') container.classList.remove('hidden');
        else container.classList.add('hidden');
    }
}

async function getGeocode(query) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    const data = await response.json();
    if (!data || data.length === 0) throw new Error(`Could not find location: ${query}`);
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
}

async function fetchOSRM(start, end) {
    const now = Date.now();
    if (now - lastOSRMCall < 30000) {
        throw new Error("OSRM Public Server limited to 1 request every 30 seconds. Please wait.");
    }
    lastOSRMCall = now;
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("OSRM routing failed.");
    const route = data.routes[0];
    return {
        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]), // Swap lng,lat to lat,lng
        distance: route.distance,
        duration: route.duration
    };
}

async function fetchMapbox(start, end) {
    if (!settings.mapboxKey) throw new Error("Mapbox API Key is required.");
    const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${settings.mapboxKey}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("Mapbox routing failed.");
    const route = data.routes[0];
    return {
        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
        distance: route.distance,
        duration: route.duration
    };
}

async function requestRoute() {
    const startStr = document.getElementById('route-start').value.trim();
    const endStr = document.getElementById('route-end').value.trim();
    const status = document.getElementById('route-status');
    status.className = "text-xs text-stone-500 mt-2 font-medium empty:hidden";
    status.innerText = "Geocoding endpoints...";
    
    if (!startStr || !endStr) {
        status.className = "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 font-medium empty:hidden shadow-sm";
        status.innerText = "Please provide both start and end locations.";
        return;
    }

    try {
        const start = await getGeocode(startStr);
        const end = await getGeocode(endStr);
        status.innerText = `Routing ${start.name} to ${end.name}...`;

        let routeResult = null;
        if (settings.routingEngine === 'osrm') routeResult = await fetchOSRM(start, end);
        else routeResult = await fetchMapbox(start, end);

        const rawCoords = routeResult.coordinates;
        const distance = routeResult.distance;
        const duration = routeResult.duration;

        // Apply Reduction
        let reducedCoords = rawCoords;
        const tolerance = parseFloat(settings.routeReduction);
        if (tolerance > 0 && worldMap) {
            status.innerText = `Simplifying geometry...`;
            const points = rawCoords.map(c => worldMap.project(L.latLng(c[0], c[1]), worldMap.getZoom()));
            const simplified = L.LineUtil.simplify(points, Math.floor(worldMap.getZoom() * tolerance * 50)); 
            // the pixel tolerance is based on zoom level usually, mapping coords is tricky, so let's simplify naive
            // wait L.LineUtil.simplify uses screen pixels, using lat/lng points directly works loosely but scaling is weird.
            // Since we do it on raw lat/lng arrays:
            const rawPoints = rawCoords.map(c => ({x: c[0], y: c[1]}));
            const simpleRaw = L.LineUtil.simplify(rawPoints, tolerance);
            reducedCoords = simpleRaw.map(p => [p.x, p.y]);
        }

        settings.savedRoutes.push({
            name: `${start.name} to ${end.name}`,
            route: reducedCoords,
            engine: settings.routingEngine,
            timestamp: Date.now(),
            date: '',
            members: [],
            description: '',
            distance: distance,
            duration: duration,
            status: 'completed'
        });
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
        
        status.innerText = `Success! Saved route with ${reducedCoords.length} points (down from ${rawCoords.length}).`;
        document.getElementById('route-start').value = ''; document.getElementById('route-end').value = '';
        renderSavedRoutes();
        updateMapMarkers();

        if (worldMap && reducedCoords.length > 0) {
            const tempLine = L.polyline(reducedCoords);
            worldMap.fitBounds(tempLine.getBounds());
        }
    } catch (e) {
        status.className = "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 font-medium empty:hidden shadow-sm";
        status.innerText = `Error: ${e.message}`;
    }
}

function renderSavedRoutes() {
    const list = document.getElementById('saved-routes-list');
    if (!list) return;
    if (!settings.savedRoutes || settings.savedRoutes.length === 0) {
        list.innerHTML = `<div class="p-4 bg-white border border-stone-200 rounded-lg text-center text-stone-400">No saved road trips yet.</div>`;
        return;
    }

    const planned = [];
    const completedByYear = {}; 
    const completedUndated = [];

    settings.savedRoutes.forEach((r, idx) => {
        const routeWithIdx = { ...r, originalIndex: idx };
        if (r.status === 'planned') {
            planned.push(routeWithIdx);
        } else {
            if (r.date && r.date.trim() !== '') {
                const year = new Date(r.date).getFullYear();
                if (!completedByYear[year]) {
                    completedByYear[year] = [];
                }
                completedByYear[year].push(routeWithIdx);
            } else {
                completedUndated.push(routeWithIdx);
            }
        }
    });

    planned.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    completedUndated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const sortedYears = Object.keys(completedByYear).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        completedByYear[year].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    });

    let html = '';

    const renderRouteItem = (r) => {
        const distStr = formatDistance(r.distance);
        const durStr = formatDuration(r.duration);
        const membersBadges = r.members && r.members.length > 0 
            ? r.members.map(m => `<span class="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded-full text-[10px] text-stone-600 font-medium">${escapeHTML(m)}</span>`).join(' ')
            : '<span class="text-[10px] text-stone-400 italic">No members added</span>';

        const badgeClass = r.status === 'planned' 
            ? 'bg-blue-100 text-blue-700 border-blue-200' 
            : 'bg-green-100 text-green-700 border-green-200';

        const isSelected = selectedRouteIndex === r.originalIndex;
        const bgClass = isSelected ? 'bg-blue-50/30 border-2 border-blue-500' : 'bg-white border border-stone-200 hover:bg-stone-50';
        const shadowClass = isSelected ? 'shadow-md' : 'shadow-sm';

        return `<div class="p-3 ${bgClass} rounded-lg flex justify-between items-start cursor-pointer transition ${shadowClass}" onclick="focusRoute(${r.originalIndex})">
            <div class="space-y-1.5 flex-1 min-w-0 pr-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-stone-800 text-sm font-semibold truncate max-w-[180px]">${escapeHTML(r.name)}</strong>
                    <span class="px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${escapeHTML(r.status)}</span>
                </div>
                <div class="text-xs text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>${distStr}</span>
                    <span class="text-stone-300">•</span>
                    <span>${durStr}</span>
                    <span class="text-stone-300">•</span>
                    <span class="uppercase font-semibold text-[10px]">${escapeHTML(r.engine)}</span>
                    ${r.date ? `<span class="text-stone-300">•</span><span class="text-stone-500 font-medium">${escapeHTML(r.date)}</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-1 items-center pt-0.5">
                    ${membersBadges}
                </div>
                ${r.description ? `<p class="text-xs text-stone-400 italic mt-1 line-clamp-2">${escapeHTML(r.description)}</p>` : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button onclick="event.stopPropagation(); openRouteEditModal(${r.originalIndex})" class="text-stone-400 hover:text-stone-600 p-1 rounded hover:bg-stone-100 transition" title="Edit trip details">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button onclick="event.stopPropagation(); deleteSavedRoute(${r.originalIndex})" class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-stone-100 transition" title="Delete route">✕</button>
            </div>
        </div>`;
    };

    if (planned.length > 0) {
        html += `<div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 mt-1">Planned Trips (${planned.length})</h4>
            <div class="flex flex-col gap-2">${planned.map(renderRouteItem).join('')}</div>
        </div>`;
    }

    sortedYears.forEach(year => {
        const routes = completedByYear[year];
        html += `<div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-green-700 mb-2 mt-1">Completed Trips - ${year} (${routes.length})</h4>
            <div class="flex flex-col gap-2">${routes.map(renderRouteItem).join('')}</div>
        </div>`;
    });

    if (completedUndated.length > 0) {
        html += `<div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 mt-1">Completed Trips - Undated (${completedUndated.length})</h4>
            <div class="flex flex-col gap-2">${completedUndated.map(renderRouteItem).join('')}</div>
        </div>`;
    }

    list.innerHTML = html;
}

function deleteSavedRoute(idx) {
    if (confirm("Delete this road trip?")) {
        settings.savedRoutes.splice(idx, 1);
        selectedRouteIndex = null;
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
        renderSavedRoutes();
        updateMapMarkers();
    }
}

function focusRoute(idx) {
    if (selectedRouteIndex === idx) {
        selectedRouteIndex = null;
    } else {
        selectedRouteIndex = idx;
    }
    renderSavedRoutes();
    updateMapMarkers();

    if (selectedRouteIndex !== null) {
        const routeData = settings.savedRoutes[selectedRouteIndex];
        if (routeData && worldMap && routeData.route && routeData.route.length > 0) {
            const polyline = L.polyline(routeData.route);
            worldMap.fitBounds(polyline.getBounds());
        }
    } else {
        if (worldMap && settings.savedRoutes && settings.savedRoutes.length > 0) {
            const allCoords = settings.savedRoutes.flatMap(r => r.route);
            if (allCoords.length > 0) {
                const polyline = L.polyline(allCoords);
                worldMap.fitBounds(polyline.getBounds());
            }
        }
    }
}

function toggleRouteEditModal(show) {
    const modal = document.getElementById('route-edit-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            routeEditTargetIndex = null;
        }, 200);
    }
}

function openRouteEditModal(idx) {
    routeEditTargetIndex = idx;
    const r = settings.savedRoutes[idx];
    if (!r) return;

    document.getElementById('route-edit-distance').innerText = formatDistance(r.distance);
    document.getElementById('route-edit-duration').innerText = formatDuration(r.duration);
    document.getElementById('route-edit-name').value = r.name || '';
    document.getElementById('route-edit-date').value = r.date || '';
    document.getElementById('route-edit-status').value = r.status || 'completed';
    document.getElementById('route-edit-description').value = r.description || '';
    document.getElementById('route-char-count').innerText = (r.description || '').length;

    const container = document.getElementById('route-edit-members');
    if (container) {
        let html = '';
        settings.familyMembers.forEach((member) => {
            const checked = (r.members && r.members.includes(member)) ? 'checked' : '';
            const escapedMember = escapeHTML(member);
            html += `<label class="flex items-center gap-2 p-1.5 rounded hover:bg-stone-100 cursor-pointer text-sm text-stone-700">
                <input type="checkbox" value="${escapedMember}" ${checked} class="w-4 h-4 rounded accent-green-700">
                <span class="truncate">${escapedMember}</span>
            </label>`;
        });
        if (settings.familyMembers.length === 0) {
            html = `<div class="col-span-2 text-stone-400 italic text-xs p-2 text-center">No family members configured.</div>`;
        }
        container.innerHTML = html;
    }

    toggleRouteEditModal(true);
}

function saveRouteEditDetails() {
    if (routeEditTargetIndex === null) return;
    const r = settings.savedRoutes[routeEditTargetIndex];
    if (!r) return;

    const name = document.getElementById('route-edit-name').value.trim();
    if (!name) {
        alert("Route name is required.");
        return;
    }

    const date = document.getElementById('route-edit-date').value;
    const status = document.getElementById('route-edit-status').value;
    const description = document.getElementById('route-edit-description').value.trim();

    const members = [];
    const checkboxes = document.querySelectorAll('#route-edit-members input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.checked) {
            members.push(cb.value);
        }
    });

    r.name = name;
    r.date = date;
    r.status = status;
    r.description = description;
    r.members = members;

    localStorage.setItem('np_travel_settings', JSON.stringify(settings));
    toggleRouteEditModal(false);
    renderSavedRoutes();
    updateMapMarkers();
}

function deleteRouteFromEditModal() {
    if (routeEditTargetIndex === null) return;
    if (confirm("Delete this road trip?")) {
        settings.savedRoutes.splice(routeEditTargetIndex, 1);
        selectedRouteIndex = null;
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
        toggleRouteEditModal(false);
        renderSavedRoutes();
        updateMapMarkers();
    }
}

// Initialize App
// Reference: Window: load event - https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
window.onload = () => {
    checkFamilyStatus();
    renderMemberFilterOptions();
    switchTab('parks');
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDistance,
        formatDuration,
        groupRoutesByYearOrStatus,
        migrateData,
        escapeHTML,
        focusRoute,
        getSelectedRouteIndex: () => selectedRouteIndex,
        setSelectedRouteIndex: (val) => { selectedRouteIndex = val; }
    };
}

