import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TripDeltaService } from './trip-delta.service';
import { StateService } from './state.service';
import { ToastService } from '../core/services/toast.service';
import { LoggerService } from '../core/services/logger.service';
import { AppSettings, DEFAULT_SETTINGS, FamilyMember } from '../models/settings.model';
import { TripDeltaPayload, ValidatedTripDelta } from '../core/models/trip-delta.model';

describe('TripDeltaService', () => {
  let service: TripDeltaService;
  let mockStateService: {
    getSettings: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
  };
  let mockToastService: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const sampleMembers: FamilyMember[] = [
    { id: 'mem-1', name: 'Jacob', color: '#10b981' },
    { id: 'mem-2', name: 'Sarah', color: '#3b82f6' },
  ];

  beforeEach(() => {
    mockStateService = {
      getSettings: vi.fn().mockReturnValue({
        ...DEFAULT_SETTINGS,
        familyMembers: sampleMembers,
        visitedParks: {},
        visitedStates: {},
      }),
      updateSettings: vi.fn(),
    };

    mockToastService = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TripDeltaService,
        { provide: StateService, useValue: mockStateService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(TripDeltaService);
  });

  describe('generatePrompt', () => {
    it('includes active group member names in the prompt text', () => {
      const prompt = service.generatePrompt(sampleMembers);
      expect(prompt).toContain('Jacob, Sarah');
      expect(prompt).toContain('trip_delta');
    });

    it('handles empty group members gracefully', () => {
      const prompt = service.generatePrompt([]);
      expect(prompt).toContain('(none defined yet)');
    });

    it('includes conversational user interaction instructions for standby and completion', () => {
      const prompt = service.generatePrompt(sampleMembers);
      expect(prompt).toContain("Hey! I'm ready to help log your travels");
      expect(prompt).toContain(
        'Here is the JSON you need to copy back into the Traveled Roads Tracker website:',
      );
    });

    it('instructs LLM on long-distance travel, highway corridor reasoning, and intermediate transit states', () => {
      const prompt = service.generatePrompt(sampleMembers);
      expect(prompt).toContain('Highway Corridor Reasoning');
      expect(prompt).toContain('Virginia to Michigan');
      expect(prompt).toContain('Maryland');
      expect(prompt).toContain('Ohio');
    });
  });

  describe('extractAndParseJson', () => {
    it('parses raw clean JSON', () => {
      const input = JSON.stringify({
        type: 'trip_delta',
        version: 1,
        trip: {
          name: 'Yellowstone Trip',
          parks: ['Yellowstone'],
          states: ['Wyoming'],
        },
      });

      const result = service.extractAndParseJson(input);
      expect(result.success).toBe(true);
      expect(result.payload?.trip?.name).toBe('Yellowstone Trip');
    });

    it('extracts JSON from markdown code fence with conversational text', () => {
      const input = `
      Sure! Here is the JSON payload for your trip:
      \`\`\`json
      {
        "type": "trip_delta",
        "trip": {
          "name": "Tetons Trip",
          "parks": ["Grand Teton"],
          "states": ["WY"]
        }
      }
      \`\`\`
      Let me know if you need anything else!
      `;

      const result = service.extractAndParseJson(input);
      expect(result.success).toBe(true);
      expect(result.payload?.trip?.name).toBe('Tetons Trip');
    });

    it('parses raw array of trips directly', () => {
      const input = JSON.stringify([
        {
          name: 'Trip 1',
          parks: ['Yellowstone'],
          states: ['WY'],
        },
        {
          name: 'Trip 2',
          parks: ['Zion'],
          states: ['UT'],
        },
      ]);

      const result = service.extractAndParseJson(input);
      expect(result.success).toBe(true);
      expect(result.payload?.trips?.length).toBe(2);
      expect(result.payload?.trips?.[0].name).toBe('Trip 1');
      expect(result.payload?.trips?.[1].name).toBe('Trip 2');
    });

    it('parses multi-trip payload with trips array', () => {
      const input = JSON.stringify({
        type: 'trip_delta',
        version: 1,
        trips: [
          { name: 'Trip 1', parks: ['Acadia'], states: ['ME'] },
          { name: 'Trip 2', parks: ['Banff'], states: ['AB'] },
        ],
      });

      const result = service.extractAndParseJson(input);
      expect(result.success).toBe(true);
      expect(result.payload?.trips?.length).toBe(2);
    });

    it('returns an error for empty or invalid input', () => {
      expect(service.extractAndParseJson('').success).toBe(false);
      expect(service.extractAndParseJson('Hello this is not json').success).toBe(false);
    });
  });

  describe('validateAndResolve', () => {
    it('resolves parks, 2-letter state codes, and fuzzy typos', () => {
      const payload: TripDeltaPayload = {
        type: 'trip_delta',
        version: 1,
        trip: {
          name: 'Wyoming Adventure',
          date: '2026-09-12',
          members: ['all'],
          parks: ['Yellowstone', 'Grand Tentons'],
          states: ['MT', 'Wyoming', 'Idaho Falls'],
          notes: 'Flew into Bozeman and returned via Idaho Falls',
        },
      };

      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        familyMembers: sampleMembers,
      };

      const result = service.validateAndResolve(payload, settings);
      expect(result.valid).toBe(true);
      expect(result.resolved).toBeDefined();

      const r = result.resolved!;
      expect(r.date).toBe('2026-09-12');
      expect(r.members.length).toBe(2);
      expect(r.parks.map((p) => p.name)).toContain('Yellowstone');
      expect(r.parks.map((p) => p.name)).toContain('Grand Teton');
      expect(r.states.map((s) => s.name)).toContain('Montana');
      expect(r.states.map((s) => s.name)).toContain('Wyoming');
      expect(r.states.map((s) => s.name)).toContain('Idaho');
      expect(r.status).toBe('pending');
      expect(r.id).toBeDefined();
    });

    it('validates batch of multiple trips in a single payload', () => {
      const payload: TripDeltaPayload = {
        type: 'trip_delta',
        version: 1,
        trips: [
          {
            name: 'Trip 1',
            parks: ['Yellowstone'],
            states: ['WY'],
          },
          {
            name: 'Trip 2',
            parks: ['Zion'],
            states: ['UT'],
          },
        ],
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.validCount).toBe(2);
      expect(result.trips.length).toBe(2);
      expect(result.trips[0].parks[0].name).toBe('Yellowstone');
      expect(result.trips[1].parks[0].name).toBe('Zion');
    });

    it('reports an error when no recognizable parks or states are present', () => {
      const payload: TripDeltaPayload = {
        trip: {
          name: 'Imaginary Land',
          parks: ['Atlantis National Park'],
          states: ['Narnia'],
        },
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes('No recognized National Parks or States/Provinces found'),
        ),
      ).toBe(true);
    });

    it('handles year-only date and formats as mid-year fallback with warning', () => {
      const payload: TripDeltaPayload = {
        trip: {
          date: '2025',
          parks: ['Acadia'],
          states: ['Maine'],
        },
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(true);
      expect(result.resolved?.date).toBe('2025-06-01');
      expect(result.warnings.some((w) => w.includes('Year-only date'))).toBe(true);
    });
  });

  describe('applyTripDelta and applyBatchTripDeltas', () => {
    it('merges new visits without overwriting existing ones', () => {
      const initialSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        familyMembers: sampleMembers,
        visitedParks: {
          Acadia: [
            {
              memberId: 'mem-1',
              dateVisited: '2024-07-01',
              visits: [{ id: 'v-1', dateVisited: '2024-07-01', comments: 'Past trip' }],
            },
          ],
        },
        visitedStates: {},
      };
      mockStateService.getSettings.mockReturnValue(initialSettings);

      const validated: ValidatedTripDelta = {
        id: 'trip-1',
        name: 'Yellowstone Trip',
        date: '2026-09-12',
        members: sampleMembers.map((m) => ({ id: m.id, name: m.name })),
        parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
        states: [{ id: 'Wyoming', name: 'Wyoming' }],
        notes: 'Great road trip',
        warnings: [],
        status: 'approved',
      };

      const success = service.applyTripDelta(validated);
      expect(success).toBe(true);
      expect(mockStateService.updateSettings).toHaveBeenCalled();

      const updated = mockStateService.updateSettings.mock.calls[0][0] as AppSettings;

      // Existing park preserved
      expect(updated.visitedParks?.['Acadia']).toBeDefined();
      expect(updated.visitedParks?.['Acadia'][0].memberId).toBe('mem-1');

      // New park added for both members
      expect(updated.visitedParks?.['Yellowstone']?.length).toBe(2);
      expect(updated.visitedParks?.['Yellowstone'][0].dateVisited).toBe('2026-09-12');

      // State added
      expect(updated.visitedStates?.['Wyoming']?.length).toBe(2);

      expect(mockToastService.showSuccess).toHaveBeenCalled();
    });

    it('merges multiple approved trips in batch mode', () => {
      mockStateService.getSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        familyMembers: sampleMembers,
        visitedParks: {},
        visitedStates: {},
      });

      const trips: ValidatedTripDelta[] = [
        {
          id: 't-1',
          name: 'Trip 1',
          date: '2024-07-01',
          members: [{ id: 'mem-1', name: 'Jacob' }],
          parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
          states: [{ id: 'Wyoming', name: 'Wyoming' }],
          warnings: [],
          status: 'approved',
        },
        {
          id: 't-2',
          name: 'Trip 2',
          date: '2025-08-01',
          members: [{ id: 'mem-1', name: 'Jacob' }],
          parks: [{ id: 'Zion', name: 'Zion' }],
          states: [{ id: 'Utah', name: 'Utah' }],
          warnings: [],
          status: 'approved',
        },
        {
          id: 't-3',
          name: 'Skipped Trip',
          date: '2026-01-01',
          members: [{ id: 'mem-1', name: 'Jacob' }],
          parks: [{ id: 'Acadia', name: 'Acadia' }],
          states: [{ id: 'Maine', name: 'Maine' }],
          warnings: [],
          status: 'skipped',
        },
      ];

      const receipt = service.applyBatchTripDeltas(trips);
      expect(receipt).toBeTruthy();
      expect(receipt?.success).toBe(true);
      expect(receipt?.tripsCount).toBe(2);
      expect(receipt?.totalLogEntriesAdded).toBe(4);

      const updated = mockStateService.updateSettings.mock.calls[0][0] as AppSettings;
      expect(updated.visitedParks?.['Yellowstone']).toBeDefined();
      expect(updated.visitedParks?.['Zion']).toBeDefined();
      // Skipped trip was not imported
      expect(updated.visitedParks?.['Acadia']).toBeUndefined();
    });

    it('correctly categorizes already visited vs newly visited locations in receipt', () => {
      // Setup state where Yellowstone and Wyoming were already visited
      mockStateService.getSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        familyMembers: [{ id: 'mem-1', name: 'Jacob', color: '#10b981' }],
        visitedParks: {
          Yellowstone: [{ memberId: 'mem-1', dateVisited: '2020-01-01', visits: [] }],
        },
        visitedStates: {
          Wyoming: [{ memberId: 'mem-1', dateVisited: '2020-01-01', visits: [] }],
        },
      });

      const trip: ValidatedTripDelta = {
        id: 't-1',
        name: 'Northern Rockies',
        date: '2026-09-12',
        members: [{ id: 'mem-1', name: 'Jacob' }],
        parks: [
          { id: 'Yellowstone', name: 'Yellowstone' },
          { id: 'Glacier', name: 'Glacier' },
        ],
        states: [
          { id: 'Wyoming', name: 'Wyoming' },
          { id: 'Montana', name: 'Montana' },
        ],
        warnings: [],
        status: 'approved',
      };

      const receipt = service.applyBatchTripDeltas([trip]);
      expect(receipt).toBeTruthy();
      expect(receipt?.alreadyVisitedParks.map((p) => p.id)).toEqual(['Yellowstone']);
      expect(receipt?.newParks.map((p) => p.id)).toEqual(['Glacier']);
      expect(receipt?.alreadyVisitedStates.map((s) => s.id)).toEqual(['Wyoming']);
      expect(receipt?.newStates.map((s) => s.id)).toEqual(['Montana']);
    });

    it('parses per-location custom dates and notes from payload', () => {
      const payload: TripDeltaPayload = {
        type: 'trip_delta',
        version: 1,
        trip: {
          name: 'Northern Rockies Loop',
          date: '2019-07-01',
          members: ['all'],
          parks: [
            { name: 'Grand Teton', date: '2019-07-03', notes: 'Jenny Lake hike' },
            'Yellowstone',
          ],
          states: [{ name: 'Colorado', date: '2019-07-01', notes: 'Flew into Denver' }, 'Wyoming'],
        },
      };

      const res = service.validateAndResolve(payload, {
        ...DEFAULT_SETTINGS,
        familyMembers: [{ id: 'mem-1', name: 'Jacob', color: '#10b981' }],
      });

      expect(res.valid).toBe(true);
      const trip = res.resolved!;
      expect(trip.parks[0].name).toBe('Grand Teton');
      expect(trip.parks[0].dateVisited).toBe('2019-07-03');
      expect(trip.parks[0].notes).toBe('Jenny Lake hike');

      expect(trip.parks[1].name).toBe('Yellowstone');
      expect(trip.parks[1].dateVisited).toBeUndefined();

      expect(trip.states[0].name).toBe('Colorado');
      expect(trip.states[0].dateVisited).toBe('2019-07-01');
      expect(trip.states[0].notes).toBe('Flew into Denver');
    });
  });

  describe('entity resolution helpers', () => {
    it('resolves single park by name and alias', () => {
      expect(service.resolveSinglePark('Yellowstone')?.id).toBe('Yellowstone');
      expect(service.resolveSinglePark('Grand Tentons')?.id).toBe('Grand Teton');
      expect(service.resolveSinglePark('Nonexistent Park')).toBeNull();
    });

    it('resolves single state by name and postal abbreviation', () => {
      expect(service.resolveSingleState('Wyoming')?.name).toBe('Wyoming');
      expect(service.resolveSingleState('MT')?.name).toBe('Montana');
      expect(service.resolveSingleState('BC')?.name).toBe('British Columbia');
      expect(service.resolveSingleState('Nonexistent State')).toBeNull();
    });
  });

  describe('security & adversarial input handling', () => {
    it('rejects payloads exceeding 128 KB byte limit', () => {
      const hugeInput = ' '.repeat(140000);
      const result = service.extractAndParseJson(hugeInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Input payload exceeds maximum allowed size');
    });

    it('rejects JSON containing prototype pollution attempts', () => {
      const maliciousJson = '{"__proto__": {"injected": true}, "trip": {"parks": ["Acadia"]}}';
      const result = service.extractAndParseJson(maliciousJson);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Security Alert');
    });

    it('sanitizes HTML tags and XSS attempts from trip name and notes', () => {
      const payload: TripDeltaPayload = {
        trip: {
          name: '<script>alert("XSS")</script>Amazing Adventure',
          notes: 'Had fun <img src=x onerror=alert(1)> at the geysers',
          parks: ['Yellowstone'],
          states: ['Wyoming'],
        },
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(true);
      expect(result.resolved?.name).toBe('Amazing Adventure');
      expect(result.resolved?.notes).toBe('Had fun at the geysers');
    });

    it('falls back to safe date when given impossible calendar date like Feb 30', () => {
      const payload: TripDeltaPayload = {
        trip: {
          date: '2026-02-30',
          parks: ['Yellowstone'],
          states: ['Wyoming'],
        },
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(true);
      expect(result.resolved?.date).not.toBe('2026-02-30');
      expect(result.warnings.some((w) => w.includes('Invalid calendar date'))).toBe(true);
    });

    it('caps oversized arrays to prevent DoS', () => {
      const massiveParks = Array(100).fill('Yellowstone');
      const payload: TripDeltaPayload = {
        trip: {
          parks: massiveParks,
          states: ['Wyoming'],
        },
      };

      const result = service.validateAndResolve(payload, DEFAULT_SETTINGS);
      expect(result.valid).toBe(true);
      // Deduplicated to 1 park
      expect(result.resolved?.parks.length).toBe(1);
    });
  });
});
