// DOCS: https://angular.io/api/core/Injectable
import { Injectable } from '@angular/core';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
import { BehaviorSubject } from 'rxjs';
import { StateService } from './state.service';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private activeTabSubject = new BehaviorSubject<string>('parks');
  public activeTab$ = this.activeTabSubject.asObservable();

  constructor(private stateService: StateService) {
    this.loadInitialState();

    // Subscribe to settings changes from state service and sync them to local storage
    this.stateService.settings$.subscribe((settings: AppSettings) => {
      // Don't save if it's the exact DEFAULT_SETTINGS instance on startup
      // Actually, saving on every emit is fine, it keeps storage in sync.
      try {
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings to localStorage', e);
      }
    });
  }

  private loadInitialState(): void {
    const savedSettings = localStorage.getItem('np_travel_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);

        // Merge with defaults to ensure all properties exist
        // Note: The legacy app stored strings in familyMembers, we need to handle migration
        // if they are strings.
        const migratedSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          familyMembers: Array.isArray(parsed.familyMembers)
            ? parsed.familyMembers.map((member: unknown) =>
                typeof member === 'string'
                  ? { id: crypto.randomUUID(), name: member, color: this.getRandomColor() }
                  : member,
              )
            : [],
        };

        this.stateService.updateSettings(migratedSettings);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
        this.stateService.updateSettings(DEFAULT_SETTINGS);
      }
    } else {
      this.stateService.updateSettings(DEFAULT_SETTINGS);
    }
  }

  public setActiveTab(tab: string): void {
    this.activeTabSubject.next(tab);
  }

  private getRandomColor(): string {
    const palette = [
      'blue',
      'pink',
      'orange',
      'purple',
      'teal',
      'red',
      'green',
      'yellow',
      'indigo',
      'cyan',
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
