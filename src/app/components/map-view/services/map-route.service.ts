// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
// DOCS: https://leafletjs.com/reference.html
import * as L from 'leaflet';
import { MapMode } from '../../../models/location.model';
import { MAP_THEME } from '../../../core/constants/map.constants';
import { RouteObject } from '../../../models/route.model';
import { RoutingService } from '../../../services/routing/routing.service';
import { LoggerService } from '../../../core/services/logger.service';

export interface RenderRoutesOptions {
  map: L.Map;
  savedRoutes?: RouteObject[];
  selectedRoute?: RouteObject | null;
  selectedRouteIds?: string[] | null;
  mapMode: MapMode;
  hasHometown?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MapRouteService {
  private currentPolylines: L.Polyline[] = [];
  private currentMarkers: L.Marker[] = [];
  private routeCoordinatesCache: { [timestamp: number]: [number, number][] } = {};

  constructor(
    private routingService: RoutingService,
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
      hasHometown = false,
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
      let coords =
        targetSingleRoute.coordinates && targetSingleRoute.coordinates.length > 0
          ? targetSingleRoute.coordinates
          : targetSingleRoute.route && targetSingleRoute.route.length > 0
            ? targetSingleRoute.route
            : this.routeCoordinatesCache[targetSingleRoute.timestamp];

      if (!coords && targetSingleRoute.waypoints && targetSingleRoute.waypoints.length > 0) {
        try {
          const routeOptions = await firstValueFrom(
            this.routingService.getRoutes(targetSingleRoute.engine, targetSingleRoute.waypoints),
          );
          if (routeOptions && routeOptions.length > 0) {
            coords = routeOptions[0].route;
            this.routeCoordinatesCache[targetSingleRoute.timestamp] = coords;
          }
        } catch (e) {
          this.logger.error('Failed to calculate route for rendering', e);
        }
      }

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
        let coords =
          route.coordinates && route.coordinates.length > 0
            ? route.coordinates
            : route.route && route.route.length > 0
              ? route.route
              : this.routeCoordinatesCache[route.timestamp];

        if (!coords && route.waypoints && route.waypoints.length > 0) {
          try {
            const routeOptions = await firstValueFrom(
              this.routingService.getRoutes(route.engine, route.waypoints),
            );
            if (routeOptions && routeOptions.length > 0) {
              coords = routeOptions[0].route;
              this.routeCoordinatesCache[route.timestamp] = coords;
            }
          } catch (e) {
            this.logger.error(`Failed to calculate route ${route.name}`, e);
          }
        }

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

      if (allBounds.length > 0 && !hasHometown) {
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
   * Cleans up any currently drawn polylines and stop markers on the map.
   */
  public clear(): void {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];
    this.currentMarkers.forEach((m) => m.remove());
    this.currentMarkers = [];
  }
}
