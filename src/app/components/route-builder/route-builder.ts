import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateService } from '../../services/state.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { RoutingService, RouteOption } from '../../services/routing/routing.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { RouteObject, Waypoint } from '../../models/route.model';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../../core/services/logger.service';

import { LocationAutocompleteComponent } from '../location-autocomplete/location-autocomplete.component';

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
  routeReduction: number = 0.01;

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
  stopsQueries: string[] = [];

  familyMembers: any[] = [];
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
    private logger: LoggerService,
  ) {}

  ngOnInit() {
    this.stateService.settings$.subscribe((settings) => {
      this.savedRoutes = settings.savedRoutes || [];
      this.routingEngine = settings.routingEngine;
      this.routeReduction = settings.routeReduction ?? 0.01;
      this.familyMembers = settings.familyMembers || [];

      // Auto-populate active hometown as start query if empty
      const activeHometown = settings.hometowns.find((h) => !h.endDate);
      if (activeHometown && !this.startQuery && !this.isEditing) {
        this.startQuery = activeHometown.name;
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
        m.name.toLowerCase().includes(this.participantSearchQuery.toLowerCase())
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
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const baseName = `${monthNames[d.getMonth()]} ${d.getFullYear()} - Trip`;
      let finalName = baseName;
      let counter = 1;
      while (this.savedRoutes.some(r => r.name === finalName)) {
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
    this.stateService.setSelectedRoute(null);
  }

  addStop() {
    this.stopsQueries.push('');
  }

  removeStop(index: number) {
    this.stopsQueries.splice(index, 1);
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
    moveItemInArray(this.stopsQueries, event.previousIndex, event.currentIndex);
  }

  trackByIndex(index: number, obj: any): any {
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

      // Preview the first route on the map
      this.previewSelectedOption();
    } catch (err: any) {
      this.logger.error('Error in calculateRoute:', err);
      this.errorMessage = err.message || 'Failed to calculate route.';
    } finally {
      this.isCalculating = false;
    }
  }

  previewSelectedOption() {
    if (this.routeOptions.length > 0) {
      const option = this.routeOptions[this.selectedOptionIndex];
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
        coordinates: this.reduceCoordinates(option.route), // Use reduced for immediate preview
      };
      this.stateService.setSelectedRoute(previewRoute);
    }
  }

  saveRoute() {
    let distance = 0;
    let duration = 0;
    let waypoints = this.calculatedWaypoints;

    if (this.routeOptions.length > 0) {
      const option = this.routeOptions[this.selectedOptionIndex];
      distance = option.distance;
      duration = option.duration;
    } else if (this.isEditing && this.originalRouteForEdit) {
      distance = this.originalRouteForEdit.distance;
      duration = this.originalRouteForEdit.duration;
      waypoints = this.originalRouteForEdit.waypoints;
    } else {
      return;
    }

    const newRoute: RouteObject = {
      id: this.isEditing && this.editingId ? this.editingId : crypto.randomUUID(),
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      members: [...this.selectedMembers],
      status: this.status,
      engine: this.routingEngine,
      distance: distance,
      duration: duration,
      timestamp: Date.now(),
      startQuery: this.startQuery,
      endQuery: this.endQuery,
      stopsQueries: [...this.stopsQueries],
      waypoints: waypoints,
      route: [], // Strip raw route out for localStorage savings
      coordinates: undefined, // Strip coordinates, we fetch dynamically
    };

    const updatedRoutes = [...this.savedRoutes];
    if (this.isEditing) {
      const idx = updatedRoutes.findIndex((r) => r.id === this.editingId);
      if (idx !== -1) updatedRoutes[idx] = newRoute;
    } else {
      updatedRoutes.push(newRoute);
    }

    this.updateSettingsAndReset(updatedRoutes);
    this.closeModal();
  }

  editRoute(route: RouteObject) {
    this.isEditing = true;
    this.editingId = route.id;
    this.originalRouteForEdit = route;
    this.name = route.name;
    this.description = route.description || '';
    this.startDate = route.startDate || '';
    this.endDate = route.endDate || '';
    this.status = route.status || 'planned';
    this.selectedMembers = route.members ? [...route.members] : [];
    this.startQuery = route.startQuery;
    this.endQuery = route.endQuery;
    this.stopsQueries = [...route.stopsQueries];

    this.routeOptions = [];
    this.showNotes = !!route.description; // Auto-show notes if they exist
    this.stateService.setSelectedRoute(route);
    this.openModal();
  }

  deleteRoute(routeId: string) {
    const updatedRoutes = this.savedRoutes.filter((r) => r.id !== routeId);
    this.updateSettingsAndReset(updatedRoutes);
    this.stateService.setSelectedRoute(null);
  }

  get plannedRoutes() {
    return this.savedRoutes
      .filter((r) => r.status === 'planned')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  get completedUndated() {
    return this.savedRoutes
      .filter((r) => r.status === 'completed' && (!r.startDate || r.startDate.trim() === '') && (!r.endDate || r.endDate.trim() === ''))
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
    // Current settings
    const currentSettings = (this.stateService as any).settingsSubject.getValue();
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
    const settings = (this.stateService as any).settingsSubject.getValue();
    const activeHometown = settings.hometowns.find((h: any) => !h.endDate);
    this.startQuery = activeHometown ? activeHometown.name : '';

    this.endQuery = '';
    this.stopsQueries = [];
    this.routeOptions = [];
    this.errorMessage = '';
  }

  private reduceCoordinates(route: [number, number][]): [number, number][] {
    // Basic array reduction for caching based on settings.routeReduction
    // e.g., 0.01 means keep ~1% of points, so step = 100
    const reduced = [];
    const step = Math.max(1, Math.ceil(1 / this.routeReduction));
    for (let i = 0; i < route.length; i += step) {
      reduced.push(route[i]);
    }
    // Always include the last point
    if (reduced[reduced.length - 1] !== route[route.length - 1]) {
      reduced.push(route[route.length - 1]);
    }
    return reduced;
  }
}
