import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiTripModalComponent } from './ai-trip-modal.component';
import { StateService } from '../../services/state.service';
import { TripDeltaService } from '../../services/trip-delta.service';
import { ToastService } from '../../core/services/toast.service';
import { DEFAULT_SETTINGS } from '../../models/settings.model';
import { ValidatedTripDelta } from '../../core/models/trip-delta.model';

describe('AiTripModalComponent', () => {
  let component: AiTripModalComponent;
  let fixture: ComponentFixture<AiTripModalComponent>;
  let mockStateService: {
    getSettings: ReturnType<typeof vi.fn>;
  };
  let mockTripDeltaService: {
    generatePrompt: ReturnType<typeof vi.fn>;
    extractAndParseJson: ReturnType<typeof vi.fn>;
    validateAndResolve: ReturnType<typeof vi.fn>;
    applyTripDelta: ReturnType<typeof vi.fn>;
  };
  let mockToastService: {
    showSuccess: ReturnType<typeof vi.fn>;
    showInfo: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockStateService = {
      getSettings: vi.fn().mockReturnValue({
        ...DEFAULT_SETTINGS,
        familyMembers: [{ id: 'mem-1', name: 'Jacob', color: '#10b981' }],
      }),
    };

    mockTripDeltaService = {
      generatePrompt: vi.fn().mockReturnValue('Mock Prompt Text'),
      extractAndParseJson: vi.fn(),
      validateAndResolve: vi.fn(),
      applyTripDelta: vi.fn().mockReturnValue(true),
    };

    mockToastService = {
      showSuccess: vi.fn(),
      showInfo: vi.fn(),
      showError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AiTripModalComponent],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: TripDeltaService, useValue: mockTripDeltaService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiTripModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with active members and generated prompt', () => {
    expect(component).toBeTruthy();
    expect(component.activeMembers.length).toBe(1);
    expect(component.promptText).toBe('Mock Prompt Text');
  });

  it('emits close event on escape key', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onEscapeKey();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('emits close event when clicking modal backdrop', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    const fakeEvent = {
      target: 'backdrop',
      currentTarget: 'backdrop',
    } as unknown as MouseEvent;

    component.onBackdropClick(fakeEvent);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('toggles prompt accordion', () => {
    expect(component.showPromptAccordion).toBe(false);
    component.togglePromptAccordion();
    expect(component.showPromptAccordion).toBe(true);
  });

  it('copies prompt to clipboard using navigator.clipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    await component.copyPrompt();
    expect(writeTextSpy).toHaveBeenCalledWith('Mock Prompt Text');
    expect(component.promptCopied).toBe(true);
    expect(mockToastService.showSuccess).toHaveBeenCalledWith('AI Prompt copied to clipboard!');
  });

  it('loads sample trip and triggers parsing', () => {
    mockTripDeltaService.extractAndParseJson.mockReturnValue({
      success: true,
      payload: { trip: { name: 'Sample' } },
    });
    mockTripDeltaService.validateAndResolve.mockReturnValue({
      valid: true,
      resolved: { name: 'Sample', date: '2026-09-12' },
      errors: [],
      warnings: [],
    });

    component.loadSampleTrip();
    expect(component.aiInput).toContain('Yellowstone & Grand Tetons Road Trip');
    expect(mockTripDeltaService.extractAndParseJson).toHaveBeenCalled();
    expect(component.validationResult?.valid).toBe(true);
  });

  it('applies trip delta and emits close on success', () => {
    const validDelta: ValidatedTripDelta = {
      name: 'Yellowstone Trip',
      date: '2026-09-12',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
      states: [{ id: 'Wyoming', name: 'Wyoming' }],
      warnings: [],
    };

    component.validationResult = {
      valid: true,
      resolved: validDelta,
      errors: [],
      warnings: [],
    };

    const closeSpy = vi.spyOn(component.close, 'emit');
    component.applyTrip();

    expect(mockTripDeltaService.applyTripDelta).toHaveBeenCalledWith(validDelta);
    expect(closeSpy).toHaveBeenCalled();
  });
});
