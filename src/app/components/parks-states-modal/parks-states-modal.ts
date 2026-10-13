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
import { LocationDataService } from '../../services/location-data.service';

export type SortColumn = 'name' | 'category' | 'country' | 'state' | string; // string for family member IDs
export type CustomPlaceCategory = 'landmark' | 'state_park' | 'city';

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
  wishlistStateTarget = 'all'; // 'all' or regionId for quick state park wishlist

  // Granular Category Chips
  selectedCategories = new Set<string>([
    'national_park',
    'state_park',
    'provincial_park',
    'city',
    'landmark',
    'country',
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
  selectedOsmCategories: Record<number, CustomPlaceCategory | ''> = {};

  // Progressive DOM Windowing (Prevents UI lockup with 1,500+ items)
  readonly pageSize = 50;
  displayLimit = 50;

  private sub?: Subscription;
  private extendedPlacesSub?: Subscription;
  private stateService = inject(StateService);
  private locationDataService = inject(LocationDataService);
  private geocodingService = inject(GeocodingService);
  private toastService = inject(ToastService);
  private extendedPlaces: Place[] = [];

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

    this.extendedPlacesSub = this.locationDataService.extendedPlaces$.subscribe((places) => {
      this.extendedPlaces = places || [];
      this.updateLocations();
    });

    // Asynchronously trigger fetch if not already loaded
    this.locationDataService.loadExtendedPlaces().subscribe();
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    if (this.extendedPlacesSub) this.extendedPlacesSub.unsubscribe();
  }

  loadMore(count = this.pageSize): void {
    this.displayLimit += count;
  }

  loadAll(): void {
    this.displayLimit = this.filteredLocations.length;
  }

  resetDisplayLimit(): void {
    this.displayLimit = this.pageSize;
  }

  switchModalMode(newMode: 'parks' | 'states' | 'places'): void {
    this.mode = newMode;
    this.stateFilter = 'all';
    this.searchQuery = '';
    this.osmResults = [];
    this.resetDisplayLimit();
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
    this.resetDisplayLimit();
    this.updateAvailableRegions();
    this.updateLocations();
  }

  toggleCategoryFilter(category: string): void {
    this.resetDisplayLimit();
    if (this.selectedCategories.has(category)) {
      if (this.selectedCategories.size > 1) {
        this.selectedCategories.delete(category);
      }
    } else {
      this.selectedCategories.add(category);
    }
  }

  toggleCapitalsOnly(): void {
    this.resetDisplayLimit();
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
      ...this.extendedPlaces.map((p) => ({
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

    const allCountries: ModalLocationItem[] = GLOBAL_COUNTRIES.map((c) => ({
      id: c.name,
      name: c.name,
      category: 'country',
      countryId: c.id,
      countryName: c.name,
      sub: c.code,
      lat: 0,
      lng: 0,
      source: 'static',
      isCurated: true,
      tags: ['country', 'nation', c.code.toLowerCase()],
    }));

    if (this.mode === 'parks') {
      this.locations = allPlaces.filter((p) => p.category === 'national_park');
    } else if (this.mode === 'states') {
      this.locations = [...allRegions, ...allCountries];
    } else {
      this.locations = [...allPlaces, ...allCountries];
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

  get displayedLocations(): ModalLocationItem[] {
    return this.filteredLocations.slice(0, this.displayLimit);
  }

  setSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  private getLegacyKeyAndMode(locationId: string): { key: string; isPark: boolean } {
    const loc = this.locations.find((l) => l.id === locationId);
    if (loc?.category === 'national_park' || locationId.startsWith('np-')) {
      return { key: loc ? loc.name.replace(/ National Park$/, '') : locationId, isPark: true };
    }
    return { key: locationId, isPark: false };
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
    const { key, isPark } = this.getLegacyKeyAndMode(locationId);
    const legacyVisits =
      isPark || this.mode === 'parks'
        ? this.viewModel.visitedParks!
        : this.viewModel.visitedStates!;
    const legacyWants =
      isPark || this.mode === 'parks'
        ? this.viewModel.wantToVisitParks!
        : this.viewModel.wantToVisitStates!;

    if (legacyVisits?.[locationId]?.some((v) => v.memberId === memberId)) return 'visited';
    if (legacyVisits?.[key]?.some((v) => v.memberId === memberId)) return 'visited';
    if (legacyWants?.[locationId]?.some((w) => w.memberId === memberId)) return 'want';
    if (legacyWants?.[key]?.some((w) => w.memberId === memberId)) return 'want';

    return 'unvisited';
  }

  private applyStatusToId(
    targetId: string,
    memberId: string,
    status: 'visited' | 'want' | 'unvisited',
    isPark: boolean,
  ): void {
    if (!this.viewModel) return;

    if (!this.viewModel.placeVisits) {
      this.viewModel.placeVisits = {};
    }
    if (!this.viewModel.placeVisits[targetId]) {
      this.viewModel.placeVisits[targetId] = [];
    }

    this.viewModel.placeVisits[targetId] = this.viewModel.placeVisits[targetId].filter(
      (v) => v.memberId !== memberId,
    );

    if (status === 'visited') {
      this.viewModel.placeVisits[targetId].push({
        placeId: targetId,
        memberId,
        status: 'visited',
        dateVisited: new Date().toISOString().split('T')[0],
      });
    } else if (status === 'want') {
      this.viewModel.placeVisits[targetId].push({
        placeId: targetId,
        memberId,
        status: 'want_to_visit',
      });
    }

    const legacyVisits = isPark ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const legacyWants = isPark
      ? this.viewModel.wantToVisitParks!
      : this.viewModel.wantToVisitStates!;

    if (legacyVisits && legacyWants) {
      if (!legacyVisits[targetId]) legacyVisits[targetId] = [];
      if (!legacyWants[targetId]) legacyWants[targetId] = [];

      legacyVisits[targetId] = legacyVisits[targetId].filter((v) => v.memberId !== memberId);
      legacyWants[targetId] = legacyWants[targetId].filter((w) => w.memberId !== memberId);

      if (status === 'visited') {
        legacyVisits[targetId].push({ memberId });
      } else if (status === 'want') {
        legacyWants[targetId].push({ memberId });
      }
    }
  }

  setMemberStatus(
    locationId: string,
    memberId: string,
    status: 'visited' | 'want' | 'unvisited',
  ): void {
    if (!this.viewModel) return;

    const loc = this.locations.find((l) => l.id === locationId);
    const isPark =
      loc?.category === 'national_park' || this.mode === 'parks' || locationId.startsWith('np-');

    this.applyStatusToId(locationId, memberId, status, isPark);

    // If it's a national park in 'places' mode (e.g., 'np-acadia'), also sync legacy name key ('Acadia')
    if (isPark && loc && loc.id.startsWith('np-')) {
      const legacyParkName = loc.name.replace(/ National Park$/, '');
      if (legacyParkName !== locationId) {
        this.applyStatusToId(legacyParkName, memberId, status, true);
      }
    }

    // Automatically log parent State/Province and Country when a place/region is marked 'visited'
    if (status === 'visited' && loc) {
      // 1. Auto-log parent US State or Canadian Province if applicable
      if (loc.category !== 'region' && loc.category !== 'country' && loc.regionName) {
        if (this.getMemberStatus(loc.regionName, memberId) !== 'visited') {
          this.applyStatusToId(loc.regionName, memberId, 'visited', false);
        }
      }

      // 2. Auto-log parent Country (e.g., Paris -> France, Chicago -> United States)
      if (loc.category !== 'country' && loc.countryName) {
        const parentCountry =
          COUNTRIES_MAP.get(loc.countryId)?.name ||
          (loc.countryId === 'US'
            ? 'United States'
            : loc.countryId === 'CA'
              ? 'Canada'
              : loc.countryName);
        if (parentCountry && this.getMemberStatus(parentCountry, memberId) !== 'visited') {
          this.applyStatusToId(parentCountry, memberId, 'visited', false);
        }
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
    const { key, isPark } = this.getLegacyKeyAndMode(locationId);
    const v4Visits = (this.viewModel.placeVisits?.[locationId] || []).filter(
      (v) => v.status === 'visited',
    );
    const legacyMap =
      isPark || this.mode === 'parks' ? this.viewModel.visitedParks : this.viewModel.visitedStates;
    const legacyVisits = [
      ...(legacyMap?.[locationId] || []),
      ...(key !== locationId ? legacyMap?.[key] || [] : []),
    ];

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
    const { key, isPark } = this.getLegacyKeyAndMode(locationId);
    const v4Wants = (this.viewModel.placeVisits?.[locationId] || []).filter(
      (v) => v.status === 'want_to_visit',
    );
    const legacyMap =
      isPark || this.mode === 'parks'
        ? this.viewModel.wantToVisitParks
        : this.viewModel.wantToVisitStates;
    const legacyWants = [
      ...(legacyMap?.[locationId] || []),
      ...(key !== locationId ? legacyMap?.[key] || [] : []),
    ];

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

  // --- Quick Bulk Wishlist Actions ---
  get selectedStateLabel(): string {
    const targetId = this.stateFilter !== 'all' ? this.stateFilter : this.wishlistStateTarget;
    if (targetId === 'all') return '';
    return REGIONS_MAP.get(targetId)?.name || targetId;
  }

  get selectedRegionOrCountryLabel(): string {
    if (this.stateFilter !== 'all') {
      return REGIONS_MAP.get(this.stateFilter)?.name || this.stateFilter;
    }
    if (this.countryFilter !== 'all') {
      return COUNTRIES_MAP.get(this.countryFilter)?.name || this.countryFilter;
    }
    return '';
  }

  private getTargetMembers(): { id: string; name: string }[] {
    if (!this.viewModel || !this.viewModel.familyMembers.length) return [];
    if (this.memberFilter !== 'all') {
      return this.viewModel.familyMembers.filter((m) => m.id === this.memberFilter);
    }
    return this.viewModel.familyMembers;
  }

  markAllNationalParksWant(): void {
    const members = this.getTargetMembers();
    if (members.length === 0) return;

    const parks = this.locations.filter((loc) => {
      if (loc.category !== 'national_park') return false;
      if (this.countryFilter !== 'all' && loc.countryId !== this.countryFilter) return false;
      if (
        this.stateFilter !== 'all' &&
        loc.regionId !== this.stateFilter &&
        loc.regionName !== this.stateFilter
      ) {
        return false;
      }
      return true;
    });

    let updatedCount = 0;
    for (const park of parks) {
      let parkMarked = false;
      for (const m of members) {
        if (this.getMemberStatus(park.id, m.id) === 'unvisited') {
          this.setMemberStatus(park.id, m.id, 'want');
          parkMarked = true;
        }
      }
      if (parkMarked) updatedCount++;
    }

    if (this.viewModel) {
      this.stateService.updateSettings(this.viewModel);
    }
    const scopeLabel = this.selectedRegionOrCountryLabel
      ? ` in ${this.selectedRegionOrCountryLabel}`
      : '';
    this.toastService.showSuccess(
      updatedCount > 0
        ? `Marked ${updatedCount} unvisited National Parks${scopeLabel} as Want to Visit!`
        : `All matching National Parks${scopeLabel} are already Visited or on your Want to Visit list.`,
    );
  }

  markAllStateParksWant(overrideRegionId?: string): void {
    const members = this.getTargetMembers();
    if (members.length === 0) return;

    const targetRegion =
      overrideRegionId ||
      (this.stateFilter !== 'all' ? this.stateFilter : this.wishlistStateTarget);

    const allPossiblePlaces = [
      ...STATIC_PLACES_CATALOG,
      ...(this.viewModel?.customPlaces || []),
    ].filter((p) => p.category === 'state_park' || p.category === 'provincial_park');

    const matchingStateParks = allPossiblePlaces.filter((p) => {
      if (targetRegion !== 'all') {
        const reg = REGIONS_MAP.get(targetRegion);
        return (
          p.regionId === targetRegion ||
          (reg && (p.regionId === reg.id || p.regionId === `${reg.countryId}-${reg.code}`))
        );
      }
      if (this.countryFilter !== 'all') {
        return p.countryId === this.countryFilter;
      }
      return true;
    });

    let updatedCount = 0;
    for (const sp of matchingStateParks) {
      let spMarked = false;
      for (const m of members) {
        if (this.getMemberStatus(sp.id, m.id) === 'unvisited') {
          this.setMemberStatus(sp.id, m.id, 'want');
          spMarked = true;
        }
      }
      if (spMarked) updatedCount++;
    }

    if (this.viewModel) {
      this.stateService.updateSettings(this.viewModel);
    }
    const regionLabel =
      targetRegion !== 'all' ? REGIONS_MAP.get(targetRegion)?.name || targetRegion : '';
    const scopeLabel = regionLabel ? ` for ${regionLabel}` : '';
    this.toastService.showSuccess(
      updatedCount > 0
        ? `Marked ${updatedCount} unvisited State Parks${scopeLabel} as Want to Visit!`
        : `All matching State Parks${scopeLabel} are already Visited or on your Want to Visit list.`,
    );
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
    this.selectedOsmCategories = {};
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

  setOsmCategory(index: number, category: CustomPlaceCategory): void {
    this.selectedOsmCategories[index] = category;
  }

  private inferCountryAndRegionFromOsm(displayName: string): {
    countryId: string;
    regionId?: string;
  } {
    let countryId = this.countryFilter !== 'all' ? this.countryFilter : 'US';
    let regionId = this.stateFilter !== 'all' ? this.stateFilter : undefined;

    if (displayName) {
      const lower = displayName.toLowerCase();
      // Match country from display name segments
      const parts = displayName.split(',').map((s) => s.trim().toLowerCase());
      for (const c of GLOBAL_COUNTRIES) {
        if (parts.includes(c.name.toLowerCase()) || lower.endsWith(c.name.toLowerCase())) {
          countryId = c.id;
          break;
        }
      }
      if (parts.includes('united states') || parts.includes('usa')) {
        countryId = 'US';
      } else if (parts.includes('canada')) {
        countryId = 'CA';
      }

      // Match US state or CA province from display name segments
      if (!regionId && (countryId === 'US' || countryId === 'CA')) {
        for (const r of REGIONS) {
          if (
            r.countryId === countryId &&
            (parts.includes(r.name.toLowerCase()) || parts.includes(r.code.toLowerCase()))
          ) {
            regionId = r.id;
            break;
          }
        }
      }
    }

    return { countryId, regionId };
  }

  addCustomPlaceFromOsm(osm: Waypoint, category?: CustomPlaceCategory, index?: number): void {
    if (!this.viewModel) return;

    const chosenCategory: CustomPlaceCategory | '' =
      category || (index !== undefined ? this.selectedOsmCategories[index] || '' : '');

    if (!chosenCategory) {
      this.toastService.showError({
        type: AppErrorType.VALIDATION_ERROR,
        message: 'Please select Landmark, State Park, or City before adding this place.',
      });
      return;
    }

    const { countryId, regionId } = this.inferCountryAndRegionFromOsm(osm.name || '');

    const newPlace: Place = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: osm.name || 'Unnamed Spot',
      category: chosenCategory,
      countryId,
      regionId,
      lat: osm.lat,
      lng: osm.lng,
      source: 'osm',
      isCurated: false,
      tags: [chosenCategory, 'custom'],
    };

    if (!this.viewModel.customPlaces) {
      this.viewModel.customPlaces = [];
    }
    this.viewModel.customPlaces.push(newPlace);

    // Ensure the chosen category chip is active so the newly added place is visible in context
    this.selectedCategories.add(chosenCategory);

    // If a member filter is active, track visit for them directly
    if (this.memberFilter !== 'all') {
      this.setMemberStatus(newPlace.id, this.memberFilter, 'visited');
    }

    this.stateService.updateSettings(this.viewModel);
    const catLabel =
      chosenCategory === 'state_park'
        ? 'State Park'
        : chosenCategory === 'landmark'
          ? 'Landmark'
          : 'City';
    this.toastService.showSuccess(`Added "${newPlace.name}" as a ${catLabel}!`);
    this.osmResults = [];
    this.selectedOsmCategories = {};
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
