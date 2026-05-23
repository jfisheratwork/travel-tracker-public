/**
 * --- HELPERS ---
 * Pure utility functions for formatting, escaping, and sorting data.
 */

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
                } catch (parseDateError) {
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
    const sortedKeys = Object.keys(groups).sort((keyA, keyB) => {
        if (groupBy === 'year') {
            if (keyA === 'Unknown') return 1;
            if (keyB === 'Unknown') return -1;
            return keyB.localeCompare(keyA); // descending
        }
        return keyA.localeCompare(keyB); // alphabetical (completed, then planned)
    });

    sortedKeys.forEach(key => {
        sortedGroups[key] = groups[key].sort((routeA, routeB) => {
            const timeA = routeA.timestamp || 0;
            const timeB = routeB.timestamp || 0;
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
            const alreadyExists = migratedSettings.hometowns.some(hometownItem => 
                hometownItem.lat === migratedSettings.hometown.lat && hometownItem.lng === migratedSettings.hometown.lng
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
                startDate: route.startDate !== undefined ? route.startDate : (route.date !== undefined ? route.date : ''),
                endDate: route.endDate !== undefined ? route.endDate : '',
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

/**
 * Helper to generate a valid Wikipedia URL for parks and states.
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

/**
 * Returns a color from the palette based on index to ensure variety.
 */
function getMemberColor(index) {
    return palette[index % palette.length];
}

// Node.js environment export support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHTML,
        formatDistance,
        formatDuration,
        groupRoutesByYearOrStatus,
        migrateData,
        getWikiLink,
        getMemberColor
    };
}
