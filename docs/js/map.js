/**
 * --- MAP LOGIC ---
 * Handle Leaflet map initialization, plotting markers/polylines, and popups.
 */

// Node.js support
if (typeof require !== 'undefined') {
    // Shared state and helpers
    const state = require('./state.js');
    const helpers = require('./helpers.js');
    Object.assign(global, state, helpers);
}

function initWorldMap() {
    if (!worldMap) {
        // Leaflet Map Library: https://leafletjs.com/
        // Used to initialize the interactive map, set its base view/zoom, and attach tile layers.
        worldMap = L.map('world-map').setView([48, -100], 3);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(worldMap);
    }
    setTimeout(() => { worldMap.invalidateSize(); updateMapMarkers(); }, 100);
}

/** Toggles map mode between 'parks' and 'states' via buttons. */
function setMapMode(mode) {
    if (currentTab !== mode) {
        switchTab(mode);
    }
}

/**
 * Clears and redraws markers on the map based on current data/filters.
 * Handles logic for styling markers (visited/not visited/selected).
 */
function updateMapMarkers() {
    if (!worldMap) return;
    mapMarkers.forEach(mapMarker => worldMap.removeLayer(mapMarker));
    hometownMarkers.forEach(hometownMarker => worldMap.removeLayer(hometownMarker));
    roadPolylines.forEach(roadPolyline => worldMap.removeLayer(roadPolyline));
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
        settings.hometowns.forEach((home, hometownIdx) => {
            const isLast = hometownIdx === settings.hometowns.length - 1;
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
            let filteredRoutes = settings.savedRoutes.map((savedRoute, routeIdx) => ({ ...savedRoute, originalIndex: routeIdx }));

            // Search filtering for road trips
            if (searchTerm) {
                filteredRoutes = filteredRoutes.filter(savedRoute => {
                    if (savedRoute.name && savedRoute.name.toLowerCase().includes(searchTerm)) return true;
                    if (savedRoute.date && savedRoute.date.includes(searchTerm)) return true;
                    if (savedRoute.members && savedRoute.members.some(familyMember => familyMember.toLowerCase().includes(searchTerm))) return true;
                    if (savedRoute.description && savedRoute.description.toLowerCase().includes(searchTerm)) return true;
                    return false;
                });
            }

            filteredRoutes.forEach(routeData => {
                const routeIdx = routeData.originalIndex;
                if (selectedRouteIndex !== null && selectedRouteIndex !== routeIdx) {
                    return;
                }
                const roadPolyline = L.polyline(routeData.route, {
                    color: palette[routeIdx % palette.length], 
                    weight: 5,
                    opacity: 0.8,
                    smoothFactor: 1,
                    className: 'cursor-pointer'
                }).addTo(worldMap);
                roadPolyline.bindPopup(`<strong>${routeData.name}</strong><br><span class="text-xs text-stone-500">${routeData.engine} engine</span>`);
                roadPolyline.on('click', () => {
                    openRouteEditModal(routeIdx);
                });
                roadPolylines.push(roadPolyline);
            });

            if (typeof updateSearchResultCount === 'function') {
                updateSearchResultCount(filteredRoutes.length);
            }

            // Auto-fit to search results
            if (searchTerm && roadPolylines.length > 0) {
                const allBounds = roadPolylines.map(roadPolyline => roadPolyline.getBounds());
                const combinedBounds = allBounds[0];
                allBounds.slice(1).forEach(boundsItem => combinedBounds.extend(boundsItem));
                worldMap.fitBounds(combinedBounds, { padding: [30, 30] });
            }
        }
        return;
    }

    let dataset = mapMode === 'parks' ? [...parks] : [...states];
    const dataStore = mapMode === 'parks' ? visitData.parks : visitData.states;
    const metaStore = (visitData.meta && visitData.meta[mapMode]) ? visitData.meta[mapMode] : {};

    // Search Filtering
    if (searchTerm) {
        const matchedMember = settings.familyMembers.find(familyMember => familyMember.toLowerCase().includes(searchTerm));
        if (matchedMember) {
            dataset = dataset.filter(item => dataStore[`${item.name}_${matchedMember}`]);
        } else {
            dataset = dataset.filter(item => item.name.toLowerCase().includes(searchTerm));
        }
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
        let visitedCount = settings.familyMembers.filter(familyMember => dataStore[`${item.name}_${familyMember}`]).length;
        let color = (settings.familyMembers.length > 0 && visitedCount === settings.familyMembers.length) ? "#16a34a" : (visitedCount > 0 ? "#eab308" : "#9ca3af");

        const hasVisits = visitedCount > 0;
        const normalIcon = createIcon(color, mapMode, false, hasVisits);
        const selectedIcon = createIcon(color, mapMode, true, hasVisits);

        const marker = L.marker([item.lat, item.lng], { icon: normalIcon }).addTo(worldMap);
        const subtitle = mapMode === 'parks' ? 'National Park' : `Capital: ${item.capital}`;
        const wikiUrl = getWikiLink(item, mapMode);

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
                    ${settings.familyMembers.map(familyMember => `<div class="flex justify-between items-center"><span class="text-stone-600">${familyMember}</span><span class="${dataStore[`${item.name}_${familyMember}`] ? 'text-green-600 font-bold' : 'text-stone-300'}">${dataStore[`${item.name}_${familyMember}`] ? 'Visited' : 'No'}</span></div>`).join('')}
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

    // Report search result count for parks/states
    if (typeof updateSearchResultCount === 'function') {
        updateSearchResultCount(dataset.length);
    }

    // Auto-fit to search results
    if (searchTerm && mapMarkers.length > 0) {
        const group = L.featureGroup(mapMarkers);
        worldMap.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
}

// Node.js environment export support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initWorldMap,
        setMapMode,
        updateMapMarkers
    };
}
