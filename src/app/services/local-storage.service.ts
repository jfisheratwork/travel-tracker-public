// DOCS: https://angular.io/api/core/Injectable
import { Injectable, inject } from '@angular/core';
// DOCS: https://rxjs.dev/api/index/class/BehaviorSubject
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { StateService } from './state.service';
import { AppSettings, DEFAULT_SETTINGS, FamilyMember, VisitDetail } from '../models/settings.model';
import { RouteObject } from '../models/route.model';
import { LoggerService } from '../core/services/logger.service';
import { HttpClient } from '@angular/common/http';
import { NATIONAL_PARKS, STATES } from '../core/constants/geography.constants';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private activeTabSubject = new BehaviorSubject<string>('parks');
  public activeTab$ = this.activeTabSubject.asObservable();
  private logger = inject(LoggerService);
  private http = inject(HttpClient);

  constructor(private stateService: StateService) {
    this.loadInitialState();

    // Subscribe to settings changes from state service and sync them to local storage
    this.stateService.settings$.subscribe((settings: AppSettings) => {
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
        this.applyParsedData(parsed);
      } catch (e) {
        this.logger.error('Failed to parse saved settings', e);
        this.stateService.updateSettings(DEFAULT_SETTINGS);
      }
    } else {
      this.stateService.updateSettings(DEFAULT_SETTINGS);
    }
  }

  /**
   * Parses and applies settings data from either modern or legacy format.
   */
  public applyParsedData(parsed: Record<string, unknown>): boolean {
    try {
      const rootSettings = (parsed['settings'] || parsed) as Record<string, unknown>;
      const legacyVisitData = parsed['visitData'] as
        | { states?: Record<string, boolean>; parks?: Record<string, boolean> }
        | undefined;

      // 1. Normalize family members
      let familyMembers: FamilyMember[] = [];
      if (Array.isArray(rootSettings['familyMembers'])) {
        familyMembers = (rootSettings['familyMembers'] as unknown[]).map((member: unknown) => {
          if (typeof member === 'string') {
            return {
              id: crypto.randomUUID(),
              name: member,
              color: this.getRandomColor(),
            };
          }
          const m = member as FamilyMember;
          return {
            id: m.id || crypto.randomUUID(),
            name: m.name || 'Member',
            color: m.color || this.getRandomColor(),
          };
        });
      }

      // 2. Normalize visited states and parks
      const visitedStates: Record<string, VisitDetail[]> = {};
      const visitedParks: Record<string, VisitDetail[]> = {};

      // If legacy visitData exists (e.g. family1.json)
      if (legacyVisitData) {
        if (legacyVisitData.states && typeof legacyVisitData.states === 'object') {
          for (const [key, value] of Object.entries(legacyVisitData.states)) {
            if (value === true) {
              const lastUnderscore = key.lastIndexOf('_');
              if (lastUnderscore !== -1) {
                const locName = key.substring(0, lastUnderscore);
                const memName = key.substring(lastUnderscore + 1);
                const loc = STATES.find(
                  (s) =>
                    s.name.toLowerCase() === locName.toLowerCase() ||
                    s.id.toLowerCase() === locName.toLowerCase(),
                );
                const mem = familyMembers.find(
                  (m) => m.name.toLowerCase() === memName.toLowerCase(),
                );
                if (loc && mem) {
                  if (!visitedStates[loc.id]) visitedStates[loc.id] = [];
                  if (!visitedStates[loc.id].some((v) => v.memberId === mem.id)) {
                    visitedStates[loc.id].push({ memberId: mem.id });
                  }
                }
              }
            }
          }
        }

        if (legacyVisitData.parks && typeof legacyVisitData.parks === 'object') {
          for (const [key, value] of Object.entries(legacyVisitData.parks)) {
            if (value === true) {
              const lastUnderscore = key.lastIndexOf('_');
              if (lastUnderscore !== -1) {
                const locName = key.substring(0, lastUnderscore);
                const memName = key.substring(lastUnderscore + 1);
                const loc = NATIONAL_PARKS.find(
                  (p) =>
                    p.name.toLowerCase() === locName.toLowerCase() ||
                    p.id.toLowerCase() === locName.toLowerCase(),
                );
                const mem = familyMembers.find(
                  (m) => m.name.toLowerCase() === memName.toLowerCase(),
                );
                if (loc && mem) {
                  if (!visitedParks[loc.id]) visitedParks[loc.id] = [];
                  if (!visitedParks[loc.id].some((v) => v.memberId === mem.id)) {
                    visitedParks[loc.id].push({ memberId: mem.id });
                  }
                }
              }
            }
          }
        }
      }

      // Merge any new-format visited locations
      const convertToVisitDetails = (
        record: Record<string, unknown[]>,
        target: Record<string, VisitDetail[]>,
      ) => {
        if (!record) return;
        for (const [key, items] of Object.entries(record)) {
          if (!target[key]) target[key] = [];
          for (const rawItem of items) {
            if (typeof rawItem === 'string') {
              const found = familyMembers.find((m) => m.name === rawItem || m.id === rawItem);
              if (found && !target[key].some((v) => v.memberId === found.id)) {
                target[key].push({ memberId: found.id });
              }
            } else if (rawItem && typeof rawItem === 'object' && 'memberId' in rawItem) {
              const item = rawItem as VisitDetail;
              const existing = target[key].find((v) => v.memberId === item.memberId);
              if (!existing) {
                target[key].push({ ...item });
              } else {
                Object.assign(existing, item);
              }
            }
          }
        }
      };

      if (rootSettings['visitedStates']) {
        convertToVisitDetails(
          rootSettings['visitedStates'] as Record<string, unknown[]>,
          visitedStates,
        );
      }
      if (rootSettings['visitedParks']) {
        convertToVisitDetails(
          rootSettings['visitedParks'] as Record<string, unknown[]>,
          visitedParks,
        );
      }

      const rawSavedRoutes = (rootSettings['savedRoutes'] || []) as RouteObject[];
      const savedRoutes = rawSavedRoutes.map((r, i) => ({
        ...r,
        id: r.id || (r.timestamp ? String(r.timestamp) : `route-${i}`),
        status: (r.status || 'planned') as 'planned' | 'completed',
        engine: (r.engine || 'osrm') as 'osrm' | 'mapbox',
        stopsQueries: r.stopsQueries || [],
        members: r.members || [],
        route: r.route && r.route.length > 0 ? r.route : r.coordinates || [],
        coordinates: r.coordinates || (r.route && r.route.length > 0 ? r.route : undefined),
        startDate: r.startDate || (r as unknown as Record<string, string>)['date'] || '',
      }));

      const migratedSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...(rootSettings as Partial<AppSettings>),
        familyMembers,
        visitedStates,
        visitedParks,
        savedRoutes,
      };

      this.stateService.updateSettings(migratedSettings);
      return true;
    } catch (err) {
      this.logger.error('Failed to apply parsed data', err);
      return false;
    }
  }

  /**
   * Exports current application state as a JSON backup file.
   * Strips sensitive API keys for user privacy and security.
   */
  public exportBackup(): void {
    const current = this.stateService.getSettings();
    const cleanSettings: AppSettings = { ...current };
    delete cleanSettings.mapboxKey;
    delete cleanSettings.cartoKey;

    const data = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: 'v4-angular',
      },
      settings: cleanSettings,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `travel_tracker_backup_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Imports a JSON string and updates application state.
   */
  public importBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
      const success = this.applyParsedData(parsed);
      if (success) {
        return { success: true, message: 'Backup successfully imported!' };
      }
      return { success: false, message: 'Invalid backup file structure.' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return { success: false, message: `Failed to parse backup: ${msg}` };
    }
  }

  /**
   * Loads a sample preset (e.g. 'family1.json') from docs/examples.
   */
  public async loadSamplePreset(
    presetFileName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Try examples/ relative to base, or docs/examples/
      const primaryUrl = `examples/${presetFileName}`;
      let data: Record<string, unknown> | null = null;
      try {
        data = await firstValueFrom(this.http.get<Record<string, unknown>>(primaryUrl));
      } catch {
        data = await firstValueFrom(
          this.http.get<Record<string, unknown>>(`docs/examples/${presetFileName}`),
        );
      }

      if (data) {
        const success = this.applyParsedData(data);
        if (success) {
          return { success: true, message: `Loaded ${presetFileName} successfully!` };
        }
      }
      return { success: false, message: 'Invalid preset data structure.' };
    } catch (err: unknown) {
      this.logger.error('Error loading preset', err);
      return { success: false, message: `Could not load ${presetFileName}` };
    }
  }

  public setActiveTab(tab: string): void {
    this.activeTabSubject.next(tab);
  }

  private getRandomColor(): string {
    const palette = [
      '#3b82f6', // blue
      '#ec4899', // pink
      '#f97316', // orange
      '#a855f7', // purple
      '#14b8a6', // teal
      '#ef4444', // red
      '#22c55e', // green
      '#eab308', // yellow
      '#6366f1', // indigo
      '#06b6d4', // cyan
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
