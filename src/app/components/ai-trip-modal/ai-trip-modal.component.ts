// DOCS: https://angular.dev/api/core/Component
import { Component, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';
// DOCS: https://angular.dev/api/common/CommonModule
import { CommonModule } from '@angular/common';
// DOCS: https://angular.dev/api/forms/FormsModule
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { TripDeltaService } from '../../services/trip-delta.service';
import { ToastService } from '../../core/services/toast.service';
import {
  BatchValidationResult,
  ValidationResult,
  ValidatedTripDelta,
  ImportReceipt,
} from '../../core/models/trip-delta.model';
import { FamilyMember } from '../../models/settings.model';
import { GeoLocation } from '../../core/constants/geography.constants';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  ColorThemeDefinition,
} from '../../core/constants/theme.constants';

@Component({
  selector: 'app-ai-trip-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-trip-modal.component.html',
})
export class AiTripModalComponent implements OnInit {
  // DOCS: https://angular.dev/api/core/Output
  @Output() close = new EventEmitter<void>();

  private stateService = inject(StateService);
  private tripDeltaService = inject(TripDeltaService);
  private toastService = inject(ToastService);

  public currentTheme: ColorThemeDefinition = COLOR_THEMES[DEFAULT_THEME_ID];
  public activeMembers: FamilyMember[] = [];
  public promptText = '';
  public promptCopied = false;
  public showPromptAccordion = false;
  public aiInput = '';

  // Wizard state: 'input' (JSON pasting), 'review' (Step-by-step editing), or 'results' (Summary receipt)
  public currentStep: 'input' | 'review' | 'results' = 'input';
  public currentTripIndex = 0;
  public reviewTrips: ValidatedTripDelta[] = [];
  public batchResult: BatchValidationResult | null = null;
  public validationResult: ValidationResult | null = null;
  public parseError: string | null = null;
  public importReceipt: ImportReceipt | null = null;
  public showLocationDates = false;

  // Autocomplete / Selector registries
  public allParks: GeoLocation[] = [];
  public allStates: GeoLocation[] = [];
  public selectedAddParkId = '';
  public selectedAddStateId = '';

