import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS, Hometown } from '../models/settings.model';
import { RouteObject } from '../models/route.model';
import { ColorThemeId, DEFAULT_THEME_ID } from '../core/constants/theme.constants';
import { MapMode } from '../models/location.model';
import { COUNTRIES_MAP } from '../core/constants/countries.constants';
import { REGIONS, REGIONS_MAP } from '../core/constants/regions.constants';
import { NATIONAL_PARKS, STATES, STATE_CODE_TO_NAME } from '../core/constants/geography.constants';
import { STATIC_PLACES_CATALOG } from '../core/constants/curated-places.constants';

export type PlaceFilterCategory =
  | 'states'
  | 'national_parks'
  | 'state_parks'
  | 'landmarks'
  | 'theme_parks'
  | 'cities'
  | 'capitals'
  | 'custom';

export const ALL_PLACE_FILTER_CATEGORIES: PlaceFilterCategory[] = [
  'states',
  'national_parks',
  'state_parks',
  'landmarks',
  'theme_parks',
  'cities',
  'capitals',
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

  private showUnvisitedPlacesSubject = new BehaviorSubject<boolean>(false);
  public showUnvisitedPlaces$ = this.showUnvisitedPlacesSubject.asObservable();

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

  getShowUnvisitedPlaces(): boolean {
    return this.showUnvisitedPlacesSubject.getValue();
  }

  setShowUnvisitedPlaces(show: boolean): void {
    this.showUnvisitedPlacesSubject.next(show);
  }

  toggleShowUnvisitedPlaces(): void {
    this.showUnvisitedPlacesSubject.next(!this.showUnvisitedPlacesSubject.getValue());
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

  getActiveHometown(): Hometown | null {
    const settings = this.getSettings();
    if (!settings.hometowns || settings.hometowns.length === 0) {
      return null;
    }
    return (
      [...settings.hometowns].reverse().find((h) => !h.endDate) ||
      settings.hometowns[settings.hometowns.length - 1]
    );
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
    const v4Visits = settings.placeVisits?.[locationId] || [];

    if (memberId) {
      const v4 = v4Visits.find((v) => v.memberId === memberId);
      if (v4) return v4.status === 'want_to_visit' ? 'want' : 'visited';
      if (visited?.[locationId]?.some((v) => v.memberId === memberId)) return 'visited';
      if (want?.[locationId]?.some((v) => v.memberId === memberId)) return 'want';
      return 'unvisited';
    }

    if (v4Visits.some((v) => v.status === 'visited')) return 'visited';
    if (v4Visits.some((v) => v.status === 'want_to_visit')) return 'want';
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
    const settings = JSON.parse(JSON.stringify(this.getSettings())) as AppSettings;
    if (!settings.visitedParks) settings.visitedParks = {};
    if (!settings.visitedStates) settings.visitedStates = {};
    if (!settings.wantToVisitParks) settings.wantToVisitParks = {};
    if (!settings.wantToVisitStates) settings.wantToVisitStates = {};
    if (!settings.placeVisits) settings.placeVisits = {};

    const allMembers = settings.familyMembers || [];
    const targetMemberIds = memberId
      ? [memberId]
      : allMembers.length > 0
        ? allMembers.map((m: { id: string }) => m.id)
        : ['default'];

    const applyToMaps = (
      targetId: string,
      isParkTarget: boolean,
      targetStatus: 'visited' | 'want' | 'unvisited',
    ) => {
      const vMap = isParkTarget ? settings.visitedParks! : settings.visitedStates!;
      const wMap = isParkTarget ? settings.wantToVisitParks! : settings.wantToVisitStates!;

      if (!settings.placeVisits[targetId]) {
        settings.placeVisits[targetId] = [];
      }
      settings.placeVisits[targetId] = settings.placeVisits[targetId].filter(
        (v) => !targetMemberIds.includes(v.memberId),
      );
      if (targetStatus === 'visited') {
        for (const mId of targetMemberIds) {
          settings.placeVisits[targetId].push({
            placeId: targetId,
            memberId: mId,
            status: 'visited',
            dateVisited: new Date().toISOString().split('T')[0],
          });
        }
      } else if (targetStatus === 'want') {
        for (const mId of targetMemberIds) {
          settings.placeVisits[targetId].push({
            placeId: targetId,
            memberId: mId,
            status: 'want_to_visit',
          });
        }
      }
      if (settings.placeVisits[targetId].length === 0) {
        delete settings.placeVisits[targetId];
      }

      if (targetStatus === 'visited') {
        if (!vMap[targetId]) vMap[targetId] = [];
        for (const mId of targetMemberIds) {
          if (!vMap[targetId].some((v) => v.memberId === mId)) {
            vMap[targetId].push({ memberId: mId });
          }
        }
        if (wMap[targetId]) {
          wMap[targetId] = wMap[targetId].filter((v) => !targetMemberIds.includes(v.memberId));
          if (wMap[targetId].length === 0) delete wMap[targetId];
        }
      } else if (targetStatus === 'want') {
        if (!wMap[targetId]) wMap[targetId] = [];
        for (const mId of targetMemberIds) {
          if (!wMap[targetId].some((v) => v.memberId === mId)) {
            wMap[targetId].push({ memberId: mId });
          }
        }
        if (vMap[targetId]) {
          vMap[targetId] = vMap[targetId].filter((v) => !targetMemberIds.includes(v.memberId));
          if (vMap[targetId].length === 0) delete vMap[targetId];
        }
      } else {
        if (vMap[targetId]) {
          vMap[targetId] = vMap[targetId].filter((v) => !targetMemberIds.includes(v.memberId));
          if (vMap[targetId].length === 0) delete vMap[targetId];
        }
        if (wMap[targetId]) {
          wMap[targetId] = wMap[targetId].filter((v) => !targetMemberIds.includes(v.memberId));
          if (wMap[targetId].length === 0) delete wMap[targetId];
        }
      }
    };

    const isPark = mode === 'parks';
    applyToMaps(locationId, isPark, status);

    // Auto-log parent region & country when status === 'visited'
    if (status === 'visited') {
      const curated =
        STATIC_PLACES_CATALOG.find((p) => p.id === locationId) ||
        (settings.customPlaces || []).find((p) => p.id === locationId);
      const park = NATIONAL_PARKS.find((p) => p.id === locationId);
      const stateObj = STATES.find((s) => s.id === locationId || s.name === locationId);
      const regionObj = REGIONS.find((r) => r.name === locationId || r.id === locationId);

      if (curated) {
        if (curated.regionId) {
          const rName = REGIONS_MAP.get(curated.regionId)?.name;
          if (rName) applyToMaps(rName, false, 'visited');
        }
        const cName =
          COUNTRIES_MAP.get(curated.countryId)?.name ||
          (curated.countryId === 'US'
            ? 'United States'
            : curated.countryId === 'CA'
              ? 'Canada'
              : '');
        if (cName) applyToMaps(cName, false, 'visited');
      } else if (park) {
        if (park.sub) {
          const primaryCode = park.sub.split('/')[0];
          const rName = STATE_CODE_TO_NAME[primaryCode];
          if (rName) applyToMaps(rName, false, 'visited');
        }
        const cName = park.country === 'Canada' ? 'Canada' : 'United States';
        applyToMaps(cName, false, 'visited');
      } else if (stateObj || regionObj) {
        const isCan =
          stateObj?.country === 'Canada' ||
          stateObj?.sub === 'Canada' ||
          regionObj?.countryId === 'CA';
        applyToMaps(isCan ? 'Canada' : 'United States', false, 'visited');
      }
    }

    this.updateSettings(settings);
  }
}
