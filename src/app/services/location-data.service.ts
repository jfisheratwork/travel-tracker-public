import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
// DOCS: https://rxjs.dev/api/index/function/of
import { BehaviorSubject, of } from 'rxjs';
// DOCS: https://rxjs.dev/api/operators/catchError
import { catchError } from 'rxjs/operators';
import { LocationPoint } from '../models/location.model';
import { LoggerService } from '../core/services/logger.service';
import { COUNTRY_CAPITALS, NATIONAL_PARKS, STATES } from '../core/constants/geography.constants';

@Injectable({
  providedIn: 'root',
})
export class LocationDataService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  private parksSubject = new BehaviorSubject<LocationPoint[]>([]);
  public readonly parks$ = this.parksSubject.asObservable();

  private statesSubject = new BehaviorSubject<LocationPoint[]>([]);
  public readonly states$ = this.statesSubject.asObservable();

  private statesGeoJsonSubject = new BehaviorSubject<GeoJSON.FeatureCollection | null>(null);
  public readonly statesGeoJson$ = this.statesGeoJsonSubject.asObservable();

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.parksSubject.next(
      NATIONAL_PARKS.map((p) => ({
        id: `park-${p.id}`,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        region: p.sub || '',
        country: p.country || 'USA',
        sub: p.sub || '',
        visited: false,
        visitedBy: [],
      })),
    );

    const mappedStates = STATES.map((s) => ({
      id: `state-${s.id}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      region: s.sub || '',
      country: s.country || (s.sub === 'Canada' ? 'Canada' : 'USA'),
      sub: s.sub || '',
      visited: false,
      visitedBy: [],
    }));

    const mappedCountryCapitals = COUNTRY_CAPITALS.map((c) => ({
      id: `state-${c.id}`,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      region: c.sub || '',
      country: c.country || (c.sub === 'Canada' ? 'Canada' : 'USA'),
      sub: c.sub || '',
      visited: false,
      visitedBy: [],
      isCountryCapital: true,
    }));

    this.statesSubject.next([...mappedStates, ...mappedCountryCapitals]);

    this.http
      .get<GeoJSON.FeatureCollection>('assets/data/us_ca_states.geojson')
      .pipe(
        catchError((err) => {
          this.logger.error('Failed to load states GeoJSON data', err);
          return of(null);
        }),
      )
      .subscribe((geoJson) => {
        if (geoJson) {
          this.statesGeoJsonSubject.next(geoJson);
        }
      });
  }
}
