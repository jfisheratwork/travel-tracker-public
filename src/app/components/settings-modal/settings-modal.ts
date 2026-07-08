import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../models/settings.model';
import { Subscription } from 'rxjs';

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

  draggedIndex: number | null = null;
  draggedType: 'family' | 'hometown' | null = null;

  private sub?: Subscription;

  constructor(private stateService: StateService) {}

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
      if (this.viewModel.routingEngine === 'mapbox' && this.viewModel.mapboxKey) {
        // Mapbox Forward Geocoding
        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${this.viewModel.mapboxKey}`,
        );
        if (response.ok) {
          const data = await response.json();
          this.hometownSearchResults = data.features.map(
            (f: {
              properties: { full_address?: string; name: string };
              geometry: { coordinates: number[] };
            }) => ({
              name: f.properties.full_address || f.properties.name,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            }),
          );
        }
      } else {
        // Fallback to Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        );
        if (response.ok) {
          const data = await response.json();
          this.hometownSearchResults = data.map(
            (item: { display_name: string; lat: string; lon: string }) => ({
              name: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }),
          );
        }
      }
    } catch (e) {
      console.error('Geocoding failed', e);
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
