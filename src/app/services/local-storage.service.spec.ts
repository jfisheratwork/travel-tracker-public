import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalStorageService } from './local-storage.service';
import { StateService } from './state.service';
import { ToastService } from '../core/services/toast.service';
import { DEFAULT_SETTINGS } from '../models/settings.model';
import { Trip } from '../models/trip.model';
import { Place, PlaceVisit } from '../models/location.model';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let stateService: StateService;
  let toastService: ToastService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        StateService,
        ToastService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    stateService = TestBed.inject(StateService);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and initialize default V4 settings when storage is empty', () => {
    service = TestBed.inject(LocalStorageService);
    expect(service).toBeTruthy();

    const current = stateService.getSettings();
    expect(current.schemaVersion).toBe(4);
    expect(current.trips).toEqual([]);
    expect(current.customPlaces).toEqual([]);
    expect(current.placeVisits).toEqual({});
    expect(current.tags.length).toBeGreaterThan(0);
  });

  it('should alert and reset to default V4 settings when pre-V4 data is loaded from storage', () => {
    const showInfoSpy = vi.spyOn(toastService, 'showInfo');
    const legacyData = {
      familyMembers: [{ id: 'm-1', name: 'Alice', color: '#ff0000' }],
      visitedStates: { 'US-CA': [{ memberId: 'm-1' }] },
      // Note: no schemaVersion
    };
    localStorage.setItem('np_travel_settings', JSON.stringify(legacyData));

    service = TestBed.inject(LocalStorageService);

    expect(showInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Welcome to Travel Tracker V4!'),
    );
    const current = stateService.getSettings();
    expect(current.schemaVersion).toBe(4);
    expect(current.trips).toEqual([]);
  });

  it('should preserve valid Schema V4 data with trips, custom places, and place visits', () => {
    const sampleTrip: Trip = {
      id: 'trip-1',
      name: 'Pacific Northwest Tour',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      travelerIds: ['m-1'],
      destinations: [
        {
          placeId: 'us-olympic',
          name: 'Olympic National Park',
          lat: 47.8021,
          lng: -123.6044,
          stopType: 'destination',
        },
      ],
      corridorStops: [
        {
          placeId: 'sp-scenic',
          name: 'Scenic Overlook',
          lat: 47.5,
          lng: -123.0,
          stopType: 'corridor_stop',
          isWaypointOnly: true,
        },
      ],
      transitRegionIds: ['US-WA', 'US-OR'],
      highlights: ['Watched sunset at Ruby Beach'],
    };

    const sampleCustomPlace: Place = {
      id: 'custom-beacon-rock',
      name: 'Beacon Rock State Park',
      category: 'state_park',
      countryId: 'US',
      regionId: 'US-WA',
      lat: 45.6289,
      lng: -122.0222,
      source: 'user',
      tags: ['hiking', 'scenic'],
    };

    const sampleVisit: PlaceVisit = {
      placeId: 'us-olympic',
      memberId: 'm-1',
      status: 'visited',
      tripId: 'trip-1',
    };

    const v4Data = {
      ...DEFAULT_SETTINGS,
      schemaVersion: 4,
      familyMembers: [{ id: 'm-1', name: 'Alice', color: '#ff0000' }],
      trips: [sampleTrip],
      customPlaces: [sampleCustomPlace],
      placeVisits: {
        'us-olympic': [sampleVisit],
      },
      tags: ['hiking', 'camping', 'scenic'],
    };
    localStorage.setItem('np_travel_settings', JSON.stringify(v4Data));

    service = TestBed.inject(LocalStorageService);

    const loaded = stateService.getSettings();
    expect(loaded.schemaVersion).toBe(4);
    expect(loaded.trips.length).toBe(1);
    expect(loaded.trips[0].name).toBe('Pacific Northwest Tour');
    expect(loaded.trips[0].destinations.length).toBe(1);
    expect(loaded.trips[0].corridorStops?.[0].isWaypointOnly).toBe(true);
    expect(loaded.customPlaces.length).toBe(1);
    expect(loaded.customPlaces[0].name).toBe('Beacon Rock State Park');
    expect(loaded.placeVisits['us-olympic'].length).toBe(1);
    expect(loaded.placeVisits['us-olympic'][0].tripId).toBe('trip-1');
  });

  it('should reject importing a backup file if schemaVersion is not 4', () => {
    service = TestBed.inject(LocalStorageService);
    const legacyJson = JSON.stringify({
      meta: { version: 'v3' },
      settings: {
        familyMembers: [{ name: 'Bob' }],
      },
    });

    const result = service.importBackup(legacyJson);
    expect(result.success).toBe(false);
    expect(result.message).toContain('older schema version (< 4)');
  });

  it('should successfully import a valid Schema V4 backup file', () => {
    service = TestBed.inject(LocalStorageService);
    const validV4Json = JSON.stringify({
      meta: { version: 'v4-angular', schemaVersion: 4 },
      settings: {
        schemaVersion: 4,
        familyMembers: [{ id: 'm-2', name: 'Charlie', color: '#00ff00' }],
        trips: [],
        customPlaces: [],
        placeVisits: {},
        tags: ['hiking', 'roadtrip'],
      },
    });

    const result = service.importBackup(validV4Json);
    expect(result.success).toBe(true);

    const current = stateService.getSettings();
    expect(current.familyMembers[0].name).toBe('Charlie');
    expect(current.tags).toEqual(['hiking', 'roadtrip']);
  });

  it('should recognize first visit or no data correctly with V4 entities', () => {
    service = TestBed.inject(LocalStorageService);
    expect(service.isFirstVisitOrNoData()).toBe(true);

    // If trips exist, it is not first visit / empty
    stateService.updateSettings({
      ...DEFAULT_SETTINGS,
      trips: [
        {
          id: 't-1',
          name: 'Road trip',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
          travelerIds: [],
          destinations: [],
        },
      ],
    });
    expect(service.isFirstVisitOrNoData()).toBe(false);
  });
});
