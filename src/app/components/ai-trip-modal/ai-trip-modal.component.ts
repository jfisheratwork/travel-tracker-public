// DOCS: https://angular.dev/api/core/Component
import { Component, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';
// DOCS: https://angular.dev/api/common/CommonModule
import { CommonModule } from '@angular/common';
// DOCS: https://angular.dev/api/forms/FormsModule
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { TripDeltaService } from '../../services/trip-delta.service';
import { ToastService } from '../../core/services/toast.service';
import { ValidationResult } from '../../core/models/trip-delta.model';
import { FamilyMember } from '../../models/settings.model';
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
  public validationResult: ValidationResult | null = null;
  public parseError: string | null = null;

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

    if (!this.aiInput.trim()) {
      return;
    }

    const parseRes = this.tripDeltaService.extractAndParseJson(this.aiInput);
    if (!parseRes.success || !parseRes.payload) {
      this.parseError = parseRes.error || 'Invalid JSON syntax.';
      return;
    }

    const settings = this.stateService.getSettings();
    this.validationResult = this.tripDeltaService.validateAndResolve(parseRes.payload, settings);
  }

  loadSampleTrip(): void {
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

  applyTrip(): void {
    if (!this.validationResult || !this.validationResult.valid || !this.validationResult.resolved) {
      return;
    }

    const success = this.tripDeltaService.applyTripDelta(this.validationResult.resolved);
    if (success) {
      this.close.emit();
    }
  }
}
