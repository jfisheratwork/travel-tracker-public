import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Waypoint } from '../../models/route.model';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

export interface RouteOption {
  distance: number;
  duration: number;
  route: [number, number][]; // [lat, lng] array
}

export interface RoutingAdapter {
  getRoutes(waypoints: Waypoint[]): Observable<RouteOption[]>;
}

export class OSRMRoutingAdapter implements RoutingAdapter {
  constructor(private http: HttpClient) {}

  getRoutes(waypoints: Waypoint[]): Observable<RouteOption[]> {
    const coordsStr = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(';');
    const url = `${API_ENDPOINTS.OSRM_DRIVING_ROUTE}/${coordsStr}?overview=full&geometries=geojson&alternatives=3`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response.routes || response.routes.length === 0) {
          throw new Error('No routes found from OSRM');
        }
        return response.routes.map((r: any) => ({
          distance: r.distance,
          duration: r.duration,
          route: r.geometry.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number],
          ),
        }));
      }),
    );
  }
}

export class MapboxRoutingAdapter implements RoutingAdapter {
  constructor(private http: HttpClient) {}

  getRoutes(waypoints: Waypoint[]): Observable<RouteOption[]> {
    const coordsStr = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(';');
    const token = environment.mapboxKey;
    if (!token || token === 'YOUR_MAPBOX_API_KEY') {
      throw new Error('Mapbox API key is not configured in environment.');
    }
    const url = `${API_ENDPOINTS.MAPBOX_DRIVING_ROUTE}/${coordsStr}?geometries=geojson&overview=full&alternatives=true&access_token=${token}`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response.routes || response.routes.length === 0) {
          throw new Error('No routes found from Mapbox');
        }
        return response.routes.map((r: any) => ({
          distance: r.distance,
          duration: r.duration,
          route: r.geometry.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number],
          ),
        }));
      }),
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  constructor(private http: HttpClient) {}

  getRoutes(engine: 'osrm' | 'mapbox', waypoints: Waypoint[]): Observable<RouteOption[]> {
    let adapter: RoutingAdapter;
    if (
      engine === 'mapbox' &&
      environment.mapboxKey &&
      environment.mapboxKey !== 'YOUR_MAPBOX_API_KEY'
    ) {
      adapter = new MapboxRoutingAdapter(this.http);
    } else {
      adapter = new OSRMRoutingAdapter(this.http);
    }
    return adapter.getRoutes(waypoints);
  }
}
