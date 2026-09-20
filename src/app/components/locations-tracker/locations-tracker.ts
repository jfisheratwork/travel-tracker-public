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
  getAvailableStateOptions,
} from '../../core/constants/geography.constants';

export interface VisitedLocationItem {
  location: GeoLocation;
  members: FamilyMember[];
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
  mode: 'parks' | 'states' = 'parks';
  settings: AppSettings | null = null;
  searchTerm = '';
  showModal = false;
  expandedLocationIds = new Set<string>();

  // Filter Dropdowns
  countryFilter: string = 'all'; // 'all' | 'USA' | 'Canada'
  stateFilter: string = 'all';
  memberFilter: string = 'all';
  availableStates: StateFilterOption[] = [];

  private subs = new Subscription();

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.subs.add(
      this.stateService.mapMode$.subscribe((mode) => {
        if (mode === 'parks' || mode === 'states') {
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

  getSubtitle(location: GeoLocation): string {
    const sub = location.sub || '';
    if (this.mode === 'parks') {
      return location.country ? (sub ? `${sub}, ${location.country}` : location.country) : sub;
    }
    return sub;
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
      this.countryFilter !== 'all' ||
      this.stateFilter !== 'all' ||
      this.memberFilter !== 'all'
    );
  }

  resetFilters(): void {
    this.countryFilter = 'all';
    this.stateFilter = 'all';
    this.memberFilter = 'all';
    this.updateAvailableStates();
    this.clearSearch();
  }

  get visitedLocations(): VisitedLocationItem[] {
    if (!this.settings) return [];

    const visits =
      this.mode === 'parks' ? this.settings.visitedParks! : this.settings.visitedStates!;
    const allLocs = this.mode === 'parks' ? NATIONAL_PARKS : STATES;

    const result: VisitedLocationItem[] = [];
    for (const [locId, visitDetails] of Object.entries(visits)) {
      if (visitDetails && visitDetails.length > 0) {
        const location = allLocs.find((l) => l.id === locId);
        if (location) {
          const memberIds = Array.from(new Set(visitDetails.map((v) => v.memberId)));
          const members = memberIds
            .map((id) => this.settings!.familyMembers.find((m) => m.id === id))
            .filter((m): m is FamilyMember => m !== undefined);

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

          const visitLogs = this.settings.locationVisits?.[locId] || [];
          const hasDetails =
            visitLogs.length > 0 || memberDetails.some((m) => !!m.firstVisitedDate || !!m.notes);

          result.push({
            location,
            members,
            memberDetails,
            visitLogs,
            visitLogsCount: visitLogs.length,
            hasDetails,
          });
        }
      }
    }

    let filtered = result;

    // 1. Country filter
    if (this.countryFilter !== 'all') {
      filtered = filtered.filter((item) => {
        if (this.mode === 'parks') {
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
      filtered = filtered.filter((item) => {
        if (this.mode === 'parks') {
          const parkSubs = (item.location.sub || '').split('/');
          return parkSubs.includes(this.stateFilter);
        } else {
          return item.location.name === this.stateFilter || item.location.id === this.stateFilter;
        }
      });
    }

    // 3. Member filter
    if (this.memberFilter !== 'all') {
      filtered = filtered.filter((item) => item.members.some((m) => m.id === this.memberFilter));
    }

    // 4. Keyword Search filter (strict location & notes matching, no member hijack)
    if (this.searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.location.name.toLowerCase().includes(this.searchTerm) ||
          (item.location.sub && item.location.sub.toLowerCase().includes(this.searchTerm)) ||
          (item.location.country &&
            item.location.country.toLowerCase().includes(this.searchTerm)) ||
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

  openEditModal(): void {
    this.showModal = true;
  }

  openLocationDetails(locationId: string): void {
    this.stateService.setEditingLocation({ id: locationId, mode: this.mode });
  }
}
