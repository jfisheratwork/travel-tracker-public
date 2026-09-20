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
  mapMode: MapMode;
  hasHometown?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MapRouteService {
  private currentPolylines: L.Polyline[] = [];
  private routeCoordinatesCache: { [timestamp: number]: [number, number][] } = {};

  constructor(
    private routingService: RoutingService,
    private logger: LoggerService,
  ) {}

  /**
   * Clears existing polylines and renders routes onto the Leaflet map.
   */
  public async renderRoutes(options: RenderRoutesOptions): Promise<L.Polyline[]> {
    const { map, savedRoutes = [], selectedRoute = null, mapMode, hasHometown = false } = options;

    this.clear();

    if (!map || mapMode !== 'roads') {
      return this.currentPolylines;
    }

    if (selectedRoute) {
      let coords =
        selectedRoute.coordinates && selectedRoute.coordinates.length > 0
          ? selectedRoute.coordinates
          : selectedRoute.route && selectedRoute.route.length > 0
            ? selectedRoute.route
            : this.routeCoordinatesCache[selectedRoute.timestamp];

      if (!coords && selectedRoute.waypoints && selectedRoute.waypoints.length > 0) {
        try {
          const routeOptions = await firstValueFrom(
            this.routingService.getRoutes(selectedRoute.engine, selectedRoute.waypoints),
          );
          if (routeOptions && routeOptions.length > 0) {
            coords = routeOptions[0].route;
            this.routeCoordinatesCache[selectedRoute.timestamp] = coords;
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

        if (selectedRoute.name) {
          polyline.bindTooltip(selectedRoute.name, { sticky: true });
        }

        this.currentPolylines.push(polyline);
        const bounds = polyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } else if (savedRoutes && savedRoutes.length > 0) {
      const allBounds: L.LatLngBounds[] = [];

      for (const route of savedRoutes) {
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
   * Cleans up any currently drawn polylines on the map.
   */
  public clear(): void {
    this.currentPolylines.forEach((p) => p.remove());
    this.currentPolylines = [];
  }
}
