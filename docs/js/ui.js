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
    settings.familyMembers.forEach(m => {
        html += `<option value="${m}">${m}</option>`;
    });
    select.innerHTML = html;

    if (settings.familyMembers.includes(current) || current === 'all') {
        select.value = current;
    } else {
        select.value = 'all';
        currentMemberFilter = 'all';
    }
}

/** Opens the Edit Metadata Modal for a specific location */
function openEditModal(name) {
    editTarget = name;
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-modal-title');
    const dateInput = document.getElementById('edit-date');
    const commentInput = document.getElementById('edit-comment');
    const charCount = document.getElementById('char-count');

    if (!visitData.meta) visitData.meta = { parks: {}, states: {} };
    if (!visitData.meta[currentTab]) visitData.meta[currentTab] = {};

    const meta = visitData.meta[currentTab][name] || {};

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

    if (!visitData.meta[currentTab]) visitData.meta[currentTab] = {};

    visitData.meta[currentTab][editTarget] = {
        date: date,
        comment: comment
    };

    save();
    toggleEditModal(false);
    renderData();
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
    let previousTab = currentTab;
    currentTab = tab;
    sortColumn = 1;
    sortDirection = 'asc';

    document.querySelectorAll('nav button').forEach(b => b.className = `px-6 py-3 text-lg transition-all text-stone-500 hover:text-green-700`);
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

    tableContainer.classList.add('hidden');
    mapContainer.classList.add('hidden');
    statsViewContainer.classList.add('hidden');
    controlsContainer.classList.remove('hidden');

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

    const headerRow = document.getElementById('table-header-row');
    if (headerRow) {
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

    if (searchTerm) {
        dataset = dataset.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    if (currentTab === 'states') dataset = dataset.filter(i => (i.sub === 'USA' && settings.showUSA) || (i.sub === 'Canada' && settings.showCanada));
    if (currentTab === 'parks') {
        dataset = dataset.filter(i => {
            if (i.country === 'USA') return settings.showUSAParks;
            if (i.country === 'Canada') return settings.showCanadianParks;
            return true;
        });
    }

    const f = document.getElementById('region-filter').value;
    if (currentTab === 'parks') {
        if (f === 'USA') dataset = dataset.filter(i => i.country === 'USA');
        if (f === 'Canada') dataset = dataset.filter(i => i.country === 'Canada');
    } else if (currentTab === 'states') {
        if (f === 'USA') dataset = dataset.filter(i => i.sub === 'USA');
        if (f === 'Canada') dataset = dataset.filter(i => i.sub === 'Canada');
    }

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

        activeMembers.forEach(m => cells += `<td class="p-4 text-center"><input type="checkbox" class="park-checkbox w-5 h-5 cursor-pointer" onchange="toggleVisit('${i.name}', '${m}')" ${dataStore[`${i.name}_${m}`] ? 'checked' : ''}></td>`);

        if (showAll) {
            cells += `<td class="p-4 text-center bg-stone-100/50 font-bold ${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? 'text-green-600' : 'text-stone-400'}">${settings.familyMembers.length > 0 && vCount === settings.familyMembers.length ? '✓' : vCount + '/' + settings.familyMembers.length}</td>`;
        }

        tr.innerHTML = cells; list.appendChild(tr);
    });
    updateStats();
}

function toggleVisit(n, m) { visitData[currentTab][`${n}_${m}`] = !visitData[currentTab][`${n}_${m}`]; save(); renderData(); }
function toggleAllRow(n, val) { settings.familyMembers.forEach(m => visitData[currentTab][`${n}_${m}`] = val); save(); renderData(); }

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
        sortTable,
        updateSortIndicators,
        renderData,
        toggleVisit,
        toggleAllRow,
        toggleRouteEditModal,
        openRouteEditModal,
        saveRouteEditDetails,
        deleteRouteFromEditModal
    };
}
