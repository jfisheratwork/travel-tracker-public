// DOCS: https://angular.dev/api/core/Injectable
import { Injectable } from '@angular/core';
import { Trip, TripStop } from '../models/trip.model';
import { Place, PlaceVisit } from '../models/location.model';
import { AppSettings } from '../models/settings.model';
import { RouteObject } from '../models/route.model';
import { STATIC_PLACES_CATALOG, getStaticPlace } from '../core/constants/curated-places.constants';
import {
  findPlacesInCorridor,
  CorridorPlaceMatch,
  DEFAULT_CORRIDOR_BUFFER_MILES,
} from '../core/utils/geo.utils';
import { LoggerService } from '../core/services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class TripService {
  constructor(private logger: LoggerService) {}

  /**
   * Resolves or generates a Place entity for a named stop.
   * Checks static curated catalog first; falls back to creating a custom place.
   */
  resolvePlaceForStop(name: string, lat: number, lng: number): Place {
    const trimmed = name.trim();
    const curated = getStaticPlace(trimmed);
    if (curated) {
      return curated;
    }

    // Slugify custom place id
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const customId = `custom-${slug || Date.now()}`;

    return {
      id: customId,
      name: trimmed,
      category: 'custom',
      countryId: 'US',
      lat,
      lng,
      source: 'user',
      isCurated: false,
      tags: ['custom'],
    };
  }

  /**
   * Synchronizes trip stops with AppSettings place visits according to Option A stop classification.
   *
   * - Stops with isWaypointOnly: true are preserved for routing geometry but DO NOT log PlaceVisits.
   * - Destination and non-waypoint corridor stops log a PlaceVisit for all trip travelers.
   * - Persists custom places if not already recorded.
   * - Bridges trip to savedRoutes for backward compatibility.
   */
  syncTripToSettings(trip: Trip, currentSettings: AppSettings): AppSettings {
    const updatedSettings: AppSettings = {
      ...currentSettings,
      trips: [...(currentSettings.trips || [])],
      placeVisits: { ...(currentSettings.placeVisits || {}) },
      customPlaces: [...(currentSettings.customPlaces || [])],
      savedRoutes: [...(currentSettings.savedRoutes || [])],
      visitedParks: { ...(currentSettings.visitedParks || {}) },
      visitedStates: { ...(currentSettings.visitedStates || {}) },
    };

    // 1. Update or append Trip in trips array
    const tripIdx = updatedSettings.trips.findIndex((t) => t.id === trip.id);
    if (tripIdx !== -1) {
      updatedSettings.trips[tripIdx] = trip;
    } else {
      updatedSettings.trips.push(trip);
    }

    // 2. Process all stops
    const allStops: TripStop[] = [...(trip.destinations || []), ...(trip.corridorStops || [])];

    for (const stop of allStops) {
      // Option A: Waypoints do NOT log a place visit
      if (stop.isWaypointOnly) {
        continue;
      }

      // Ensure custom places are registered in customPlaces
      const isCurated = !!getStaticPlace(stop.placeId);
      if (!isCurated) {
        const placeExists = updatedSettings.customPlaces.some((p) => p.id === stop.placeId);
        if (!placeExists) {
          updatedSettings.customPlaces.push({
            id: stop.placeId,
            name: stop.name,
            category: 'custom',
            countryId: 'US',
            lat: stop.lat,
            lng: stop.lng,
            source: 'user',
            isCurated: false,
            tags: ['custom'],
          });
        }
      }

      // Ensure placeVisits record exists for this place
      if (!updatedSettings.placeVisits[stop.placeId]) {
        updatedSettings.placeVisits[stop.placeId] = [];
      }

      const visitDate =
        stop.arrivalDate || trip.startDate || new Date().toISOString().split('T')[0];

      // Add visit for each traveler on the trip if not already logged for this trip
      for (const travelerId of trip.travelerIds) {
        const existingVisit = updatedSettings.placeVisits[stop.placeId].find(
          (v) => v.memberId === travelerId && (v.tripId === trip.id || v.dateVisited === visitDate),
        );

        if (!existingVisit) {
          const newVisit: PlaceVisit = {
            placeId: stop.placeId,
            memberId: travelerId,
            status: 'visited',
            dateVisited: visitDate,
            tripId: trip.id,
            notes: stop.notes,
          };
          updatedSettings.placeVisits[stop.placeId].push(newVisit);

          // Backward-compatible sync to visitedParks if applicable
          if (stop.placeId.startsWith('np-') && updatedSettings.visitedParks) {
            if (!updatedSettings.visitedParks[stop.placeId]) {
              updatedSettings.visitedParks[stop.placeId] = [];
            }
            if (
              !updatedSettings.visitedParks[stop.placeId].some((v) => v.memberId === travelerId)
            ) {
              updatedSettings.visitedParks[stop.placeId].push({
                memberId: travelerId,
                dateVisited: visitDate,
                firstVisitedDate: visitDate,
                notes: stop.notes,
              });
            }
          }
        }
      }
    }

    // 3. Bridge trip to savedRoutes for backward-compatibility
    const destinations = trip.destinations || [];
    const corridorStops = trip.corridorStops || [];
    const startStop = destinations[0];
    const endStop = destinations.length > 1 ? destinations[destinations.length - 1] : undefined;

    const mappedRoute: RouteObject = {
      id: trip.id,
      name: trip.name,
      description: trip.notes || '',
      startDate: trip.startDate,
      endDate: trip.endDate,
      members: trip.travelerIds.map((id) => {
        const member = updatedSettings.familyMembers.find((m) => m.id === id);
        return member?.name || id;
      }),
      status: 'completed',
      engine: 'osrm',
      distance: trip.distanceMiles || 0,
      duration: 0,
      timestamp: Date.now(),
      startQuery: startStop?.name || '',
      endQuery: endStop?.name || startStop?.name || '',
      stopsQueries: corridorStops.map((s) => s.name),
      coordinates: trip.coordinates,
      route: trip.coordinates || [],
      waypoints: allStops.map((s) => ({
        name: s.name,
        lat: s.lat,
        lng: s.lng,
      })),
    };

    const routeIdx = updatedSettings.savedRoutes.findIndex((r) => r.id === trip.id);
    if (routeIdx !== -1) {
      updatedSettings.savedRoutes[routeIdx] = mappedRoute;
    } else {
      updatedSettings.savedRoutes.push(mappedRoute);
    }

    this.logger.info(`Synchronized Trip "${trip.name}" with ${allStops.length} stops.`);
    return updatedSettings;
  }

  /**
   * Finds curated places located along the route corridor buffer.
   */
  getSuggestedCorridorPlaces(
    polyline: [number, number][],
    maxDistanceMiles: number = DEFAULT_CORRIDOR_BUFFER_MILES,
  ): CorridorPlaceMatch<Place>[] {
    return findPlacesInCorridor(polyline, STATIC_PLACES_CATALOG, maxDistanceMiles);
  }
}
