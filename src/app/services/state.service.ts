import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import { RouteObject } from '../models/route.model';

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

  private selectedRouteSubject = new BehaviorSubject<RouteObject | null>(null);
  public selectedRoute$ = this.selectedRouteSubject.asObservable();

  private loadingCount = 0;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  setMapMode(mode: 'parks' | 'states' | 'roads'): void {
    this.mapModeSubject.next(mode);
  }

  updateSettings(settings: AppSettings): void {
    this.settingsSubject.next(settings);
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
}
