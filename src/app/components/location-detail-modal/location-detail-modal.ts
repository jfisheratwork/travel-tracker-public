import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, VisitDetail, VisitLogEntry } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { NATIONAL_PARKS, STATES, GeoLocation } from '../../core/constants/geography.constants';
import { GLOBAL_COUNTRIES, COUNTRIES_MAP } from '../../core/constants/countries.constants';
import { REGIONS_MAP } from '../../core/constants/regions.constants';
import { STATIC_PLACES_CATALOG } from '../../core/constants/curated-places.constants';

@Component({
  selector: 'app-location-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-detail-modal.html',
})
export class LocationDetailModal implements OnInit, OnDestroy {
  @Input() locationId!: string;
  @Input() mode: 'parks' | 'states' = 'parks';
  @Output() close = new EventEmitter<void>();

  viewModel: AppSettings | null = null;
  location: GeoLocation | null = null;

  // Local state for editing visits before saving
  editingVisits: Record<string, VisitDetail> = {};
  locationVisitLogs: VisitLogEntry[] = [];

  private sub?: Subscription;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
      this.resolveLocation();
      this.initializeEditingState();
    });
  }

  private resolveLocation(): void {
    const allCountries: GeoLocation[] = GLOBAL_COUNTRIES.map((c) => ({
      id: c.name,
      name: c.name,
      lat: 0,
      lng: 0,
      sub: c.code,
      country: c.name,
      category: 'country',
    }));
    const curatedLocs: GeoLocation[] = STATIC_PLACES_CATALOG.map((p) => {
      const cName =
        COUNTRIES_MAP.get(p.countryId)?.name ||
        (p.countryId === 'US' ? 'USA' : p.countryId === 'CA' ? 'Canada' : p.countryId);
      const rName = p.regionId ? REGIONS_MAP.get(p.regionId)?.name : undefined;
      return {
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        sub: rName || '',
        country: cName,
        category: p.category,
        regionName: rName,
      };
    });
    const customLocs: GeoLocation[] = (this.viewModel?.customPlaces || []).map((p) => {
      const cName =
        COUNTRIES_MAP.get(p.countryId)?.name ||
        (p.countryId === 'US' ? 'USA' : p.countryId === 'CA' ? 'Canada' : p.countryId);
      const rName = p.regionId ? REGIONS_MAP.get(p.regionId)?.name : undefined;
      return {
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        sub: rName || '',
        country: cName,
        category: p.category,
        regionName: rName,
      };
    });

    const primaryList = this.mode === 'parks' ? NATIONAL_PARKS : [...STATES, ...allCountries];
    const fallbackList = [
      ...primaryList,
      ...(this.mode === 'parks' ? [...STATES, ...allCountries] : NATIONAL_PARKS),
      ...curatedLocs,
      ...customLocs,
    ];

    const cleanId = this.locationId
      .replace(/^park-/, '')
      .replace(/^state-/, '')
      .toLowerCase();
    this.location =
      fallbackList.find(
        (l) =>
          l.id === this.locationId ||
          l.id.toLowerCase() === cleanId ||
          l.name.toLowerCase() === cleanId ||
          l.name.toLowerCase() === this.locationId.toLowerCase(),
      ) || null;

    if (this.location) {
      this.locationId = this.location.id;
    }
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  private getVisitsMap(): Record<string, VisitDetail[]> {
    if (!this.viewModel) return {};
    if (!this.viewModel.visitedParks) this.viewModel.visitedParks = {};
    if (!this.viewModel.visitedStates) this.viewModel.visitedStates = {};
    return this.mode === 'parks' ? this.viewModel.visitedParks : this.viewModel.visitedStates;
  }

  private initializeEditingState(): void {
    if (!this.viewModel) return;
    const visits = this.getVisitsMap();
    const locVisits = [...(visits[this.locationId] || [])];
    const v4Visits = this.viewModel.placeVisits?.[this.locationId] || [];

    for (const v4 of v4Visits) {
      if (v4.status === 'visited' && !locVisits.some((v) => v.memberId === v4.memberId)) {
        locVisits.push({
          memberId: v4.memberId,
          firstVisitedDate: v4.dateVisited || '',
          dateVisited: v4.dateVisited || '',
          notes: v4.notes || '',
        });
      }
    }
    visits[this.locationId] = locVisits;

    this.editingVisits = {};
    for (const member of this.viewModel.familyMembers) {
      const existing = locVisits.find((v) => v.memberId === member.id);
      if (existing) {
        this.editingVisits[member.id] = {
          ...existing,
          firstVisitedDate: existing.firstVisitedDate || existing.dateVisited || '',
        };
      } else {
        this.editingVisits[member.id] = {
          memberId: member.id,
          dateVisited: '',
          firstVisitedDate: '',
          notes: '',
        };
      }
    }

    // Initialize visits list for this specific location
    const storedLogs = this.viewModel.locationVisits?.[this.locationId] || [];
    this.locationVisitLogs = storedLogs.map((l) => ({ ...l }));
  }

  isVisited(memberId: string): boolean {
    if (!this.viewModel) return false;
    const visits = this.getVisitsMap();
    const locVisits = visits[this.locationId] || [];
    return locVisits.some((v) => v.memberId === memberId);
  }

  toggleVisit(memberId: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (!this.viewModel) return;

    const visits = this.getVisitsMap();
    if (!visits[this.locationId]) visits[this.locationId] = [];

    const locVisits = visits[this.locationId];
    const idx = locVisits.findIndex((v) => v.memberId === memberId);

    if (isChecked && idx === -1) {
      locVisits.push({ ...this.editingVisits[memberId] });
    } else if (!isChecked && idx !== -1) {
      locVisits.splice(idx, 1);
    }
  }

  updateDetails(memberId: string): void {
    if (!this.viewModel) return;
    const visits = this.getVisitsMap();
    const locVisits = visits[this.locationId] || [];

    const idx = locVisits.findIndex((v) => v.memberId === memberId);
    if (idx !== -1) {
      const detail = this.editingVisits[memberId];
      locVisits[idx] = {
        ...detail,
        dateVisited: detail.firstVisitedDate || detail.dateVisited,
      };
    }
  }

  addVisitLog(): void {
    const today = new Date().toISOString().split('T')[0];
    this.locationVisitLogs.push({
      id: crypto.randomUUID(),
      dateVisited: today,
      comments: '',
    });
  }

  removeVisitLog(index: number): void {
    this.locationVisitLogs.splice(index, 1);
  }

  save(): void {
    if (!this.viewModel) return;

    // Save location-level visit logs
    if (!this.viewModel.locationVisits) {
      this.viewModel.locationVisits = {};
    }
    this.viewModel.locationVisits[this.locationId] = this.locationVisitLogs;

    // Update visited details per member
    const visits = this.getVisitsMap();
    const locVisits = visits[this.locationId] || [];

    if (!this.viewModel.placeVisits) {
      this.viewModel.placeVisits = {};
    }

    locVisits.forEach((v) => {
      const edit = this.editingVisits[v.memberId];
      if (edit) {
        v.firstVisitedDate = edit.firstVisitedDate;
        v.dateVisited = edit.firstVisitedDate || edit.dateVisited;
        v.notes = edit.notes;
      }
    });

    // Sync V4 placeVisits for this location
    this.viewModel.placeVisits[this.locationId] = locVisits.map((v) => ({
      placeId: this.locationId,
      memberId: v.memberId,
      status: 'visited',
      dateVisited: v.firstVisitedDate || v.dateVisited,
      notes: v.notes,
    }));

    this.stateService.updateSettings(this.viewModel);
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }
}
