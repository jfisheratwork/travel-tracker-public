// DOCS: https://angular.dev/api/core/Injectable
import { Injectable, inject } from '@angular/core';
import { StateService } from './state.service';
import { ToastService } from '../core/services/toast.service';
import { LoggerService } from '../core/services/logger.service';
import { AppSettings, FamilyMember, VisitDetail, VisitLogEntry } from '../models/settings.model';
import { AppErrorType } from '../core/models/app-error.model';
import { NATIONAL_PARKS, STATES, GeoLocation } from '../core/constants/geography.constants';
import {
  SECURITY_LIMITS,
  sanitizePlainText,
  isPrototypePollutionSafe,
  isValidCalendarDate,
} from '../core/utils/security.utils';
import {
  TripDeltaPayload,
  ValidatedTripDelta,
  ParseResult,
  ValidationResult,
  ResolvedEntity,
  RawTripPayload,
} from '../core/models/trip-delta.model';

@Injectable({
  providedIn: 'root',
})
export class TripDeltaService {
  private stateService = inject(StateService);
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);

  /**
   * Generates a context-aware system prompt tailored for external LLMs
   * (ChatGPT, Claude, Gemini, etc.) that includes the user's active family members.
   */
  public generatePrompt(members: FamilyMember[]): string {
    const memberNames = members.map((m) => m.name).filter(Boolean);
    const memberContext =
      memberNames.length > 0
        ? `Active group members: [${memberNames.join(', ')}]. If the user says "all of us", "the family", or "everyone", map members to ["all"]. If specific individuals are mentioned, match them to this list.`
        : `Active group members: (none defined yet). Use ["all"] for group-wide visits.`;

    return `You are an AI assistant for the "Traveled Roads Tracker" application.
The user will describe a trip or vacation in natural language. Your task is to extract the visited National Parks, States/Provinces, group members, approximate date, and trip notes, and output strictly a valid JSON object matching the Trip Delta schema.

### User Group Context:
${memberContext}

### Extraction Rules:
1. "parks": Extract all US and Canadian National Parks visited. Use canonical names (e.g. "Yellowstone", "Grand Teton", "Banff", "Acadia").
2. "states": Extract all US States and Canadian Provinces visited, including arrival/departure transit states explicitly mentioned (e.g. "Montana", "Wyoming", "Idaho", or standard 2-letter postal codes like "MT", "WY", "ID").
3. "members": Array of member names who took part, or ["all"] if everyone attended.
4. "date": The trip date in YYYY-MM-DD format (use the approximate date if only month/year or "last week" is given).
5. "name": A concise, descriptive trip title (e.g., "Yellowstone & Grand Tetons Road Trip").
6. "notes": A brief 1-2 sentence summary of the route or highlights.

### Required Output Schema (JSON Only):
\`\`\`json
{
  "type": "trip_delta",
  "version": 1,
  "trip": {
    "name": "Trip Title",
    "date": "YYYY-MM-DD",
    "members": ["all"],
    "parks": ["Yellowstone", "Grand Teton"],
    "states": ["Montana", "Wyoming", "Idaho"],
    "notes": "Route notes or highlights"
  }
}
\`\`\`

IMPORTANT: Output ONLY the JSON block. Do not include introductory or concluding conversational text.`;
  }

  /**
   * Safely extracts and parses JSON from raw user input, handling markdown
   * code fences, leading/trailing conversational text, and partial payloads.
   */
  public extractAndParseJson(rawInput: string): ParseResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, error: 'Input is empty. Please paste your trip JSON.' };
    }

    // Input size guardrail (DoS / memory exhaustion prevention)
    if (rawInput.length > SECURITY_LIMITS.MAX_INPUT_PAYLOAD_BYTES) {
      return {
        success: false,
        error: `Input payload exceeds maximum allowed size (${SECURITY_LIMITS.MAX_INPUT_PAYLOAD_BYTES / 1024} KB).`,
      };
    }

    if (!rawInput.trim()) {
      return { success: false, error: 'Input is empty. Please paste your trip JSON.' };
    }

    let cleaned = rawInput.trim();

    // 1. Extract content from markdown code block if present
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    } else {
      // 2. Locate first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      // Prototype pollution & excessive object depth defense
      if (!isPrototypePollutionSafe(parsed)) {
        this.logger.warn('Rejected payload failing prototype pollution or depth check', { parsed });
        return {
          success: false,
          error: 'Security Alert: Potentially unsafe JSON object structure detected.',
        };
      }

      // Normalize if user or LLM emitted { trip: { ... } } or just the inner { ... } directly
      let tripPayload: RawTripPayload;
      if (parsed['trip'] && typeof parsed['trip'] === 'object') {
        tripPayload = parsed['trip'] as RawTripPayload;
      } else if (parsed['parks'] || parsed['states'] || parsed['name']) {
        tripPayload = parsed as RawTripPayload;
      } else {
        return {
          success: false,
          error: 'JSON is missing required "trip", "parks", or "states" fields.',
        };
      }

      const payload: TripDeltaPayload = {
        type: typeof parsed['type'] === 'string' ? parsed['type'] : 'trip_delta',
        version: typeof parsed['version'] === 'number' ? parsed['version'] : 1,
        trip: tripPayload,
      };

      return { success: true, payload };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid JSON syntax';
      this.logger.warn('Failed to parse trip delta JSON', { error: message, input: rawInput });
      return { success: false, error: `JSON Parse Error: ${message}` };
    }
  }

  /**
   * Validates and resolves a parsed Trip Delta payload against canonical
   * national park lists, state/province lists, and active family members.
   */
  public validateAndResolve(
    payload: TripDeltaPayload,
    currentSettings: AppSettings,
  ): ValidationResult {
    const trip = payload.trip;
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Date with strict calendar arithmetic & limits
    let resolvedDate = (trip.date || '').trim();
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!resolvedDate) {
      const today = new Date().toISOString().split('T')[0];
      resolvedDate = today;
      warnings.push(`No date provided. Defaulted to today (${today}).`);
    } else if (!isoDateRegex.test(resolvedDate)) {
      // Handle YYYY or YYYY-MM
      if (/^\d{4}$/.test(resolvedDate)) {
        resolvedDate = `${resolvedDate}-06-01`;
        warnings.push(`Year-only date provided. Adjusted to ${resolvedDate}.`);
      } else if (/^\d{4}-\d{2}$/.test(resolvedDate)) {
        resolvedDate = `${resolvedDate}-01`;
        warnings.push(`Month-year date provided. Adjusted to ${resolvedDate}.`);
      } else {
        const fallback = new Date().toISOString().split('T')[0];
        warnings.push(`Unrecognized date format "${resolvedDate}". Defaulted to ${fallback}.`);
        resolvedDate = fallback;
      }
    }

    if (!isValidCalendarDate(resolvedDate)) {
      const fallback = new Date().toISOString().split('T')[0];
      warnings.push(`Invalid calendar date "${resolvedDate}". Defaulted to ${fallback}.`);
      resolvedDate = fallback;
    }

    // 2. Resolve Family Members (capped at MAX_MEMBERS_PER_TRIP)
    const family = currentSettings.familyMembers || [];
    const resolvedMembers: { id: string; name: string }[] = [];
    const rawMembers = (Array.isArray(trip.members) ? trip.members : [])
      .slice(0, SECURITY_LIMITS.MAX_MEMBERS_PER_TRIP)
      .map((m) => sanitizePlainText(String(m), SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH));

    const isAll =
      rawMembers.length === 0 ||
      rawMembers.some((m) => typeof m === 'string' && m.trim().toLowerCase() === 'all');

    if (isAll) {
      if (family.length > 0) {
        resolvedMembers.push(...family.map((f) => ({ id: f.id, name: f.name })));
      } else {
        resolvedMembers.push({ id: 'primary-user', name: 'Primary Traveler' });
      }
    } else {
      for (const rawName of rawMembers) {
        if (!rawName) continue;
        const normalized = rawName.trim().toLowerCase();
        const found = family.find(
          (f) => f.name.toLowerCase() === normalized || f.id.toLowerCase() === normalized,
        );
        if (found) {
          if (!resolvedMembers.some((rm) => rm.id === found.id)) {
            resolvedMembers.push({ id: found.id, name: found.name });
          }
        } else {
          warnings.push(`Group member "${rawName}" was not found in your settings.`);
        }
      }
      if (resolvedMembers.length === 0 && family.length > 0) {
        resolvedMembers.push(...family.map((f) => ({ id: f.id, name: f.name })));
        warnings.push('No recognized members specified; assigned to all group members.');
      }
    }

    // 3. Resolve National Parks (capped at MAX_ENTITIES_PER_TRIP)
    const resolvedParks: ResolvedEntity[] = [];
    const rawParks = (Array.isArray(trip.parks) ? trip.parks : [])
      .slice(0, SECURITY_LIMITS.MAX_ENTITIES_PER_TRIP)
      .map((p) => sanitizePlainText(String(p), SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH));

    for (const rawPark of rawParks) {
      if (!rawPark) continue;
      const match = this.matchPark(rawPark);
      if (match) {
        if (!resolvedParks.some((p) => p.id === match.id)) {
          resolvedParks.push({ id: match.id, name: match.name, country: match.country });
        }
      } else {
        warnings.push(`National Park "${rawPark}" could not be recognized.`);
      }
    }

    // 4. Resolve States & Provinces (capped at MAX_ENTITIES_PER_TRIP)
    const resolvedStates: ResolvedEntity[] = [];
    const rawStates = (Array.isArray(trip.states) ? trip.states : [])
      .slice(0, SECURITY_LIMITS.MAX_ENTITIES_PER_TRIP)
      .map((s) => sanitizePlainText(String(s), SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH));

    for (const rawState of rawStates) {
      if (!rawState) continue;
      const match = this.matchState(rawState);
      if (match) {
        if (!resolvedStates.some((s) => s.id === match.id)) {
          resolvedStates.push({ id: match.id, name: match.name, country: match.country });
        }
      } else {
        warnings.push(`State/Province "${rawState}" could not be recognized.`);
      }
    }

    // Must have at least one valid destination (either a park or a state)
    if (resolvedParks.length === 0 && resolvedStates.length === 0) {
      errors.push('No recognized National Parks or States/Provinces found in this trip.');
    }

    // Sanitize trip title and notes against XSS, control characters, and length limits
    const rawNameCleaned = sanitizePlainText(trip.name || '', SECURITY_LIMITS.MAX_TRIP_NAME_LENGTH);
    const tripName = rawNameCleaned || this.generateDefaultTripName(resolvedParks, resolvedStates);
    const tripNotes =
      sanitizePlainText(trip.notes || '', SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH) || undefined;

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const resolved: ValidatedTripDelta = {
      name: tripName,
      date: resolvedDate,
      members: resolvedMembers,
      parks: resolvedParks,
      states: resolvedStates,
      notes: tripNotes,
      warnings,
    };

    return { valid: true, resolved, errors: [], warnings };
  }

  /**
   * Merges a validated trip delta incrementally into the central application state
   * without overwriting existing visits or settings.
   */
  public applyTripDelta(validated: ValidatedTripDelta): boolean {
    try {
      const current = this.stateService.getSettings();
      const updatedVisitedParks: Record<string, VisitDetail[]> = {
        ...(current.visitedParks || {}),
      };
      const updatedVisitedStates: Record<string, VisitDetail[]> = {
        ...(current.visitedStates || {}),
      };

      const dateStr = validated.date;
      const comments = validated.notes || validated.name;

      // 1. Merge Parks
      for (const park of validated.parks) {
        if (!updatedVisitedParks[park.id]) {
          updatedVisitedParks[park.id] = [];
        }
        for (const member of validated.members) {
          let memberDetail = updatedVisitedParks[park.id].find((v) => v.memberId === member.id);
          const newLogEntry: VisitLogEntry = {
            id: crypto.randomUUID(),
            dateVisited: dateStr,
            comments,
          };

          if (!memberDetail) {
            memberDetail = {
              memberId: member.id,
              dateVisited: dateStr,
              firstVisitedDate: dateStr,
              notes: comments,
              visits: [newLogEntry],
            };
            updatedVisitedParks[park.id].push(memberDetail);
          } else {
            if (!memberDetail.visits) {
              memberDetail.visits = [];
            }
            // Avoid duplicate entry on exact same date
            const existingSameDate = memberDetail.visits.some((v) => v.dateVisited === dateStr);
            if (!existingSameDate) {
              memberDetail.visits.push(newLogEntry);
            }
            if (!memberDetail.firstVisitedDate || memberDetail.firstVisitedDate > dateStr) {
              memberDetail.firstVisitedDate = dateStr;
            }
          }
        }
      }

      // 2. Merge States
      for (const state of validated.states) {
        if (!updatedVisitedStates[state.id]) {
          updatedVisitedStates[state.id] = [];
        }
        for (const member of validated.members) {
          let memberDetail = updatedVisitedStates[state.id].find((v) => v.memberId === member.id);
          const newLogEntry: VisitLogEntry = {
            id: crypto.randomUUID(),
            dateVisited: dateStr,
            comments,
          };

          if (!memberDetail) {
            memberDetail = {
              memberId: member.id,
              dateVisited: dateStr,
              firstVisitedDate: dateStr,
              notes: comments,
              visits: [newLogEntry],
            };
            updatedVisitedStates[state.id].push(memberDetail);
          } else {
            if (!memberDetail.visits) {
              memberDetail.visits = [];
            }
            const existingSameDate = memberDetail.visits.some((v) => v.dateVisited === dateStr);
            if (!existingSameDate) {
              memberDetail.visits.push(newLogEntry);
            }
            if (!memberDetail.firstVisitedDate || memberDetail.firstVisitedDate > dateStr) {
              memberDetail.firstVisitedDate = dateStr;
            }
          }
        }
      }

      const updatedSettings: AppSettings = {
        ...current,
        visitedParks: updatedVisitedParks,
        visitedStates: updatedVisitedStates,
      };

      this.stateService.updateSettings(updatedSettings);

      const summaryParts: string[] = [];
      if (validated.parks.length > 0) {
        summaryParts.push(`${validated.parks.length} park(s)`);
      }
      if (validated.states.length > 0) {
        summaryParts.push(`${validated.states.length} state(s)`);
      }

      this.toastService.showSuccess(
        `Successfully logged "${validated.name}" with ${summaryParts.join(' & ')}!`,
      );
      return true;
    } catch (e) {
      this.logger.error('Failed to apply trip delta', e);
      this.toastService.showError({
        type: AppErrorType.VALIDATION_ERROR,
        message: 'Failed to merge trip data into your tracker.',
      });
      return false;
    }
  }

  // --- Entity Matching Helpers ---

  private matchPark(rawName: string): GeoLocation | null {
    const cleaned = this.normalizeString(rawName)
      .replace(/\bnational\s+park(?:\s+and\s+preserve)?\b/g, '')
      .replace(/\bnp\b/g, '')
      .replace(/\bpark\b/g, '')
      .trim();

    if (!cleaned) return null;

    // Direct exact or normalized match
    for (const park of NATIONAL_PARKS) {
      const parkNorm = this.normalizeString(park.name);
      if (parkNorm === cleaned) return park;
    }

    // Substring contains check
    for (const park of NATIONAL_PARKS) {
      const parkNorm = this.normalizeString(park.name);
      if (parkNorm.includes(cleaned) || cleaned.includes(parkNorm)) {
        return park;
      }
    }

    // Common typo / alias dictionary
    const aliases: Record<string, string> = {
      'grand tentons': 'Grand Teton',
      'grand tenton': 'Grand Teton',
      tetons: 'Grand Teton',
      teton: 'Grand Teton',
      smokies: 'Great Smoky Mountains',
      'smoky mountains': 'Great Smoky Mountains',
      'smokey mountains': 'Great Smoky Mountains',
      joshua: 'Joshua Tree',
      'zion canyon': 'Zion',
      redwoods: 'Redwood',
      'haleakala crater': 'Haleakala',
      'death vally': 'Death Valley',
    };

    if (aliases[cleaned]) {
      const target = aliases[cleaned];
      return NATIONAL_PARKS.find((p) => p.name === target) || null;
    }

    return null;
  }

  private readonly statePostalMap: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'District of Columbia',
    AB: 'Alberta',
    BC: 'British Columbia',
    MB: 'Manitoba',
    NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia',
    NT: 'Northwest Territories',
    NU: 'Nunavut',
    ON: 'Ontario',
    PE: 'Prince Edward Island',
    QC: 'Quebec',
    SK: 'Saskatchewan',
    YT: 'Yukon',
  };

  private matchState(rawState: string): GeoLocation | null {
    const cleaned = this.normalizeString(rawState);
    if (!cleaned) return null;

    // Check 2-letter postal abbreviation
    const upperCode = rawState.trim().toUpperCase();
    if (upperCode.length === 2 && this.statePostalMap[upperCode]) {
      const targetName = this.statePostalMap[upperCode];
      const found = STATES.find((s) => s.name.toLowerCase() === targetName.toLowerCase());
      if (found) return found;
    }

    // Direct name match
    for (const state of STATES) {
      const stateNorm = this.normalizeString(state.name);
      if (stateNorm === cleaned) return state;
    }

    // Check if input contains the state name (e.g. "Idaho Falls" contains "Idaho")
    for (const state of STATES) {
      const stateNorm = this.normalizeString(state.name);
      if (cleaned.includes(stateNorm) && stateNorm.length >= 4) {
        return state;
      }
    }

    return null;
  }

  private normalizeString(val: string): string {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateDefaultTripName(parks: ResolvedEntity[], states: ResolvedEntity[]): string {
    if (parks.length > 0) {
      return `${parks
        .map((p) => p.name)
        .slice(0, 2)
        .join(' & ')} Trip`;
    }
    if (states.length > 0) {
      return `${states
        .map((s) => s.name)
        .slice(0, 2)
        .join(' & ')} Visit`;
    }
    return 'Travel Tracker Trip';
  }
}
