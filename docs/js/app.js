/**
 * --- APP ORCHESTRATOR ---
 * Coordinates routing, exports/imports, search events, and onload handlers.
 */

// Node.js test environment compatibility layer
if (typeof module !== 'undefined' && module.exports) {
    const state = require('./state.js');
    const helpers = require('./helpers.js');
    const map = require('./map.js');
    const ui = require('./ui.js');

    // Emulate shared global scope in Node.js
    Object.assign(global, state, helpers, map, ui);
}

/** Filter map markers, below-map lists, and update result count. */
function handleSearch(val) {
    searchTerm = val.toLowerCase().trim();

    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
        if (searchTerm) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    updateMapMarkers();

    if (mapMode === 'roads') {
        renderSavedRoutes();
    } else {
        renderVisitedList(mapMode);
    }
}

/** Clears the search input and resets all views. */
function clearSearch() {
    const input = document.getElementById('global-search-input');
    if (input) input.value = '';
    searchTerm = '';

    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');

    const countEl = document.getElementById('search-result-count');
    if (countEl) { countEl.classList.add('hidden'); countEl.innerText = ''; }

    updateMapMarkers();
    if (mapMode === 'roads') {
        renderSavedRoutes();
    } else {
        renderVisitedList(mapMode);
    }
}

/** Updates the search result count badge. */
function updateSearchResultCount(count) {
    const el = document.getElementById('search-result-count');
    if (!el) return;
    if (searchTerm) {
        el.innerText = `${count} result${count !== 1 ? 's' : ''}`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
        el.innerText = '';
    }
}

/** Shows visual warning if no family members are configured. */
function checkFamilyStatus() {
    const prompt = document.getElementById('setup-prompt');
    const settingsBtn = document.getElementById('settings-btn');

    if (settings.familyMembers.length === 0) {
        if (prompt) prompt.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.add('warning-active');
    } else {
        if (prompt) prompt.classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.remove('warning-active');
    }
}

/**
 * Updates a specific setting key in LocalStorage and refreshes the UI.
 */
function updateSetting(settingKey, settingValue) {
    settings[settingKey] = settingValue;
    try {
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
    } catch (saveSettingsError) {
        // Silent catch for LocalStorage write failures
    }

    checkFamilyStatus();

    if (settingKey === 'hometowns') {
        renderHometownUI();
        if (currentTab === 'world') {
            updateMapMarkers();
        }
    } else if (settingKey === 'familyMembers') {
        renderSettingsFamilyList();
        switchTab(currentTab);
    } else {
        if (currentTab === 'world') {
            updateMapMarkers();
        } else if (currentTab === 'stats') {
            updateStats();
        } else {
            switchTab(currentTab);
        }
    }
}

/** Loads static sample data for quick setup. */
function loadSampleData() {
    const sampleMembers = ['John', 'Jane', 'Jim', 'Jess'];
    settings.familyMembers = [...sampleMembers];
    updateSetting('familyMembers', settings.familyMembers);

    const sampleVisits = [
        { type: 'states', name: 'California' },
        { type: 'states', name: 'New York' },
        { type: 'parks', name: 'Yosemite' },
        { type: 'parks', name: 'Yellowstone' }
    ];

    sampleVisits.forEach(visitRecord => {
        settings.familyMembers.forEach((familyMember) => {
            if (Math.random() > 0.3) {
                if (visitRecord.type === 'parks') {
                    visitData.parks[`${visitRecord.name}_${familyMember}`] = true;
                } else if (visitRecord.type === 'states') {
                    visitData.states[`${visitRecord.name}_${familyMember}`] = true;
                }
            }
        });
    });

    save();
    checkFamilyStatus();
    location.reload();
}

/** Adds a new family member to the list and saves settings. */
function addFamilyMember() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (name && !settings.familyMembers.includes(name)) {
        settings.familyMembers.push(name);
        input.value = '';
        updateSetting('familyMembers', settings.familyMembers);
    }
}

