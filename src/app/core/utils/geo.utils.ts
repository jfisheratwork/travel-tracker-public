/**
 * Geo coordinate utilities for map visualization and routing.
 */

/**
 * Reduces the density of a coordinate route array based on a reduction factor.
 * Ensures the last coordinate in the route is always preserved.
 *
 * @param route Array of latitude/longitude coordinate pairs
 * @param routeReduction Ratio of coordinates to retain (e.g. 0.5 retains ~50%)
 * @returns Decimated array of coordinates
 */
export function reduceCoordinates(
  route: [number, number][],
  routeReduction: number,
): [number, number][] {
  if (!route || route.length <= 2 || routeReduction >= 1 || routeReduction <= 0) {
    return route;
  }

  const reduced: [number, number][] = [];
  const step = Math.max(1, Math.ceil(1 / routeReduction));

  for (let i = 0; i < route.length; i += step) {
    reduced.push(route[i]);
  }

  const lastOriginalCoord = route[route.length - 1];
  const lastReducedCoord = reduced[reduced.length - 1];

  if (
    lastReducedCoord[0] !== lastOriginalCoord[0] ||
    lastReducedCoord[1] !== lastOriginalCoord[1]
  ) {
    reduced.push(lastOriginalCoord);
  }

  return reduced;
}

// DOCS: https://en.wikipedia.org/wiki/Haversine_formula
export const EARTH_RADIUS_MILES = 3958.8;
export const DEGREES_TO_RADIANS = Math.PI / 180;
export const DEFAULT_CORRIDOR_BUFFER_MILES = 50;

/**
 * Calculates great-circle distance between two GPS coordinates using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in statute miles
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEGREES_TO_RADIANS;
  const dLon = (lon2 - lon1) * DEGREES_TO_RADIANS;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEGREES_TO_RADIANS) *
      Math.cos(lat2 * DEGREES_TO_RADIANS) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculates perpendicular distance from a point to a 2D line segment on earth.
 */
export function distanceToSegmentMiles(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dx = (bLng - aLng) * Math.cos(((aLat + bLat) / 2) * DEGREES_TO_RADIANS);
  const dy = bLat - aLat;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return haversineDistanceMiles(pLat, pLng, aLat, aLng);
  }

  const px = (pLng - aLng) * Math.cos(((aLat + pLat) / 2) * DEGREES_TO_RADIANS);
  const py = pLat - aLat;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);

  return haversineDistanceMiles(pLat, pLng, projLat, projLng);
}

/**
 * Calculates the shortest distance from a point to any segment of a polyline in miles.
 */
export function distanceToPolylineMiles(
  point: [number, number],
  polyline: [number, number][],
): number {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineDistanceMiles(point[0], point[1], polyline[0][0], polyline[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegmentMiles(
      point[0],
      point[1],
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1],
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

export interface CorridorPlaceMatch<T = { lat: number; lng: number }> {
  place: T;
  distanceMiles: number;
}

/**
 * Filters and ranks places situated within a defined corridor buffer of a route polyline.
 *
 * @param polyline Array of [lat, lng] coordinates along the route
 * @param places Collection of places to filter
 * @param maxDistanceMiles Maximum perpendicular distance in miles from the route corridor
 * @returns Array of matches sorted ascending by distance to route
 */
export function findPlacesInCorridor<T extends { lat: number; lng: number }>(
  polyline: [number, number][],
  places: T[],
  maxDistanceMiles: number = DEFAULT_CORRIDOR_BUFFER_MILES,
): CorridorPlaceMatch<T>[] {
  if (!polyline || polyline.length === 0 || !places || places.length === 0) {
    return [];
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of polyline) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const MILES_PER_LAT_DEGREE = 69;
  const latBufferDegrees = maxDistanceMiles / MILES_PER_LAT_DEGREE;
  const avgLat = (minLat + maxLat) / 2;
  const lngBufferDegrees =
    maxDistanceMiles /
    (MILES_PER_LAT_DEGREE * Math.max(0.1, Math.cos(avgLat * DEGREES_TO_RADIANS)));

  const bufferedMinLat = minLat - latBufferDegrees;
  const bufferedMaxLat = maxLat + latBufferDegrees;
  const bufferedMinLng = minLng - lngBufferDegrees;
  const bufferedMaxLng = maxLng + lngBufferDegrees;

  const matches: CorridorPlaceMatch<T>[] = [];

  for (const place of places) {
    if (
      place.lat < bufferedMinLat ||
      place.lat > bufferedMaxLat ||
      place.lng < bufferedMinLng ||
      place.lng > bufferedMaxLng
    ) {
      continue;
    }

    const dist = distanceToPolylineMiles([place.lat, place.lng], polyline);
    if (dist <= maxDistanceMiles) {
      matches.push({
        place,
        distanceMiles: Math.round(dist * 10) / 10,
      });
    }
  }

  matches.sort((a, b) => a.distanceMiles - b.distanceMiles);
  return matches;
}
