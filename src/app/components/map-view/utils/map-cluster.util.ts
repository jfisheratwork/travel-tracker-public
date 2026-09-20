// DOCS: https://leafletjs.com/reference.html#latlng
// DOCS: https://leafletjs.com/reference.html#latlngbounds
import * as L from 'leaflet';
import { LocationPoint } from '../../../models/location.model';
import { ColorThemeDefinition } from '../../../core/constants/theme.constants';
import {
  CLUSTER_COLLISION_RADIUS_PX,
  CLUSTER_MAX_ZOOM,
} from '../../../core/constants/map.constants';

export interface EnrichedLocationPoint extends LocationPoint {
  isAllVisited?: boolean;
  isPartiallyVisited?: boolean;
  wantToVisit?: boolean;
  isWantToVisit?: boolean;
  visitedByMembers?: Array<{
    id: string;
    name?: string;
    color?: string;
    date?: string;
    notes?: string;
    [key: string]: unknown;
  }>;
  visitLogs?: unknown[];
  isLast?: boolean;
}

export interface ClusterStatusSummary {
  visitedCount: number;
  partialCount: number;
  unvisitedCount: number;
  total: number;
}

export interface MarkerClusterGroup {
  id: string;
  lat: number;
  lng: number;
  items: EnrichedLocationPoint[];
  bounds: [[number, number], [number, number]];
  statusSummary: ClusterStatusSummary;
  primaryColor: string;
  secondaryColors: [string, string];
  isParkCluster: boolean;
  isCanadaCluster: boolean;
  hasMixedStatus: boolean;
}

const BOUNDS_DELTA_OFFSET = 0.05;

/**
 * Calculates the bounding box for a group of locations.
 */
