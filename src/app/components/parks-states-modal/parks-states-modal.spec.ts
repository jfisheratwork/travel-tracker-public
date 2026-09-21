import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ParksStatesModal } from './parks-states-modal';
import { StateService } from '../../services/state.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { ToastService } from '../../core/services/toast.service';
import { BehaviorSubject, of } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/settings.model';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ParksStatesModal', () => {
  let component: ParksStatesModal;
  let fixture: ComponentFixture<ParksStatesModal>;
  let settings$: BehaviorSubject<AppSettings>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateServiceMock: any;
  let geocodingServiceMock: { searchLocations: ReturnType<typeof vi.fn> };
  let toastService: ToastService;

  const mockSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    familyMembers: [
      { id: 'm-1', name: 'Traveler 1', color: '#10b981' },
      { id: 'm-2', name: 'Traveler 2', color: '#3b82f6' },
    ],
    visitedStates: {
      California: [{ memberId: 'm-1' }],
      Alberta: [{ memberId: 'm-2' }],
    },
    visitedParks: {
      'np-yosemite': [{ memberId: 'm-1' }],
      'np-banff': [{ memberId: 'm-2' }],
    },
    placeVisits: {
      'np-yosemite': [{ placeId: 'np-yosemite', memberId: 'm-1', status: 'visited' }],
      'np-banff': [{ placeId: 'np-banff', memberId: 'm-2', status: 'visited' }],
    },
    customPlaces: [],
  };

  beforeEach(async () => {
    settings$ = new BehaviorSubject<AppSettings>(mockSettings);

    stateServiceMock = {
      settings$,
      updateSettings: vi.fn((s) => settings$.next(s)),
      setEditingLocation: vi.fn(),
    };

    geocodingServiceMock = {
      searchLocations: vi.fn().mockReturnValue(
        of([
          {
            name: 'Starved Rock State Park, Oglesby, IL',
            lat: 41.32,
            lng: -88.99,
          },
        ]),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ParksStatesModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ToastService,
        { provide: StateService, useValue: stateServiceMock },
        { provide: GeocodingService, useValue: geocodingServiceMock },
      ],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ParksStatesModal);
    component = fixture.componentInstance;
    component.mode = 'places';
    fixture.detectChanges();
  });

  it('should create and load places catalog in places mode', () => {
    expect(component).toBeTruthy();
    expect(component.locations.length).toBeGreaterThan(100);
  });

  it('should filter locations by Country (US and CA)', () => {
    component.countryFilter = 'CA';
    const canadianPlaces = component.filteredLocations;
    expect(canadianPlaces.length).toBeGreaterThan(10);
    expect(canadianPlaces.every((p) => p.countryId === 'CA' || p.countryName === 'Canada')).toBe(
      true,
    );

    component.countryFilter = 'US';
    const usPlaces = component.filteredLocations;
    expect(usPlaces.length).toBeGreaterThan(50);
    expect(usPlaces.every((p) => p.countryId === 'US' || p.countryName === 'United States')).toBe(
      true,
    );
  });

  it('should filter places by category chips (e.g. cities, state parks, capitals)', () => {
    component.selectedCategories = new Set(['city']);
    component.capitalsOnly = false;
    const cities = component.filteredLocations;
    expect(cities.every((c) => c.category === 'city')).toBe(true);
    expect(cities.some((c) => c.name.includes('Chicago'))).toBe(true);

    // Test Capitals Only toggle
    component.capitalsOnly = true;
    const capitals = component.filteredLocations;
    expect(capitals.every((c) => c.isCapital === true)).toBe(true);
  });

  it('should filter by search query across name, region, and tags', () => {
    component.searchQuery = 'Chicago';
    const chicago = component.filteredLocations;
    expect(chicago.some((p) => p.name.includes('Chicago'))).toBe(true);

    component.searchQuery = 'hiking';
    const hikingPlaces = component.filteredLocations;
    expect(hikingPlaces.length).toBeGreaterThan(0);
    expect(hikingPlaces.some((p) => p.tags?.includes('hiking'))).toBe(true);
  });

  it('should cycle member status from unvisited -> visited -> want -> unvisited in placeVisits', () => {
    const placeId = 'np-yellowstone';
    expect(component.getMemberStatus(placeId, 'm-1')).toBe('unvisited');

    // Cycle 1: unvisited -> visited
    component.cycleMemberStatus(placeId, 'm-1');
    expect(component.getMemberStatus(placeId, 'm-1')).toBe('visited');

    // Cycle 2: visited -> want
    component.cycleMemberStatus(placeId, 'm-1');
    expect(component.getMemberStatus(placeId, 'm-1')).toBe('want');

    // Cycle 3: want -> unvisited
    component.cycleMemberStatus(placeId, 'm-1');
    expect(component.getMemberStatus(placeId, 'm-1')).toBe('unvisited');
  });

  it('should switch mode between places, parks, and states cleanly', () => {
    // Places mode
    expect(component.mode).toBe('places');
    expect(component.locations.length).toBeGreaterThan(100);

    // Switch to Parks mode
    component.switchModalMode('parks');
    expect(component.mode).toBe('parks');
    expect(component.locations.every((l) => l.category === 'national_park')).toBe(true);

    // Switch to States mode
    component.switchModalMode('states');
    expect(component.mode).toBe('states');
    expect(component.locations.every((l) => l.category === 'region')).toBe(true);
  });

  it('should support secondary fallback OpenStreetMap search and track custom places', () => {
    component.searchQuery = 'Starved Rock';
    component.searchOsm();

    expect(geocodingServiceMock.searchLocations).toHaveBeenCalledWith('Starved Rock', 5);
    expect(component.osmResults.length).toBe(1);

    const toastSpy = vi.spyOn(toastService, 'showSuccess');
    component.addCustomPlaceFromOsm(component.osmResults[0]);

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('Added'));
    expect(component.osmResults.length).toBe(0);
    expect(component.viewModel?.customPlaces?.length).toBe(1);
    expect(component.viewModel?.customPlaces?.[0].name).toContain('Starved Rock');
  });
});
