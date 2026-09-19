import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import { RouteObject } from '../models/route.model';
import { ColorThemeId, DEFAULT_THEME_ID } from '../core/constants/theme.constants';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private searchTermSubject = new BehaviorSubject<string>('');
  public searchTerm$ = this.searchTermSubject.asObservable();

  private mapModeSubject = new BehaviorSubject<'parks' | 'states' | 'roads'>('parks');
  public mapMode$ = this.mapModeSubject.asObservable();

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

  setMapMode(mode: 'parks' | 'states' | 'roads'): void {
    this.mapModeSubject.next(mode);
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

  triggerNewRoadTrip(): void {
    this.newRoadTripTriggerSubject.next(Date.now());
  }
}
