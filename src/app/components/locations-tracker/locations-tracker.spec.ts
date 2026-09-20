import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationsTrackerComponent } from './locations-tracker';
import { StateService } from '../../services/state.service';
import { BehaviorSubject } from 'rxjs';
import { AppSettings } from '../../models/settings.model';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('LocationsTrackerComponent', () => {
  let component: LocationsTrackerComponent;
  let fixture: ComponentFixture<LocationsTrackerComponent>;
  let settings$: BehaviorSubject<AppSettings>;
  let mapMode$: BehaviorSubject<'roads' | 'parks' | 'states'>;
  let searchTerm$: BehaviorSubject<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateServiceMock: any;

  const mockSettings: AppSettings = {
    familyMembers: [
      { id: 'm-brittany', name: 'Brittany', color: '#10b981' },
      { id: 'm-bob', name: 'Bob', color: '#3b82f6' },
    ],
    visitedStates: {
      Alaska: [{ memberId: 'm-brittany' }],
      Alberta: [{ memberId: 'm-brittany' }, { memberId: 'm-bob' }],
      Arizona: [{ memberId: 'm-brittany' }],
      'British Columbia': [{ memberId: 'm-brittany' }, { memberId: 'm-bob' }],
    },
    visitedParks: {
      Acadia: [{ memberId: 'm-bob' }],
      Yellowstone: [{ memberId: 'm-brittany' }, { memberId: 'm-bob' }],
      Banff: [{ memberId: 'm-brittany' }],
    },
    savedRoutes: [],
    hometowns: [],
    routingEngine: 'osrm',
    routeReduction: 0.01,
    locationVisits: {},
  };

  beforeEach(async () => {
    settings$ = new BehaviorSubject<AppSettings>(mockSettings);
    mapMode$ = new BehaviorSubject<'roads' | 'parks' | 'states'>('states');
    searchTerm$ = new BehaviorSubject<string>('');

    stateServiceMock = {
      settings$,
      mapMode$,
      searchTerm$,
      setSearchTerm: vi.fn((term: string) => searchTerm$.next(term)),
      setEditingLocation: vi.fn(),
      setLocationStatus: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LocationsTrackerComponent],
      providers: [{ provide: StateService, useValue: stateServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationsTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list all visited states initially', () => {
    expect(component.visitedLocations.length).toBe(4);
    const names = component.visitedLocations.map((v) => v.location.name);
    expect(names).toEqual(['Alaska', 'Alberta', 'Arizona', 'British Columbia']);
  });

  it('BUG FIX: searching "brit" should strictly match "British Columbia" and NOT hijack for member Brittany', () => {
    component.searchTerm = 'brit';
    const results = component.visitedLocations;
    expect(results.length).toBe(1);
    expect(results[0].location.name).toBe('British Columbia');
  });

  it('should filter visited locations by Country (USA vs Canada)', () => {
    component.countryFilter = 'Canada';
    const canadaResults = component.visitedLocations.map((v) => v.location.name);
    expect(canadaResults).toEqual(['Alberta', 'British Columbia']);

    component.countryFilter = 'USA';
    const usaResults = component.visitedLocations.map((v) => v.location.name);
    expect(usaResults).toEqual(['Alaska', 'Arizona']);
  });

  it('should filter visited parks by State code, including multi-state parks', () => {
    component.mode = 'parks';
    component.countryFilter = 'all';
    component.stateFilter = 'WY'; // Yellowstone is WY/MT/ID

    const results = component.visitedLocations.map((v) => v.location.name);
    expect(results).toEqual(['Yellowstone']);
  });

  it('should filter visited locations by member using memberFilter dropdown', () => {
    component.memberFilter = 'm-bob';
    const bobLocations = component.visitedLocations.map((v) => v.location.name);
    expect(bobLocations).toEqual(['Alberta', 'British Columbia']);
  });

  it('should detect active filters and reset correctly', () => {
    expect(component.hasActiveFilters).toBe(false);

    component.countryFilter = 'Canada';
    expect(component.hasActiveFilters).toBe(true);

    component.resetFilters();
    expect(component.countryFilter).toBe('all');
    expect(component.stateFilter).toBe('all');
    expect(component.memberFilter).toBe('all');
    expect(component.searchTerm).toBe('');
    expect(component.hasActiveFilters).toBe(false);
  });

  it('should aggregate both parks and capitals in places mode', () => {
    component.mode = 'places';
    const allVisited = component.visitedLocations;
    expect(allVisited.length).toBe(7);

    const parkItems = allVisited.filter((item) => item.isPark);
    const capitalItems = allVisited.filter((item) => !item.isPark);

    expect(parkItems.length).toBe(3);
    expect(capitalItems.length).toBe(4);

    expect(parkItems.map((p) => p.location.name)).toEqual(['Acadia', 'Banff', 'Yellowstone']);
    expect(capitalItems.map((c) => c.location.name)).toEqual([
      'Alaska',
      'Alberta',
      'Arizona',
      'British Columbia',
    ]);
  });

  it('should dispatch correct mode when opening location details in places mode', () => {
    component.mode = 'places';
    component.openLocationDetails('Acadia', true);
    expect(stateServiceMock.setEditingLocation).toHaveBeenCalledWith({
      id: 'Acadia',
      mode: 'parks',
    });

    component.openLocationDetails('Alaska', false);
    expect(stateServiceMock.setEditingLocation).toHaveBeenCalledWith({
      id: 'Alaska',
      mode: 'states',
    });
  });

  it('should include wantToVisit destinations and filter by statusFilter', () => {
    // Add a wantToVisit state to settings
    const updatedSettings: AppSettings = {
      ...mockSettings,
      wantToVisitStates: {
        Hawaii: [{ memberId: 'm-brittany' }],
      },
    };
    settings$.next(updatedSettings);

    // With statusFilter = 'all', Hawaii should be included
    component.statusFilter = 'all';
    expect(component.visitedLocations.some((l) => l.location.name === 'Hawaii')).toBe(true);

    // With statusFilter = 'visited', Hawaii should NOT be included
    component.statusFilter = 'visited';
    expect(component.visitedLocations.some((l) => l.location.name === 'Hawaii')).toBe(false);

    // With statusFilter = 'want', ONLY Hawaii should be included
    component.statusFilter = 'want';
    const wantList = component.visitedLocations;
    expect(wantList.length).toBe(1);
    expect(wantList[0].location.name).toBe('Hawaii');
    expect(wantList[0].status).toBe('want');
  });

  it('should dispatch setLocationStatus when setStatus is called', () => {
    const item = component.visitedLocations[0];
    component.setStatus(item, 'want');

    expect(stateServiceMock.setLocationStatus).toHaveBeenCalledWith(
      item.location.id,
      'states',
      'want',
      undefined,
    );
  });
});
