import { Component, EventEmitter, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/settings.model';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoggerService } from '../../core/services/logger.service';
import { GeocodingService } from '../../services/routing/geocoding.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  activeTab: 'locations' | 'family' | 'routing' | 'danger' = 'locations';

  // The intermediate ViewModel
  viewModel: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  newMemberName: string = '';
  hometownQuery: string = '';
  hometownSearchResults: { name: string; lat: number; lng: number }[] = [];
  isSearching: boolean = false;
  private logger = inject(LoggerService);

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

  save(): void {
    this.stateService.updateSettings(this.viewModel);
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  // --- Family Members ---
  addFamilyMember(): void {
    const name = this.newMemberName.trim();
    if (!name) return;

    // Check if exists
    if (this.viewModel.familyMembers.find((m) => m.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    this.viewModel.familyMembers.push({
      id: crypto.randomUUID(),
      name,
      color: this.getRandomColor(),
    });

    this.newMemberName = '';
  }

  removeFamilyMember(id: string): void {
    this.viewModel.familyMembers = this.viewModel.familyMembers.filter((m) => m.id !== id);
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
    } catch (e: any) {
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
