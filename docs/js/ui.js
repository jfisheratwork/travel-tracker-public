/**
 * --- UI RENDERING & MODALS ---
 * Handles tab switching, tables list drawing, stats updates, and editing modals.
 */

// Node.js support
if (typeof require !== 'undefined') {
    const state = require('./state.js');
    const helpers = require('./helpers.js');
    Object.assign(global, state, helpers);
}

function updateMemberFilter() {
    currentMemberFilter = document.getElementById('member-filter').value;
    switchTab(currentTab); // Re-render current view with new filter
}

function renderMemberFilterOptions() {
    const select = document.getElementById('member-filter');
    if (!select) return;

    const current = select.value || 'all';

    let html = '<option value="all">All Members</option>';
    settings.familyMembers.forEach(familyMember => {
        html += `<option value="${familyMember}">${familyMember}</option>`;
    });
    select.innerHTML = html;

    if (settings.familyMembers.includes(current) || current === 'all') {
        select.value = current;
    } else {
        select.value = 'all';
        currentMemberFilter = 'all';
    }
}

let editTargetType = 'parks';

/** Opens the Edit Metadata Modal for a specific location */
function openEditModal(name, type) {
    editTarget = name;
    editTargetType = type || 'parks';
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-modal-title');
    const dateInput = document.getElementById('edit-date');
    const commentInput = document.getElementById('edit-comment');
    const charCount = document.getElementById('char-count');

    if (!visitData.meta) visitData.meta = { parks: {}, states: {} };
    if (!visitData.meta[editTargetType]) visitData.meta[editTargetType] = {};

    const meta = visitData.meta[editTargetType][name] || {};

    title.innerText = `Edit Details: ${name}`;
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
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

/** Saves the metadata to local storage */
function saveMetaData() {
    if (!editTarget) return;

    const date = document.getElementById('edit-date').value;
    const comment = document.getElementById('edit-comment').value;

    if (!visitData.meta[editTargetType]) visitData.meta[editTargetType] = {};

    visitData.meta[editTargetType][editTarget] = {
        date: date,
        comment: comment
    };

    save();
    toggleEditModal(false);
    if (editTargetType === 'parks') {
        renderParksTable();
    } else {
        renderStatesTable();
    }
    renderVisitedList(editTargetType);
    updateMapMarkers();
}

/** Renders the UI element showing the list of hometowns. */
function renderHometownUI() {
    const display = document.getElementById('hometown-display');
    if (!display) return;
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
    if (!list) return;
    list.innerHTML = '';
    settings.familyMembers.forEach((member, i) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-2 rounded border border-stone-200";
        div.innerHTML = `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-${getMemberColor(i)}-500"></div><span class="text-sm font-medium text-stone-700">${member}</span></div><button onclick="removeFamilyMember(${i})" class="text-stone-400 hover:text-red-600 transition"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>`;
        list.appendChild(div);
    });
}

/**
 * Main navigation logic. Switches views, toggles visibility of containers,
 * updates headers, and triggers data rendering for the selected tab.
 */
