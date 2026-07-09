import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Waypoint } from '../../models/route.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  constructor(private http: HttpClient) {}

  searchLocations(query: string, limit: number = 5): Observable<Waypoint[]> {
    const token = environment.mapboxKey;
    if (token && token !== 'YOUR_MAPBOX_API_KEY') {
      const url = `${API_ENDPOINTS.MAPBOX_GEOCODE}?q=${encodeURIComponent(query)}&access_token=${token}&limit=${limit}`;
      return this.http.get<any>(url).pipe(
        map((response) => {
          if (!response.features || response.features.length === 0) {
            return [];
          }
          return response.features.map((f: any) => ({
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            name: f.properties.full_address || f.properties.name,
          }));
        }),
      );
    }

    const url = `${API_ENDPOINTS.NOMINATIM_SEARCH}?format=json&q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.http.get<any[]>(url).pipe(
      map((results) => {
        if (!results || results.length === 0) {
          return [];
        }
        return results.map((r: any) => ({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          name: r.display_name,
        }));
      }),
    );
  }

  geocode(query: string): Observable<Waypoint> {
    return this.searchLocations(query, 1).pipe(
      map((results) => {
        if (results.length === 0) {
          throw new Error(`Location not found: ${query}`);
        }
        return results[0];
      }),
    );
  }
}
