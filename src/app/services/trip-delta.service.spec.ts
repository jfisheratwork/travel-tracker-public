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
      expect(result.payload?.trip.name).toBe('Yellowstone Trip');
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
      expect(result.payload?.trip.name).toBe('Tetons Trip');
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
      expect(result.errors).toContain(
        'No recognized National Parks or States/Provinces found in this trip.',
      );
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

  describe('applyTripDelta', () => {
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
        name: 'Yellowstone Trip',
        date: '2026-09-12',
        members: sampleMembers.map((m) => ({ id: m.id, name: m.name })),
        parks: [{ id: 'Yellowstone', name: 'Yellowstone' }],
        states: [{ id: 'Wyoming', name: 'Wyoming' }],
        notes: 'Great road trip',
        warnings: [],
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
  });

  describe('security & adversarial input handling', () => {
    it('rejects payloads exceeding 32 KB byte limit', () => {
      const hugeInput = ' '.repeat(35000);
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