function switchTab(tab) {
    if (tab === 'world') {
        tab = 'parks';
    }
    
    currentTab = tab;
    mapMode = tab;
    try {
        localStorage.setItem('np_travel_active_tab', tab);
    } catch(e) {}

    const btnParks = document.getElementById('btn-map-parks');
    const btnStates = document.getElementById('btn-map-states');
    const btnRoads = document.getElementById('btn-map-roads');

    const activeClass = "px-4 py-2 rounded-lg text-sm font-bold transition-all bg-green-700 text-white shadow-md";
    const inactiveClass = "px-4 py-2 rounded-lg text-sm font-medium transition-all text-stone-600 hover:bg-stone-100";

    if (btnParks) btnParks.className = tab === 'parks' ? activeClass : inactiveClass;
    if (btnStates) btnStates.className = tab === 'states' ? activeClass : inactiveClass;
    if (btnRoads) btnRoads.className = tab === 'roads' ? activeClass : inactiveClass;

    // Toggle below-map panels
    const builderUi = document.getElementById('route-builder-ui');
    const parksVisitedUi = document.getElementById('parks-visited-ui');
    const statesVisitedUi = document.getElementById('states-visited-ui');

    if (builderUi) {
        if (tab === 'roads') {
            builderUi.classList.remove('hidden');
            renderSavedRoutes();
        } else {
            builderUi.classList.add('hidden');
        }
    }

    if (parksVisitedUi) {
        if (tab === 'parks') {
            parksVisitedUi.classList.remove('hidden');
            renderVisitedList('parks');
        } else {
            parksVisitedUi.classList.add('hidden');
        }
    }

    if (statesVisitedUi) {
        if (tab === 'states') {
            statesVisitedUi.classList.remove('hidden');
            renderVisitedList('states');
        } else {
            statesVisitedUi.classList.add('hidden');
        }
    }

    updateMapMarkers();
    initWorldMap();

    // Toggle stats widget visibility on switch
    try {
        const showStats = localStorage.getItem('np_travel_show_stats') === 'true';
        toggleStatsWidget(showStats);
    } catch(e) {}
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

function setStatsMode(mode) {
    statsMode = mode;
    const btnParks = document.getElementById('btn-stats-parks');
    const btnStates = document.getElementById('btn-stats-states');
    btnParks.className = mode === 'parks' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    btnStates.className = mode === 'states' ? "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-700 text-white shadow-md" : "px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200";
    updateStats();
}

function toggleStatsWidget(show) {
    const container = document.getElementById('stats-widget-container');
    const btn = document.getElementById('toggle-stats-btn');
    if (!container || !btn) return;

    let shouldShow = show;
    if (shouldShow === undefined) {
        shouldShow = container.classList.contains('hidden');
    }

    if (shouldShow) {
        container.classList.remove('hidden');
        btn.innerHTML = '📊 Hide Statistics';
        updateStats();
        try {
            localStorage.setItem('np_travel_show_stats', 'true');
        } catch(e) {}
    } else {
        container.classList.add('hidden');
        btn.innerHTML = '📊 Show Statistics';
        try {
            localStorage.setItem('np_travel_show_stats', 'false');
        } catch(e) {}
    }
}

function updateStats() {
    // Road Trips mode: show trip-specific statistics
    if (mapMode === 'roads') {
        updateRoadTripStats();
        return;
    }

    let target = (mapMode === 'states') ? 'states' : 'parks';
    let dataset = target === 'parks' ? [...parks] : [...states];
    const dataStore = visitData[target];

    if (target === 'states') dataset = dataset.filter(locationItem => (locationItem.sub === 'USA' && settings.showUSA) || (locationItem.sub === 'Canada' && settings.showCanada));
    if (target === 'parks') {
        dataset = dataset.filter(locationItem => {
            if (locationItem.country === 'USA') return settings.showUSAParks;
            if (locationItem.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    const unique = new Set();
    Object.keys(dataStore).forEach(storageKey => { const name = storageKey.split('_')[0]; if (dataStore[storageKey] && dataset.find(locationItem => locationItem.name === name)) unique.add(name); });

    const statsLabel = document.getElementById('stats-label');
    const totalVisited = document.getElementById('total-visited');
    const totalRemaining = document.getElementById('total-remaining');
    const progressBar = document.getElementById('progress-bar');
    const groupPercent = document.getElementById('group-percent');
    const remainingBox = document.getElementById('remaining-box');

    const remainingLabel = document.getElementById('remaining-label');

    if (statsLabel) statsLabel.innerText = target === 'parks' ? 'Parks Visited' : 'Total Visited';
    if (totalVisited) totalVisited.innerText = `${unique.size} / ${dataset.length}`;
    if (remainingBox) remainingBox.classList.remove('hidden');
    if (remainingLabel) remainingLabel.innerText = 'Remaining';
    if (totalRemaining) totalRemaining.innerText = dataset.length - unique.size;
    if (progressBar) progressBar.style.width = `${dataset.length ? (unique.size / dataset.length) * 100 : 0}%`;
    if (groupPercent) groupPercent.innerText = `${Math.round(dataset.length ? (unique.size / dataset.length) * 100 : 0)}%`;

    const showSplit = (target === 'states' && settings.showUSA && settings.showCanada) ||
        (target === 'parks' && settings.showUSAParks && settings.showCanadianParks);

    const regionalStats = document.getElementById('regional-stats');
    if (regionalStats) {
        if (showSplit) {
            const usTotal = dataset.filter(locationItem => (locationItem.sub === 'USA' || locationItem.country === 'USA')).length;
            const caTotal = dataset.filter(locationItem => (locationItem.sub === 'Canada' || locationItem.country === 'Canada')).length;
            let usVisitedCount = dataset.filter(locationItem => (locationItem.sub === 'USA' || locationItem.country === 'USA') && settings.familyMembers.some(familyMember => dataStore[`${locationItem.name}_${familyMember}`])).length;
            let caVisitedCount = dataset.filter(locationItem => (locationItem.sub === 'Canada' || locationItem.country === 'Canada') && settings.familyMembers.some(familyMember => dataStore[`${locationItem.name}_${familyMember}`])).length;
            regionalStats.classList.remove('hidden');
            
            const usStatLabel = document.getElementById('us-stat-label');
            const usStatCount = document.getElementById('us-stat-count');
            const usStatBar = document.getElementById('us-stat-bar');
            const caStatLabel = document.getElementById('ca-stat-label');
            const caStatCount = document.getElementById('ca-stat-count');
            const caStatBar = document.getElementById('ca-stat-bar');

            if (usStatLabel) usStatLabel.innerText = target === 'parks' ? 'US Parks' : 'US States';
            if (usStatCount) usStatCount.innerText = `${usVisitedCount}/${usTotal}`;
            if (usStatBar) usStatBar.style.width = `${usTotal ? (usVisitedCount / usTotal) * 100 : 0}%`;
            if (caStatLabel) caStatLabel.innerText = target === 'parks' ? 'CA Parks' : 'CA Provinces';
            if (caStatCount) caStatCount.innerText = `${caVisitedCount}/${caTotal}`;
            if (caStatBar) caStatBar.style.width = `${caTotal ? (caVisitedCount / caTotal) * 100 : 0}%`;
        } else {
            regionalStats.classList.add('hidden');
        }
    }

    const grid = document.getElementById('family-progress-grid'); 
    if (grid) {
        grid.innerHTML = '';
        settings.familyMembers.forEach((familyMember, memberIdx) => {
            let mTotal = 0, mUs = 0, mCa = 0;
            dataset.forEach(item => { if (dataStore[`${item.name}_${familyMember}`]) { mTotal++; if (item.sub === 'USA' || item.country === 'USA') mUs++; else mCa++; } });
            const totalCap = dataset.length;
            let html = `<div class="bg-stone-50/50 p-2 rounded-lg border border-stone-100"><div class="flex justify-between text-xs font-bold"><span>${familyMember}</span><span class="text-stone-500">${mTotal}/${totalCap}</span></div>`;
            if (showSplit) {
                const usTotalCount = dataset.filter(locationItem => (locationItem.sub === 'USA' || locationItem.country === 'USA')).length;
                const caTotalCount = dataset.filter(locationItem => (locationItem.sub === 'Canada' || locationItem.country === 'Canada')).length;
                html += `<div class="space-y-1.5 mt-2">`;
                if ((target === 'states' && settings.showUSA) || (target === 'parks' && settings.showUSAParks)) html += `<div class="flex flex-col gap-0.5"><div class="flex justify-between text-[8px] uppercase font-bold text-stone-400"><span>USA</span><span>${mUs}/${usTotalCount}</span></div><div class="w-full bg-stone-200 h-1 rounded-full"><div class="bg-blue-500 h-full" style="width:${usTotalCount ? (mUs / usTotalCount) * 100 : 0}%"></div></div></div>`;
                if ((target === 'states' && settings.showCanada) || (target === 'parks' && settings.showCanadianParks)) html += `<div class="flex flex-col gap-0.5"><div class="flex justify-between text-[8px] uppercase font-bold text-stone-400"><span>CAN</span><span>${mCa}/${caTotalCount}</span></div><div class="w-full bg-stone-200 h-1 rounded-full"><div class="bg-red-500 h-full" style="width:${caTotalCount ? (mCa / caTotalCount) * 100 : 0}%"></div></div></div>`;
                html += `</div>`;
            } else {
                html += `<div class="w-full bg-stone-200 rounded-full h-2 mt-1"><div class="bg-${getMemberColor(memberIdx)}-500 h-full" style="width:${totalCap ? (mTotal / totalCap) * 100 : 0}%"></div></div>`;
            }
            grid.innerHTML += html + `</div>`;
        });
    }
}

/**
 * Renders road trip-specific statistics in the stats widget.
 * Shows total trips, aggregate distance/duration, completed vs planned split,
 * and per-member participation counts.
 */
function updateRoadTripStats() {
    const routes = settings.savedRoutes || [];
    const completed = routes.filter(savedRoute => savedRoute.status !== 'planned');
    const planned = routes.filter(savedRoute => savedRoute.status === 'planned');

    const totalDistance = completed.reduce((sum, savedRoute) => sum + (savedRoute.distance || 0), 0);
    const totalDuration = completed.reduce((sum, savedRoute) => sum + (savedRoute.duration || 0), 0);

    const statsLabel = document.getElementById('stats-label');
    const totalVisited = document.getElementById('total-visited');
    const totalRemaining = document.getElementById('total-remaining');
    const remainingBox = document.getElementById('remaining-box');
    const progressBar = document.getElementById('progress-bar');
    const groupPercent = document.getElementById('group-percent');

    const remainingLabel = document.getElementById('remaining-label');

    if (statsLabel) statsLabel.innerText = 'Road Trips';
    if (totalVisited) totalVisited.innerText = `${completed.length} completed`;
    if (remainingBox) remainingBox.classList.remove('hidden');
    if (remainingLabel) remainingLabel.innerText = 'Planned';
    if (totalRemaining) totalRemaining.innerText = planned.length;
    if (progressBar) {
        const pct = routes.length ? (completed.length / routes.length) * 100 : 0;
        progressBar.style.width = `${pct}%`;
    }
    if (groupPercent) {
        groupPercent.innerText = `${routes.length} total`;
    }

    // Show distance/duration in the regional stats area
    const regionalStats = document.getElementById('regional-stats');
    if (regionalStats) {
        regionalStats.classList.remove('hidden');

        const usStatLabel = document.getElementById('us-stat-label');
        const usStatCount = document.getElementById('us-stat-count');
        const usStatBar = document.getElementById('us-stat-bar');
        const caStatLabel = document.getElementById('ca-stat-label');
        const caStatCount = document.getElementById('ca-stat-count');
        const caStatBar = document.getElementById('ca-stat-bar');

        if (usStatLabel) usStatLabel.innerText = 'Total Distance';
        if (usStatCount) usStatCount.innerText = formatDistance(totalDistance);
        if (usStatBar) usStatBar.style.width = '100%';
        if (caStatLabel) caStatLabel.innerText = 'Total Duration';
        if (caStatCount) caStatCount.innerText = formatDuration(totalDuration);
        if (caStatBar) caStatBar.style.width = '100%';
    }

    // Per-member participation grid
    const grid = document.getElementById('family-progress-grid');
    if (grid) {
        grid.innerHTML = '';
        settings.familyMembers.forEach((familyMember, memberIdx) => {
            const memberTrips = completed.filter(savedRoute => savedRoute.members && savedRoute.members.includes(familyMember));
            const memberDistance = memberTrips.reduce((sum, savedRoute) => sum + (savedRoute.distance || 0), 0);

            let html = `<div class="bg-stone-50/50 p-2 rounded-lg border border-stone-100">
                <div class="flex justify-between text-xs font-bold">
                    <span>${escapeHTML(familyMember)}</span>
                    <span class="text-stone-500">${memberTrips.length}/${completed.length} trips</span>
                </div>
                <div class="w-full bg-stone-200 rounded-full h-2 mt-1">
                    <div class="bg-${getMemberColor(memberIdx)}-500 h-full rounded-full transition-all" style="width:${completed.length ? (memberTrips.length / completed.length) * 100 : 0}%"></div>
                </div>
                <div class="text-[10px] text-stone-400 mt-1">${formatDistance(memberDistance)}</div>
            </div>`;
            grid.innerHTML += html;
        });
    }
}

/**
 * Renders a list of visited parks or states below the map.
 * Shows each visited location as a card with member badges and edit button.
 * Filtered by searchTerm when active.
 */
function renderVisitedList(type) {
    const listId = type === 'parks' ? 'visited-parks-list' : 'visited-states-list';
    const list = document.getElementById(listId);
    if (!list) return;

    const dataset = type === 'parks' ? [...parks] : [...states];
    const dataStore = visitData[type];
    const metaStore = (visitData.meta && visitData.meta[type]) ? visitData.meta[type] : {};

    // Filter to only visited locations
    let visited = dataset.filter(item => {
        return settings.familyMembers.some(familyMember => dataStore[`${item.name}_${familyMember}`]);
    });

    // Apply visibility settings
    if (type === 'states') {
        visited = visited.filter(item => {
            if (item.sub === 'USA') return settings.showUSA;
            if (item.sub === 'Canada') return settings.showCanada;
            return true;
        });
    }
    if (type === 'parks') {
        visited = visited.filter(item => {
            if (item.country === 'USA') return settings.showUSAParks;
            if (item.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    // Apply search filter
    if (searchTerm) {
        const matchedMember = settings.familyMembers.find(familyMember => familyMember.toLowerCase().includes(searchTerm));
        if (matchedMember) {
            visited = visited.filter(item => dataStore[`${item.name}_${matchedMember}`]);
        } else {
            visited = visited.filter(item => item.name.toLowerCase().includes(searchTerm));
        }
    }

    // Sort alphabetically
    visited.sort((itemA, itemB) => itemA.name.localeCompare(itemB.name));

    if (visited.length === 0) {
        const emptyMsg = searchTerm
            ? `No ${type === 'parks' ? 'parks' : 'states'} matching "${escapeHTML(searchTerm)}".`
            : `No ${type === 'parks' ? 'parks' : 'states'} visited yet. Use "Add ${type === 'parks' ? 'Parks' : 'States'}" to log visits.`;
        list.innerHTML = `<div class="p-4 bg-white border border-stone-200 rounded-lg text-center text-stone-400">${emptyMsg}</div>`;
        return;
    }

    let html = '';
    visited.forEach(item => {
        const visitedMembers = settings.familyMembers.filter(familyMember => dataStore[`${item.name}_${familyMember}`]);
        const allVisited = visitedMembers.length === settings.familyMembers.length;
        const meta = metaStore[item.name] || {};

        const memberBadges = visitedMembers.map(familyMember =>
            `<span class="px-1.5 py-0.5 bg-green-50 border border-green-200 rounded-full text-[10px] text-green-700 font-medium">${escapeHTML(familyMember)}</span>`
        ).join(' ');

        const subtitle = type === 'parks'
            ? `${item.sub}, ${item.country}`
            : item.sub;

        const statusIcon = allVisited
            ? '<span class="text-green-600 font-bold text-xs">✓ All</span>'
            : `<span class="text-stone-400 text-xs">${visitedMembers.length}/${settings.familyMembers.length}</span>`;

        html += `<div class="p-3 bg-white border border-stone-200 rounded-lg flex justify-between items-start hover:bg-stone-50 transition shadow-sm">
            <div class="space-y-1.5 flex-1 min-w-0 pr-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-stone-800 text-sm font-semibold">${escapeHTML(item.name)}</strong>
                    <span class="text-xs text-stone-400">${escapeHTML(subtitle)}</span>
                    ${statusIcon}
                </div>
                <div class="flex flex-wrap gap-1 items-center">
                    ${memberBadges}
                </div>
                ${meta.date ? `<div class="text-[11px] text-stone-500">📅 ${escapeHTML(meta.date)}</div>` : ''}
                ${meta.comment ? `<p class="text-xs text-stone-400 italic line-clamp-1">"${escapeHTML(meta.comment)}"</p>` : ''}
            </div>
            <button onclick="openEditModal('${item.name.replace(/'/g, "\\'")}', '${type}')" class="text-stone-400 hover:text-stone-600 p-1.5 rounded hover:bg-stone-100 transition flex-shrink-0" title="Edit details">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
        </div>`;
    });

    list.innerHTML = html;
}

function sortTable(n) {
    if (sortColumn === n) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = n; sortDirection = 'asc'; }
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    const active = document.querySelector(`th[onclick="sortTable(${sortColumn})"]`);
    if (active) active.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

function toggleParksModal(show) {
    const modal = document.getElementById('parks-modal');
    if (!modal) return;
    if (show) {
        renderParksMemberFilterOptions();
        initParksTableHeaders();
        renderParksTable();
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
        updateMapMarkers();
        renderVisitedList('parks');
    }
}

function toggleStatesModal(show) {
    const modal = document.getElementById('states-modal');
    if (!modal) return;
    if (show) {
        renderStatesMemberFilterOptions();
        initStatesTableHeaders();
        renderStatesTable();
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
        updateMapMarkers();
        renderVisitedList('states');
    }
}

function handleParksSearch(val) {
    parksSearchTerm = val.toLowerCase();
    renderParksTable();
}

function handleStatesSearch(val) {
    statesSearchTerm = val.toLowerCase();
    renderStatesTable();
}

function updateParksMemberFilter() {
    parksMemberFilter = document.getElementById('parks-member-filter').value;
    initParksTableHeaders();
    renderParksTable();
}

function updateStatesMemberFilter() {
    statesMemberFilter = document.getElementById('states-member-filter').value;
    initStatesTableHeaders();
    renderStatesTable();
}

function renderParksMemberFilterOptions() {
    const select = document.getElementById('parks-member-filter');
    if (!select) return;
    const current = select.value || 'all';
    let html = '<option value="all">All Members</option>';
    settings.familyMembers.forEach(familyMember => {
        html += `<option value="${familyMember}">${familyMember}</option>`;
    });
    select.innerHTML = html;
    if (settings.familyMembers.includes(current) || current === 'all') {
        select.value = current;
    } else {
        select.value = 'all';
        parksMemberFilter = 'all';
    }
}

function renderStatesMemberFilterOptions() {
    const select = document.getElementById('states-member-filter');
    if (!select) return;
    const current = select.value || 'all';
    let html = '<option value="all">All Members</option>';
    settings.familyMembers.forEach(familyMember => {
        html += `<option value="${familyMember}">${familyMember}</option>`;
    });
    select.innerHTML = html;
    if (settings.familyMembers.includes(current) || current === 'all') {
        select.value = current;
    } else {
        select.value = 'all';
        statesMemberFilter = 'all';
    }
}

function sortParksTable(n) {
    if (sortColumn === n) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = n; sortDirection = 'asc'; }
    updateParksSortIndicators();
    renderParksTable();
}

function sortStatesTable(n) {
    if (sortColumn === n) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = n; sortDirection = 'asc'; }
    updateStatesSortIndicators();
    renderStatesTable();
}

function initParksTableHeaders() {
    const headerRow = document.getElementById('parks-table-header-row');
    if (!headerRow) return;
    const showAll = parksMemberFilter === 'all';
    const activeMembers = showAll ? settings.familyMembers : [parksMemberFilter];

    let headers = `<th class="p-4 border-b text-center w-12" title="Select/Deselect All">All</th>
                   <th id="parks-col-name" onclick="sortParksTable(1)" class="p-4 border-b sortable cursor-pointer hover:bg-stone-200">Name</th>
                   <th id="parks-col-sub" onclick="sortParksTable(2)" class="p-4 border-b sortable cursor-pointer hover:bg-stone-200">State/Prov</th>
                   <th id="parks-col-country" onclick="sortParksTable(3)" class="p-4 border-b sortable cursor-pointer hover:bg-stone-200">Country</th>`;

    activeMembers.forEach((m, i) => {
        headers += `<th onclick="sortParksTable(${4 + i})" class="p-4 border-b text-center sortable cursor-pointer hover:bg-stone-200 text-xs uppercase tracking-tighter">${m}</th>`;
    });

    if (showAll) {
        headers += `<th onclick="sortParksTable(${4 + activeMembers.length})" class="p-4 border-b text-center bg-stone-200/50 sortable cursor-pointer hover:bg-stone-200">Family</th>`;
    }
    headerRow.innerHTML = headers;
    updateParksSortIndicators();
}

function initStatesTableHeaders() {
    const headerRow = document.getElementById('states-table-header-row');
    if (!headerRow) return;
    const showAll = statesMemberFilter === 'all';
    const activeMembers = showAll ? settings.familyMembers : [statesMemberFilter];

    let headers = `<th class="p-4 border-b text-center w-12" title="Select/Deselect All">All</th>
                   <th id="states-col-name" onclick="sortStatesTable(1)" class="p-4 border-b sortable cursor-pointer hover:bg-stone-200">Name</th>
                   <th id="states-col-sub" onclick="sortStatesTable(2)" class="p-4 border-b sortable cursor-pointer hover:bg-stone-200">Country</th>`;

    activeMembers.forEach((m, i) => {
        headers += `<th onclick="sortStatesTable(${3 + i})" class="p-4 border-b text-center sortable cursor-pointer hover:bg-stone-200 text-xs uppercase tracking-tighter">${m}</th>`;
    });

    if (showAll) {
        headers += `<th onclick="sortStatesTable(${3 + activeMembers.length})" class="p-4 border-b text-center bg-stone-200/50 sortable cursor-pointer hover:bg-stone-200">Family</th>`;
    }
    headerRow.innerHTML = headers;
    updateStatesSortIndicators();
}

function updateParksSortIndicators() {
    document.querySelectorAll('#parks-table th.sortable').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    let selector = '';
    if (sortColumn === 1) selector = '#parks-col-name';
    else if (sortColumn === 2) selector = '#parks-col-sub';
    else if (sortColumn === 3) selector = '#parks-col-country';
    else {
        const headers = document.querySelectorAll('#parks-table-header-row th');
        if (headers[sortColumn]) {
            headers[sortColumn].classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            return;
        }
    }
    const active = document.querySelector(selector);
    if (active) active.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

function updateStatesSortIndicators() {
    document.querySelectorAll('#states-table th.sortable').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    let selector = '';
    if (sortColumn === 1) selector = '#states-col-name';
    else if (sortColumn === 2) selector = '#states-col-sub';
    else {
        const headers = document.querySelectorAll('#states-table-header-row th');
        if (headers[sortColumn]) {
            headers[sortColumn].classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            return;
        }
    }
    const active = document.querySelector(selector);
    if (active) active.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

function renderParksTable() {
    const list = document.getElementById('parks-data-list');
    if (!list) return;
    let dataset = [...parks];
    const dataStore = visitData.parks;
    const metaStore = visitData.meta.parks || {};

    if (parksSearchTerm) {
        dataset = dataset.filter(item => item.name.toLowerCase().includes(parksSearchTerm));
    }

    dataset = dataset.filter(locationItem => {
        if (locationItem.country === 'USA') return settings.showUSAParks;
        if (locationItem.country === 'Canada') return settings.showCanadianParks;
        return true;
    });

    const regFilter = document.getElementById('parks-region-filter').value;
    if (regFilter === 'USA') dataset = dataset.filter(locationItem => locationItem.country === 'USA');
    if (regFilter === 'Canada') dataset = dataset.filter(locationItem => locationItem.country === 'Canada');

    const showAll = parksMemberFilter === 'all';
    const activeMembers = showAll ? settings.familyMembers : [parksMemberFilter];

    dataset.sort((itemA, itemB) => {
        let vA, vB;
        if (sortColumn === 1) { vA = itemA.name.toLowerCase(); vB = itemB.name.toLowerCase(); }
        else if (sortColumn === 2) { vA = itemA.sub.toLowerCase(); vB = itemB.sub.toLowerCase(); }
        else if (sortColumn === 3) { vA = itemA.country.toLowerCase(); vB = itemB.country.toLowerCase(); }
        else if (sortColumn >= 4 && sortColumn < 4 + activeMembers.length) { 
            let activeMember = activeMembers[sortColumn - 4]; 
            vA = dataStore[`${itemA.name}_${activeMember}`] ? 1 : 0; 
            vB = dataStore[`${itemB.name}_${activeMember}`] ? 1 : 0; 
        }
        else if (showAll && sortColumn === 4 + activeMembers.length) { 
            vA = settings.familyMembers.filter(familyMember => dataStore[`${itemA.name}_${familyMember}`]).length; 
            vB = settings.familyMembers.filter(familyMember => dataStore[`${itemB.name}_${familyMember}`]).length; 
        }
        return sortDirection === 'asc' ? (vA < vB ? -1 : 1) : (vA > vB ? -1 : 1);
    });

    list.innerHTML = '';

    dataset.forEach(locationItem => {
        let vCount = settings.familyMembers.filter(familyMember => dataStore[`${locationItem.name}_${familyMember}`]).length;
        let tr = document.createElement('tr');
        tr.className = "hover:bg-stone-50 border-b border-stone-100 " + (vCount > 0 ? "checked-row" : "");

        const hasMeta = metaStore[locationItem.name] && (metaStore[locationItem.name].comment || metaStore[locationItem.name].date);
        const wrenchColor = hasMeta ? "text-blue-500 hover:text-blue-700" : "text-stone-300 hover:text-stone-500";

        let cells = `<td class="p-4 text-center border-r border-stone-100"><input type="checkbox" class="all-checkbox w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition" onchange="toggleAllRow('${locationItem.name}', this.checked, 'parks')" ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'checked' : ''}></td>
        <td class="p-4 font-medium flex items-center justify-between group">
            <a href="${getWikiLink(locationItem, 'parks')}" target="_blank" title="View Wikipedia Article" class="flex items-center gap-2 hover:text-green-700 transition-colors">
                ${locationItem.name}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </a>
            <button onclick="openEditModal('${locationItem.name}', 'parks')" class="${wrenchColor} transition-colors p-1 rounded hover:bg-stone-100" title="Edit Details">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </button>
        </td>
        <td class="p-4 text-sm text-stone-500">${locationItem.sub}</td>
        <td class="p-4 text-sm text-stone-500">${locationItem.country}</td>`;

        activeMembers.forEach(familyMember => cells += `<td class="p-4 text-center"><input type="checkbox" class="park-checkbox w-5 h-5 cursor-pointer" onchange="toggleVisit('${locationItem.name}', '${familyMember}', 'parks')" ${dataStore[`${locationItem.name}_${familyMember}`] ? 'checked' : ''}></td>`);

        if (showAll) {
            cells += `<td class="p-4 text-center bg-stone-100/50 font-bold ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'text-green-600' : 'text-stone-400'}">${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? '✓' : vCount + '/' + settings.familyMembers.length}</td>`;
        }

        tr.innerHTML = cells; list.appendChild(tr);
    });
    updateStats();
}

function renderStatesTable() {
    const list = document.getElementById('states-data-list');
    if (!list) return;
    let dataset = [...states];
    const dataStore = visitData.states;
    const metaStore = visitData.meta.states || {};

    if (statesSearchTerm) {
        dataset = dataset.filter(locationItem => locationItem.name.toLowerCase().includes(statesSearchTerm));
    }

    dataset = dataset.filter(locationItem => (locationItem.sub === 'USA' && settings.showUSA) || (locationItem.sub === 'Canada' && settings.showCanada));

    const regFilter = document.getElementById('states-region-filter').value;
    if (regFilter === 'USA') dataset = dataset.filter(locationItem => locationItem.sub === 'USA');
    if (regFilter === 'Canada') dataset = dataset.filter(locationItem => locationItem.sub === 'Canada');

    const showAll = statesMemberFilter === 'all';
    const activeMembers = showAll ? settings.familyMembers : [statesMemberFilter];

    dataset.sort((itemA, itemB) => {
        let vA, vB;
        if (sortColumn === 1) { vA = itemA.name.toLowerCase(); vB = itemB.name.toLowerCase(); }
        else if (sortColumn === 2) { vA = itemA.sub.toLowerCase(); vB = itemB.sub.toLowerCase(); }
        else if (sortColumn >= 3 && sortColumn < 3 + activeMembers.length) { 
            let activeMember = activeMembers[sortColumn - 3]; 
            vA = dataStore[`${itemA.name}_${activeMember}`] ? 1 : 0; 
            vB = dataStore[`${itemB.name}_${activeMember}`] ? 1 : 0; 
        }
        else if (showAll && sortColumn === 3 + activeMembers.length) { 
            vA = settings.familyMembers.filter(familyMember => dataStore[`${itemA.name}_${familyMember}`]).length; 
            vB = settings.familyMembers.filter(familyMember => dataStore[`${itemB.name}_${familyMember}`]).length; 
        }
        return sortDirection === 'asc' ? (vA < vB ? -1 : 1) : (vA > vB ? -1 : 1);
    });

    list.innerHTML = '';

    dataset.forEach(locationItem => {
        let vCount = settings.familyMembers.filter(familyMember => dataStore[`${locationItem.name}_${familyMember}`]).length;
        let tr = document.createElement('tr');
        tr.className = "hover:bg-stone-50 border-b border-stone-100 " + (vCount > 0 ? "checked-row" : "");

        const hasMeta = metaStore[locationItem.name] && (metaStore[locationItem.name].comment || metaStore[locationItem.name].date);
        const wrenchColor = hasMeta ? "text-blue-500 hover:text-blue-700" : "text-stone-300 hover:text-stone-500";

        let cells = `<td class="p-4 text-center border-r border-stone-100"><input type="checkbox" class="all-checkbox w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition" onchange="toggleAllRow('${locationItem.name}', this.checked, 'states')" ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'checked' : ''}></td>
        <td class="p-4 font-medium flex items-center justify-between group">
            <a href="${getWikiLink(locationItem, 'states')}" target="_blank" title="View Wikipedia Article" class="flex items-center gap-2 hover:text-green-700 transition-colors">
                ${locationItem.name}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </a>
            <button onclick="openEditModal('${locationItem.name}', 'states')" class="${wrenchColor} transition-colors p-1 rounded hover:bg-stone-100" title="Edit Details">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </button>
        </td>
        <td class="p-4 text-sm text-stone-500">${locationItem.sub}</td>`;

        activeMembers.forEach(familyMember => cells += `<td class="p-4 text-center"><input type="checkbox" class="park-checkbox w-5 h-5 cursor-pointer" onchange="toggleVisit('${locationItem.name}', '${familyMember}', 'states')" ${dataStore[`${locationItem.name}_${familyMember}`] ? 'checked' : ''}></td>`);

        if (showAll) {
            cells += `<td class="p-4 text-center bg-stone-100/50 font-bold ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'text-green-600' : 'text-stone-400'}">${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? '✓' : vCount + '/' + settings.familyMembers.length}</td>`;
        }

        tr.innerHTML = cells; list.appendChild(tr);
    });
    updateStats();
}

function toggleVisit(locationName, familyMember, visitType) { 
    visitData[visitType][`${locationName}_${familyMember}`] = !visitData[visitType][`${locationName}_${familyMember}`]; 
    save(); 
    if (visitType === 'parks') renderParksTable();
    else renderStatesTable();
    renderVisitedList(visitType);
}

function toggleAllRow(locationName, isVisited, visitType) { 
    settings.familyMembers.forEach(familyMember => visitData[visitType][`${locationName}_${familyMember}`] = isVisited); 
    save(); 
    if (visitType === 'parks') renderParksTable();
    else renderStatesTable();
    renderVisitedList(visitType);
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
    const savedRoute = settings.savedRoutes[idx];
    if (!savedRoute) return;

    document.getElementById('route-edit-distance').innerText = formatDistance(savedRoute.distance);
    document.getElementById('route-edit-duration').innerText = formatDuration(savedRoute.duration);
    document.getElementById('route-edit-name').value = savedRoute.name || '';
    document.getElementById('route-edit-start-date').value = savedRoute.startDate || savedRoute.date || '';
    document.getElementById('route-edit-end-date').value = savedRoute.endDate || '';
    document.getElementById('route-edit-status').value = savedRoute.status || 'completed';
    document.getElementById('route-edit-description').value = savedRoute.description || '';
    document.getElementById('route-char-count').innerText = (savedRoute.description || '').length;

    const container = document.getElementById('route-edit-members');
    if (container) {
        let html = '';
        settings.familyMembers.forEach((member) => {
            const checked = (savedRoute.members && savedRoute.members.includes(member)) ? 'checked' : '';
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
    const savedRoute = settings.savedRoutes[routeEditTargetIndex];
    if (!savedRoute) return;

    const name = document.getElementById('route-edit-name').value.trim();
    if (!name) {
        alert("Route name is required.");
        return;
    }

    const startDate = document.getElementById('route-edit-start-date').value;
    const endDate = document.getElementById('route-edit-end-date').value;
    const status = document.getElementById('route-edit-status').value;
    const description = document.getElementById('route-edit-description').value.trim();

    const members = [];
    const checkboxes = document.querySelectorAll('#route-edit-members input[type="checkbox"]');
    checkboxes.forEach(checkboxItem => {
        if (checkboxItem.checked) {
            members.push(checkboxItem.value);
        }
    });

    savedRoute.name = name;
    savedRoute.startDate = startDate;
    savedRoute.endDate = endDate;
    savedRoute.date = startDate; // Maintain for backward compatibility
    savedRoute.status = status;
    savedRoute.description = description;
    savedRoute.members = members;

    localStorage.setItem('np_travel_settings', JSON.stringify(settings));
    toggleRouteEditModal(false);
    renderSavedRoutes();
    updateMapMarkers();
}

/**
 * Selects all family members in the route edit modal checkboxes.
 */
function selectAllRouteMembers() {
    const checkboxes = document.querySelectorAll('#route-edit-members input[type="checkbox"]');
    for (const checkboxItem of checkboxes) {
        checkboxItem.checked = true;
    }
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

function toggleRouteEditChoiceModal(show) {
    const modal = document.getElementById('route-edit-choice-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.remove('opacity-0'));
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    }
}

function openRouteEditChoice(idx) {
    routeEditTargetIndex = idx;
    toggleRouteEditChoiceModal(true);
}

function handleEditChoice(choice) {
    toggleRouteEditChoiceModal(false);
    if (routeEditTargetIndex === null) return;

    if (choice === 'data') {
        openRouteEditModal(routeEditTargetIndex);
    } else if (choice === 'route') {
        editSavedRouteOnMap(routeEditTargetIndex);
    }
}

function editSavedRouteOnMap(idx) {
    const savedRoute = settings.savedRoutes[idx];
    if (!savedRoute) return;

    routeEditTargetIndex = idx;

    // Switch to roads tab to make the route builder visible
    switchTab('roads');

    // Populate start and end points
    const startQuery = savedRoute.startQuery || (savedRoute.route && savedRoute.route.length > 0 ? `${savedRoute.route[0][0]},${savedRoute.route[0][1]}` : '');
    const endQuery = savedRoute.endQuery || (savedRoute.route && savedRoute.route.length > 0 ? `${savedRoute.route[savedRoute.route.length - 1][0]},${savedRoute.route[savedRoute.route.length - 1][1]}` : '');
    const stopsQueries = savedRoute.stopsQueries || [];

    const startInput = document.getElementById('route-start');
    const endInput = document.getElementById('route-end');
    if (startInput) startInput.value = startQuery;
    if (endInput) endInput.value = endQuery;

    // Populate stop inputs
    const container = document.getElementById('route-stops-container');
    if (container) {
        container.innerHTML = '';
        stopsQueries.forEach((stopVal, stopIdx) => {
            const div = document.createElement('div');
            div.className = "flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-150";
            div.id = `stop-input-wrapper-${stopIdx}`;
            div.innerHTML = `
                <input type="text" class="route-stop-input flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-white" value="${escapeHTML(stopVal)}">
                <button onclick="removeStopInput(${stopIdx})" class="text-stone-400 hover:text-red-600 transition font-bold px-2 py-1">✕</button>
            `;
            container.appendChild(div);
        });
    }

    // Update Route Builder header text
    const title = document.getElementById('route-builder-title');
    if (title) title.innerText = `Edit Road Trip: ${savedRoute.name}`;

    // Scroll Route Builder into view
    const builderUi = document.getElementById('route-builder-ui');
    if (builderUi) {
        builderUi.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Automatically trigger route calculation
    requestRoute();
}

// Node.js environment export support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateMemberFilter,
        renderMemberFilterOptions,
        openEditModal,
        toggleEditModal,
        saveMetaData,
        renderHometownUI,
        renderSettingsFamilyList,
        switchTab,
        toggleInfoModal,
        toggleSettingsModal,
        toggleExportModal,
        setStatsMode,
        updateStats,
        toggleStatsWidget,
        toggleParksModal,
        toggleStatesModal,
        handleParksSearch,
        handleStatesSearch,
        updateParksMemberFilter,
        updateStatesMemberFilter,
        sortParksTable,
        sortStatesTable,
        renderParksTable,
        renderStatesTable,
        toggleVisit,
        toggleAllRow,
        toggleRouteEditModal,
        openRouteEditModal,
        saveRouteEditDetails,
        deleteRouteFromEditModal,
        updateRoadTripStats,
        renderVisitedList,
        toggleRouteEditChoiceModal,
        openRouteEditChoice,
        handleEditChoice,
        editSavedRouteOnMap,
        selectAllRouteMembers
    };
}
