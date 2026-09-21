import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteBuilderComponent } from './route-builder';
import { RoutingService } from '../../services/routing/routing.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { StateService } from '../../services/state.service';
import { Place } from '../../models/location.model';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('RouteBuilderComponent', () => {
  let component: RouteBuilderComponent;
  let fixture: ComponentFixture<RouteBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteBuilderComponent, HttpClientTestingModule, ReactiveFormsModule],
      providers: [RoutingService, LocalStorageService, StateService],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteBuilderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should manage stops and sync stopsQueries seamlessly', () => {
    expect(component.stops.length).toBe(0);
    expect(component.stopsQueries.length).toBe(0);

    component.addStop();
    expect(component.stops.length).toBe(1);
    expect(component.stops[0].isWaypointOnly).toBe(false);
    expect(component.stopsQueries.length).toBe(1);

    component.onStopQueryChange(0, 'Yellowstone');
    expect(component.stops[0].query).toBe('Yellowstone');
    expect(component.stopsQueries[0]).toBe('Yellowstone');

    component.removeStop(0);
    expect(component.stops.length).toBe(0);
    expect(component.stopsQueries.length).toBe(0);
  });

  it('should support adding corridor suggestions directly to stops', () => {
    const mockPlace = {
      id: 'np-yosemite',
      name: 'Yosemite National Park',
      category: 'national_park' as const,
      countryId: 'US',
      lat: 37.8651,
      lng: -119.5383,
      source: 'static' as const,
      isCurated: true,
    };

    component.suggestedCorridorPlaces = [
      {
        place: mockPlace,
        distanceMiles: 12.5,
      },
    ];

    component.addCorridorSuggestionToStops(mockPlace);

    expect(component.stops.length).toBe(1);
    expect(component.stops[0].query).toBe('Yosemite National Park');
    expect(component.stops[0].isWaypointOnly).toBe(false);
    expect(component.suggestedCorridorPlaces.length).toBe(0);
  });

  it('should save trip with Option A stop classification and synchronize place visits', () => {
    const stateService = TestBed.inject(StateService);
    stateService.updateSettings({
      ...stateService.getSettings(),
      familyMembers: [
        { id: 'm-1', name: 'Alice', color: '#10b981' },
        { id: 'm-2', name: 'Bob', color: '#3b82f6' },
      ],
      trips: [],
      placeVisits: {},
    });

    component.openModal();
    component.name = 'Sierra Tour';
    component.status = 'completed';
    component.startDate = '2026-08-01';
    component.endDate = '2026-08-05';
    component.selectedMembers = ['Alice', 'Bob'];
    component.startQuery = 'San Francisco';
    component.endQuery = 'Lake Tahoe';

    // Stop 1: Visited corridor stop
    // Stop 2: Waypoint only (routing guide)
    component.stops = [
      {
        query: 'Yosemite National Park',
        isWaypointOnly: false,
        stopType: 'corridor_stop',
      },
      {
        query: 'Gas Station Sonora Pass',
        isWaypointOnly: true,
        stopType: 'corridor_stop',
      },
    ];
    component.syncStopsQueries();

    // Mock calculated waypoints
    component.calculatedWaypoints = [
      { name: 'San Francisco, CA', lat: 37.77, lng: -122.41 },
      { name: 'Yosemite National Park', lat: 37.86, lng: -119.53 },
      { name: 'Gas Station Sonora Pass', lat: 38.32, lng: -119.63 },
      { name: 'Lake Tahoe, CA', lat: 39.09, lng: -120.03 },
    ];

    component.routeOptions = [
      {
        distance: 450000,
        duration: 20000,
        route: [
          [37.77, -122.41],
          [37.86, -119.53],
          [38.32, -119.63],
          [39.09, -120.03],
        ],
      },
    ];
    component.selectedOptionIndex = 0;

    component.saveRoute();

    const updatedSettings = stateService.getSettings();

    // 1. Trip is recorded in trips
    expect(updatedSettings.trips.length).toBe(1);
    expect(updatedSettings.trips[0].name).toBe('Sierra Tour');
    expect(updatedSettings.trips[0].destinations.length).toBe(2); // SF and Tahoe
    expect(updatedSettings.trips[0].corridorStops?.length).toBe(2);

    // 2. Non-waypoint corridor stop (Yosemite) received place visits for Alice and Bob
    expect(updatedSettings.placeVisits['np-yosemite']).toBeDefined();
    expect(updatedSettings.placeVisits['np-yosemite'].length).toBe(2);

    // 3. Waypoint-only stop (Gas Station) did NOT receive place visits (Option A)
    const gasStationId = Object.keys(updatedSettings.placeVisits).find((k) =>
      k.includes('gas-station'),
    );
    expect(gasStationId).toBeUndefined();

    // 4. Saved routes updated
    expect(updatedSettings.savedRoutes.length).toBe(1);
    expect(updatedSettings.savedRoutes[0].name).toBe('Sierra Tour');
  });

  it('should initialize with blank status and default dates when status is chosen', () => {
    component.openModal();
    expect(component.status).toBe('');
    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');

    // Selecting Completed defaults to ~1 month ago
    component.status = 'completed';
    component.onStatusChange();
    expect(component.startDate).toBeTruthy();
    expect(component.endDate).toBeTruthy();

    const pastDate = new Date(component.startDate + 'T00:00:00');
    const now = new Date();
    expect(pastDate.getTime()).toBeLessThan(now.getTime());

    // Selecting Planned defaults to ~1 month in the future
    component.hasUserManuallySelectedDates = false;
    component.startDate = '';
    component.endDate = '';
    component.status = 'planned';
    component.onStatusChange();
    const futureDate = new Date(component.startDate + 'T00:00:00');
    expect(futureDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should default status to completed if dates chosen are before today', () => {
    component.openModal();
    component.startDate = '2020-05-10';
    component.onStartDateChange();
    expect(component.status).toBe('completed');

    // Future date defaults to planned
    component.startDate = '2099-01-01';
    component.onStartDateChange();
    expect(component.status).toBe('planned');
  });

  it('should dynamically update trip name based on dates and locations until user edits name', () => {
    component.openModal();
    component.onStartQueryChange('Novi, MI, USA');
    component.onEndQueryChange('Traverse City, MI');
    expect(component.name).toBe('Novi to Traverse City');

    component.startDate = '2026-09-10';
    component.onStartDateChange();
    expect(component.name).toBe('September: Novi to Traverse City');

    // User manual edit locks the name
    component.name = 'Up North Getaway';
    component.onNameInput();

    component.onEndQueryChange('Mackinaw City, MI');
    expect(component.name).toBe('Up North Getaway');

    // Clearing the name resumes auto-naming
    component.name = '';
    component.onNameInput();
    expect(component.name).toBe('September: Novi to Mackinaw City');
  });

  it('should assume active home location as startQuery when creating a new trip, not the first in the list', () => {
    const stateService = TestBed.inject(StateService);
    stateService.updateSettings({
      ...stateService.getSettings(),
      hometowns: [
        { id: '1', name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
        { id: '2', name: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
      ],
    });

    component.openModal();
    expect(component.startQuery).toBe('Denver, CO');
  });

  it('should map member UUIDs to display names when editing an existing trip', () => {
    const stateService = TestBed.inject(StateService);
    stateService.updateSettings({
      ...stateService.getSettings(),
      familyMembers: [
        { id: 'uuid-bob', name: 'Bob', color: '#eab308' },
        { id: 'uuid-brittany', name: 'Brittany', color: '#06b6d4' },
      ],
    });

    component.editRoute({
      id: 'r-1',
      name: 'Spokane Road Trip',
      description: 'Vacation',
      startDate: '2022-04-01',
      endDate: '2022-04-08',
      status: 'completed',
      members: ['uuid-bob', 'uuid-brittany'],
      engine: 'osrm',
      distance: 1000,
      duration: 10,
      timestamp: 123456,
      startQuery: 'Spokane, WA',
      endQuery: 'Monterey, CA',
      stopsQueries: [],
      waypoints: [],
      route: [],
    });

    expect(component.selectedMembers).toEqual(['Bob', 'Brittany']);
    expect(component.getMemberName('uuid-bob')).toBe('Bob');
  });

  it('should filter out places already in stops, start location, or end location from corridor suggestions', () => {
    const mockCraterLake: Place = {
      id: 'np-crater-lake',
      name: 'Crater Lake National Park',
      category: 'national_park',
      countryId: 'US',
      lat: 42.9446,
      lng: -122.109,
      source: 'static',
      isCurated: true,
    };
    const mockHumboldt: Place = {
      id: 'sp-humboldt-redwoods',
      name: 'Humboldt Redwoods State Park',
      category: 'state_park',
      countryId: 'US',
      lat: 40.3344,
      lng: -123.9161,
      source: 'static',
      isCurated: true,
    };
    const mockPortland: Place = {
      id: 'city-portland',
      name: 'Portland',
      category: 'city',
      countryId: 'US',
      lat: 45.5152,
      lng: -122.6784,
      source: 'static',
      isCurated: true,
    };
    const mockBeaconRock: Place = {
      id: 'sp-beacon-rock',
      name: 'Beacon Rock State Park',
      category: 'state_park',
      countryId: 'US',
      lat: 45.6289,
      lng: -122.0222,
      source: 'static',
      isCurated: true,
    };

    component.startQuery = 'Spokane, WA';
    component.endQuery = 'Portland, OR';
    component.stops = [
      {
        query: 'Crater Lake National Park, OR',
        isWaypointOnly: false,
        stopType: 'corridor_stop',
      },
      {
        query: 'Humboldt Redwoods State Park',
        isWaypointOnly: false,
        stopType: 'corridor_stop',
      },
    ];
    component.syncStopsQueries();

    component.rawCorridorPlaces = [
      { place: mockCraterLake, distanceMiles: 0.1 },
      { place: mockHumboldt, distanceMiles: 0.0 },
      { place: mockPortland, distanceMiles: 0.2 },
      { place: mockBeaconRock, distanceMiles: 1.2 },
    ];

    component.refreshSuggestedCorridorPlaces();

    // Crater Lake, Humboldt, and Portland should all be filtered out.
    // Only Beacon Rock should remain.
    expect(component.suggestedCorridorPlaces.length).toBe(1);
    expect(component.suggestedCorridorPlaces[0].place.id).toBe('sp-beacon-rock');
  });

  it('should filter out places by coordinate proximity when stops are within 3 miles', () => {
    const mockPark: Place = {
      id: 'np-redwood',
      name: 'Redwood National Park',
      category: 'national_park',
      countryId: 'US',
      lat: 41.2132,
      lng: -124.0046,
      source: 'static',
      isCurated: true,
    };

    component.startQuery = 'San Francisco, CA';
    component.endQuery = 'Seattle, WA';
    component.stops = [
      {
        query: 'Klamath River Overlook',
        isWaypointOnly: false,
        stopType: 'corridor_stop',
        lat: 41.2135,
        lng: -124.005,
      },
    ];
    component.syncStopsQueries();

    component.rawCorridorPlaces = [{ place: mockPark, distanceMiles: 0.1 }];

    component.refreshSuggestedCorridorPlaces();
    expect(component.suggestedCorridorPlaces.length).toBe(0);
  });
});
