import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StateService } from '../../services/state.service';
import { AppSettings } from '../../models/settings.model';
import { Place, PlaceCategory } from '../../models/location.model';
import { Waypoint } from '../../models/route.model';
import { GeocodingService } from '../../services/routing/geocoding.service';
import { ToastService } from '../../core/services/toast.service';
import { AppErrorType } from '../../core/models/app-error.model';
import { GLOBAL_COUNTRIES, COUNTRIES_MAP } from '../../core/constants/countries.constants';
import { REGIONS, REGIONS_MAP, getRegionsByCountry } from '../../core/constants/regions.constants';
import { STATIC_PLACES_CATALOG } from '../../core/constants/curated-places.constants';

export type SortColumn = 'name' | 'category' | 'country' | 'state' | string; // string for family member IDs

export interface ModalLocationItem {
  id: string;
  name: string;
  category: PlaceCategory | 'region';
  countryId: string;
  countryName: string;
  regionId?: string;
  regionName?: string;
  sub?: string;
  lat: number;
  lng: number;
  source: 'static' | 'user' | 'osm';
  isCurated?: boolean;
  isCapital?: boolean;
  isMajorCity?: boolean;
  tags?: string[];
}

@Component({
  selector: 'app-parks-states-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parks-states-modal.html',
})
export class ParksStatesModal implements OnInit, OnDestroy {
  @Input() mode: 'parks' | 'states' | 'places' = 'places';
  @Output() close = new EventEmitter<void>();

  viewModel: AppSettings | null = null;
  locations: ModalLocationItem[] = [];

  // Static Catalogs
  readonly globalCountries = GLOBAL_COUNTRIES;
  readonly primaryCountries = GLOBAL_COUNTRIES.filter((c) => c.pinned);
  readonly otherCountries = GLOBAL_COUNTRIES.filter((c) => !c.pinned);

  // Filters
  searchQuery = '';
  countryFilter = 'all'; // 'all', 'US', 'CA', etc.
  stateFilter = 'all'; // 'all' or regionId
  memberFilter = 'all'; // 'all' or member ID
  visibilityFilter = 'all'; // 'all', 'visited', 'want', 'unvisited'

  // Granular Category Chips
  selectedCategories = new Set<string>([
    'national_park',
    'state_park',
    'provincial_park',
    'city',
    'landmark',
    'custom',
  ]);
  capitalsOnly = false;

  availableRegions = REGIONS;

  // Sorting
  sortColumn: SortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // OpenStreetMap Fallback Search
  isSearchingOsm = false;
  osmResults: Waypoint[] = [];

