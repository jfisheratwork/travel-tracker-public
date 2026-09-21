import { describe, beforeEach, it, expect } from 'vitest';
import { TripService } from './trip.service';
import { LoggerService } from '../core/services/logger.service';
import { Trip } from '../models/trip.model';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

describe('TripService', () => {
  let service: TripService;

  const mockSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    familyMembers: [
      { id: 'm-1', name: 'Alice', color: '#10b981' },
      { id: 'm-2', name: 'Bob', color: '#3b82f6' },
    ],
    trips: [],
    placeVisits: {},
    customPlaces: [],
    savedRoutes: [],
  };

  beforeEach(() => {
    service = new TripService(new LoggerService());
  });

  it('should resolve static curated places when matching name or slug', () => {
    const yosemite = service.resolvePlaceForStop('Yosemite National Park', 37.8651, -119.5383);
    expect(yosemite.id).toBe('np-yosemite');
    expect(yosemite.category).toBe('national_park');
    expect(yosemite.isCurated).toBe(true);

    const chicago = service.resolvePlaceForStop('Chicago', 41.8781, -87.6298);
    expect(chicago.id).toBe('city-chicago');
    expect(chicago.category).toBe('city');
  });

  it('should generate custom place with slugified id for non-curated stops', () => {
    const customSpot = service.resolvePlaceForStop('World Largest Ball of Twine', 39.5, -98.5);
    expect(customSpot.id).toContain('world-largest-ball-of-twine');
    expect(customSpot.category).toBe('custom');
    expect(customSpot.isCurated).toBe(false);
  });

  it('should synchronize trip stops according to Option A stop classification', () => {
    const trip: Trip = {
      id: 'trip-pnw-2026',
      name: 'PNW Adventure',
      startDate: '2026-07-01',
      endDate: '2026-07-07',
      travelerIds: ['m-1', 'm-2'],
      destinations: [
        {
          placeId: 'np-olympic',
          name: 'Olympic National Park',
          lat: 47.8021,
          lng: -123.6044,
          stopType: 'destination',
          arrivalDate: '2026-07-02',
        },
      ],
      corridorStops: [
        // Non-waypoint corridor stop -> should log PlaceVisit
        {
          placeId: 'city-seattle',
          name: 'Seattle',
          lat: 47.6062,
          lng: -122.3321,
          stopType: 'corridor_stop',
          isWaypointOnly: false,
        },
        // Option A Waypoint-only stop -> should NOT log PlaceVisit
        {
          placeId: 'custom-gas-stop-ellensburg',
          name: 'Ellensburg Gas Station',
          lat: 46.9965,
          lng: -120.5478,
          stopType: 'corridor_stop',
          isWaypointOnly: true,
        },
      ],
    };

    const updated = service.syncTripToSettings(trip, mockSettings);

    // 1. Trip stored in trips array
    expect(updated.trips.length).toBe(1);
    expect(updated.trips[0].id).toBe('trip-pnw-2026');

    // 2. Destination (Olympic) logged for both travelers
    expect(updated.placeVisits['np-olympic']).toBeDefined();
    expect(updated.placeVisits['np-olympic'].length).toBe(2);
    expect(updated.placeVisits['np-olympic'].map((v) => v.memberId)).toEqual(['m-1', 'm-2']);

    // 3. Corridor stop (Seattle) logged for both travelers
    expect(updated.placeVisits['city-seattle']).toBeDefined();
    expect(updated.placeVisits['city-seattle'].length).toBe(2);

    // 4. Option A Waypoint-only stop NOT logged in placeVisits
    expect(updated.placeVisits['custom-gas-stop-ellensburg']).toBeUndefined();

    // 5. Bridged to savedRoutes for backward compatibility
    expect(updated.savedRoutes.length).toBe(1);
    expect(updated.savedRoutes[0].name).toBe('PNW Adventure');
  });

  it('should find suggested places along a route corridor', () => {
    // SF to Sacramento corridor
    const routeCoordinates: [number, number][] = [
      [37.7749, -122.4194],
      [38.5816, -121.4944],
    ];

    const corridorPlaces = service.getSuggestedCorridorPlaces(routeCoordinates, 50);
    expect(corridorPlaces.length).toBeGreaterThan(0);
    // Sacramento (capital) is right on the corridor
    expect(corridorPlaces.some((cp) => cp.place.name.includes('Sacramento'))).toBe(true);
  });
});
