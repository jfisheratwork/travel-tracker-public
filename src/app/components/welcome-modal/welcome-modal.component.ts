// DOCS: https://angular.io/api/core/Component
import { Component, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';
// DOCS: https://angular.io/api/common/CommonModule
import { CommonModule } from '@angular/common';
// DOCS: https://angular.io/api/forms/FormsModule
import { FormsModule } from '@angular/forms';
// DOCS: https://rxjs.dev/api/index/function/firstValueFrom
import { firstValueFrom } from 'rxjs';
import { StateService } from '../../services/state.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { ToastService } from '../../core/services/toast.service';
import { LoggerService } from '../../core/services/logger.service';
import { AppErrorType } from '../../core/models/app-error.model';
import { FamilyMember, Hometown } from '../../models/settings.model';
import { environment } from '../../../environments/environment';

const MEMBER_COLOR_PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

@Component({
  selector: 'app-welcome-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './welcome-modal.component.html',
})
export class WelcomeModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private stateService = inject(StateService);
  private localStorageService = inject(LocalStorageService);
  private geocodingService = inject(GeocodingService);
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);

  // Form states
  familyMembers: { id: string; name: string; color: string }[] = [];
  memberNameInput = '';

  homeCityQuery = '';
  homeCity: { name: string; lat: number; lng: number } | null = null;
  homeCitySearchResults: { name: string; lat: number; lng: number }[] = [];
  isSearchingCity = false;

  mapboxKeyInput = '';
  cartoKeyInput = '';

  ngOnInit(): void {
    const current = this.stateService.getSettings();
    if (current.familyMembers && current.familyMembers.length > 0) {
      this.familyMembers = current.familyMembers.map((m) => ({ ...m }));
    }
    if (current.hometowns && current.hometowns.length > 0) {
      const primary = current.hometowns[0];
      this.homeCity = { name: primary.name, lat: primary.lat, lng: primary.lng };
      this.homeCityQuery = primary.name;
    }
    this.mapboxKeyInput = current.mapboxKey || '';
    this.cartoKeyInput = current.cartoKey || '';
  }

  get hasEnvCartoKey(): boolean {
    return !!(environment.cartoKey && environment.cartoKey !== 'YOUR_CARTO_API_KEY');
  }

  get hasEnvMapboxKey(): boolean {
    return !!(environment.mapboxKey && environment.mapboxKey !== 'YOUR_MAPBOX_API_KEY');
  }

  get isMapboxActive(): boolean {
    const key = (this.mapboxKeyInput || environment.mapboxKey || '').trim();
    return !!(key && key !== 'YOUR_MAPBOX_API_KEY');
  }

  get isCartoActive(): boolean {
    const key = (this.cartoKeyInput || environment.cartoKey || '').trim();
    return !!(key && key !== 'YOUR_CARTO_API_KEY');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.skip();
  }

  // --- Family Members ---
  addFamilyMember(): void {
    const raw = this.memberNameInput.trim();
    if (!raw) return;

    // Support comma-separated names (e.g. "Bob, Brittany, Ben")
    const names = raw
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    for (const name of names) {
      const colorIndex = this.familyMembers.length % MEMBER_COLOR_PALETTE.length;
      this.familyMembers.push({
        id: crypto.randomUUID(),
        name,
        color: MEMBER_COLOR_PALETTE[colorIndex],
      });
    }

    this.memberNameInput = '';
  }

  removeFamilyMember(index: number): void {
    this.familyMembers.splice(index, 1);
  }

  // --- Home City ---
  async searchCity(): Promise<void> {
    const query = this.homeCityQuery.trim();
    if (!query) return;

    this.isSearchingCity = true;
    this.homeCitySearchResults = [];

    try {
      const results = await firstValueFrom(this.geocodingService.searchLocations(query, 5));
      this.homeCitySearchResults = results.map((r) => ({
        name: r.name || 'Unknown Location',
        lat: r.lat,
        lng: r.lng,
      }));
    } catch (e) {
      this.logger.error('City search failed', e);
      this.toastService.showError({
        type: AppErrorType.VALIDATION_ERROR,
        message: 'Could not find city. Please check the spelling.',
      });
    } finally {
      this.isSearchingCity = false;
    }
  }

  selectCity(result: { name: string; lat: number; lng: number }): void {
    this.homeCity = result;
    this.homeCityQuery = result.name;
    this.homeCitySearchResults = [];
  }

  clearCity(): void {
    this.homeCity = null;
    this.homeCityQuery = '';
    this.homeCitySearchResults = [];
  }

  // --- Actions ---
  async saveAndStart(): Promise<void> {
    // If the user entered a home city but didn't click search/select, resolve it
    if (!this.homeCity && this.homeCityQuery.trim()) {
      try {
        const query = this.homeCityQuery.trim();
        const results = await firstValueFrom(this.geocodingService.searchLocations(query, 1));
        if (results.length > 0) {
          this.homeCity = {
            name: results[0].name || query,
            lat: results[0].lat,
            lng: results[0].lng,
          };
        }
      } catch {
        // Fallback: use query with center of US
        this.homeCity = { name: this.homeCityQuery.trim(), lat: 39.8283, lng: -98.5795 };
      }
    }

    const current = this.stateService.getSettings();
    const mapboxKey = this.mapboxKeyInput.trim();
    const cartoKey = this.cartoKeyInput.trim();

    const hometowns: Hometown[] = this.homeCity
      ? [
          {
            id: crypto.randomUUID(),
            name: this.homeCity.name,
            lat: this.homeCity.lat,
            lng: this.homeCity.lng,
          },
        ]
      : current.hometowns || [];

    const updatedSettings = {
      ...current,
      familyMembers: this.familyMembers as FamilyMember[],
      hometowns,
      mapboxKey: mapboxKey || undefined,
      cartoKey: cartoKey || undefined,
      routingEngine:
        mapboxKey || this.hasEnvMapboxKey ? ('mapbox' as const) : current.routingEngine || 'osrm',
    };

    this.stateService.updateSettings(updatedSettings);
    this.localStorageService.markWelcomeDismissed();
    this.toastService.showSuccess('Welcome! Your travel tracker is ready.');
    this.close.emit();
  }

  async loadDemoSample(): Promise<void> {
    const result = await this.localStorageService.loadSamplePreset();
    if (result.success) {
      this.localStorageService.markWelcomeDismissed();
      this.toastService.showSuccess('Sample data loaded! Have fun exploring.');
      this.close.emit();
    } else {
      this.toastService.showError({
        type: AppErrorType.SERVER_ERROR,
        message: 'Could not load sample data.',
      });
    }
  }

  skip(): void {
    this.localStorageService.markWelcomeDismissed();
    this.close.emit();
  }
}
