import { Component, EventEmitter, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/settings.model';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoggerService } from '../../core/services/logger.service';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { AppErrorType } from '../../core/models/app-error.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  activeTab: 'locations' | 'family' | 'routing' | 'data' | 'danger' = 'locations';

  // The intermediate ViewModel
  viewModel: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  newMemberName: string = '';
  hometownQuery: string = '';
  hometownSearchResults: { name: string; lat: number; lng: number }[] = [];
  isSearching: boolean = false;
  isLoadingPreset: boolean = false;

  private logger = inject(LoggerService);
  private localStorageService = inject(LocalStorageService);
  private toastService = inject(ToastService);

  draggedIndex: number | null = null;
  draggedType: 'family' | 'hometown' | null = null;

  private sub?: Subscription;

  constructor(
    private stateService: StateService,
    private geocodingService: GeocodingService,
  ) {}

  ngOnInit(): void {
    // Clone the current settings state when opening the modal
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  get hasEnvCartoKey(): boolean {
    return !!(environment.cartoKey && environment.cartoKey !== 'YOUR_CARTO_API_KEY');
  }

  get hasEnvMapboxKey(): boolean {
    return !!(environment.mapboxKey && environment.mapboxKey !== 'YOUR_MAPBOX_API_KEY');
  }

  get isCartoActive(): boolean {
    const key = (this.viewModel.cartoKey || environment.cartoKey || '').trim();
    return !!(key && key !== 'YOUR_CARTO_API_KEY');
  }

  save(): void {
    if (this.viewModel.cartoKey) {
      this.viewModel.cartoKey = this.viewModel.cartoKey.trim();
    }
    if (this.viewModel.mapboxKey) {
      this.viewModel.mapboxKey = this.viewModel.mapboxKey.trim();
    }
    this.stateService.updateSettings(this.viewModel);
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  // --- Family Members ---
  addFamilyMember(): void {
    const raw = this.newMemberName.trim();
    if (!raw) return;

    // Support comma-separated names (e.g. "Bob, Brittany, Ben")
    const names = raw
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    for (const name of names) {
      if (this.viewModel.familyMembers.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        continue;
      }
      this.viewModel.familyMembers.push({
        id: crypto.randomUUID(),
        name,
        color: this.getRandomColor(),
      });
    }

    this.newMemberName = '';
  }

  removeFamilyMember(id: string): void {
    this.viewModel.familyMembers = this.viewModel.familyMembers.filter((m) => m.id !== id);
  }

  private getRandomColor(): string {
    const palette = [
      '#3b82f6',
      '#ec4899',
      '#f97316',
      '#a855f7',
      '#14b8a6',
      '#ef4444',
      '#22c55e',
      '#eab308',
      '#6366f1',
      '#06b6d4',
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  onDragStart(index: number, type: 'family' | 'hometown'): void {
    this.draggedIndex = index;
    this.draggedType = type;
  }

  onDrop(dropIndex: number, type: 'family' | 'hometown'): void {
    if (this.draggedIndex !== null && this.draggedType === type) {
      if (type === 'family') {
        const item = this.viewModel.familyMembers.splice(this.draggedIndex, 1)[0];
        this.viewModel.familyMembers.splice(dropIndex, 0, item);
      } else if (type === 'hometown') {
        const item = this.viewModel.hometowns.splice(this.draggedIndex, 1)[0];
        this.viewModel.hometowns.splice(dropIndex, 0, item);
      }
    }
    this.draggedIndex = null;
    this.draggedType = null;
  }

  moveFamilyMember(index: number, direction: 'up' | 'down'): void {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.viewModel.familyMembers.length) return;
    const item = this.viewModel.familyMembers.splice(index, 1)[0];
    this.viewModel.familyMembers.splice(targetIndex, 0, item);
  }

  moveHometown(index: number, direction: 'up' | 'down'): void {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.viewModel.hometowns.length) return;
    const item = this.viewModel.hometowns.splice(index, 1)[0];
    this.viewModel.hometowns.splice(targetIndex, 0, item);
  }

  // --- Hometowns ---
  async searchHometown(): Promise<void> {
    const query = this.hometownQuery.trim();
    if (!query) return;

    this.isSearching = true;
    this.hometownSearchResults = [];

    try {
      const results = await firstValueFrom(this.geocodingService.searchLocations(query, 5));
      this.hometownSearchResults = results.map((r) => ({
        name: r.name || 'Unknown Location',
        lat: r.lat,
        lng: r.lng,
      }));
    } catch (e: unknown) {
      this.logger.error('Geocoding failed', e);
    } finally {
      this.isSearching = false;
    }
  }

  addHometown(result: { name: string; lat: number; lng: number }): void {
    this.viewModel.hometowns.push({
      id: crypto.randomUUID(),
      name: result.name,
      lat: result.lat,
      lng: result.lng,
    });
    this.hometownQuery = '';
    this.hometownSearchResults = [];
  }

  removeHometown(id: string): void {
    this.viewModel.hometowns = this.viewModel.hometowns.filter((h) => h.id !== id);
  }

  // --- Data Management (Export / Import / Samples) ---
  exportData(): void {
    this.localStorageService.exportBackup();
    this.toastService.showSuccess('Backup exported successfully!');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      const res = this.localStorageService.importBackup(content);
      if (res.success) {
        this.toastService.showSuccess(res.message);
      } else {
        this.toastService.showError({
          type: AppErrorType.UNKNOWN,
          message: res.message,
        });
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async loadSampleData(): Promise<void> {
    this.isLoadingPreset = true;
    const res = await this.localStorageService.loadSamplePreset('family1.json');
    this.isLoadingPreset = false;
    if (res.success) {
      this.toastService.showSuccess('Sample data (family1.json) loaded!');
    } else {
      this.toastService.showError({
        type: AppErrorType.UNKNOWN,
        message: res.message,
      });
    }
  }

  // --- Danger Zone ---
  confirmReset(): void {
    if (
      confirm('Are you sure you want to reset all settings and visit data? This cannot be undone.')
    ) {
      localStorage.removeItem('np_travel_settings');
      localStorage.removeItem('np_travel_tracker_v3');
      localStorage.removeItem('np_travel_active_tab');
      // Reload page to start fresh
      window.location.reload();
    }
  }
}
