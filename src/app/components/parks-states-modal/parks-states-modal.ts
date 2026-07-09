import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { NATIONAL_PARKS, STATES, GeoLocation } from '../../core/constants/geography.constants';

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
  memberFilter: string = 'all'; // 'all' or member ID
  visibilityFilter: string = 'all'; // 'all', 'visited', 'unvisited'

  // Sorting
  sortColumn: SortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  private sub?: Subscription;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.locations = this.mode === 'parks' ? NATIONAL_PARKS : STATES;
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  get filteredLocations(): GeoLocation[] {
    if (!this.viewModel) return [];

    let result = this.locations;

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q));
    }

    // Visibility filter
    if (this.visibilityFilter !== 'all') {
      result = result.filter((l) => {
        const visitCount = this.getVisitCount(l.id);
        if (this.visibilityFilter === 'visited') return visitCount > 0;
        if (this.visibilityFilter === 'unvisited') return visitCount === 0;
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

  toggleVisit(locationId: string, memberId: string): void {
    if (!this.viewModel) return;

    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    if (!visits[locationId]) visits[locationId] = [];

    const idx = visits[locationId].findIndex((v) => v.memberId === memberId);
    if (idx >= 0) {
      visits[locationId].splice(idx, 1);
    } else {
      visits[locationId].push({ memberId });
    }
  }

  isVisited(locationId: string, memberId: string): boolean {
    if (!this.viewModel) return false;
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    return visits[locationId]?.some((v) => v.memberId === memberId) || false;
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

  isAllVisited(locationId: string): boolean {
    if (!this.viewModel || this.viewModel.familyMembers.length === 0) return false;

    if (this.memberFilter !== 'all') {
      return this.isVisited(locationId, this.memberFilter);
    }

    const count = this.getVisitCount(locationId);
    return count === this.viewModel.familyMembers.length;
  }

  toggleAllVisits(locationId: string): void {
    if (!this.viewModel || this.viewModel.familyMembers.length === 0) return;

    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    if (!visits[locationId]) visits[locationId] = [];

    const allVisited = this.isAllVisited(locationId);

    if (allVisited) {
      // Uncheck all active members (or specific member if filtered)
      if (this.memberFilter !== 'all') {
        const idx = visits[locationId].findIndex((v) => v.memberId === this.memberFilter);
        if (idx >= 0) visits[locationId].splice(idx, 1);
      } else {
        const activeIds = this.viewModel.familyMembers.map((m) => m.id);
        visits[locationId] = visits[locationId].filter((v) => !activeIds.includes(v.memberId));
      }
    } else {
      // Check all active members (or specific member if filtered)
      if (this.memberFilter !== 'all') {
        if (!visits[locationId].some((v) => v.memberId === this.memberFilter)) {
          visits[locationId].push({ memberId: this.memberFilter });
        }
      } else {
        for (const member of this.viewModel.familyMembers) {
          if (!visits[locationId].some((v) => v.memberId === member.id)) {
            visits[locationId].push({ memberId: member.id });
          }
        }
      }
    }
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
