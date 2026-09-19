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
