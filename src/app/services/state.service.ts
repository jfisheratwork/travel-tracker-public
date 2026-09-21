import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import { RouteObject } from '../models/route.model';
import { ColorThemeId, DEFAULT_THEME_ID } from '../core/constants/theme.constants';
import { MapMode } from '../models/location.model';

export type PlaceFilterCategory =
  | 'states'
  | 'national_parks'
  | 'state_parks'
  | 'landmarks'
  | 'theme_parks'
  | 'cities'
  | 'custom';

export const ALL_PLACE_FILTER_CATEGORIES: PlaceFilterCategory[] = [
  'states',
  'national_parks',
  'state_parks',
  'landmarks',
  'theme_parks',
  'cities',
  'custom',
];

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private searchTermSubject = new BehaviorSubject<string>('');
  public searchTerm$ = this.searchTermSubject.asObservable();

  private mapModeSubject = new BehaviorSubject<MapMode>('places');
  public mapMode$ = this.mapModeSubject.asObservable();

  private placesFiltersSubject = new BehaviorSubject<PlaceFilterCategory[]>([
    ...ALL_PLACE_FILTER_CATEGORIES,
  ]);
  public placesFilters$ = this.placesFiltersSubject.asObservable();

  private selectedRouteIdsSubject = new BehaviorSubject<string[] | null>(null);
  public selectedRouteIds$ = this.selectedRouteIdsSubject.asObservable();

  private settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  public settings$ = this.settingsSubject.asObservable();

  private colorThemeSubject = new BehaviorSubject<ColorThemeId>(DEFAULT_THEME_ID);
  public colorTheme$ = this.colorThemeSubject.asObservable();

  private selectedRouteSubject = new BehaviorSubject<RouteObject | null>(null);
  public selectedRoute$ = this.selectedRouteSubject.asObservable();

  private loadingCount = 0;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private editingLocationSubject = new BehaviorSubject<{
    id: string;
    mode: 'parks' | 'states';
  } | null>(null);
  public editingLocation$ = this.editingLocationSubject.asObservable();

  setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  setMapMode(mode: MapMode): void {
    this.mapModeSubject.next(mode);
  }

  getPlacesFilters(): PlaceFilterCategory[] {
    return this.placesFiltersSubject.getValue();
  }

  setPlacesFilters(filters: PlaceFilterCategory[]): void {
    this.placesFiltersSubject.next([...filters]);
  }

  togglePlacesFilter(filter: PlaceFilterCategory): void {
    const current = this.getPlacesFilters();
    if (current.includes(filter)) {
      this.setPlacesFilters(current.filter((f) => f !== filter));
    } else {
      this.setPlacesFilters([...current, filter]);
    }
  }

  isPlacesFilterActive(filter: PlaceFilterCategory): boolean {
    return this.getPlacesFilters().includes(filter);
  }

  selectAllPlacesFilters(): void {
    this.setPlacesFilters([...ALL_PLACE_FILTER_CATEGORIES]);
  }

  clearAllPlacesFilters(): void {
    this.setPlacesFilters([]);
  }

  getSelectedRouteIds(): string[] | null {
    return this.selectedRouteIdsSubject.getValue();
  }

  setSelectedRouteIds(ids: string[] | null): void {
    this.selectedRouteIdsSubject.next(ids ? [...ids] : null);
  }

  getSettings(): AppSettings {
    return this.settingsSubject.getValue();
  }

  updateSettings(settings: AppSettings): void {
    this.settingsSubject.next(settings);
    if (settings.colorTheme && settings.colorTheme !== this.colorThemeSubject.getValue()) {
      this.colorThemeSubject.next(settings.colorTheme);
    }
  }

  setColorTheme(themeId: ColorThemeId): void {
    this.colorThemeSubject.next(themeId);
    const settings = this.getSettings();
    if (settings.colorTheme !== themeId) {
      this.updateSettings({ ...settings, colorTheme: themeId });
    }
  }

  getColorTheme(): ColorThemeId {
    return this.colorThemeSubject.getValue();
  }

  setSelectedRoute(route: RouteObject | null): void {
    this.selectedRouteSubject.next(route);
  }

  setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.loadingCount++;
    } else {
      this.loadingCount = Math.max(0, this.loadingCount - 1);
    }
    this.isLoadingSubject.next(this.loadingCount > 0);
  }

  setEditingLocation(location: { id: string; mode: 'parks' | 'states' } | null): void {
    this.editingLocationSubject.next(location);
  }

  private newRoadTripTriggerSubject = new BehaviorSubject<number>(0);
  public newRoadTripTrigger$ = this.newRoadTripTriggerSubject.asObservable();

  private detailsDrawerOpenSubject = new BehaviorSubject<boolean>(false);
  public detailsDrawerOpen$ = this.detailsDrawerOpenSubject.asObservable();

  setDetailsDrawerOpen(isOpen: boolean): void {
    this.detailsDrawerOpenSubject.next(isOpen);
  }

  isDetailsDrawerOpen(): boolean {
    return this.detailsDrawerOpenSubject.getValue();
  }

  triggerNewRoadTrip(): void {
    this.setMapMode('roads');
    this.setDetailsDrawerOpen(true);
    this.newRoadTripTriggerSubject.next(Date.now());
  }

  clearNewRoadTripTrigger(): void {
    this.newRoadTripTriggerSubject.next(0);
  }

  getLocationStatus(
    locationId: string,
    mode: 'parks' | 'states',
    memberId?: string,
  ): 'visited' | 'want' | 'unvisited' {
    const settings = this.getSettings();
    const visited = mode === 'parks' ? settings.visitedParks : settings.visitedStates;
    const want = mode === 'parks' ? settings.wantToVisitParks : settings.wantToVisitStates;

    if (memberId) {
      if (visited?.[locationId]?.some((v) => v.memberId === memberId)) return 'visited';
      if (want?.[locationId]?.some((v) => v.memberId === memberId)) return 'want';
      return 'unvisited';
    }

    if (visited?.[locationId] && visited[locationId].length > 0) return 'visited';
    if (want?.[locationId] && want[locationId].length > 0) return 'want';
    return 'unvisited';
  }

  setLocationStatus(
    locationId: string,
    mode: 'parks' | 'states',
    status: 'visited' | 'want' | 'unvisited',
    memberId?: string,
  ): void {
    const settings = JSON.parse(JSON.stringify(this.getSettings()));
    if (!settings.visitedParks) settings.visitedParks = {};
    if (!settings.visitedStates) settings.visitedStates = {};
    if (!settings.wantToVisitParks) settings.wantToVisitParks = {};
    if (!settings.wantToVisitStates) settings.wantToVisitStates = {};

    const visitedMap = mode === 'parks' ? settings.visitedParks : settings.visitedStates;
    const wantMap = mode === 'parks' ? settings.wantToVisitParks : settings.wantToVisitStates;

    const allMembers = settings.familyMembers || [];
    const targetMemberIds = memberId
      ? [memberId]
      : allMembers.length > 0
        ? allMembers.map((m: { id: string }) => m.id)
        : ['default'];

    if (status === 'visited') {
      if (!visitedMap[locationId]) visitedMap[locationId] = [];
      for (const mId of targetMemberIds) {
        if (!visitedMap[locationId].some((v: { memberId: string }) => v.memberId === mId)) {
          visitedMap[locationId].push({ memberId: mId });
        }
      }
      if (wantMap[locationId]) {
        wantMap[locationId] = wantMap[locationId].filter(
          (v: { memberId: string }) => !targetMemberIds.includes(v.memberId),
        );
        if (wantMap[locationId].length === 0) delete wantMap[locationId];
      }
    } else if (status === 'want') {
      if (!wantMap[locationId]) wantMap[locationId] = [];
      for (const mId of targetMemberIds) {
        if (!wantMap[locationId].some((v: { memberId: string }) => v.memberId === mId)) {
          wantMap[locationId].push({ memberId: mId });
        }
      }
      if (visitedMap[locationId]) {
        visitedMap[locationId] = visitedMap[locationId].filter(
          (v: { memberId: string }) => !targetMemberIds.includes(v.memberId),
        );
        if (visitedMap[locationId].length === 0) delete visitedMap[locationId];
      }
    } else {
      if (visitedMap[locationId]) {
        visitedMap[locationId] = visitedMap[locationId].filter(
          (v: { memberId: string }) => !targetMemberIds.includes(v.memberId),
        );
        if (visitedMap[locationId].length === 0) delete visitedMap[locationId];
      }
      if (wantMap[locationId]) {
        wantMap[locationId] = wantMap[locationId].filter(
          (v: { memberId: string }) => !targetMemberIds.includes(v.memberId),
        );
        if (wantMap[locationId].length === 0) delete wantMap[locationId];
      }
    }

    this.updateSettings(settings);
  }
}
