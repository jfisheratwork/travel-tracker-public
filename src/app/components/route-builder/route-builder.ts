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

@Component({
  selector: 'app-route-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './route-builder.html',
  styleUrls: ['./route-builder.css'],
})
export class RouteBuilderComponent implements OnInit {
  savedRoutes: RouteObject[] = [];
  routingEngine: 'osrm' | 'mapbox' = 'osrm';
  routeReduction: number = 0.01;

  // Form State
  isEditing = false;
  editingId: string | null = null;
  name = '';
  description = '';
  startDate = '';
  endDate = '';

  startQuery = '';
  endQuery = '';
  stopsQueries: string[] = [];

  familyMembers: any[] = [];
  selectedMembers: string[] = [];

  // Routing State
  isCalculating = false;
  routeOptions: RouteOption[] = [];
  selectedOptionIndex = 0;
  calculatedWaypoints: Waypoint[] = [];
  errorMessage = '';

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
      const activeHometown =
        settings.hometowns.length > 0 ? settings.hometowns[settings.hometowns.length - 1] : null;
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
        coordinates: option.route, // for simplicity in preview
      };
      this.stateService.setSelectedRoute(previewRoute);
    }
  }

  saveRoute() {
    if (this.routeOptions.length === 0) return;

    const option = this.routeOptions[this.selectedOptionIndex];
    const newRoute: RouteObject = {
      id: this.isEditing && this.editingId ? this.editingId : crypto.randomUUID(),
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      members: [...this.selectedMembers],
      status: 'planned',
      engine: this.routingEngine,
      distance: option.distance,
      duration: option.duration,
      timestamp: Date.now(),
      startQuery: this.startQuery,
      endQuery: this.endQuery,
      stopsQueries: [...this.stopsQueries],
      waypoints: this.calculatedWaypoints,
      route: option.route,
      coordinates: this.reduceCoordinates(option.route),
    };

    const updatedRoutes = [...this.savedRoutes];
    if (this.isEditing) {
      const idx = updatedRoutes.findIndex((r) => r.id === this.editingId);
      if (idx !== -1) updatedRoutes[idx] = newRoute;
    } else {
      updatedRoutes.push(newRoute);
    }

    this.updateSettingsAndReset(updatedRoutes);
  }

  editRoute(route: RouteObject) {
    this.isEditing = true;
    this.editingId = route.id;
    this.name = route.name;
    this.description = route.description || '';
    this.startDate = route.startDate || '';
    this.endDate = route.endDate || '';
    this.selectedMembers = route.members ? [...route.members] : [];
    this.startQuery = route.startQuery;
    this.endQuery = route.endQuery;
    this.stopsQueries = [...route.stopsQueries];

    this.routeOptions = [];
    this.stateService.setSelectedRoute(route);
  }

  deleteRoute(routeId: string) {
    const updatedRoutes = this.savedRoutes.filter((r) => r.id !== routeId);
    this.updateSettingsAndReset(updatedRoutes);
    this.stateService.setSelectedRoute(null);
  }

  cancelEdit() {
    this.resetForm();
    this.stateService.setSelectedRoute(null);
  }

  private updateSettingsAndReset(routes: RouteObject[]) {
    // Current settings
    const currentSettings = (this.stateService as any).settingsSubject.getValue();
    this.stateService.updateSettings({ ...currentSettings, savedRoutes: routes });
    this.resetForm();
  }

  private resetForm() {
    this.isEditing = false;
    this.editingId = null;
    this.name = '';
    this.description = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedMembers = [];

    // reset startQuery to active hometown if applicable
    const settings = (this.stateService as any).settingsSubject.getValue();
    const activeHometown =
      settings.hometowns.length > 0 ? settings.hometowns[settings.hometowns.length - 1] : null;
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
