import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import {
  NATIONAL_PARKS,
  STATES,
  GeoLocation,
  StateFilterOption,
  getAvailableStateOptions,
} from '../../core/constants/geography.constants';

type SortColumn = 'name' | 'country' | string; // string for family member IDs

@Component({
  selector: 'app-parks-states-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parks-states-modal.html',
})
export class ParksStatesModal implements OnInit, OnDestroy {
  @Input() mode: 'parks' | 'states' = 'parks';
  @Output() close = new EventEmitter<void>();

  viewModel: AppSettings | null = null;
  locations: GeoLocation[] = [];

  // Filters
  searchQuery: string = '';
  countryFilter: string = 'all'; // 'all', 'USA', 'Canada'
  stateFilter: string = 'all';
  memberFilter: string = 'all'; // 'all' or member ID
  visibilityFilter: string = 'all'; // 'all', 'visited', 'unvisited'

  availableStates: StateFilterOption[] = [];

  // Sorting
  sortColumn: SortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  private sub?: Subscription;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.locations = this.mode === 'parks' ? NATIONAL_PARKS : STATES;
    this.updateAvailableStates();
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
      if (!this.viewModel!.visitedParks) this.viewModel!.visitedParks = {};
      if (!this.viewModel!.visitedStates) this.viewModel!.visitedStates = {};
      if (!this.viewModel!.wantToVisitParks) this.viewModel!.wantToVisitParks = {};
      if (!this.viewModel!.wantToVisitStates) this.viewModel!.wantToVisitStates = {};
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
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

  get filteredLocations(): GeoLocation[] {
    if (!this.viewModel) return [];

    let result = this.locations;

    // Search filter (name & abbreviation/sub)
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (l) => l.name.toLowerCase().includes(q) || (l.sub && l.sub.toLowerCase().includes(q)),
      );
    }

    // Country filter
    if (this.countryFilter !== 'all') {
      result = result.filter((l) => this.getCountry(l) === this.countryFilter);
    }

    // State / Province filter
    if (this.stateFilter !== 'all') {
      result = result.filter((l) => {
        if (this.mode === 'parks') {
          const subs = (l.sub || '').split('/');
          return subs.includes(this.stateFilter);
        } else {
          return l.name === this.stateFilter || l.id === this.stateFilter;
        }
      });
    }

    // Visibility filter
    if (this.visibilityFilter !== 'all') {
      result = result.filter((l) => {
        const visitCount = this.getVisitCount(l.id);
        const wantCount = this.getWantCount(l.id);
        if (this.visibilityFilter === 'visited') return visitCount > 0;
        if (this.visibilityFilter === 'want') return wantCount > 0 && visitCount === 0;
        if (this.visibilityFilter === 'unvisited') return visitCount === 0 && wantCount === 0;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (this.sortColumn === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (this.sortColumn === 'country') {
        valA = this.getCountry(a).toLowerCase();
        valB = this.getCountry(b).toLowerCase();
      } else {
        // Sort by specific member visit
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

  getCountry(loc: GeoLocation): string {
    if (this.mode === 'states') {
      return loc.country === 'Canada' ? 'Canada' : 'USA';
    }
    // For parks, we just return the sub (e.g. ME) or country
    return loc.country === 'Canada' ? 'Canada' : 'USA';
  }

  getMemberStatus(locationId: string, memberId: string): 'visited' | 'want' | 'unvisited' {
    if (!this.viewModel) return 'unvisited';
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const wants =
      this.mode === 'parks' ? this.viewModel.wantToVisitParks! : this.viewModel.wantToVisitStates!;

    if (visits[locationId]?.some((v) => v.memberId === memberId)) return 'visited';
    if (wants[locationId]?.some((w) => w.memberId === memberId)) return 'want';
    return 'unvisited';
  }

  setMemberStatus(
    locationId: string,
    memberId: string,
    status: 'visited' | 'want' | 'unvisited',
  ): void {
    if (!this.viewModel) return;
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const wants =
      this.mode === 'parks' ? this.viewModel.wantToVisitParks! : this.viewModel.wantToVisitStates!;

    if (!visits[locationId]) visits[locationId] = [];
    if (!wants[locationId]) wants[locationId] = [];

    // Remove existing
    visits[locationId] = visits[locationId].filter((v) => v.memberId !== memberId);
    wants[locationId] = wants[locationId].filter((w) => w.memberId !== memberId);

    if (status === 'visited') {
      visits[locationId].push({ memberId });
    } else if (status === 'want') {
      wants[locationId].push({ memberId });
    }
  }

  cycleMemberStatus(locationId: string, memberId: string): void {
    const current = this.getMemberStatus(locationId, memberId);
    const next: 'visited' | 'want' | 'unvisited' =
      current === 'unvisited' ? 'visited' : current === 'visited' ? 'want' : 'unvisited';
    this.setMemberStatus(locationId, memberId, next);
  }

  toggleVisit(locationId: string, memberId: string): void {
    const isVis = this.isVisited(locationId, memberId);
    this.setMemberStatus(locationId, memberId, isVis ? 'unvisited' : 'visited');
  }

  isVisited(locationId: string, memberId: string): boolean {
    return this.getMemberStatus(locationId, memberId) === 'visited';
  }

  getVisitCount(locationId: string): number {
    if (!this.viewModel) return 0;
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const visitors = visits[locationId] || [];

    // Apply member filter if active
    if (this.memberFilter !== 'all') {
      return visitors.some((v) => v.memberId === this.memberFilter) ? 1 : 0;
    }

    // Only count active family members
    const activeIds = this.viewModel.familyMembers.map((m) => m.id);
    return visitors.filter((v) => activeIds.includes(v.memberId)).length;
  }

  getWantCount(locationId: string): number {
    if (!this.viewModel) return 0;
    const wants =
      this.mode === 'parks' ? this.viewModel.wantToVisitParks! : this.viewModel.wantToVisitStates!;
    const wishers = wants[locationId] || [];

    if (this.memberFilter !== 'all') {
      return wishers.some((w) => w.memberId === this.memberFilter) ? 1 : 0;
    }

    const activeIds = this.viewModel.familyMembers.map((m) => m.id);
    return wishers.filter((w) => activeIds.includes(w.memberId)).length;
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
    // Save any pending checkbox changes before opening detail modal
    if (this.viewModel) {
      this.stateService.updateSettings(this.viewModel);
    }
    this.stateService.setEditingLocation({ id: locationId, mode: this.mode });
    // optionally close this modal:
    // this.close.emit();
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
}
