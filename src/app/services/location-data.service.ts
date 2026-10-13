import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
// DOCS: https://rxjs.dev/api/index/function/of
// DOCS: https://rxjs.dev/api/index/function/combineLatest
// DOCS: https://rxjs.dev/api/index/class/Observable
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
// DOCS: https://rxjs.dev/api/operators/catchError
// DOCS: https://rxjs.dev/api/operators/tap
import { catchError, tap } from 'rxjs/operators';
import { LocationPoint, Place } from '../models/location.model';
import { LoggerService } from '../core/services/logger.service';
import { COUNTRY_CAPITALS, NATIONAL_PARKS, STATES } from '../core/constants/geography.constants';
import { STATIC_PLACES_MAP } from '../core/constants/curated-places.constants';

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

  private extendedPlacesSubject = new BehaviorSubject<Place[]>([]);
  public readonly extendedPlaces$ = this.extendedPlacesSubject.asObservable();
  private extendedPlacesLoaded = false;

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

    const statesGeo$ = this.http
      .get<GeoJSON.FeatureCollection>('assets/data/us_ca_states.geojson')
      .pipe(
        catchError((err) => {
          this.logger.error('Failed to load states GeoJSON data', err);
          return of(null);
        }),
      );

    const worldCountriesGeo$ = this.http
      .get<GeoJSON.FeatureCollection>('assets/data/world_countries.geojson')
      .pipe(
        catchError(() => {
          return of(null);
        }),
      );

    combineLatest([statesGeo$, worldCountriesGeo$]).subscribe(([statesGeo, worldGeo]) => {
      if (!statesGeo && !worldGeo) {
        return;
      }
      const combinedFeatures: GeoJSON.Feature[] = [
        ...(statesGeo?.features || []),
        ...(worldGeo?.features || []),
      ];
      this.statesGeoJsonSubject.next({
        type: 'FeatureCollection',
        features: combinedFeatures,
      });
    });
  }

  /**
   * Lazily loads extended places (cities >= 60k population, state & provincial parks)
   * from static JSON asset, populating the extendedPlaces$ stream and static lookup map.
   */
  public loadExtendedPlaces(): Observable<Place[]> {
    if (this.extendedPlacesLoaded) {
      return of(this.extendedPlacesSubject.value);
    }

    return this.http.get<Place[]>('assets/data/extended-places.json').pipe(
      tap((places) => {
        for (const place of places) {
          STATIC_PLACES_MAP.set(place.id, place);
          const nameKey = place.name.toLowerCase().trim();
          if (!STATIC_PLACES_MAP.has(nameKey)) {
            STATIC_PLACES_MAP.set(nameKey, place);
          }
        }
        this.extendedPlacesLoaded = true;
        this.extendedPlacesSubject.next(places);
      }),
      catchError((err) => {
        this.logger.error('Failed to load extended places data', err);
        return of([]);
      }),
    );
  }
}