export function calculateClusterBounds(
  items: EnrichedLocationPoint[],
): [[number, number], [number, number]] {
  if (items.length === 0) {
    return [
      [0, 0],
      [0, 0],
    ];
  }

  let minLat = items[0].lat;
  let maxLat = items[0].lat;
  let minLng = items[0].lng;
  let maxLng = items[0].lng;

  for (let i = 1; i < items.length; i++) {
    const it = items[i];
    if (it.lat < minLat) minLat = it.lat;
    if (it.lat > maxLat) maxLat = it.lat;
    if (it.lng < minLng) minLng = it.lng;
    if (it.lng > maxLng) maxLng = it.lng;
  }

  // If points are coincident or single-point, expand slightly so map zooms in effectively
  if (minLat === maxLat && minLng === maxLng) {
    return [
      [minLat - BOUNDS_DELTA_OFFSET, minLng - BOUNDS_DELTA_OFFSET],
      [maxLat + BOUNDS_DELTA_OFFSET, maxLng + BOUNDS_DELTA_OFFSET],
    ];
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Summarizes the visit statuses of a set of items in a cluster.
 */
export function calculateStatusSummary(items: EnrichedLocationPoint[]): ClusterStatusSummary {
  let visitedCount = 0;
  let partialCount = 0;
  let unvisitedCount = 0;

  for (const item of items) {
    if (item.isAllVisited || (item.visited && !item.isPartiallyVisited)) {
      visitedCount++;
    } else if (item.isPartiallyVisited) {
      partialCount++;
    } else {
      unvisitedCount++;
    }
  }

  return {
    visitedCount,
    partialCount,
    unvisitedCount,
    total: items.length,
  };
}

/**
 * Computes primary (front) and secondary (mid, back) colors for Option 1: Stacked Card Depth.
 */
export function resolveStackedCardColors(
  summary: ClusterStatusSummary,
  currentTheme: ColorThemeDefinition,
): { primaryColor: string; secondaryColors: [string, string] } {
  const visitedColor = currentTheme.markerVisitedColor || '#22c55e';
  const partialColor = currentTheme.markerPartialColor || '#f59e0b';
  const unvisitedColor = currentTheme.markerUnvisitedColor || '#64748b';

  // Front disc prioritizes showing visited > partial > unvisited
  let primaryColor = unvisitedColor;
  if (summary.visitedCount > 0) {
    primaryColor = visitedColor;
  } else if (summary.partialCount > 0) {
    primaryColor = partialColor;
  }

  // Determine which other statuses exist for mid and back layer discs
  const statusesPresent: string[] = [];
  if (summary.visitedCount > 0) statusesPresent.push(visitedColor);
  if (summary.partialCount > 0) statusesPresent.push(partialColor);
  if (summary.unvisitedCount > 0) statusesPresent.push(unvisitedColor);

  let midColor = primaryColor;
  let backColor = primaryColor;

  if (statusesPresent.length === 3) {
    // All 3 distinct statuses present
    midColor = partialColor;
    backColor = unvisitedColor;
  } else if (statusesPresent.length === 2) {
    // 2 distinct statuses present
    const otherColor = statusesPresent.find((c) => c !== primaryColor) || primaryColor;
    midColor = otherColor;
    backColor = primaryColor;
  }

  return {
    primaryColor,
    secondaryColors: [midColor, backColor],
  };
}

/**
 * Groups location markers into spatial clusters based on pixel distance at the current map zoom.
 * Hometowns are never clustered.
 */
export function groupMarkersIntoClusters(
  locations: EnrichedLocationPoint[],
  map: L.Map | undefined,
  currentTheme: ColorThemeDefinition,
  collisionRadiusPx: number = CLUSTER_COLLISION_RADIUS_PX,
  maxZoom: number = CLUSTER_MAX_ZOOM,
): MarkerClusterGroup[] {
  if (!locations || locations.length === 0) return [];

  // If map is absent or zoom is deeper than max clustering zoom, render each item as individual 1-item cluster
  const currentZoom = map && typeof map.getZoom === 'function' ? map.getZoom() : 0;
  const isClusteringDisabled = !map || currentZoom > maxZoom;

  if (isClusteringDisabled) {
    return locations.map((loc) => {
      const summary = calculateStatusSummary([loc]);
      const colors = resolveStackedCardColors(summary, currentTheme);
      return {
        id: loc.id,
        lat: loc.lat,
        lng: loc.lng,
        items: [loc],
        bounds: calculateClusterBounds([loc]),
        statusSummary: summary,
        primaryColor: colors.primaryColor,
        secondaryColors: colors.secondaryColors,
        isParkCluster: loc.id.includes('park'),
        isCanadaCluster: loc.country === 'Canada' || loc.sub === 'Canada',
        hasMixedStatus: false,
      };
    });
  }

  // Separate hometowns (which must never cluster) from cluster candidates
  const hometowns: EnrichedLocationPoint[] = [];
  const candidates: Array<{ location: EnrichedLocationPoint; point: L.Point }> = [];

  for (const loc of locations) {
    if (loc.lat === 0 && loc.lng === 0) continue;

    if (loc.id.startsWith('hometown-')) {
      hometowns.push(loc);
    } else {
      const pt = map.latLngToLayerPoint([loc.lat, loc.lng]);
      candidates.push({ location: loc, point: pt });
    }
  }

  // Connected components / spatial clustering in pixel space
  const visitedIndices = new Set<number>();
  const rawClusters: EnrichedLocationPoint[][] = [];

  for (let i = 0; i < candidates.length; i++) {
    if (visitedIndices.has(i)) continue;
    visitedIndices.add(i);

    const group: EnrichedLocationPoint[] = [candidates[i].location];
    const queue: number[] = [i];

    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      const currPt = candidates[currIdx].point;

      for (let j = 0; j < candidates.length; j++) {
        if (visitedIndices.has(j)) continue;

        const nextPt = candidates[j].point;
        const dx = currPt.x - nextPt.x;
        const dy = currPt.y - nextPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= collisionRadiusPx) {
          visitedIndices.add(j);
          group.push(candidates[j].location);
          queue.push(j);
        }
      }
    }
    rawClusters.push(group);
  }

  // Map raw clusters to MarkerClusterGroup objects
  const clusterGroups: MarkerClusterGroup[] = rawClusters.map((group) => {
    let latSum = 0;
    let lngSum = 0;
    let parkCount = 0;
    let canadaCount = 0;

    for (const item of group) {
      latSum += item.lat;
      lngSum += item.lng;
      if (item.id.includes('park')) parkCount++;
      if (item.country === 'Canada' || item.sub === 'Canada') canadaCount++;
    }

    const avgLat = latSum / group.length;
    const avgLng = lngSum / group.length;
    const summary = calculateStatusSummary(group);
    const colors = resolveStackedCardColors(summary, currentTheme);
    const isParkCluster = parkCount >= group.length / 2;
    const isCanadaCluster = canadaCount >= group.length / 2;
    const hasMixedStatus =
      [summary.visitedCount > 0, summary.partialCount > 0, summary.unvisitedCount > 0].filter(
        Boolean,
      ).length > 1;

    const clusterId =
      group.length === 1 ? group[0].id : `cluster-${group.map((g) => g.id).join('-')}`;

    return {
      id: clusterId,
      lat: avgLat,
      lng: avgLng,
      items: group,
      bounds: calculateClusterBounds(group),
      statusSummary: summary,
      primaryColor: colors.primaryColor,
      secondaryColors: colors.secondaryColors,
      isParkCluster,
      isCanadaCluster,
      hasMixedStatus,
    };
  });

  // Append individual hometown clusters
  for (const ht of hometowns) {
    const summary = calculateStatusSummary([ht]);
    const colors = resolveStackedCardColors(summary, currentTheme);
    clusterGroups.push({
      id: ht.id,
      lat: ht.lat,
      lng: ht.lng,
      items: [ht],
      bounds: calculateClusterBounds([ht]),
      statusSummary: summary,
      primaryColor: colors.primaryColor,
      secondaryColors: colors.secondaryColors,
      isParkCluster: false,
      isCanadaCluster: false,
      hasMixedStatus: false,
    });
  }

  return clusterGroups;
}
