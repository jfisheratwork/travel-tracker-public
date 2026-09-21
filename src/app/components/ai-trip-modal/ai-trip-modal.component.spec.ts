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
    applyBatchTripDeltas: ReturnType<typeof vi.fn>;
    getAllParks: ReturnType<typeof vi.fn>;
    getAllStates: ReturnType<typeof vi.fn>;
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
      applyBatchTripDeltas: vi.fn().mockReturnValue({
        success: true,
        tripsCount: 1,
        newParks: [
          {
            id: 'Yellowstone',
            name: 'Yellowstone',
            isNewVisit: true,
            dateVisited: '2026-09-12',
          },
        ],
        alreadyVisitedParks: [],
        newStates: [
          { id: 'Wyoming', name: 'Wyoming', isNewVisit: true, dateVisited: '2026-09-12' },
        ],
        alreadyVisitedStates: [],
        totalLogEntriesAdded: 2,
        affectedMembers: ['Jacob'],
      }),
      getAllParks: vi
        .fn()
        .mockReturnValue([{ id: 'Yellowstone', name: 'Yellowstone', state: 'WY', country: 'USA' }]),
      getAllStates: vi.fn().mockReturnValue([{ id: 'Wyoming', name: 'Wyoming', country: 'USA' }]),
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
    expect(component.allParks.length).toBe(1);
    expect(component.allStates.length).toBe(1);
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

  it('loads sample single and multi-trip and triggers parsing', () => {
    mockTripDeltaService.extractAndParseJson.mockReturnValue({
      success: true,
      payload: { trip: { name: 'Sample' } },
    });
    mockTripDeltaService.validateAndResolve.mockReturnValue({
      valid: true,
      trips: [
        {
          id: '1',
          name: 'Sample',
          date: '2026-09-12',
          parks: [],
          states: [],
          members: [],
          warnings: [],
          status: 'pending',
        },
      ],
      totalCount: 1,
      validCount: 1,
      errors: [],
      warnings: [],
    });

    component.loadSampleSingleTrip();
    expect(component.aiInput).toContain('Yellowstone & Grand Tetons Road Trip');
    expect(mockTripDeltaService.extractAndParseJson).toHaveBeenCalled();
    expect(component.batchResult?.valid).toBe(true);

    component.loadSampleMultiTrip();
    expect(component.aiInput).toContain('Utah Mighty 5 Desert Tour');
  });

  it('transitions to review step and navigates stepper', () => {
    const trip1: ValidatedTripDelta = {
      id: 't-1',
      name: 'Trip 1',
      date: '2026-09-12',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
      states: [{ id: 'Wyoming', name: 'Wyoming' }],
      warnings: [],
      status: 'pending',
    };
    const trip2: ValidatedTripDelta = {
      id: 't-2',
      name: 'Trip 2',
      date: '2026-09-20',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [],
      states: [],
      warnings: [],
      status: 'pending',
    };

    component.batchResult = {
      valid: true,
      trips: [trip1, trip2],
      totalCount: 2,
      validCount: 2,
      errors: [],
      warnings: [],
    };

    component.startReview();
    expect(component.currentStep).toBe('review');
    expect(component.currentTripIndex).toBe(0);
    expect(component.currentTrip?.name).toBe('Trip 1');

    // Approve & Next advances index
    component.approveAndNext();
    expect(component.reviewTrips[0].status).toBe('approved');
    expect(component.currentTripIndex).toBe(1);
    expect(component.currentTrip?.name).toBe('Trip 2');

    // Previous moves back
    component.previousTrip();
    expect(component.currentTripIndex).toBe(0);

    // Skip & Next advances
    component.skipAndNext();
    expect(component.reviewTrips[0].status).toBe('skipped');
    expect(component.currentTripIndex).toBe(1);
  });

  it('supports inline editing: park, state, and member modifications', () => {
    const trip: ValidatedTripDelta = {
      id: 't-1',
      name: 'Trip 1',
      date: '2026-09-12',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
      states: [{ id: 'Wyoming', name: 'Wyoming' }],
      warnings: [],
      status: 'pending',
    };

    component.reviewTrips = [trip];
    component.currentTripIndex = 0;
    component.currentStep = 'review';

    // Remove park
    component.removePark(0);
    expect(trip.parks.length).toBe(0);

    // Add park
    component.selectedAddParkId = 'Yellowstone';
    component.onAddParkSelected();
    expect(trip.parks.length).toBe(1);
    expect(trip.parks[0].id).toBe('Yellowstone');

    // Remove state
    component.removeState(0);
    expect(trip.states.length).toBe(0);

    // Add state
    component.selectedAddStateId = 'Wyoming';
    component.onAddStateSelected();
    expect(trip.states.length).toBe(1);

    // Member toggle
    expect(component.isMemberSelected('mem-1')).toBe(true);
    component.toggleMember({ id: 'mem-1', name: 'Jacob', color: '#10b981' });
    expect(component.isMemberSelected('mem-1')).toBe(false);

    component.toggleAllMembers();
    expect(component.isMemberSelected('mem-1')).toBe(true);
  });

  it('applies batch trip deltas, shows results screen, and emits close on done', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    const trip: ValidatedTripDelta = {
      id: 't-1',
      name: 'Trip 1',
      date: '2026-09-12',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
      states: [{ id: 'Wyoming', name: 'Wyoming' }],
      warnings: [],
      status: 'pending',
    };

    component.reviewTrips = [trip];
    component.finishAndApply();

    expect(trip.status).toBe('approved');
    expect(mockTripDeltaService.applyBatchTripDeltas).toHaveBeenCalledWith([trip]);
    expect(component.currentStep).toBe('results');
    expect(component.importReceipt).toBeTruthy();

    component.doneAndClose();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('toggles location dates editor', () => {
    expect(component.showLocationDates).toBe(false);
    component.toggleLocationDates();
    expect(component.showLocationDates).toBe(true);
    component.toggleLocationDates();
    expect(component.showLocationDates).toBe(false);
  });

  it('supports road trip route editing, toggling inclusion, and modifying legs/highways', () => {
    const trip: ValidatedTripDelta = {
      id: 't-route',
      name: 'Pacific Northwest Road Trip',
      date: '2026-09-12',
      members: [{ id: 'mem-1', name: 'Jacob' }],
      parks: [{ id: 'Crater Lake', name: 'Crater Lake' }],
      states: [{ id: 'Oregon', name: 'Oregon' }],
      route: [
        {
          segment: 1,
          from: 'Spokane, WA',
          to: 'Bend, OR',
          highways: ['I-90 W', 'US-97 S'],
          notes: 'Leg 1 note',
        },
      ],
      includeRoute: true,
      routeTitle: 'Pacific Northwest Road Trip',
      routeComments: 'Trip comments',
      warnings: [],
      status: 'pending',
    };

    component.reviewTrips = [trip];
    component.currentTripIndex = 0;
    component.currentStep = 'review';

    expect(trip.includeRoute).toBe(true);

    // Toggle includeRoute off
    component.toggleIncludeRoute();
    expect(trip.includeRoute).toBe(false);

    // Toggle includeRoute back on
    component.toggleIncludeRoute();
    expect(trip.includeRoute).toBe(true);

    // Add a leg
    component.addRouteSegment();
    expect(trip.route?.length).toBe(2);
    expect(trip.route?.[1].from).toBe('Bend, OR');

    // Remove highway from segment 0
    component.removeHighway(trip.route![0], 0);
    expect(trip.route![0].highways).toEqual(['US-97 S']);

    // Remove leg 0
    component.removeRouteSegment(0);
    expect(trip.route?.length).toBe(1);
    expect(trip.route?.[0].segment).toBe(1);
  });
});
