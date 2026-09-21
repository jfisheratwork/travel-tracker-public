import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteBuilderComponent } from './route-builder';
import { RoutingService } from '../../services/routing/routing.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { StateService } from '../../services/state.service';
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
});
