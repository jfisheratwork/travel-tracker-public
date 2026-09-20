import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// DOCS: https://angular.dev/guide/forms/template-driven-forms
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, FamilyMember, VisitLogEntry } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { ParksStatesModal } from '../parks-states-modal/parks-states-modal';
import {
  NATIONAL_PARKS,
  STATES,
  GeoLocation,
  StateFilterOption,
  STATE_CODE_TO_NAME,
  getAvailableStateOptions,
} from '../../core/constants/geography.constants';

export interface VisitedLocationItem {
  location: GeoLocation;
  isPark: boolean;
  status: 'visited' | 'want' | 'unvisited';
  members: FamilyMember[];
  wantMembers: FamilyMember[];
  memberDetails: {
    member: FamilyMember;
    firstVisitedDate?: string;
    notes?: string;
  }[];
  visitLogs: VisitLogEntry[];
  visitLogsCount: number;
  hasDetails: boolean;
}

@Component({
  selector: 'app-locations-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, ParksStatesModal],
  templateUrl: './locations-tracker.html',
})
export class LocationsTrackerComponent implements OnInit, OnDestroy {
  mode: 'parks' | 'states' | 'places' = 'parks';
  editModalMode: 'parks' | 'states' = 'parks';
  settings: AppSettings | null = null;
  searchTerm = '';
  showModal = false;
  expandedLocationIds = new Set<string>();

  // Filter Dropdowns
  statusFilter: 'all' | 'visited' | 'want' = 'all';
  countryFilter: string = 'all'; // 'all' | 'USA' | 'Canada'
  stateFilter: string = 'all';
  memberFilter: string = 'all';
  availableStates: StateFilterOption[] = [];

  private subs = new Subscription();

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.subs.add(
      this.stateService.mapMode$.subscribe((mode) => {
        if (mode === 'parks' || mode === 'states' || mode === 'places') {
          this.mode = mode;
          this.updateAvailableStates();
        }
      }),
    );
    this.updateAvailableStates();

    this.subs.add(
      this.stateService.settings$.subscribe((settings) => {
        this.settings = settings;
      }),
    );

