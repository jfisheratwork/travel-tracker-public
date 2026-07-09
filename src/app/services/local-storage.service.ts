// DOCS: https://angular.io/api/core/Injectable
import { Injectable, inject } from '@angular/core';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
import { BehaviorSubject } from 'rxjs';
import { StateService } from './state.service';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import { LoggerService } from '../core/services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private activeTabSubject = new BehaviorSubject<string>('parks');
  public activeTab$ = this.activeTabSubject.asObservable();
  private logger = inject(LoggerService);

  constructor(private stateService: StateService) {
    this.loadInitialState();

    // Subscribe to settings changes from state service and sync them to local storage
    this.stateService.settings$.subscribe((settings: AppSettings) => {
      // Don't save if it's the exact DEFAULT_SETTINGS instance on startup
      // Actually, saving on every emit is fine, it keeps storage in sync.
      try {
        localStorage.setItem('np_travel_settings', JSON.stringify(settings));
      } catch (e) {
        this.logger.error('Failed to save settings to localStorage', e);
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
        const familyMembers = Array.isArray(parsed.familyMembers)
          ? parsed.familyMembers.map((member: unknown) =>
              typeof member === 'string'
                ? { id: crypto.randomUUID(), name: member, color: this.getRandomColor() }
                : member,
            )
          : [];

        // Helper to convert legacy structures to VisitDetail[]
        const convertToVisitDetails = (record: Record<string, any[]>) => {
          const newRecord: Record<string, import('../models/settings.model').VisitDetail[]> = {};
          if (!record) return newRecord;
          for (const [key, items] of Object.entries(record)) {
            newRecord[key] = items.map((item) => {
              if (typeof item === 'string') {
                const found = familyMembers.find((m: any) => m.name === item || m.id === item);
                return { memberId: found ? found.id : item };
              }
              return item; // already VisitDetail
            });
          }
          return newRecord;
        };

        const migratedSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          familyMembers,
          visitedStates: convertToVisitDetails(parsed.visitedStates),
          visitedParks: convertToVisitDetails(parsed.visitedParks),
        };

        this.stateService.updateSettings(migratedSettings);
      } catch (e) {
        this.logger.error('Failed to parse saved settings', e);
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
