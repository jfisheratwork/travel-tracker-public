import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateService } from '../../services/state.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { RoutingService, RouteOption } from '../../services/routing/routing.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { TripService } from '../../services/trip.service';
import { Trip, TripStop } from '../../models/trip.model';
import { Place } from '../../models/location.model';
import { CorridorPlaceMatch, reduceCoordinates } from '../../core/utils/geo.utils';
import { RouteObject, Waypoint } from '../../models/route.model';
import { FamilyMember } from '../../models/settings.model';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../../core/services/logger.service';

import { LocationAutocompleteComponent } from '../location-autocomplete/location-autocomplete.component';

export interface RouteBuilderStop {
  query: string;
  isWaypointOnly: boolean;
  stopType: 'destination' | 'corridor_stop';
  placeId?: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-route-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, LocationAutocompleteComponent],
  templateUrl: './route-builder.html',
  styleUrls: ['./route-builder.css'],
})
export class RouteBuilderComponent implements OnInit {
  savedRoutes: RouteObject[] = [];
  routingEngine: 'osrm' | 'mapbox' = 'osrm';
  routeReduction: number = 0;

  isFormExpanded = false;
  isCreating = false;
  showNotes = false;

  // Form State
  isEditing = false;
  editingId: string | null = null;
  name = '';
  description = '';
  startDate = '';
  endDate = '';
  status: 'planned' | 'completed' = 'planned';

  startQuery = '';
  collapsedYears: { [year: string]: boolean } = {};
  endQuery = '';
  stops: RouteBuilderStop[] = [];
  stopsQueries: string[] = [];
  suggestedCorridorPlaces: CorridorPlaceMatch<Place>[] = [];

  familyMembers: FamilyMember[] = [];
  selectedMembers: string[] = [];
  participantSearchQuery = '';

  // Routing State
  isCalculating = false;
  routeOptions: RouteOption[] = [];
  selectedOptionIndex = 0;
  calculatedWaypoints: Waypoint[] = [];
  errorMessage = '';

  originalRouteForEdit: RouteObject | null = null;

  constructor(
    public stateService: StateService,
    private geocodingService: GeocodingService,
    private routingService: RoutingService,
    private localStorageService: LocalStorageService,
    private tripService: TripService,
    private logger: LoggerService,
  ) {}