  private sub?: Subscription;
  private stateService = inject(StateService);
  private geocodingService = inject(GeocodingService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.updateAvailableRegions();
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
      if (!this.viewModel!.visitedParks) this.viewModel!.visitedParks = {};
      if (!this.viewModel!.visitedStates) this.viewModel!.visitedStates = {};
      if (!this.viewModel!.wantToVisitParks) this.viewModel!.wantToVisitParks = {};
      if (!this.viewModel!.wantToVisitStates) this.viewModel!.wantToVisitStates = {};
      if (!this.viewModel!.customPlaces) this.viewModel!.customPlaces = [];
      if (!this.viewModel!.placeVisits) this.viewModel!.placeVisits = {};

      this.updateLocations();
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  switchModalMode(newMode: 'parks' | 'states' | 'places'): void {
    this.mode = newMode;
    this.stateFilter = 'all';
    this.searchQuery = '';
    this.osmResults = [];
    this.updateAvailableRegions();
    this.updateLocations();
  }

  updateAvailableRegions(): void {
    if (this.countryFilter === 'all') {
      this.availableRegions = REGIONS;
    } else {
      this.availableRegions = getRegionsByCountry(this.countryFilter);
    }
  }

  onCountryChange(): void {
    this.stateFilter = 'all';
    this.updateAvailableRegions();
    this.updateLocations();
  }

  toggleCategoryFilter(category: string): void {
    if (this.selectedCategories.has(category)) {
      if (this.selectedCategories.size > 1) {
        this.selectedCategories.delete(category);
      }
    } else {
      this.selectedCategories.add(category);
    }
  }

  toggleCapitalsOnly(): void {
    this.capitalsOnly = !this.capitalsOnly;
  }

  updateLocations(): void {
    const customPlaces = this.viewModel?.customPlaces || [];
    const allPlaces: ModalLocationItem[] = [
      ...STATIC_PLACES_CATALOG.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        countryId: p.countryId,
        countryName:
          p.countryId === 'CA'
            ? 'Canada'
            : p.countryId === 'US'
              ? 'United States'
              : COUNTRIES_MAP.get(p.countryId)?.name || p.countryId,
        regionId: p.regionId,
        regionName: p.regionId ? REGIONS_MAP.get(p.regionId)?.name : undefined,
        sub: p.regionId ? REGIONS_MAP.get(p.regionId)?.code : undefined,
        lat: p.lat,
        lng: p.lng,
        source: p.source,
        isCurated: p.isCurated,
        isCapital: p.isCapital,
        isMajorCity: p.isMajorCity,
        tags: p.tags,
      })),
      ...customPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        countryId: p.countryId,
        countryName:
          p.countryId === 'CA'
            ? 'Canada'
            : p.countryId === 'US'
              ? 'United States'
              : COUNTRIES_MAP.get(p.countryId)?.name || p.countryId,
        regionId: p.regionId,
        regionName: p.regionId ? REGIONS_MAP.get(p.regionId)?.name : undefined,
        sub: p.regionId ? REGIONS_MAP.get(p.regionId)?.code : undefined,
        lat: p.lat,
        lng: p.lng,
        source: p.source,
        isCurated: false,
        isCapital: p.isCapital,
        isMajorCity: p.isMajorCity,
        tags: p.tags,
      })),
    ];

    const allRegions: ModalLocationItem[] = REGIONS.map((r) => ({
      id: r.name,
      name: r.name,
      category: 'region',
      countryId: r.countryId,
      countryName: r.countryId === 'CA' ? 'Canada' : 'United States',
      regionId: r.id,
      regionName: r.name,
      sub: r.code,
      lat: 0,
      lng: 0,
      source: 'static',
      isCurated: true,
      tags: ['region', 'state'],
    }));

    if (this.mode === 'parks') {
      this.locations = allPlaces.filter((p) => p.category === 'national_park');
    } else if (this.mode === 'states') {
      this.locations = allRegions;
    } else {
      this.locations = allPlaces;
    }
  }

  get filteredLocations(): ModalLocationItem[] {
    let result = this.locations;

    // 1. Country Filter
    if (this.countryFilter !== 'all') {
      result = result.filter(
        (loc) =>
          loc.countryId === this.countryFilter ||
          (this.countryFilter === 'US' && loc.countryName === 'USA') ||
          (this.countryFilter === 'CA' && loc.countryName === 'Canada'),
      );
    }

    // 2. State / Region Filter
    if (this.stateFilter !== 'all') {
      result = result.filter((loc) => {
        return (
          loc.regionId === this.stateFilter ||
          loc.id === this.stateFilter ||
          loc.sub === this.stateFilter ||
          loc.regionName === this.stateFilter
        );
      });
    }

    // 3. Category Filter Chips (in places mode)
    if (this.mode === 'places') {
      if (this.capitalsOnly) {
        result = result.filter((loc) => loc.isCapital === true);
      } else {
        result = result.filter((loc) => this.selectedCategories.has(loc.category));
      }
    }

    // 4. Search Query Filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.countryName.toLowerCase().includes(q) ||
          loc.regionName?.toLowerCase().includes(q) ||
          loc.sub?.toLowerCase().includes(q) ||
          loc.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // 5. Visibility / Status Filter
    if (this.visibilityFilter !== 'all') {
      result = result.filter((loc) => {
        const visitCount = this.getVisitCount(loc.id);
        const wantCount = this.getWantCount(loc.id);
        if (this.visibilityFilter === 'visited') return visitCount > 0;
        if (this.visibilityFilter === 'want') return wantCount > 0;
        if (this.visibilityFilter === 'unvisited') return visitCount === 0 && wantCount === 0;
        return true;
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (this.sortColumn === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (this.sortColumn === 'category') {
        valA = a.category;
        valB = b.category;
      } else if (this.sortColumn === 'country') {
        valA = a.countryName.toLowerCase();
        valB = b.countryName.toLowerCase();
      } else if (this.sortColumn === 'state') {
        valA = (a.regionName || a.sub || '').toLowerCase();
        valB = (b.regionName || b.sub || '').toLowerCase();
      } else {
        // Specific family member sort
        valA = this.isVisited(a.id, this.sortColumn) ? 1 : 0;
        valB = this.isVisited(b.id, this.sortColumn) ? 1 : 0;
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  setSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getMemberStatus(locationId: string, memberId: string): 'visited' | 'want' | 'unvisited' {
    if (!this.viewModel) return 'unvisited';

    // 1. Check V4 placeVisits first
    const visits = this.viewModel.placeVisits?.[locationId] || [];
    const visit = visits.find((v) => v.memberId === memberId);
    if (visit) {
      return visit.status === 'want_to_visit' ? 'want' : 'visited';
    }

    // 2. Check legacy visited/want collections
    const legacyVisits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const legacyWants =
      this.mode === 'parks' ? this.viewModel.wantToVisitParks! : this.viewModel.wantToVisitStates!;

    if (legacyVisits[locationId]?.some((v) => v.memberId === memberId)) return 'visited';
    if (legacyWants[locationId]?.some((w) => w.memberId === memberId)) return 'want';

    return 'unvisited';
  }

  setMemberStatus(
    locationId: string,
    memberId: string,
    status: 'visited' | 'want' | 'unvisited',
  ): void {
    if (!this.viewModel) return;

    // 1. Update V4 placeVisits
    if (!this.viewModel.placeVisits) {
      this.viewModel.placeVisits = {};
    }
    if (!this.viewModel.placeVisits[locationId]) {
      this.viewModel.placeVisits[locationId] = [];
    }

    this.viewModel.placeVisits[locationId] = this.viewModel.placeVisits[locationId].filter(
      (v) => v.memberId !== memberId,
    );

    if (status === 'visited') {
      this.viewModel.placeVisits[locationId].push({
        placeId: locationId,
        memberId,
        status: 'visited',
        dateVisited: new Date().toISOString().split('T')[0],
      });
    } else if (status === 'want') {
      this.viewModel.placeVisits[locationId].push({
        placeId: locationId,
        memberId,
        status: 'want_to_visit',
      });
    }

    // 2. Keep legacy visitedParks/visitedStates in sync
    const legacyVisits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const legacyWants =
      this.mode === 'parks' ? this.viewModel.wantToVisitParks! : this.viewModel.wantToVisitStates!;

    if (legacyVisits && legacyWants) {
      if (!legacyVisits[locationId]) legacyVisits[locationId] = [];
      if (!legacyWants[locationId]) legacyWants[locationId] = [];

      legacyVisits[locationId] = legacyVisits[locationId].filter((v) => v.memberId !== memberId);
      legacyWants[locationId] = legacyWants[locationId].filter((w) => w.memberId !== memberId);

      if (status === 'visited') {
        legacyVisits[locationId].push({ memberId });
      } else if (status === 'want') {
        legacyWants[locationId].push({ memberId });
      }
    }
  }

  cycleMemberStatus(locationId: string, memberId: string): void {
    const current = this.getMemberStatus(locationId, memberId);
    const next: 'visited' | 'want' | 'unvisited' =
      current === 'unvisited' ? 'visited' : current === 'visited' ? 'want' : 'unvisited';
    this.setMemberStatus(locationId, memberId, next);
  }

  isVisited(locationId: string, memberId: string): boolean {
    return this.getMemberStatus(locationId, memberId) === 'visited';
  }

  getVisitCount(locationId: string): number {
    if (!this.viewModel) return 0;
    const v4Visits = (this.viewModel.placeVisits?.[locationId] || []).filter(
      (v) => v.status === 'visited',
    );
    const legacyVisits =
      (this.mode === 'parks'
        ? this.viewModel.visitedParks?.[locationId]
        : this.viewModel.visitedStates?.[locationId]) || [];

    const activeIds = this.viewModel.familyMembers.map((m) => m.id);
    const visitedMemberIds = new Set<string>();

    for (const v of v4Visits) {
      if (activeIds.includes(v.memberId)) visitedMemberIds.add(v.memberId);
    }
    for (const v of legacyVisits) {
      if (activeIds.includes(v.memberId)) visitedMemberIds.add(v.memberId);
    }

    if (this.memberFilter !== 'all') {
      return visitedMemberIds.has(this.memberFilter) ? 1 : 0;
    }
    return visitedMemberIds.size;
  }

  getWantCount(locationId: string): number {
    if (!this.viewModel) return 0;
    const v4Wants = (this.viewModel.placeVisits?.[locationId] || []).filter(
      (v) => v.status === 'want_to_visit',
    );
    const legacyWants =
      (this.mode === 'parks'
        ? this.viewModel.wantToVisitParks?.[locationId]
        : this.viewModel.wantToVisitStates?.[locationId]) || [];

    const activeIds = this.viewModel.familyMembers.map((m) => m.id);
    const wantMemberIds = new Set<string>();

    for (const w of v4Wants) {
      if (activeIds.includes(w.memberId)) wantMemberIds.add(w.memberId);
    }
    for (const w of legacyWants) {
      if (activeIds.includes(w.memberId)) wantMemberIds.add(w.memberId);
    }

    if (this.memberFilter !== 'all') {
      return wantMemberIds.has(this.memberFilter) ? 1 : 0;
    }
    return wantMemberIds.size;
  }

  hasAnyVisitOrWant(locationId: string): boolean {
    return this.getVisitCount(locationId) > 0 || this.getWantCount(locationId) > 0;
  }

  setAllStatus(locationId: string, status: 'visited' | 'want' | 'unvisited'): void {
    if (!this.viewModel || this.viewModel.familyMembers.length === 0) return;
    const members =
      this.memberFilter !== 'all'
        ? this.viewModel.familyMembers.filter((m) => m.id === this.memberFilter)
        : this.viewModel.familyMembers;

    for (const member of members) {
      this.setMemberStatus(locationId, member.id, status);
    }
  }

  isAllVisited(locationId: string): boolean {
    if (!this.viewModel || this.viewModel.familyMembers.length === 0) return false;
    const members =
      this.memberFilter !== 'all'
        ? this.viewModel.familyMembers.filter((m) => m.id === this.memberFilter)
        : this.viewModel.familyMembers;

    return members.every((m) => this.getMemberStatus(locationId, m.id) === 'visited');
  }

  isAllWant(locationId: string): boolean {
    if (!this.viewModel || this.viewModel.familyMembers.length === 0) return false;
    const members =
      this.memberFilter !== 'all'
        ? this.viewModel.familyMembers.filter((m) => m.id === this.memberFilter)
        : this.viewModel.familyMembers;

    return members.every((m) => this.getMemberStatus(locationId, m.id) === 'want');
  }

  toggleAllVisits(locationId: string): void {
    const allVisited = this.isAllVisited(locationId);
    this.setAllStatus(locationId, allVisited ? 'unvisited' : 'visited');
  }

  hasLocationDetails(locationId: string): boolean {
    if (!this.viewModel) return false;
    if (this.viewModel.locationVisits?.[locationId]?.length) return true;

    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const locVisits = visits[locationId] || [];
    return locVisits.some((v) => !!v.firstVisitedDate || !!v.dateVisited || !!v.notes);
  }

  openExternal(name: string): void {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, '_blank');
  }

  editLocationDetails(locationId: string): void {
    if (this.viewModel) {
      this.stateService.updateSettings(this.viewModel);
    }
    const editMode = this.mode === 'states' ? 'states' : 'parks';
    this.stateService.setEditingLocation({ id: locationId, mode: editMode });
  }

  // --- Fallback OpenStreetMap / Nominatim Search ---
  searchOsm(): void {
    if (!this.searchQuery || this.searchQuery.trim().length < 2) {
      this.toastService.showError({
        type: AppErrorType.VALIDATION_ERROR,
        message: 'Please enter at least 2 characters to search OpenStreetMap.',
      });
      return;
    }

    this.isSearchingOsm = true;
    this.geocodingService.searchLocations(this.searchQuery.trim(), 5).subscribe({
      next: (results) => {
        this.isSearchingOsm = false;
        this.osmResults = results;
        if (results.length === 0) {
          this.toastService.showInfo(`No spots found on OpenStreetMap for "${this.searchQuery}".`);
        }
      },
      error: () => {
        this.isSearchingOsm = false;
        this.toastService.showError({
          type: AppErrorType.NETWORK_TIMEOUT,
          message: 'Failed to search OpenStreetMap. Please check connection and try again.',
        });
      },
    });
  }

  addCustomPlaceFromOsm(osm: Waypoint): void {
    if (!this.viewModel) return;

    const newPlace: Place = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: osm.name || 'Unnamed Spot',
      category: 'custom',
      countryId: this.countryFilter !== 'all' ? this.countryFilter : 'US',
      lat: osm.lat,
      lng: osm.lng,
      source: 'osm',
      isCurated: false,
      tags: ['custom'],
    };

    if (!this.viewModel.customPlaces) {
      this.viewModel.customPlaces = [];
    }
    this.viewModel.customPlaces.push(newPlace);

    // If a member filter is active, track visit for them directly
    if (this.memberFilter !== 'all') {
      this.setMemberStatus(newPlace.id, this.memberFilter, 'visited');
    }

    this.stateService.updateSettings(this.viewModel);
    this.toastService.showSuccess(`Added "${newPlace.name}" to custom places!`);
    this.osmResults = [];
    this.updateLocations();
  }

  save(): void {
    if (this.viewModel) {
      this.stateService.updateSettings(this.viewModel);
    }
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  trackById(_index: number, item: ModalLocationItem): string {
    return item.id;
  }
}
