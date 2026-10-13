import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocationDataService } from './location-data.service';
import { STATIC_PLACES_MAP } from '../core/constants/curated-places.constants';
import { Place } from '../models/location.model';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('LocationDataService', () => {
  let service: LocationDataService;
  let httpTestingController: HttpTestingController;

  const mockExtendedPlaces: Place[] = [
    {
      id: 'city-us-ann-arbor-mi',
      name: 'Ann Arbor',
      category: 'city',
      countryId: 'US',
      regionId: 'US-MI',
      lat: 42.2808,
      lng: -83.743,
      source: 'static',
      isCurated: true,
      tags: ['city', 'usa', 'united states', 'michigan', 'mi', 'ann arbor'],
    },
    {
      id: 'sp-us-starved-rock-il',
      name: 'Starved Rock State Park',
      category: 'state_park',
      countryId: 'US',
      regionId: 'US-IL',
      lat: 41.32,
      lng: -88.99,
      source: 'static',
      isCurated: true,
      tags: ['state_park', 'park', 'usa', 'illinois', 'il', 'starved rock'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationDataService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LocationDataService);
    httpTestingController = TestBed.inject(HttpTestingController);

    // Handle constructor GeoJSON requests
    const statesReq = httpTestingController.expectOne('assets/data/us_ca_states.geojson');
    statesReq.flush({ type: 'FeatureCollection', features: [] });
    const worldReq = httpTestingController.expectOne('assets/data/world_countries.geojson');
    worldReq.flush({ type: 'FeatureCollection', features: [] });
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should initialize with parks and states data', () => {
    expect(service).toBeTruthy();
  });

  it('should lazily load extended places and populate STATIC_PLACES_MAP and extendedPlaces$', () => {
    let emittedPlaces: Place[] = [];
    service.extendedPlaces$.subscribe((places) => {
      emittedPlaces = places;
    });

    expect(emittedPlaces.length).toBe(0);

    service.loadExtendedPlaces().subscribe((places) => {
      expect(places.length).toBe(2);
      expect(places[0].name).toBe('Ann Arbor');
    });

    const req = httpTestingController.expectOne('assets/data/extended-places.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockExtendedPlaces);

    expect(emittedPlaces.length).toBe(2);
    expect(STATIC_PLACES_MAP.get('city-us-ann-arbor-mi')).toBeTruthy();
    expect(STATIC_PLACES_MAP.get('ann arbor')).toBeTruthy();
    expect(STATIC_PLACES_MAP.get('sp-us-starved-rock-il')).toBeTruthy();
  });

  it('should return cached extended places on subsequent calls without new network request', () => {
    service.loadExtendedPlaces().subscribe();
    const req = httpTestingController.expectOne('assets/data/extended-places.json');
    req.flush(mockExtendedPlaces);

    // Call second time
    let secondResult: Place[] = [];
    service.loadExtendedPlaces().subscribe((places) => {
      secondResult = places;
    });

    httpTestingController.expectNone('assets/data/extended-places.json');
    expect(secondResult.length).toBe(2);
  });
});