/** Removes a family member by index. */
function removeFamilyMember(index) {
    settings.familyMembers.splice(index, 1);
    updateSetting('familyMembers', settings.familyMembers);
}

/** Updates the character counter in the text area */
function updateCharCount(textarea) {
    const counter = document.getElementById('char-count');
    if (counter) counter.innerText = textarea.value.length;
}

/** Fetches coordinates for a city name using OpenStreetMap Nominatim API. */
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
                name: result.display_name.split(',')[0],
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            });
            updateSetting('hometowns', settings.hometowns);
            input.value = '';
        } else {
            alert('Location not found. Please try a different name (e.g., "Seattle, WA")');
        }
    } catch (geocodingError) {
        console.error(geocodingError);
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

/** Attempt to fetch 'examples/' folder content to populate dropdown. */
async function populateExamplesDropdown() {
    const select = document.getElementById('example-select');
    if (select) {
        select.innerHTML = `
            <option value="travel_tracker_backup_2026-05-23.json">travel_tracker_backup_2026-05-23.json</option>
            <option value="family1.json">family1.json</option>
        `;
    }
}

let selectedExampleFile = '';

function showLoadConfirmation() {
    const filename = document.getElementById('example-select').value;
    if (!filename || filename.includes('Scanning')) return;
    selectedExampleFile = filename;

    const controls = document.getElementById('example-select').parentElement;
    controls.classList.add('hidden');
    document.getElementById('load-example-confirm').classList.remove('hidden');
}

function cancelLoad() {
    const controls = document.getElementById('example-select').parentElement;
    controls.classList.remove('hidden');
    document.getElementById('load-example-confirm').classList.add('hidden');
    selectedExampleFile = '';
}

function performLoad() {
    if (!selectedExampleFile) return;

    fetch(`examples/${selectedExampleFile}`)
        .then(response => response.json())
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

function saveBackupJSON() {
    const settingsCopy = JSON.parse(JSON.stringify(settings));
    delete settingsCopy.mapboxKey;
    const data = { settings: settingsCopy, visitData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `travel_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadAnchor.click();
    URL.revokeObjectURL(url);
}

let importedData = null;

function handleBackupImport(passedEvent) {
    const selectedFile = passedEvent.target.files[0];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = function (eventParam) {
        try {
            importedData = JSON.parse(eventParam.target.result);
            if (importedData.settings && importedData.visitData) {
                document.getElementById('backup-import-prompt').classList.add('hidden');
                document.getElementById('backup-import-confirm').classList.remove('hidden');
            } else {
                alert('Invalid backup file structure.');
                importedData = null;
            }
        } catch (backupParseError) {
            alert('Could not parse backup file.');
        }
    };
    reader.readAsText(selectedFile);
}

function cancelRestore() {
    document.getElementById('backup-import-prompt').classList.remove('hidden');
    document.getElementById('backup-import-confirm').classList.add('hidden');
    importedData = null;
    document.querySelector('#export-modal input[type="file"]').value = '';
}

function performRestore() {
    if (!importedData) return;
    const currentKey = settings.mapboxKey;
    if (currentKey) {
        importedData.settings.mapboxKey = currentKey;
    }
    localStorage.setItem('np_travel_settings', JSON.stringify(importedData.settings));
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(importedData.visitData));
    location.reload();
}

function getExportData(targetTab) {
    const dataset = targetTab === 'parks' ? parks : states;
    const dataStore = targetTab === 'parks' ? visitData.parks : visitData.states;
    const metaStore = targetTab === 'parks' ? (visitData.meta.parks || {}) : (visitData.meta.states || {});
    
    return dataset.map(item => {
        const row = { Name: item.name };
        if (targetTab === 'parks') {
            row['State/Prov'] = item.sub;
            row['Country'] = item.country;
        } else {
            row['Country'] = item.sub;
        }
        
        settings.familyMembers.forEach(familyMember => {
            if (familyMember !== '__proto__' && familyMember !== 'constructor' && familyMember !== 'prototype') {
                row[familyMember] = dataStore[`${item.name}_${familyMember}`] ? 'Visited' : 'No';
            }
        });
        
        const mData = metaStore[item.name] || {};
        row['Visited Date'] = mData.date || '';
        row['Comments'] = mData.comment || '';
        return row;
    });
}

function saveToCSV(targetTab) {
    const exportData = getExportData(targetTab);
    if (!exportData.length) return;
    const headers = Object.keys(exportData[0]);
    const csv = [headers.join(','), ...exportData.map(rowValue => headers.map(headerKey => {
        const cellVal = (headerKey !== '__proto__' && headerKey !== 'constructor') ? rowValue[headerKey] : '';
        return `"${String(cellVal).replace(/"/g, '""')}"`;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a'); 
    downloadAnchor.href = url; 
    downloadAnchor.download = `Family_Travel_${targetTab}.csv`; 
    downloadAnchor.click(); 
    URL.revokeObjectURL(url);
}

function saveToExcel(targetTab) {
    const exportData = getExportData(targetTab);
    if (!exportData.length) return;
    // SheetJS Spreadsheet Library (xlsx): https://sheetjs.com/
    // Used for parsing uploaded spreadsheet files and generating Excel-compatible formats.
    const excelWorksheet = XLSX.utils.json_to_sheet(exportData);
    const excelWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(excelWorkbook, excelWorksheet, targetTab);
    XLSX.writeFile(excelWorkbook, `Family_Travel_${targetTab}.xlsx`);
}

function handleImport(passedEvent) {
    const selectedFile = passedEvent.target.files[0];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = function (eventParam) {
        const lines = eventParam.target.result.split('\n').filter(lineContent => lineContent.trim() !== '');
        const target = lines[0].includes('Park') ? 'parks' : 'states';
        if (target === 'parks') {
            visitData.parks = {};
        } else {
            visitData.states = {};
        }
        for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
            const rowValues = lines[lineIndex].split(',').map(valueStr => valueStr.replace(/"/g, ''));
            const offset = target === 'parks' ? 3 : 2;
            settings.familyMembers.forEach((familyMember, memberIdx) => {
                if (rowValues[memberIdx + offset] === 'Visited') {
                    const key = `${rowValues[0]}_${familyMember}`;
                    if (key !== '__proto__' && key !== 'constructor') {
                        if (target === 'parks') {
                            visitData.parks[key] = true;
                        } else {
                            visitData.states[key] = true;
                        }
                    }
                }
            });
        }
        save();
        switchTab(target);
        passedEvent.target.value = '';
        toggleExportModal(false);
    };
    reader.readAsText(selectedFile);
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

let tempAlternatives = [];
let selectedAltRouteIdx = 0;
let tempAltPolylines = [];

async function fetchOSRM(waypoints) {
    const now = Date.now();
    if (now - lastOSRMCall < 15000) {
        throw new Error("OSRM Public Server limited to 1 request every 15 seconds. Please wait or consider switching to the Mapbox API in Settings for faster, unthrottled routing.");
    }
    lastOSRMCall = now;
    const coordsStr = waypoints.map(waypointNode => `${waypointNode.lng},${waypointNode.lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full&alternatives=3`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error("OSRM routing failed (you may have been throttled). Consider switching to the Mapbox API in Settings for faster, unthrottled routing.");
    }
    return data.routes.map((route, index) => ({
        coordinates: route.geometry.coordinates.map(coordinatePair => [coordinatePair[1], coordinatePair[0]]),
        distance: route.distance,
        duration: route.duration,
        index: index
    }));
}

async function fetchMapbox(waypoints) {
    if (!settings.mapboxKey) throw new Error("Mapbox API Key is required.");
    const coordsStr = waypoints.map(waypointNode => `${waypointNode.lng},${waypointNode.lat}`).join(';');
    const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&access_token=${settings.mapboxKey}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("Mapbox routing failed.");
    return data.routes.map((route, index) => ({
        coordinates: route.geometry.coordinates.map(coordinatePair => [coordinatePair[1], coordinatePair[0]]),
        distance: route.distance,
        duration: route.duration,
        index: index
    }));
}

async function requestRoute() {
    const startStr = document.getElementById('route-start').value.trim();
    const endStr = document.getElementById('route-end').value.trim();
    const status = document.getElementById('route-status');
    if (status) {
        status.className = "text-xs text-stone-500 mt-2 font-medium empty:hidden";
        status.innerText = "Geocoding endpoints...";
    }
    
    if (!startStr || !endStr) {
        if (status) {
            status.className = "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 font-medium empty:hidden shadow-sm";
            status.innerText = "Please provide both start and end locations.";
        }
        return;
    }

    const stopsInputs = document.querySelectorAll('.route-stop-input');
    const stopQueries = Array.from(stopsInputs).map(input => input.value.trim()).filter(Boolean);

    try {
        const waypoints = [];
        const start = await getGeocode(startStr);
        waypoints.push(start);
        
        for (const query of stopQueries) {
            if (status) status.innerText = `Geocoding stop: ${query}...`;
            const stop = await getGeocode(query);
            waypoints.push(stop);
        }
        
        const end = await getGeocode(endStr);
        waypoints.push(end);
        
        if (status) status.innerText = `Routing...`;

        let routes = [];
        if (settings.routingEngine === 'osrm') {
            routes = await fetchOSRM(waypoints);
        } else {
            routes = await fetchMapbox(waypoints);
        }

        tempAlternatives = routes.map(altRoute => {
            let reduced = altRoute.coordinates;
            const tolerance = parseFloat(settings.routeReduction);
            if (tolerance > 0 && worldMap) {
                const rawPoints = altRoute.coordinates.map(coordinatePair => ({x: coordinatePair[0], y: coordinatePair[1]}));
                const simpleRaw = L.LineUtil.simplify(rawPoints, tolerance);
                reduced = simpleRaw.map(pointItem => [pointItem.x, pointItem.y]);
            }
            return {
                ...altRoute,
                coordinates: reduced,
                originalCoords: altRoute.coordinates,
                waypoints: waypoints,
                startQuery: startStr,
                endQuery: endStr,
                stopsQueries: stopQueries
            };
        });

        showAltRouteSelectionUI();
    } catch (routeFetchError) {
        if (status) {
            status.className = "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 font-medium empty:hidden shadow-sm";
            status.innerText = `Error: ${routeFetchError.message}`;
        }
    }
}

function showAltRouteSelectionUI() {
    const selector = document.getElementById('alt-routes-selector');
    const list = document.getElementById('alt-routes-list');
    const status = document.getElementById('route-status');

    if (!selector || !list) return;

    clearTempAltPolylines();

    list.innerHTML = '';
    tempAlternatives.forEach((alt, idx) => {
        const div = document.createElement('div');
        div.className = `p-3 rounded-lg border border-stone-200 cursor-pointer transition flex items-center justify-between bg-white hover:border-green-600 ${idx === 0 ? 'ring-2 ring-green-600 border-green-600' : ''}`;
        div.id = `alt-route-card-${idx}`;
        div.setAttribute('onclick', `selectAltRoute(${idx})`);

        const distanceStr = formatDistance(alt.distance);
        const durationStr = formatDuration(alt.duration);

        div.innerHTML = `
            <div>
                <span class="block text-xs font-bold text-stone-700">Option ${idx + 1}${idx === 0 ? ' (Recommended)' : ''}</span>
                <span class="text-xs text-stone-500">${distanceStr} • ${durationStr}</span>
            </div>
            <input type="radio" name="alt-route-radio" value="${idx}" ${idx === 0 ? 'checked' : ''} class="accent-green-700">
        `;
        list.appendChild(div);

        if (worldMap) {
            const isSelected = idx === 0;
            const line = L.polyline(alt.coordinates, {
                color: isSelected ? '#15803d' : '#9ca3af',
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 0.9 : 0.5,
                dashArray: isSelected ? null : '5, 5'
            }).addTo(worldMap);
            tempAltPolylines.push(line);
        }
    });

    selector.classList.remove('hidden');
    if (status) status.innerText = `Select one of the ${tempAlternatives.length} alternative route options shown.`;

    if (worldMap && tempAltPolylines.length > 0) {
        const bounds = tempAltPolylines[0].getBounds();
        tempAltPolylines.forEach(roadPolyline => bounds.extend(roadPolyline.getBounds()));
        worldMap.fitBounds(bounds);
    }
}

function selectAltRoute(idx) {
    selectedAltRouteIdx = idx;

    const radios = document.getElementsByName('alt-route-radio');
    radios.forEach((radioElement, indexIdx) => {
        radioElement.checked = (indexIdx === idx);
        const card = document.getElementById(`alt-route-card-${i}`);
        if (card) {
            if (i === idx) {
                card.className = "p-3 rounded-lg border border-stone-200 cursor-pointer transition flex items-center justify-between bg-white border-green-600 ring-2 ring-green-600 animate-in zoom-in-95 duration-100";
            } else {
                card.className = "p-3 rounded-lg border border-stone-200 cursor-pointer transition flex items-center justify-between bg-white hover:border-green-600";
            }
        }
    });

    tempAltPolylines.forEach((line, i) => {
        if (i === idx) {
            line.setStyle({
                color: '#15803d',
                weight: 5,
                opacity: 0.9,
                dashArray: null
            });
            line.bringToFront();
        } else {
            line.setStyle({
                color: '#9ca3af',
                weight: 3,
                opacity: 0.5,
                dashArray: '5, 5'
            });
        }
    });
}

function clearTempAltPolylines() {
    if (tempAltPolylines) {
        tempAltPolylines.forEach(line => {
            if (worldMap) worldMap.removeLayer(line);
        });
    }
    tempAltPolylines = [];
}

function cancelAltRouteSelection() {
    clearTempAltPolylines();
    tempAlternatives = [];
    selectedAltRouteIdx = 0;

    const selector = document.getElementById('alt-routes-selector');
    if (selector) selector.classList.add('hidden');
    const status = document.getElementById('route-status');
    if (status) status.innerText = '';

    // Reset edit target if cancelled
    routeEditTargetIndex = null;
    const title = document.getElementById('route-builder-title');
    if (title) title.innerText = "Add New Road Trip";
}

function saveSelectedRoute() {
    if (tempAlternatives.length === 0) return;
    const selectedRoute = tempAlternatives[selectedAltRouteIdx];
    if (!selectedRoute) return;

    const waypoints = selectedRoute.waypoints;
    const name = `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name}`;

    if (routeEditTargetIndex !== null) {
        const existing = settings.savedRoutes[routeEditTargetIndex];
        if (existing) {
            existing.route = selectedRoute.coordinates;
            existing.distance = selectedRoute.distance;
            existing.duration = selectedRoute.duration;
            existing.startQuery = selectedRoute.startQuery;
            existing.endQuery = selectedRoute.endQuery;
            existing.stopsQueries = selectedRoute.stopsQueries;
            existing.engine = settings.routingEngine;
            existing.name = name;
        }
    } else {
        settings.savedRoutes.push({
            name: name,
            route: selectedRoute.coordinates,
            engine: settings.routingEngine,
            timestamp: Date.now(),
            date: '',
            members: [],
            description: '',
            distance: selectedRoute.distance,
            duration: selectedRoute.duration,
            status: 'completed',
            startQuery: selectedRoute.startQuery,
            endQuery: selectedRoute.endQuery,
            stopsQueries: selectedRoute.stopsQueries
        });
    }

    localStorage.setItem('np_travel_settings', JSON.stringify(settings));

    document.getElementById('route-start').value = '';
    document.getElementById('route-end').value = '';
    const container = document.getElementById('route-stops-container');
    if (container) container.innerHTML = '';

    cancelAltRouteSelection();

    const status = document.getElementById('route-status');
    if (status) {
        status.className = "text-xs text-stone-500 mt-2 font-medium empty:hidden";
        status.innerText = "Success! Route saved.";
    }

    renderSavedRoutes();
    updateMapMarkers();
}

function addStopInput() {
    const container = document.getElementById('route-stops-container');
    if (!container) return;
    const count = container.children.length;
    
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-150";
    div.id = `stop-input-wrapper-${count}`;
    
    div.innerHTML = `
        <input type="text" class="route-stop-input flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-white" placeholder="Stop (e.g. Portland, OR)">
        <button onclick="removeStopInput(${count})" class="text-stone-400 hover:text-red-600 transition font-bold px-2 py-1">✕</button>
    `;
    container.appendChild(div);
}

function removeStopInput(index) {
    const el = document.getElementById(`stop-input-wrapper-${index}`);
    if (el) {
        el.remove();
        const container = document.getElementById('route-stops-container');
        Array.from(container.children).forEach((child, i) => {
            child.id = `stop-input-wrapper-${i}`;
            const btn = child.querySelector('button');
            if (btn) {
                btn.setAttribute('onclick', `removeStopInput(${i})`);
            }
        });
    }
}

function toggleYearCollapse(year) {
    if (year === '__proto__' || year === 'constructor') return;
    collapsedYears[year] = !collapsedYears[year];
    saveCollapsedYears();
    renderSavedRoutes();
}

function renderSavedRoutes() {
    const list = document.getElementById('saved-routes-list');
    if (!list) return;
    if (!settings.savedRoutes || settings.savedRoutes.length === 0) {
        list.innerHTML = `<div class="p-4 bg-white border border-stone-200 rounded-lg text-center text-stone-400">No saved road trips yet.</div>`;
        return;
    }

    // Apply search filtering
    let filteredRoutes = settings.savedRoutes.map((savedRoute, routeIdx) => ({ ...savedRoute, originalIndex: routeIdx }));
    if (searchTerm) {
        filteredRoutes = filteredRoutes.filter(savedRoute => {
            if (savedRoute.name && savedRoute.name.toLowerCase().includes(searchTerm)) return true;
            if (savedRoute.date && savedRoute.date.includes(searchTerm)) return true;
            if (savedRoute.members && savedRoute.members.some(familyMember => familyMember.toLowerCase().includes(searchTerm))) return true;
            if (savedRoute.description && savedRoute.description.toLowerCase().includes(searchTerm)) return true;
            return false;
        });
    }

    if (filteredRoutes.length === 0) {
        list.innerHTML = `<div class="p-4 bg-white border border-stone-200 rounded-lg text-center text-stone-400">No road trips matching "${escapeHTML(searchTerm)}".</div>`;
        return;
    }

    const planned = [];
    const completedByYear = {}; 
    const completedUndated = [];

    filteredRoutes.forEach(routeWithIdx => {
        if (routeWithIdx.status === 'planned') {
            planned.push(routeWithIdx);
        } else {
            if (routeWithIdx.date && routeWithIdx.date.trim() !== '') {
                const year = new Date(routeWithIdx.date).getFullYear();
                if (!completedByYear[year]) {
                    completedByYear[year] = [];
                }
                completedByYear[year].push(routeWithIdx);
            } else {
                completedUndated.push(routeWithIdx);
            }
        }
    });

    planned.sort((routeA, routeB) => (routeB.timestamp || 0) - (routeA.timestamp || 0));
    completedUndated.sort((routeA, routeB) => (routeB.timestamp || 0) - (routeA.timestamp || 0));

    const sortedYears = Object.keys(completedByYear).sort((yearA, yearB) => yearB - yearA);
    sortedYears.forEach(year => {
        if (year !== '__proto__' && year !== 'constructor' && completedByYear[year]) {
            completedByYear[year].sort((routeA, routeB) => (routeB.timestamp || 0) - (routeA.timestamp || 0));
        }
    });

    let html = '';

    const renderRouteItem = (savedRoute) => {
        const distStr = formatDistance(savedRoute.distance);
        const durStr = formatDuration(savedRoute.duration);
        const membersBadges = savedRoute.members && savedRoute.members.length > 0 
            ? savedRoute.members.map(familyMember => `<span class="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded-full text-[10px] text-stone-600 font-medium">${escapeHTML(familyMember)}</span>`).join(' ')
            : '<span class="text-[10px] text-stone-400 italic">No members added</span>';

        const badgeClass = savedRoute.status === 'planned' 
            ? 'bg-blue-100 text-blue-700 border-blue-200' 
            : 'bg-green-100 text-green-700 border-green-200';

        const isSelected = selectedRouteIndex === savedRoute.originalIndex;
        const bgClass = isSelected ? 'bg-blue-50/30 border-2 border-blue-500' : 'bg-white border border-stone-200 hover:bg-stone-50';
        const shadowClass = isSelected ? 'shadow-md' : 'shadow-sm';

        return `<div class="p-3 ${bgClass} rounded-lg flex justify-between items-start cursor-pointer transition ${shadowClass}" onclick="focusRoute(${savedRoute.originalIndex})">
            <div class="space-y-1.5 flex-1 min-w-0 pr-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-stone-800 text-sm font-semibold truncate max-w-[180px]">${escapeHTML(savedRoute.name)}</strong>
                    <span class="px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${escapeHTML(savedRoute.status)}</span>
                </div>
                <div class="text-xs text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>${distStr}</span>
                    <span class="text-stone-300">•</span>
                    <span>${durStr}</span>
                    <span class="text-stone-300">•</span>
                    <span class="uppercase font-semibold text-[10px]">${escapeHTML(savedRoute.engine)}</span>
                    ${savedRoute.startDate ? `<span class="text-stone-300">•</span><span class="text-stone-500 font-medium">${escapeHTML(savedRoute.startDate)}${savedRoute.endDate ? ` to ${escapeHTML(savedRoute.endDate)}` : ''}</span>` : (savedRoute.date ? `<span class="text-stone-300">•</span><span class="text-stone-500 font-medium">${escapeHTML(savedRoute.date)}</span>` : '')}
                </div>
                <div class="flex flex-wrap gap-1 items-center pt-0.5">
                    ${membersBadges}
                </div>
                ${savedRoute.description ? `<p class="text-xs text-stone-400 italic mt-1 line-clamp-2">${escapeHTML(savedRoute.description)}</p>` : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button onclick="event.stopPropagation(); openRouteEditChoice(${savedRoute.originalIndex})" class="text-stone-400 hover:text-stone-600 p-1 rounded hover:bg-stone-100 transition" title="Edit trip details">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button onclick="event.stopPropagation(); deleteSavedRoute(${savedRoute.originalIndex})" class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-stone-100 transition" title="Delete route">✕</button>
            </div>
        </div>`;
    };

    if (planned.length > 0) {
        html += `<div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 mt-1">Planned Trips (${planned.length})</h4>
            <div class="flex flex-col gap-2">${planned.map(renderRouteItem).join('')}</div>
        </div>`;
    }

    const currentYear = new Date().getFullYear();

    sortedYears.forEach(year => {
        if (year === '__proto__' || year === 'constructor') return;
        const routes = completedByYear[year];
        if (!routes) return;
        
        if (collapsedYears[year] === undefined) {
            try {
                const yVal = parseInt(year);
                if (!isNaN(yVal) && yVal < currentYear) {
                    collapsedYears[year] = true;
                } else {
                    collapsedYears[year] = false;
                }
            } catch(parseYearError) {
                collapsedYears[year] = false;
            }
        }
        
        const isCollapsed = collapsedYears[year];
        const toggleIcon = isCollapsed ? '▶' : '▼';
        
        html += `<div class="mb-4 border-b border-stone-100 pb-3 last:border-0">
            <div onclick="toggleYearCollapse('${year}')" class="flex justify-between items-center cursor-pointer select-none py-1 hover:text-green-700 transition-colors">
                <h4 class="text-xs font-bold uppercase tracking-wider text-green-700 flex items-center gap-1.5">
                    <span class="text-[10px] text-stone-400 font-normal">${toggleIcon}</span>
                    Completed Trips - ${year}
                </h4>
                <span class="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full shadow-sm">${routes.length}</span>
            </div>
            <div class="${isCollapsed ? 'hidden' : 'flex flex-col gap-2 mt-2 pl-2 border-l border-stone-200/50'}">
                ${routes.map(renderRouteItem).join('')}
            </div>
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
            const allCoords = settings.savedRoutes.flatMap(savedRoute => savedRoute.route);
            if (allCoords.length > 0) {
                const polyline = L.polyline(allCoords);
                worldMap.fitBounds(polyline.getBounds());
            }
        }
    }
}

// Initialize App
window.onload = () => {
    checkFamilyStatus();
    renderParksMemberFilterOptions();
    renderStatesMemberFilterOptions();
    switchTab(currentTab);
};

// Node.js test environment exports mapping
if (typeof module !== 'undefined' && module.exports) {
    global.focusRoute = focusRoute;
    global.handleSearch = handleSearch;
    global.clearSearch = clearSearch;
    global.renderSavedRoutes = renderSavedRoutes;
    global.removeHometown = removeHometown;
    global.removeFamilyMember = removeFamilyMember;
    global.checkFamilyStatus = checkFamilyStatus;
    global.addStopInput = addStopInput;
    global.removeStopInput = removeStopInput;
    global.toggleYearCollapse = toggleYearCollapse;
    global.requestRoute = requestRoute;
    global.cancelAltRouteSelection = cancelAltRouteSelection;
    global.saveSelectedRoute = saveSelectedRoute;
    global.selectAltRoute = selectAltRoute;
    global.updateSearchResultCount = updateSearchResultCount;
    global.getTempAlternatives = () => tempAlternatives;
    global.setTempAlternatives = (passedAlternatives) => { tempAlternatives = passedAlternatives; };
    global.updateSetting = updateSetting;
    global.toggleMapboxSettings = toggleMapboxSettings;
    global.saveBackupJSON = saveBackupJSON;
    global.performRestore = performRestore;
    global.getImportedData = () => importedData;
    global.setImportedData = (passedImportedData) => { importedData = passedImportedData; };
    global.populateExamplesDropdown = populateExamplesDropdown;

    module.exports = {
        formatDistance: global.formatDistance,
        formatDuration: global.formatDuration,
        groupRoutesByYearOrStatus: global.groupRoutesByYearOrStatus,
        migrateData: global.migrateData,
        escapeHTML: global.escapeHTML,
        focusRoute: focusRoute,
        getSelectedRouteIndex: () => global.selectedRouteIndex,
        setSelectedRouteIndex: (passedVal) => { global.selectedRouteIndex = passedVal; },
        handleSearch: handleSearch,
        clearSearch: clearSearch,
        updateSearchResultCount: updateSearchResultCount,
        getTempAlternatives: () => tempAlternatives,
        setTempAlternatives: (passedAlternatives) => { tempAlternatives = passedAlternatives; },
        updateSetting: updateSetting,
        toggleMapboxSettings: toggleMapboxSettings,
        saveBackupJSON: saveBackupJSON,
        performRestore: performRestore,
        getImportedData: () => importedData,
        setImportedData: (passedImportedData) => { importedData = passedImportedData; },
        populateExamplesDropdown: populateExamplesDropdown
    };
}
