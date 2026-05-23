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

    sampleVisits.forEach(v => {
        settings.familyMembers.forEach((m) => {
            if (Math.random() > 0.3) {
                visitData[v.type][`${v.name}_${m}`] = true;
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

/** Attempt to fetch 'examples/' folder content to populate dropdown. */
async function populateExamplesDropdown() {
    const select = document.getElementById('example-select');
    if (select) select.innerHTML = '<option value="family1.json">family1.json</option>';
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

// --- EXPORT/IMPORT/BACKUP ---
function saveBackupJSON() {
    const data = { settings, visitData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

let importedData = null;

function handleBackupImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            importedData = JSON.parse(ev.target.result);
            if (importedData.settings && importedData.visitData) {
                document.getElementById('backup-import-prompt').classList.add('hidden');
                document.getElementById('backup-import-confirm').classList.remove('hidden');
            } else {
                alert('Invalid backup file structure.');
                importedData = null;
            }
        } catch (err) {
            alert('Could not parse backup file.');
        }
    };
    reader.readAsText(f);
}

function cancelRestore() {
    document.getElementById('backup-import-prompt').classList.remove('hidden');
    document.getElementById('backup-import-confirm').classList.add('hidden');
    importedData = null;
    document.querySelector('#export-modal input[type="file"]').value = '';
}

function performRestore() {
    if (!importedData) return;
    localStorage.setItem('np_travel_settings', JSON.stringify(importedData.settings));
    localStorage.setItem('np_travel_tracker_v3', JSON.stringify(importedData.visitData));
    location.reload();
}

function getExportData(targetTab) {
    const dataset = targetTab === 'parks' ? parks : states;
    const dataStore = visitData[targetTab];
    const metaStore = visitData.meta[targetTab] || {};
    
    return dataset.map(item => {
        const row = { Name: item.name };
        if (targetTab === 'parks') {
            row['State/Prov'] = item.sub;
            row['Country'] = item.country;
        } else {
            row['Country'] = item.sub;
        }
        
        settings.familyMembers.forEach(m => {
            row[m] = dataStore[`${item.name}_${m}`] ? 'Visited' : 'No';
        });
        
        const mData = metaStore[item.name] || {};
        row['Visited Date'] = mData.date || '';
        row['Comments'] = mData.comment || '';
        return row;
    });
}

function saveToCSV(targetTab) {
    const d = getExportData(targetTab);
    if (!d.length) return;
    const headers = Object.keys(d[0]);
    const csv = [headers.join(','), ...d.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Family_Travel_${targetTab}.csv`; a.click(); URL.revokeObjectURL(url);
}

function saveToExcel(targetTab) {
    const d = getExportData(targetTab);
    if (!d.length) return;
    const ws = XLSX.utils.json_to_sheet(d);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, targetTab);
    XLSX.writeFile(wb, `Family_Travel_${targetTab}.xlsx`);
}

function handleImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        const lines = ev.target.result.split('\n').filter(l => l.trim() !== '');
        const target = lines[0].includes('Park') ? 'parks' : 'states';
        visitData[target] = {};
        for (let i = 1; i < lines.length; i++) {
            const v = lines[i].split(',').map(s => s.replace(/"/g, ''));
            const offset = target === 'parks' ? 3 : 2;
            settings.familyMembers.forEach((m, idx) => {
                if (v[idx + offset] === 'Visited') visitData[target][`${v[0]}_${m}`] = true;
            });
        }
        save();
        switchTab(target);
        e.target.value = '';
        toggleExportModal(false);
    };
    reader.readAsText(f);
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
    if (now - lastOSRMCall < 30000) {
        throw new Error("OSRM Public Server limited to 1 request every 30 seconds. Please wait.");
    }
    lastOSRMCall = now;
    const coordsStr = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full&alternatives=true`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("OSRM routing failed.");
    return data.routes.map((route, index) => ({
        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
        distance: route.distance,
        duration: route.duration,
        index: index
    }));
}

async function fetchMapbox(waypoints) {
    if (!settings.mapboxKey) throw new Error("Mapbox API Key is required.");
    const coordsStr = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&alternatives=true&access_token=${settings.mapboxKey}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error("Mapbox routing failed.");
    return data.routes.map((route, index) => ({
        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
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

        tempAlternatives = routes.map(r => {
            let reduced = r.coordinates;
            const tolerance = parseFloat(settings.routeReduction);
            if (tolerance > 0 && worldMap) {
                const rawPoints = r.coordinates.map(c => ({x: c[0], y: c[1]}));
                const simpleRaw = L.LineUtil.simplify(rawPoints, tolerance);
                reduced = simpleRaw.map(p => [p.x, p.y]);
            }
            return {
                ...r,
                coordinates: reduced,
                originalCoords: r.coordinates,
                waypoints: waypoints
            };
        });

        showAltRouteSelectionUI();
    } catch (e) {
        if (status) {
            status.className = "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 font-medium empty:hidden shadow-sm";
            status.innerText = `Error: ${e.message}`;
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
        tempAltPolylines.forEach(l => bounds.extend(l.getBounds()));
        worldMap.fitBounds(bounds);
    }
}

function selectAltRoute(idx) {
    selectedAltRouteIdx = idx;

    const radios = document.getElementsByName('alt-route-radio');
    radios.forEach((r, i) => {
        r.checked = (i === idx);
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
}

function saveSelectedRoute() {
    if (tempAlternatives.length === 0) return;
    const selectedRoute = tempAlternatives[selectedAltRouteIdx];
    if (!selectedRoute) return;

    const waypoints = selectedRoute.waypoints;
    const name = `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name}`;

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
        status: 'completed'
    });

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
    let filteredRoutes = settings.savedRoutes.map((r, idx) => ({ ...r, originalIndex: idx }));
    if (searchTerm) {
        filteredRoutes = filteredRoutes.filter(r => {
            if (r.name && r.name.toLowerCase().includes(searchTerm)) return true;
            if (r.date && r.date.includes(searchTerm)) return true;
            if (r.members && r.members.some(m => m.toLowerCase().includes(searchTerm))) return true;
            if (r.description && r.description.toLowerCase().includes(searchTerm)) return true;
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

    const currentYear = new Date().getFullYear();

    sortedYears.forEach(year => {
        const routes = completedByYear[year];
        
        if (collapsedYears[year] === undefined) {
            try {
                const yVal = parseInt(year);
                if (!isNaN(yVal) && yVal < currentYear) {
                    collapsedYears[year] = true;
                } else {
                    collapsedYears[year] = false;
                }
            } catch(e) {
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
            const allCoords = settings.savedRoutes.flatMap(r => r.route);
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

    module.exports = {
        formatDistance: global.formatDistance,
        formatDuration: global.formatDuration,
        groupRoutesByYearOrStatus: global.groupRoutesByYearOrStatus,
        migrateData: global.migrateData,
        escapeHTML: global.escapeHTML,
        focusRoute: focusRoute,
        getSelectedRouteIndex: () => global.selectedRouteIndex,
        setSelectedRouteIndex: (val) => { global.selectedRouteIndex = val; }
    };
}
