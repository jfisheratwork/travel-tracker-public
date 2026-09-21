import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParksStatesModal } from './parks-states-modal';
import { StateService } from '../../services/state.service';
import { BehaviorSubject } from 'rxjs';
import { AppSettings } from '../../models/settings.model';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ParksStatesModal', () => {
  let component: ParksStatesModal;
  let fixture: ComponentFixture<ParksStatesModal>;
  let settings$: BehaviorSubject<AppSettings>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateServiceMock: any;

  const mockSettings: AppSettings = {
    familyMembers: [
      { id: 'm-1', name: 'Traveler 1', color: '#10b981' },
      { id: 'm-2', name: 'Traveler 2', color: '#3b82f6' },
    ],
    visitedStates: {
      California: [{ memberId: 'm-1' }],
      Alberta: [{ memberId: 'm-2' }],
    },
    visitedParks: {
      Yosemite: [{ memberId: 'm-1' }],
      Banff: [{ memberId: 'm-2' }],
    },
    savedRoutes: [],
    hometowns: [],
    routingEngine: 'osrm',
    routeReduction: 0.01,
    locationVisits: {},
  };

  beforeEach(async () => {
    settings$ = new BehaviorSubject<AppSettings>(mockSettings);

    stateServiceMock = {
      settings$,
      updateSettings: vi.fn(),
      setEditingLocation: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ParksStatesModal],
      providers: [{ provide: StateService, useValue: stateServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ParksStatesModal);
    component = fixture.componentInstance;
    component.mode = 'parks';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter locations by Country', () => {
    component.countryFilter = 'Canada';
    const canadianParks = component.filteredLocations;
    expect(canadianParks.length).toBe(22);
    expect(canadianParks.every((p) => p.country === 'Canada')).toBe(true);

    component.countryFilter = 'USA';
    const usParks = component.filteredLocations;
    expect(usParks.length).toBe(63);
    expect(usParks.every((p) => p.country === 'USA')).toBe(true);
  });

  it('should filter parks by state/province code', () => {
    component.countryFilter = 'Canada';
    component.stateFilter = 'AB';
    const albertaParks = component.filteredLocations.map((p) => p.name);
    expect(albertaParks).toContain('Banff');
    expect(albertaParks).toContain('Jasper');
    expect(albertaParks).not.toContain('Yoho'); // Yoho is in BC
  });

  it('should reset stateFilter when switching to an incompatible country', () => {
    component.countryFilter = 'USA';
    component.stateFilter = 'CA';

    // Switch to Canada where CA is not a valid province
    component.countryFilter = 'Canada';
    component.onCountryChange();

    expect(component.stateFilter).toBe('all');
  });

  it('should filter by search query matching name or abbreviation', () => {
    component.searchQuery = 'BC';
    const bcParks = component.filteredLocations.map((p) => p.name);
    expect(bcParks).toContain('Yoho');
    expect(bcParks).toContain('Kootenay');
  });

  it('should toggle visits for family members', () => {
    expect(component.isVisited('Banff', 'm-1')).toBe(false);
    component.toggleVisit('Banff', 'm-1');
    expect(component.isVisited('Banff', 'm-1')).toBe(true);
  });

  it('should cycle member status from unvisited -> visited -> want -> unvisited', () => {
    expect(component.getMemberStatus('Acadia', 'm-1')).toBe('unvisited');

    // Cycle 1: unvisited -> visited
    component.cycleMemberStatus('Acadia', 'm-1');
    expect(component.getMemberStatus('Acadia', 'm-1')).toBe('visited');

    // Cycle 2: visited -> want
    component.cycleMemberStatus('Acadia', 'm-1');
    expect(component.getMemberStatus('Acadia', 'm-1')).toBe('want');

    // Cycle 3: want -> unvisited
    component.cycleMemberStatus('Acadia', 'm-1');
    expect(component.getMemberStatus('Acadia', 'm-1')).toBe('unvisited');
  });

  it('should set all member statuses at once and support want visibility filter', () => {
    // Set all members to want for Acadia
    component.setAllStatus('Acadia', 'want');
    expect(component.isAllWant('Acadia')).toBe(true);
    expect(component.getWantCount('Acadia')).toBe(2);

    // Filter by want
    component.visibilityFilter = 'want';
    const wantLocations = component.filteredLocations.map((l) => l.name);
    expect(wantLocations).toContain('Acadia');
    expect(wantLocations).not.toContain('Banff'); // Banff is visited
  });

  it('should switch modal mode between parks and states', () => {
    expect(component.mode).toBe('parks');
    expect(component.locations.length).toBeGreaterThan(50);

    // Switch to states
    component.switchModalMode('states');
    expect(component.mode).toBe('states');
    const stateNames = component.locations.map((l) => l.name);
    expect(stateNames).toContain('California');
    expect(stateNames).toContain('Alberta');

    // Switch back to parks
    component.switchModalMode('parks');
    expect(component.mode).toBe('parks');
    const parkNames = component.locations.map((l) => l.name);
    expect(parkNames).toContain('Yosemite');
  });
});
