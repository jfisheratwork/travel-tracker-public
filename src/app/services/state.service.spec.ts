import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';
import { firstValueFrom } from 'rxjs';

describe('StateService', () => {
  let service: StateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with an empty search term', async () => {
    const term = await firstValueFrom(service.searchTerm$);
    expect(term).toBe('');
  });

  it('should correctly update the search term', async () => {
    service.setSearchTerm('Yosemite');
    const term = await firstValueFrom(service.searchTerm$);
    expect(term).toBe('Yosemite');
  });

  it('should correctly transition location status between visited, want, and unvisited', () => {
    // Initial status: unvisited
    expect(service.getLocationStatus('yosemite', 'parks')).toBe('unvisited');

    // Transition to want
    service.setLocationStatus('yosemite', 'parks', 'want');
    expect(service.getLocationStatus('yosemite', 'parks')).toBe('want');
    expect(service.getSettings().wantToVisitParks?.['yosemite']).toBeDefined();
    expect(service.getSettings().visitedParks?.['yosemite']).toBeUndefined();

    // Transition to visited (should clear from want)
    service.setLocationStatus('yosemite', 'parks', 'visited');
    expect(service.getLocationStatus('yosemite', 'parks')).toBe('visited');
    expect(service.getSettings().visitedParks?.['yosemite']).toBeDefined();
    expect(service.getSettings().wantToVisitParks?.['yosemite']).toBeUndefined();

    // Transition to unvisited (should clear from both)
    service.setLocationStatus('yosemite', 'parks', 'unvisited');
    expect(service.getLocationStatus('yosemite', 'parks')).toBe('unvisited');
    expect(service.getSettings().visitedParks?.['yosemite']).toBeUndefined();
    expect(service.getSettings().wantToVisitParks?.['yosemite']).toBeUndefined();
  });

  it('should manage member-specific want and visited statuses', () => {
    service.setLocationStatus('banff', 'parks', 'visited', 'member-1');
    service.setLocationStatus('banff', 'parks', 'want', 'member-2');

    expect(service.getLocationStatus('banff', 'parks', 'member-1')).toBe('visited');
    expect(service.getLocationStatus('banff', 'parks', 'member-2')).toBe('want');
    expect(service.getLocationStatus('banff', 'parks', 'member-3')).toBe('unvisited');
  });

  it('should return the active hometown (last in list or one without endDate)', () => {
    // Empty hometowns
    expect(service.getActiveHometown()).toBeNull();

    // Multiple hometowns without endDate (ordered chronologically)
    const baseSettings = service.getSettings();
    service.updateSettings({
      ...baseSettings,
      hometowns: [
        { id: '1', name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
        { id: '2', name: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
        { id: '3', name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
      ],
    });

    // Should assume the active home is the last one in the list (Seattle), not the first (Chicago)
    expect(service.getActiveHometown()?.name).toBe('Seattle, WA');

    // When previous hometowns have an explicit endDate
    service.updateSettings({
      ...baseSettings,
      hometowns: [
        { id: '1', name: 'Chicago, IL', lat: 41.8781, lng: -87.6298, endDate: '2020-01' },
        { id: '2', name: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
        { id: '3', name: 'Seattle, WA', lat: 47.6062, lng: -122.3321, endDate: '2023-01' },
      ],
    });
    expect(service.getActiveHometown()?.name).toBe('Austin, TX');
  });
});
