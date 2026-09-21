// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { MapMode } from '../../../models/location.model';
import { MAP_THEME } from '../../../core/constants/map.constants';
import { RouteObject, Waypoint } from '../../../models/route.model';
import { RoutingService } from '../../../services/routing/routing.service';
import { GeocodingService } from '../../../services/routing/geocoding.service';
import { StateService } from '../../../services/state.service';
import { LoggerService } from '../../../core/services/logger.service';

export interface RenderRoutesOptions {
  map: L.Map;
  savedRoutes?: RouteObject[];
  selectedRoute?: RouteObject | null;
  selectedRouteIds?: string[] | null;
  mapMode: MapMode;
  hasHometown?: boolean;
}

const METERS_PER_MILE = 1609.34;

@Injectable({
  providedIn: 'root',
})
export class MapRouteService {
  private currentPolylines: L.Polyline[] = [];
  private currentMarkers: L.Marker[] = [];
  private routeCoordinatesCache: { [timestamp: number]: [number, number][] } = {};

  constructor(
    private routingService: RoutingService,
    private geocodingService: GeocodingService,
    private stateService: StateService,
    private logger: LoggerService,
  ) {}

  /**
   * Clears existing polylines and renders routes onto the Leaflet map.
   */
  public async renderRoutes(options: RenderRoutesOptions): Promise<L.Polyline[]> {
    const {
      map,
      savedRoutes = [],
      selectedRoute = null,
      selectedRouteIds = null,
      mapMode,
    } = options;

    this.clear();

    if (!map || mapMode !== 'roads') {
      return this.currentPolylines;
    }

    // Determine target routes to render based on selectedRouteIds or selectedRoute
    let targetSingleRoute: RouteObject | null = selectedRoute;
    let targetRoutesToDraw: RouteObject[] = [];

    if (selectedRouteIds && selectedRouteIds.length > 0) {
      const matched = savedRoutes.filter((r) =>
        selectedRouteIds.includes(r.id || String(r.timestamp) || r.name),
      );
      if (matched.length === 1) {
        targetSingleRoute = matched[0];
      } else {
        targetSingleRoute = null;
        targetRoutesToDraw = matched;
      }
    } else if (selectedRoute) {
      targetSingleRoute = selectedRoute;
    } else {
      // Draw all saved routes
      targetSingleRoute = null;
      targetRoutesToDraw = savedRoutes;
    }

    if (targetSingleRoute) {
      const coords = await this.ensureRouteCoordinates(targetSingleRoute);

      if (coords && coords.length > 0) {
        // DOCS: https://leafletjs.com/reference.html#polyline
        const polyline = L.polyline(coords, {
          color: MAP_THEME.ROUTE_POLYLINE_COLOR,
          weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
          opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
        }).addTo(map);

        if (targetSingleRoute.name) {
          polyline.bindTooltip(targetSingleRoute.name, { sticky: true });
        }

        this.currentPolylines.push(polyline);
        const bounds = polyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }

      // Render badged stop markers for trip waypoints
      if (targetSingleRoute.waypoints && targetSingleRoute.waypoints.length > 0) {
        targetSingleRoute.waypoints.forEach((wp, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === targetSingleRoute!.waypoints.length - 1;
          const badgeText = isStart ? '🏁' : isEnd ? '🏆' : `${idx}`;
          const bgColor = isStart ? '#10b981' : isEnd ? '#ef4444' : '#2563eb';

          // DOCS: https://leafletjs.com/reference.html#divicon
          const icon = L.divIcon({
            className: 'trip-stop-marker-icon',
            html: `<div style="background: ${bgColor}; color: white; border-radius: 9999px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">${badgeText}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const marker = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
          const label = isStart
            ? `Start: ${wp.name}`
            : isEnd
              ? `Destination: ${wp.name}`
              : `Stop ${idx}: ${wp.name}`;
          marker.bindTooltip(label, { direction: 'top', offset: [0, -12] });
          this.currentMarkers.push(marker);
        });
      }
    } else if (targetRoutesToDraw && targetRoutesToDraw.length > 0) {
      const allBounds: L.LatLngBounds[] = [];

      for (const route of targetRoutesToDraw) {
        const coords = await this.ensureRouteCoordinates(route);

        if (coords && coords.length > 0) {
          const polyline = L.polyline(coords, {
            color: MAP_THEME.ROUTE_POLYLINE_COLOR,
            weight: MAP_THEME.ROUTE_POLYLINE_WEIGHT,
            opacity: MAP_THEME.ROUTE_POLYLINE_OPACITY,
          }).addTo(map);

          if (route.name) {
            polyline.bindTooltip(route.name, { sticky: true });
          }

          this.currentPolylines.push(polyline);
          const b = polyline.getBounds();
          if (b.isValid()) {
            allBounds.push(b);
          }
        }
      }

      if (allBounds.length > 0) {
        let groupBounds = allBounds[0];
        for (let i = 1; i < allBounds.length; i++) {
          groupBounds = groupBounds.extend(allBounds[i]);
        }
        if (groupBounds.isValid()) {
          map.fitBounds(groupBounds, { padding: [50, 50] });
        }
      }
    }

    return this.currentPolylines;
  }

  /**
   * Ensures a route has driving coordinates. If waypoints or coordinates are missing,
   * it automatically geocodes the stop queries, calls the routing service, and updates state.
   */
  private async ensureRouteCoordinates(route: RouteObject): Promise<[number, number][] | null> {
    let coords =
      route.coordinates && route.coordinates.length > 0
        ? route.coordinates
        : route.route && route.route.length > 0
          ? route.route
          : this.routeCoordinatesCache[route.timestamp];

    if (coords && coords.length > 0) {
      return coords;
    }

    // 1. Geocode waypoints if missing but queries are present
    if (
      (!route.waypoints || route.waypoints.length === 0) &&
      (route.startQuery || route.endQuery)
    ) {
      const queries = [route.startQuery, ...(route.stopsQueries || []), route.endQuery].filter(
        (q): q is string => Boolean(q && q.trim().length > 0),
      );

      if (queries.length >= 2) {
        const resolvedWaypoints: Waypoint[] = [];
        for (const query of queries) {
          try {
            const wp = await firstValueFrom(this.geocodingService.geocode(query));
            if (wp) {
              resolvedWaypoints.push(wp);
            }
          } catch (err) {
            this.logger.warn(`Failed to geocode "${query}" for route "${route.name}"`, err);
          }
        }

        if (resolvedWaypoints.length >= 2) {
          route.waypoints = resolvedWaypoints;
          this.updateRouteInSettings(route);
        }
      }
    }

    // 2. Fetch routing engine coordinates
    if (route.waypoints && route.waypoints.length >= 2) {
      try {
        const engine = route.engine || 'osrm';
        const routeOptions = await firstValueFrom(
          this.routingService.getRoutes(engine, route.waypoints),
        );
        if (routeOptions && routeOptions.length > 0 && routeOptions[0].route) {
          coords = routeOptions[0].route;
          this.routeCoordinatesCache[route.timestamp] = coords;
          route.route = coords;
          route.coordinates = coords;
          route.distance = routeOptions[0].distance;
          route.duration = routeOptions[0].duration;
          this.updateRouteInSettings(route);
          return coords;
        }
      } catch (e) {
        this.logger.error(`Failed to calculate route coordinates for "${route.name}"`, e);
      }
    }

    return null;
  }

  /**
   * Persists newly computed waypoints and polyline coordinates to application settings.
   */
  private updateRouteInSettings(route: RouteObject): void {
    const current = this.stateService.getSettings();
    if (!current.savedRoutes) return;

    const idx = current.savedRoutes.findIndex(
      (r) => (r.id || String(r.timestamp)) === (route.id || String(route.timestamp)),
    );

    if (idx !== -1) {
      const updatedSavedRoutes = [...current.savedRoutes];
      updatedSavedRoutes[idx] = { ...route };

      const updatedTrips = (current.trips || []).map((t) => {
        if (t.name === route.name || t.startDate === route.startDate) {
          return {
            ...t,
            coordinates: route.route || route.coordinates,
            distanceMiles: route.distance
              ? Math.round(route.distance / METERS_PER_MILE)
              : t.distanceMiles,
          };
        }
        return t;
      });

      this.stateService.updateSettings({
        ...current,
        savedRoutes: updatedSavedRoutes,
        trips: updatedTrips,
      });
    }
  }

  /**
   * Cleans up any currently drawn polylines and stop markers on the map.
   */
  public clear(): void {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];
    this.currentMarkers.forEach((m) => m.remove());
    this.currentMarkers = [];
  }
}
