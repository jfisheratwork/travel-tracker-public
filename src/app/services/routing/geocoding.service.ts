import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Waypoint } from '../../models/route.model';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  constructor(private http: HttpClient) {}

  geocode(query: string): Observable<Waypoint> {
    const url = `${API_ENDPOINTS.NOMINATIM_SEARCH}?format=json&q=${encodeURIComponent(query)}&limit=1`;
    return this.http.get<any[]>(url).pipe(
      map((results) => {
        if (!results || results.length === 0) {
          throw new Error(`Location not found: ${query}`);
        }
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          name: query,
        };
      }),
    );
  }
}