    this.subs.add(
      this.stateService.searchTerm$.subscribe((term) => {
        this.searchTerm = term ? term.toLowerCase().trim() : '';
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get totalFamilyMembersCount(): number {
    return this.settings?.familyMembers?.length || 0;
  }

  isParkLocation(location: GeoLocation): boolean {
    return NATIONAL_PARKS.some((p) => p.id === location.id);
  }

  getSubtitle(location: GeoLocation): string {
    const sub = location.sub || '';
    if (this.isParkLocation(location)) {
      return location.country ? (sub ? `${sub}, ${location.country}` : location.country) : sub;
    }
    return location.capital ? `Capital: ${location.capital}` : sub;
  }

  toggleDisclose(locId: string): void {
    if (this.expandedLocationIds.has(locId)) {
      this.expandedLocationIds.delete(locId);
    } else {
      this.expandedLocationIds.add(locId);
    }
  }

  isExpanded(locId: string): boolean {
    return this.expandedLocationIds.has(locId);
  }

  toggleAllDisclose(): void {
    const allIds = this.visitedLocations.map((item) => item.location.id);
    if (this.allExpanded) {
      this.expandedLocationIds.clear();
    } else {
      this.expandedLocationIds = new Set(allIds);
    }
  }

  get allExpanded(): boolean {
    const allIds = this.visitedLocations.map((item) => item.location.id);
    return allIds.length > 0 && this.expandedLocationIds.size === allIds.length;
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stateService.setSearchTerm(input.value);
  }

  clearSearch(): void {
    this.stateService.setSearchTerm('');
  }

  updateAvailableStates(): void {
    this.availableStates = getAvailableStateOptions(this.countryFilter, this.mode);
  }

  onCountryChange(): void {
    this.updateAvailableStates();
    if (this.stateFilter !== 'all') {
      const validCodes = this.availableStates.map((s) => s.code);
      if (!validCodes.includes(this.stateFilter)) {
        this.stateFilter = 'all';
      }
    }
  }

  trackByCode(_index: number, item: StateFilterOption): string {
    return item.code;
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchTerm ||
      this.statusFilter !== 'all' ||
      this.countryFilter !== 'all' ||
      this.stateFilter !== 'all' ||
      this.memberFilter !== 'all'
    );
  }

  resetFilters(): void {
    this.statusFilter = 'all';
    this.countryFilter = 'all';
    this.stateFilter = 'all';
    this.memberFilter = 'all';
    this.updateAvailableStates();
    this.clearSearch();
  }

  get visitedLocations(): VisitedLocationItem[] {
    if (!this.settings) return [];

    const result: VisitedLocationItem[] = [];

    const processLocations = (
      visitsMap:
        | Record<
            string,
            {
              memberId: string;
              firstVisitedDate?: string;
              dateVisited?: string;
              notes?: string;
            }[]
          >
        | undefined,
      wantMap:
        | Record<
            string,
            {
              memberId: string;
              notes?: string;
            }[]
          >
        | undefined,
      allLocs: GeoLocation[],
      isPark: boolean,
    ) => {
      const allLocIds = new Set<string>([
        ...Object.keys(visitsMap || {}),
        ...Object.keys(wantMap || {}),
      ]);

      for (const locId of allLocIds) {
        const visitDetails = visitsMap?.[locId] || [];
        const wantDetails = wantMap?.[locId] || [];
        const visitLogs = this.settings!.locationVisits?.[locId] || [];

        if (visitDetails.length === 0 && wantDetails.length === 0 && visitLogs.length === 0) {
          continue;
        }

        const location = allLocs.find((l) => l.id === locId);
        if (!location) continue;

        const visitedMemberIds = Array.from(new Set(visitDetails.map((v) => v.memberId)));
        const wantMemberIds = Array.from(new Set(wantDetails.map((v) => v.memberId)));

        const members = visitedMemberIds
          .map((id) => this.settings!.familyMembers.find((m) => m.id === id))
          .filter((m): m is FamilyMember => m !== undefined);

        const wantMembers = wantMemberIds
          .map((id) => this.settings!.familyMembers.find((m) => m.id === id))
          .filter((m): m is FamilyMember => m !== undefined);

        const isVisited = members.length > 0 || visitLogs.length > 0;
        const isWant = !isVisited && wantMembers.length > 0;
        const currentStatus: 'visited' | 'want' | 'unvisited' = isVisited
          ? 'visited'
          : isWant
            ? 'want'
            : 'unvisited';

        // Filter by statusFilter
        if (this.statusFilter === 'visited' && currentStatus !== 'visited') continue;
        if (this.statusFilter === 'want' && currentStatus !== 'want') continue;

        const memberDetails: {
          member: FamilyMember;
          firstVisitedDate?: string;
          notes?: string;
        }[] = [];

        for (const v of visitDetails) {
          const mem = this.settings!.familyMembers.find((m) => m.id === v.memberId);
          if (mem) {
            memberDetails.push({
              member: mem,
              firstVisitedDate: v.firstVisitedDate || v.dateVisited,
              notes: v.notes,
            });
          }
        }

        const hasDetails =
          visitLogs.length > 0 || memberDetails.some((m) => !!m.firstVisitedDate || !!m.notes);

        result.push({
          location,
          isPark,
          status: currentStatus,
          members,
          wantMembers,
          memberDetails,
          visitLogs,
          visitLogsCount: visitLogs.length,
          hasDetails,
        });
      }
    };

    if (this.mode === 'parks' || this.mode === 'places') {
      processLocations(
        this.settings.visitedParks,
        this.settings.wantToVisitParks,
        NATIONAL_PARKS,
        true,
      );
    }
    if (this.mode === 'states' || this.mode === 'places') {
      processLocations(this.settings.visitedStates, this.settings.wantToVisitStates, STATES, false);
    }

    let filtered = result;

    // 1. Country filter
    if (this.countryFilter !== 'all') {
      filtered = filtered.filter((item) => {
        if (item.isPark) {
          return item.location.country === this.countryFilter;
        } else {
          return (
            item.location.country === this.countryFilter || item.location.sub === this.countryFilter
          );
        }
      });
    }

    // 2. State / Province filter
    if (this.stateFilter !== 'all') {
      const codeEntry = Object.entries(STATE_CODE_TO_NAME).find(
        ([c, name]) => name === this.stateFilter || c === this.stateFilter,
      );
      const filterCode = codeEntry ? codeEntry[0] : this.stateFilter;
      const filterName = codeEntry ? codeEntry[1] : this.stateFilter;

      filtered = filtered.filter((item) => {
        if (item.isPark) {
          const parkSubs = (item.location.sub || '').split('/');
          return parkSubs.includes(filterCode) || parkSubs.includes(filterName);
        } else {
          return (
            item.location.name === filterName ||
            item.location.id === filterName ||
            item.location.sub === filterCode
          );
        }
      });
    }

    // 3. Member filter
    if (this.memberFilter !== 'all') {
      filtered = filtered.filter(
        (item) =>
          item.members.some((m) => m.id === this.memberFilter) ||
          item.wantMembers.some((m) => m.id === this.memberFilter),
      );
    }

    // 4. Keyword Search filter (strict location & notes matching, no member hijack)
    if (this.searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.location.name.toLowerCase().includes(this.searchTerm) ||
          (item.location.sub && item.location.sub.toLowerCase().includes(this.searchTerm)) ||
          (item.location.country &&
            item.location.country.toLowerCase().includes(this.searchTerm)) ||
          (item.location.capital &&
            item.location.capital.toLowerCase().includes(this.searchTerm)) ||
          item.visitLogs.some(
            (l) =>
              (l.comments && l.comments.toLowerCase().includes(this.searchTerm)) ||
              (l.dateVisited && l.dateVisited.includes(this.searchTerm)),
          ) ||
          item.memberDetails.some(
            (m) =>
              (m.notes && m.notes.toLowerCase().includes(this.searchTerm)) ||
              (m.firstVisitedDate && m.firstVisitedDate.includes(this.searchTerm)),
          ),
      );
    }

    return filtered.sort((a, b) => a.location.name.localeCompare(b.location.name));
  }

  setStatus(item: VisitedLocationItem, newStatus: 'visited' | 'want' | 'unvisited'): void {
    const locMode = item.isPark ? 'parks' : 'states';
    const targetMember = this.memberFilter !== 'all' ? this.memberFilter : undefined;
    this.stateService.setLocationStatus(item.location.id, locMode, newStatus, targetMember);
  }

  openEditModal(modalMode?: 'parks' | 'states'): void {
    this.editModalMode = modalMode || (this.mode === 'states' ? 'states' : 'parks');
    this.showModal = true;
  }

  openLocationDetails(locationId: string, isPark?: boolean): void {
    const locMode =
      isPark !== undefined
        ? isPark
          ? 'parks'
          : 'states'
        : this.mode === 'states'
          ? 'states'
          : 'parks';
    this.stateService.setEditingLocation({ id: locationId, mode: locMode });
  }
}
