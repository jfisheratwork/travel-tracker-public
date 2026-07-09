import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AppSettings, VisitDetail } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { NATIONAL_PARKS, STATES, GeoLocation } from '../../core/constants/geography.constants';

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

  private sub?: Subscription;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    const list = this.mode === 'parks' ? NATIONAL_PARKS : STATES;
    this.location = list.find((l) => l.id === this.locationId) || null;

    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.viewModel = JSON.parse(JSON.stringify(settings));
      this.initializeEditingState();
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  private initializeEditingState(): void {
    if (!this.viewModel) return;
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const locVisits = visits[this.locationId] || [];

    this.editingVisits = {};
    for (const member of this.viewModel.familyMembers) {
      const existing = locVisits.find((v) => v.memberId === member.id);
      if (existing) {
        this.editingVisits[member.id] = { ...existing };
      } else {
        this.editingVisits[member.id] = { memberId: member.id, dateVisited: '', notes: '' };
      }
    }
  }

  isVisited(memberId: string): boolean {
    if (!this.viewModel) return false;
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const locVisits = visits[this.locationId] || [];
    return locVisits.some((v) => v.memberId === memberId);
  }

  toggleVisit(memberId: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (!this.viewModel) return;

    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
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
    const visits =
      this.mode === 'parks' ? this.viewModel.visitedParks! : this.viewModel.visitedStates!;
    const locVisits = visits[this.locationId] || [];

    const idx = locVisits.findIndex((v) => v.memberId === memberId);
    if (idx !== -1) {
      locVisits[idx] = { ...this.editingVisits[memberId] };
    }
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