  // DOCS: https://angular.dev/api/core/HostListener
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close.emit();
  }

  ngOnInit(): void {
    const settings = this.stateService.getSettings();
    this.activeMembers = settings.familyMembers || [];
    this.currentTheme =
      COLOR_THEMES[settings.colorTheme || DEFAULT_THEME_ID] || COLOR_THEMES[DEFAULT_THEME_ID];
    this.promptText = this.tripDeltaService.generatePrompt(this.activeMembers);
    this.allParks = this.tripDeltaService.getAllParks();
    this.allStates = this.tripDeltaService.getAllStates();
  }

  public get currentTrip(): ValidatedTripDelta | undefined {
    return this.reviewTrips[this.currentTripIndex];
  }

  public get approvedCount(): number {
    return this.reviewTrips.filter((t) => t.status === 'approved').length;
  }

  public get pendingCount(): number {
    return this.reviewTrips.filter((t) => t.status === 'pending').length;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  async copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.promptText);
      this.promptCopied = true;
      this.toastService.showSuccess('AI Prompt copied to clipboard!');
      setTimeout(() => {
        this.promptCopied = false;
      }, 3000);
    } catch {
      this.toastService.showInfo('Select and copy the prompt text manually.');
    }
  }

  togglePromptAccordion(): void {
    this.showPromptAccordion = !this.showPromptAccordion;
  }

  onInputChange(): void {
    this.parseError = null;
    this.validationResult = null;
    this.batchResult = null;

    if (!this.aiInput.trim()) {
      return;
    }

    const parseRes = this.tripDeltaService.extractAndParseJson(this.aiInput);
    if (!parseRes.success || !parseRes.payload) {
      this.parseError = parseRes.error || 'Invalid JSON syntax.';
      return;
    }

    const settings = this.stateService.getSettings();
    const result = this.tripDeltaService.validateAndResolve(parseRes.payload, settings);
    this.batchResult = result;
    this.validationResult = result;
  }

  loadSampleSingleTrip(): void {
    const sample = {
      type: 'trip_delta',
      version: 1,
      trip: {
        name: 'Yellowstone & Grand Tetons Road Trip',
        date: new Date().toISOString().split('T')[0],
        members: ['all'],
        parks: ['Yellowstone', 'Grand Teton'],
        states: ['Montana', 'Wyoming', 'Idaho'],
        notes: 'Flew into Bozeman, drove through both national parks, returned via Idaho Falls.',
      },
    };
    this.aiInput = JSON.stringify(sample, null, 2);
    this.onInputChange();
  }

  loadSampleMultiTrip(): void {
    const today = new Date();
    const pastYear = new Date(today);
    pastYear.setFullYear(today.getFullYear() - 1);

    const sample = {
      type: 'trip_delta',
      version: 1,
      trips: [
        {
          name: 'Yellowstone & Grand Tetons Road Trip',
          date: today.toISOString().split('T')[0],
          members: ['all'],
          parks: ['Yellowstone', 'Grand Teton'],
          states: ['Montana', 'Wyoming', 'Idaho'],
          notes: 'Flew into Bozeman, drove through both national parks, returned via Idaho Falls.',
        },
        {
          name: 'Utah Mighty 5 Desert Tour',
          date: pastYear.toISOString().split('T')[0],
          members: ['all'],
          parks: ['Zion', 'Bryce Canyon'],
          states: ['Utah'],
          notes: 'Visited red rock amphitheaters and Zion canyon highlights.',
        },
      ],
    };
    this.aiInput = JSON.stringify(sample, null, 2);
    this.onInputChange();
  }

  startReview(): void {
    if (!this.batchResult || !this.batchResult.valid || this.batchResult.trips.length === 0) {
      return;
    }
    // Deep clone the validated trips into mutable review trips
    this.reviewTrips = JSON.parse(JSON.stringify(this.batchResult.trips));
    this.currentTripIndex = 0;
    this.currentStep = 'review';
  }

  backToInput(): void {
    this.currentStep = 'input';
  }

  selectTrip(index: number): void {
    if (index >= 0 && index < this.reviewTrips.length) {
      this.currentTripIndex = index;
    }
  }

  approveAndNext(): void {
    const trip = this.currentTrip;
    if (!trip) return;

    trip.status = 'approved';

    if (this.currentTripIndex < this.reviewTrips.length - 1) {
      this.currentTripIndex++;
    } else {
      this.finishAndApply();
    }
  }

  skipAndNext(): void {
    const trip = this.currentTrip;
    if (!trip) return;

    trip.status = 'skipped';

    if (this.currentTripIndex < this.reviewTrips.length - 1) {
      this.currentTripIndex++;
    } else {
      this.finishAndApply();
    }
  }

  previousTrip(): void {
    if (this.currentTripIndex > 0) {
      this.currentTripIndex--;
    }
  }

  approveAllRemaining(): void {
    for (const trip of this.reviewTrips) {
      if (trip.status === 'pending') {
        trip.status = 'approved';
      }
    }
    this.finishAndApply();
  }

  finishAndApply(): void {
    if (this.currentTrip && this.currentTrip.status === 'pending') {
      this.currentTrip.status = 'approved';
    }

    const approved = this.reviewTrips.filter((t) => t.status === 'approved');
    if (approved.length === 0) {
      this.toastService.showInfo('No trips were approved to import.');
      this.close.emit();
      return;
    }

    const receipt = this.tripDeltaService.applyBatchTripDeltas(this.reviewTrips);
    if (receipt) {
      this.importReceipt = receipt;
      this.currentStep = 'results';
    }
  }

  toggleLocationDates(): void {
    this.showLocationDates = !this.showLocationDates;
  }

  doneAndClose(): void {
    this.close.emit();
  }

  // --- Mixed Edit Window Handlers ---

  removePark(parkIndex: number): void {
    const trip = this.currentTrip;
    if (trip && trip.parks) {
      trip.parks.splice(parkIndex, 1);
    }
  }

  onAddParkSelected(): void {
    const trip = this.currentTrip;
    if (!trip || !this.selectedAddParkId) return;

    const park = this.allParks.find((p) => p.id === this.selectedAddParkId);
    if (park && !trip.parks.some((p) => p.id === park.id)) {
      trip.parks.push({
        id: park.id,
        name: park.name,
        country: park.country,
        dateVisited: trip.date,
      });
    }
    this.selectedAddParkId = '';
  }

  removeState(stateIndex: number): void {
    const trip = this.currentTrip;
    if (trip && trip.states) {
      trip.states.splice(stateIndex, 1);
    }
  }

  onAddStateSelected(): void {
    const trip = this.currentTrip;
    if (!trip || !this.selectedAddStateId) return;

    const state = this.allStates.find((s) => s.id === this.selectedAddStateId);
    if (state && !trip.states.some((s) => s.id === state.id)) {
      trip.states.push({
        id: state.id,
        name: state.name,
        country: state.country,
        dateVisited: trip.date,
      });
    }
    this.selectedAddStateId = '';
  }

  isMemberSelected(memberId: string): boolean {
    const trip = this.currentTrip;
    return !!trip && trip.members.some((m) => m.id === memberId);
  }

  isAllMembers(): boolean {
    const trip = this.currentTrip;
    if (!trip) return false;
    return (
      this.activeMembers.length > 0 &&
      this.activeMembers.every((m) => trip.members.some((tm) => tm.id === m.id))
    );
  }

  toggleMember(member: FamilyMember): void {
    const trip = this.currentTrip;
    if (!trip) return;

    const index = trip.members.findIndex((m) => m.id === member.id);
    if (index !== -1) {
      trip.members.splice(index, 1);
    } else {
      trip.members.push({ id: member.id, name: member.name });
    }
  }

  toggleAllMembers(): void {
    const trip = this.currentTrip;
    if (!trip) return;

    if (this.isAllMembers()) {
      trip.members = [];
    } else {
      trip.members = this.activeMembers.map((m) => ({ id: m.id, name: m.name }));
    }
  }
}