  ngOnInit() {
    this.stateService.settings$.subscribe((settings) => {
      this.savedRoutes = (settings.savedRoutes || []).map((r, i) => ({
        ...r,
        id: r.id || (r.timestamp ? String(r.timestamp) : `route-${i}`),
      }));
      this.routingEngine = settings.routingEngine;
      this.routeReduction = settings.routeReduction ?? 0;
      this.familyMembers = settings.familyMembers || [];

      // Auto-populate active hometown as start query if empty
      const activeHometown = settings.hometowns.find((h) => !h.endDate);
      if (activeHometown && !this.startQuery && !this.isEditing) {
        this.startQuery = activeHometown.name;
      }
    });

    this.stateService.newRoadTripTrigger$.subscribe((timestamp) => {
      if (timestamp > 0) {
        this.isEditing = false;
        this.openModal();
        this.stateService.clearNewRoadTripTrigger();
        window.setTimeout(() => {
          document.querySelector('app-route-builder')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });
  }

  toggleMember(name: string) {
    const idx = this.selectedMembers.indexOf(name);
    if (idx > -1) {
      this.selectedMembers.splice(idx, 1);
    } else {
      this.selectedMembers.push(name);
    }
    this.participantSearchQuery = '';
  }

  selectAllMembers() {
    this.selectedMembers = this.familyMembers.map((m) => m.name);
    this.participantSearchQuery = '';
  }

  get filteredAvailableMembers() {
    return this.familyMembers.filter(
      (m) =>
        !this.selectedMembers.includes(m.name) &&
        m.name.toLowerCase().includes(this.participantSearchQuery.toLowerCase()),
    );
  }

  openModal() {
    this.isFormExpanded = true;
    if (!this.isEditing) {
      this.isCreating = true;
      // Prefill Start Date
      const d = new Date();
      d.setDate(1);
      this.startDate = d.toISOString().split('T')[0];

      // Default Name
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const baseName = `${monthNames[d.getMonth()]} ${d.getFullYear()} - Trip`;
      let finalName = baseName;
      let counter = 1;
      while (this.savedRoutes.some((r) => r.name === finalName)) {
        finalName = `${baseName} (${counter})`;
        counter++;
      }
      this.name = finalName;
    }

    // Smooth scroll to top so the map is always visible
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  closeModal() {
    this.isFormExpanded = false;
    this.isCreating = false;
    this.showNotes = false;
    this.resetForm();
    this.stateService.setSelectedRoute(null);
  }

  onStartDateChange() {
    if (this.startDate && !this.endDate) {
      const nextDay = new Date(this.startDate);
      nextDay.setUTCHours(0, 0, 0, 0);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      this.endDate = nextDay.toISOString().split('T')[0];
    }
  }

  loadAllRoutes() {
    this.stateService.setMapMode('roads');
    this.stateService.setSelectedRoute(null);
  }

  addStop() {
    this.stops.push({
      query: '',
      isWaypointOnly: false,
      stopType: 'corridor_stop',
    });
    this.syncStopsQueries();
  }

  removeStop(index: number) {
    this.stops.splice(index, 1);
    this.syncStopsQueries();
  }

  syncStopsQueries() {
    this.stopsQueries = this.stops.map((s) => s.query);
  }

  syncStopsFromQueries() {
    while (this.stops.length < this.stopsQueries.length) {
      const idx = this.stops.length;
      this.stops.push({
        query: this.stopsQueries[idx] || '',
        isWaypointOnly: false,
        stopType: 'corridor_stop',
      });
    }
    while (this.stops.length > this.stopsQueries.length) {
      this.stops.pop();
    }
    for (let i = 0; i < this.stopsQueries.length; i++) {
      if (this.stops[i].query !== this.stopsQueries[i]) {
        this.stops[i].query = this.stopsQueries[i];
      }
    }
  }

  onStopQueryChange(index: number, query: string) {
    if (this.stops[index]) {
      this.stops[index].query = query;
      this.syncStopsQueries();
    }
  }

  addCorridorSuggestionToStops(place: Place) {
    this.stops.push({
      query: place.name,
      isWaypointOnly: false,
      stopType: 'corridor_stop',
      placeId: place.id,
      lat: place.lat,
      lng: place.lng,
    });
    this.syncStopsQueries();
    this.suggestedCorridorPlaces = this.suggestedCorridorPlaces.filter(
      (s) => s.place.id !== place.id,
    );
    if (this.startQuery && this.endQuery) {
      this.calculateRoute();
    }
  }

  formatDistance(meters: number): string {
    const METERS_PER_MILE = 1609.34;
    return (meters / METERS_PER_MILE).toFixed(1);
  }

  formatDuration(seconds: number): string {
    const SECONDS_PER_HOUR = 3600;
    return (seconds / SECONDS_PER_HOUR).toFixed(1);
  }

  drop(event: CdkDragDrop<string[]>) {
    this.syncStopsFromQueries();
    moveItemInArray(this.stops, event.previousIndex, event.currentIndex);
    this.syncStopsQueries();
  }

  trackByIndex(index: number): number {
    return index;
  }

  async calculateRoute() {
    this.errorMessage = '';
    this.routeOptions = [];

    if (!this.name) {
      this.errorMessage = 'Trip Name is required.';
      return;
    }
    if (!this.startQuery || !this.endQuery) {
      this.errorMessage = 'Start and End locations are required.';
      return;
    }

    this.syncStopsFromQueries();
    this.isCalculating = true;

    try {
      // 1. Geocode all points sequentially to maintain order and respect API limits
      const waypoints: Waypoint[] = [];
      const queries = [this.startQuery, ...this.stopsQueries, this.endQuery].filter(
        (q) => q.trim().length > 0,
      );

      for (const query of queries) {
        const wp = await firstValueFrom(this.geocodingService.geocode(query));
        waypoints.push(wp);
      }
      this.calculatedWaypoints = waypoints;

      this.logger.info('Geocoded waypoints:', waypoints);

      // 2. Fetch Routes
      const options = await firstValueFrom(
        this.routingService.getRoutes(this.routingEngine, waypoints),
      );
      this.logger.info('Fetched routes:', options);
      this.routeOptions = options;
      this.selectedOptionIndex = 0;

      // Extract corridor suggestions from first route option
      if (options.length > 0 && options[0].route) {
        this.suggestedCorridorPlaces = this.tripService.getSuggestedCorridorPlaces(
          options[0].route,
          50,
        );
      }

      // Preview the first route on the map
      this.previewSelectedOption();

      // Scroll smoothly to route options & save section
      window.setTimeout(() => {
        document
          .getElementById('route-options-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err: unknown) {
      this.logger.error('Error in calculateRoute:', err);
      this.errorMessage = err instanceof Error ? err.message : 'Failed to calculate route.';
    } finally {
      this.isCalculating = false;
    }
  }

  previewSelectedOption() {
    if (this.routeOptions.length > 0) {
      const option = this.routeOptions[this.selectedOptionIndex];
      if (option?.route) {
        this.suggestedCorridorPlaces = this.tripService.getSuggestedCorridorPlaces(
          option.route,
          50,
        );
      }
      const previewRoute: RouteObject = {
        id: 'preview',
        name: 'Preview',
        description: '',
        members: this.selectedMembers,
        status: 'planned',
        engine: this.routingEngine,
        distance: option.distance,
        duration: option.duration,
        timestamp: Date.now(),
        startQuery: this.startQuery,
        endQuery: this.endQuery,
        stopsQueries: this.stopsQueries,
        waypoints: this.calculatedWaypoints,
        route: option.route,
        coordinates: reduceCoordinates(option.route, this.routeReduction), // Use reduced for immediate preview
      };
      this.stateService.setSelectedRoute(previewRoute);
    }
  }

  saveRoute() {
    let distance = 0;
    let duration = 0;
    let waypoints = this.calculatedWaypoints;
    let optionRoute: [number, number][] = [];

    if (this.routeOptions.length > 0) {
      const option = this.routeOptions[this.selectedOptionIndex];
      distance = option.distance;
      duration = option.duration;
      optionRoute = option.route || [];
    } else if (this.isEditing && this.originalRouteForEdit) {
      distance = this.originalRouteForEdit.distance;
      duration = this.originalRouteForEdit.duration;
      waypoints = this.originalRouteForEdit.waypoints;
      optionRoute =
        this.originalRouteForEdit.route && this.originalRouteForEdit.route.length > 0
          ? this.originalRouteForEdit.route
          : this.originalRouteForEdit.coordinates || [];
    } else {
      return;
    }

    const routeId =
      this.isEditing && this.editingId
        ? this.editingId
        : this.originalRouteForEdit?.id ||
          (this.originalRouteForEdit?.timestamp
            ? String(this.originalRouteForEdit.timestamp)
            : crypto.randomUUID());

    this.syncStopsFromQueries();

    const newRoute: RouteObject = {
      id: routeId,
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      members: [...this.selectedMembers],
      status: this.status,
      engine: this.routingEngine || (this.originalRouteForEdit?.engine ?? 'osrm'),
      distance: distance,
      duration: duration,
      timestamp:
        this.isEditing && this.originalRouteForEdit?.timestamp
          ? this.originalRouteForEdit.timestamp
          : Date.now(),
      startQuery: this.startQuery,
      endQuery: this.endQuery,
      stopsQueries: [...this.stopsQueries],
      waypoints: waypoints || [],
      route: optionRoute,
      coordinates: optionRoute.length > 0 ? optionRoute : undefined,
    };

    const currentSettings = this.stateService.getSettings();

    // Map member names to traveler IDs
    const travelerIds = this.selectedMembers
      .map((name) => currentSettings.familyMembers.find((m) => m.name === name)?.id)
      .filter((id): id is string => !!id);

    const finalTravelerIds =
      travelerIds.length > 0 ? travelerIds : currentSettings.familyMembers.map((m) => m.id);

    // Build destinations and corridor stops for Trip model
    const destinations: TripStop[] = [];
    const corridorStops: TripStop[] = [];

    if (waypoints && waypoints.length > 0) {
      // Start destination
      const startWp = waypoints[0];
      const startPlace = this.tripService.resolvePlaceForStop(
        this.startQuery || startWp.name || 'Start',
        startWp.lat,
        startWp.lng,
      );
      destinations.push({
        placeId: startPlace.id,
        name: startPlace.name,
        lat: startWp.lat,
        lng: startWp.lng,
        stopType: 'destination',
        arrivalDate: this.startDate,
      });

      // Intermediate corridor stops
      for (let i = 0; i < this.stops.length; i++) {
        const wpIdx = i + 1;
        if (wpIdx < waypoints.length - 1) {
          const wp = waypoints[wpIdx];
          const stopDef = this.stops[i];
          const stopPlace = this.tripService.resolvePlaceForStop(
            stopDef.query || wp.name || `Stop ${i + 1}`,
            wp.lat,
            wp.lng,
          );
          corridorStops.push({
            placeId: stopPlace.id,
            name: stopPlace.name,
            lat: wp.lat,
            lng: wp.lng,
            stopType: stopDef.stopType || 'corridor_stop',
            isWaypointOnly: stopDef.isWaypointOnly,
            arrivalDate: this.startDate,
          });
        }
      }

      // End destination
      if (waypoints.length > 1) {
        const endWp = waypoints[waypoints.length - 1];
        const endPlace = this.tripService.resolvePlaceForStop(
          this.endQuery || endWp.name || 'Destination',
          endWp.lat,
          endWp.lng,
        );
        destinations.push({
          placeId: endPlace.id,
          name: endPlace.name,
          lat: endWp.lat,
          lng: endWp.lng,
          stopType: 'destination',
          arrivalDate: this.endDate || this.startDate,
        });
      }
    }

    const trip: Trip = {
      id: routeId,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      travelerIds: finalTravelerIds,
      destinations,
      corridorStops,
      notes: this.description,
      coordinates: optionRoute.length > 0 ? optionRoute : undefined,
      distanceMiles: distance,
    };

    const syncedSettings = this.tripService.syncTripToSettings(trip, currentSettings);

    const updatedRoutes = [...syncedSettings.savedRoutes];
    const idx = updatedRoutes.findIndex(
      (r) =>
        (r.id && r.id === routeId) ||
        (r.timestamp &&
          this.originalRouteForEdit?.timestamp &&
          r.timestamp === this.originalRouteForEdit.timestamp) ||
        (r.name && this.originalRouteForEdit?.name && r.name === this.originalRouteForEdit.name),
    );
    if (idx !== -1) {
      updatedRoutes[idx] = newRoute;
    } else {
      updatedRoutes.push(newRoute);
    }
    syncedSettings.savedRoutes = updatedRoutes;

    this.stateService.updateSettings(syncedSettings);
    this.resetForm();
    this.closeModal();
  }

  editRoute(route: RouteObject) {
    this.isEditing = true;
    this.editingId = route.id || (route.timestamp ? String(route.timestamp) : route.name);
    this.originalRouteForEdit = route;
    this.name = route.name;
    this.description = route.description || '';
    this.startDate = route.startDate || (route as unknown as Record<string, string>)['date'] || '';
    this.endDate = route.endDate || '';
    this.status = route.status || 'planned';
    this.selectedMembers = route.members ? [...route.members] : [];

    // Auto-infer start and end queries if missing from legacy name "A to B"
    if (!route.startQuery && route.name && route.name.includes(' to ')) {
      const parts = route.name.split(' to ');
      this.startQuery = parts[0]?.trim() || '';
      this.endQuery = parts[1]?.trim() || '';
    } else {
      this.startQuery = route.startQuery || '';
      this.endQuery = route.endQuery || '';
    }

    const trip = this.stateService.getSettings().trips?.find((t) => t.id === route.id);
    const queries = route.stopsQueries ? [...route.stopsQueries] : [];
    this.stops = queries.map((q, i) => {
      const matchingCorridorStop = trip?.corridorStops?.[i];
      return {
        query: q,
        isWaypointOnly: matchingCorridorStop?.isWaypointOnly ?? false,
        stopType: matchingCorridorStop?.stopType ?? 'corridor_stop',
      };
    });
    this.syncStopsQueries();

    this.routeOptions = [];
    this.showNotes = !!route.description; // Auto-show notes if they exist
    this.stateService.setSelectedRoute(route);
    this.openModal();
  }

  deleteRoute(routeId: string) {
    const currentSettings = this.stateService.getSettings();
    const updatedRoutes = this.savedRoutes.filter(
      (r) =>
        (r.id || (r.timestamp ? String(r.timestamp) : '')) !== routeId &&
        String(r.timestamp) !== routeId,
    );
    const updatedTrips = (currentSettings.trips || []).filter((t) => t.id !== routeId);
    this.stateService.updateSettings({
      ...currentSettings,
      savedRoutes: updatedRoutes,
      trips: updatedTrips,
    });
    this.resetForm();
    this.stateService.setSelectedRoute(null);
  }

  get plannedRoutes() {
    return this.savedRoutes
      .filter((r) => r.status === 'planned')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  get completedUndated() {
    return this.savedRoutes
      .filter(
        (r) =>
          r.status === 'completed' &&
          (!r.startDate || r.startDate.trim() === '') &&
          (!r.endDate || r.endDate.trim() === ''),
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  get completedByYearKeys() {
    const years = new Set<string>();
    this.savedRoutes.forEach((r) => {
      if (r.status === 'completed' && (r.startDate || r.endDate)) {
        const dateToUse = r.startDate || r.endDate;
        if (dateToUse) {
          const year = new Date(dateToUse).getFullYear().toString();
          years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }

  getCompletedRoutesForYear(year: string) {
    return this.savedRoutes
      .filter((r) => {
        if (r.status === 'completed' && (r.startDate || r.endDate)) {
          const dateToUse = r.startDate || r.endDate;
          if (dateToUse) {
            return new Date(dateToUse).getFullYear().toString() === year;
          }
        }
        return false;
      })
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  toggleYear(year: string) {
    this.collapsedYears[year] = !this.isYearCollapsed(year);
  }

  isYearCollapsed(year: string) {
    if (this.collapsedYears[year] === undefined) {
      const yVal = parseInt(year);
      const currentYear = new Date().getFullYear();
      if (!isNaN(yVal) && yVal < currentYear) {
        this.collapsedYears[year] = true;
      } else {
        this.collapsedYears[year] = false;
      }
    }
    return this.collapsedYears[year];
  }

  private updateSettingsAndReset(routes: RouteObject[]) {
    const currentSettings = this.stateService.getSettings();
    this.stateService.updateSettings({ ...currentSettings, savedRoutes: routes });
    this.resetForm();
  }

  private resetForm() {
    this.isEditing = false;
    this.isCreating = false;
    this.editingId = null;
    this.originalRouteForEdit = null;
    this.name = '';
    this.description = '';
    this.startDate = '';
    this.endDate = '';
    this.status = 'planned';
    this.selectedMembers = [];
    this.showNotes = false;

    // reset startQuery to active hometown if applicable
    const settings = this.stateService.getSettings();
    const activeHometown = settings.hometowns.find((h) => !h.endDate);
    this.startQuery = activeHometown ? activeHometown.name : '';

    this.endQuery = '';
    this.stops = [];
    this.stopsQueries = [];
    this.suggestedCorridorPlaces = [];
    this.routeOptions = [];
    this.errorMessage = '';
  }
}
