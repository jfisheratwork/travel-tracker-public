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

    // Switch to States (Regions & Countries) mode
    component.switchModalMode('states');
    expect(component.mode).toBe('states');
    expect(
      component.locations.every((l) => l.category === 'region' || l.category === 'country'),
    ).toBe(true);
    expect(component.locations.some((l) => l.id === 'France' && l.category === 'country')).toBe(
      true,
    );
  });

  it('should include countries (e.g., France) in places mode and filter by country category chip', () => {
    expect(component.locations.some((l) => l.id === 'France' && l.category === 'country')).toBe(
      true,
    );

    component.selectedCategories = new Set(['country']);
    const countries = component.filteredLocations;
    expect(countries.length).toBe(193);
    expect(countries.every((c) => c.category === 'country')).toBe(true);
    expect(countries.some((c) => c.name === 'France')).toBe(true);
  });

  it('should automatically log parent country (France) when marking Paris as visited, and parent region + country when marking Chicago as visited', () => {
    expect(component.getMemberStatus('city-paris', 'm-1')).toBe('unvisited');
    expect(component.getMemberStatus('France', 'm-1')).toBe('unvisited');

    // Mark Paris as visited for Traveler 1
    component.setMemberStatus('city-paris', 'm-1', 'visited');

    expect(component.getMemberStatus('city-paris', 'm-1')).toBe('visited');
    expect(component.getMemberStatus('France', 'm-1')).toBe('visited');
    expect(component.viewModel?.visitedStates?.['France']?.some((v) => v.memberId === 'm-1')).toBe(
      true,
    );

    // Mark Chicago as visited for Traveler 2 -> should auto-log Illinois and United States
    component.setMemberStatus('city-chicago', 'm-2', 'visited');
    expect(component.getMemberStatus('city-chicago', 'm-2')).toBe('visited');
    expect(component.getMemberStatus('Illinois', 'm-2')).toBe('visited');
    expect(component.getMemberStatus('United States', 'm-2')).toBe('visited');
  });

  it('should require a category (landmark, state_park, city) when tracking custom places from OpenStreetMap', () => {
    component.searchQuery = 'Starved Rock';
    component.searchOsm();

    expect(geocodingServiceMock.searchLocations).toHaveBeenCalledWith('Starved Rock', 5);
    expect(component.osmResults.length).toBe(1);

    const errorSpy = vi.spyOn(toastService, 'showError');
    const successSpy = vi.spyOn(toastService, 'showSuccess');

    // Attempt to add without selecting a category -> should error and not add
    component.addCustomPlaceFromOsm(component.osmResults[0], undefined, 0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Please select Landmark, State Park, or City'),
      }),
    );
    expect(component.viewModel?.customPlaces?.length).toBe(0);

    // Select 'state_park' category and add
    component.setOsmCategory(0, 'state_park');
    component.addCustomPlaceFromOsm(component.osmResults[0], undefined, 0);

    expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('State Park'));
    expect(component.osmResults.length).toBe(0);
    expect(component.viewModel?.customPlaces?.length).toBe(1);
    expect(component.viewModel?.customPlaces?.[0].name).toContain('Starved Rock');
    expect(component.viewModel?.customPlaces?.[0].category).toBe('state_park');
    expect(component.viewModel?.customPlaces?.[0].regionId).toBe('US-IL');
    expect(component.viewModel?.customPlaces?.[0].countryId).toBe('US');

    // Verify custom place appears when filtering by state_park
    component.selectedCategories = new Set(['state_park']);
    component.searchQuery = 'Starved Rock';
    expect(
      component.filteredLocations.some(
        (l) => l.name.includes('Starved Rock') && l.category === 'state_park',
      ),
    ).toBe(true);
  });

  it('should bulk mark all unvisited national parks as want while preserving visited parks', () => {
    // np-yosemite is already visited by m-1 in mockSettings
    expect(component.getMemberStatus('np-yosemite', 'm-1')).toBe('visited');
    expect(component.getMemberStatus('np-yellowstone', 'm-1')).toBe('unvisited');

    component.countryFilter = 'US';
    component.markAllNationalParksWant();

    // Unvisited US national park becomes 'want'
    expect(component.getMemberStatus('np-yellowstone', 'm-1')).toBe('want');
    expect(component.getMemberStatus('np-yellowstone', 'm-2')).toBe('want');
    // Already visited park stays 'visited' for m-1
    expect(component.getMemberStatus('np-yosemite', 'm-1')).toBe('visited');
  });

  it('should bulk mark all unvisited state parks for a specific state as want', () => {
    const ilStatePark = component.locations.find(
      (l) => l.category === 'state_park' && l.regionId === 'US-IL',
    );
    const caStatePark = component.locations.find(
      (l) => l.category === 'state_park' && l.regionId === 'US-CA',
    );
    expect(ilStatePark).toBeTruthy();
    expect(caStatePark).toBeTruthy();

    component.markAllStateParksWant('US-IL');

    expect(component.getMemberStatus(ilStatePark!.id, 'm-1')).toBe('want');
    expect(component.getMemberStatus(caStatePark!.id, 'm-1')).toBe('unvisited');
  });
});
