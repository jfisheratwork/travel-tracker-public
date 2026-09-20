// DOCS: https://angular.dev/api/core/Injectable
import { Injectable, inject } from '@angular/core';
import { StateService } from './state.service';
import { ToastService } from '../core/services/toast.service';
import { LoggerService } from '../core/services/logger.service';
import { AppSettings, FamilyMember, VisitDetail, VisitLogEntry } from '../models/settings.model';
import { AppErrorType } from '../core/models/app-error.model';
import {
  NATIONAL_PARKS,
  STATES,
  GeoLocation,
  STATE_CODE_TO_NAME,
} from '../core/constants/geography.constants';
import {
  SECURITY_LIMITS,
  sanitizePlainText,
  checkPayloadSafety,
  isValidCalendarDate,
} from '../core/utils/security.utils';
import {
  TripDeltaPayload,
  ValidatedTripDelta,
  ParseResult,
  ValidationResult,
  BatchValidationResult,
  ResolvedEntity,
  RawTripPayload,
  ImportReceipt,
  LocationImportSummary,
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
Your task is to help the user log their travels by converting their natural language trip descriptions into a structured JSON object matching the Trip Delta schema.

### User Group Context:
${memberContext}

### How to Interact with the User:
1. **Initial Greeting / Standby**: If this prompt is provided without a trip description yet, reply warmly:
   "Hey! I'm ready to help log your travels. Please tell me about the trip (or trips) you want to log — which national parks or states you visited, who went with you, and roughly when!"
2. **Trip Date Verification**: If the user's travel date or year is ambiguous or unspecified, ask them to verify or approximate the start date (YYYY-MM-DD).
3. **Route & Highway Corridor Transparency**: In your conversational text accompanying the JSON, explicitly point out any intermediate corridor states you inferred based on their driving route (e.g. "I traced your driving route from Virginia to Michigan and included the Maryland and Ohio highway corridors so your map reflects all states traversed!").
4. **Delivering the JSON**: Once details are ready, introduce the output with:
   "Here is the JSON you need to copy back into the Traveled Roads Tracker website:"
   followed immediately by the JSON code block wrapped in standard markdown fences (\`\`\`json ... \`\`\`).

### Long-Distance Travel & Highway Corridor Reasoning (CRITICAL):
When travelers describe driving from one destination to another (e.g. road trips, cross-country drives, traveling between states or national parks):
1. **Trace the Logical Highway Corridors**: Reason step-by-step about the most logical major interstates and highways a traveler would use for that trip (e.g. I-95, I-81, I-80, I-76 PA Turnpike, I-70, I-40, I-10, I-15, I-90, Trans-Canada Highway).
2. **Infer Intermediate Transit States & Provinces**: Include ALL intermediate corridor states traversed along that driving route, even if the traveler did not explicitly name every pass-through state!
   - *Example*: If the user says "I went from Virginia to Michigan and stopped in Pennsylvania", the logical driving route follows major highway corridors (e.g., I-81 north to I-70 through Maryland into Pennsylvania, then the PA Turnpike/I-76 to I-80 through Ohio into Michigan). Therefore, you MUST include:
     \`"states": ["Virginia", "Maryland", "Pennsylvania", "Ohio", "Michigan"]\`
     Never omit intermediate states like Maryland or Ohio simply because the user didn't explicitly utter their names!
   - *Example*: Driving from New York to Florida along I-95 traverses New York, New Jersey, Delaware, Maryland, Virginia, North Carolina, South Carolina, Georgia, and Florida.
   - *Example*: Driving from Chicago to Yellowstone along I-90/I-80 traverses Illinois, Wisconsin, Minnesota, South Dakota, Wyoming, and Montana.
3. **Flying vs. Driving**:
   - If the user explicitly states they **flew** between cities (e.g. "Flew from Richmond to Denver"), only log the departure and destination states (Virginia, Colorado).
   - If the user drove, took a road trip, or mentions stops/cities along the highway, trace the full highway corridor and include all traversed states.

### Extraction Rules:
1. "date": The trip start date in YYYY-MM-DD format (use the best estimate if only month/year is given).
2. "parks": Extract all US and Canadian National Parks visited. Can be simple string array (e.g. ["Grand Teton", "Yellowstone"]) or structured objects with individual dates and notes if known (e.g. [{"name": "Grand Teton", "date": "2019-07-03", "notes": "Jenny Lake hike"}]).
3. "states": Extract all US States and Canadian Provinces visited OR traversed along logical highway corridors (e.g. ["Virginia", "Maryland", "Pennsylvania", "Ohio", "Michigan"]). Can also be structured objects with dates/notes.
4. "members": Array of member names who took part, or ["all"] if everyone attended.
5. "name": A concise, descriptive trip title (e.g., "Virginia to Michigan Road Trip via Pennsylvania").
6. "notes": A brief 1-2 sentence summary of the route, highlights, and major highways/corridors traveled.

### Required Output Schema (JSON Only):
For a single trip:
\`\`\`json
{
  "type": "trip_delta",
  "version": 1,
  "trip": {
    "name": "Virginia to Michigan Road Trip",
    "date": "2023-08-10",
    "members": ["all"],
    "parks": [
      { "name": "Cuyahoga Valley", "notes": "Quick stop off the Ohio Turnpike" }
    ],
    "states": [
      "Virginia",
      "Maryland",
      "Pennsylvania",
      "Ohio",
      "Michigan"
    ],
    "notes": "Drove from Virginia to Michigan stopping in Pennsylvania, traveling along the I-70 / I-76 / I-80 corridor through Maryland and Ohio."
  }
}
\`\`\`

For multiple trips / travel history:
\`\`\`json
{
  "type": "trip_delta",
  "version": 1,
  "trips": [
    {
      "name": "Virginia to Michigan Road Trip",
      "date": "2023-08-10",
      "members": ["all"],
      "parks": ["Cuyahoga Valley"],
      "states": ["Virginia", "Maryland", "Pennsylvania", "Ohio", "Michigan"],
      "notes": "Drove from Virginia to Michigan via MD, PA, and OH along the I-70/I-76/I-80 corridor."
    },
    {
      "name": "Utah Mighty 5 Tour",
      "date": "2025-05-10",
      "members": ["all"],
      "parks": ["Zion", "Bryce Canyon"],
      "states": ["Utah"],
      "notes": "Spring trip across southern Utah."
    }
  ]
}
\`\`\``;
  }

  /**
   * Pre-processes raw text from the AI prompt, cleans Markdown code fences,
   * extracts the JSON payload, checks prototype pollution safety, and parses it.
   */
  public extractAndParseJson(rawInput: string): ParseResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, error: 'Input is empty or not a valid string.' };
    }

    if (rawInput.length > SECURITY_LIMITS.MAX_INPUT_PAYLOAD_BYTES) {
      return {
        success: false,
        error: `Input payload exceeds maximum allowed size (${Math.round(SECURITY_LIMITS.MAX_INPUT_PAYLOAD_BYTES / 1024)} KB).`,
      };
    }

    let cleaned = rawInput.trim();

    // 1. Strip Markdown ```json ... ``` code blocks
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    } else {
      // Find the outermost { ... } or [ ... ]
      const firstCurly = cleaned.indexOf('{');
      const firstSquare = cleaned.indexOf('[');

      let startIndex = -1;
      let endIndex = -1;

      if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        startIndex = firstCurly;
        endIndex = cleaned.lastIndexOf('}');
      } else if (firstSquare !== -1) {
        startIndex = firstSquare;
        endIndex = cleaned.lastIndexOf(']');
      }

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned) as unknown;

      // Handle raw array of trips e.g. [ { ... }, { ... } ]
      if (Array.isArray(parsed)) {
        const safety = checkPayloadSafety(parsed);
        if (!safety.safe) {
          this.logger.warn('Rejected array payload failing safety check', {
            parsed,
            reason: safety.reason,
          });
          return {
            success: false,
            error: safety.errorMessage || 'Invalid JSON array structure detected.',
          };
        }
        return {
          success: true,
          payload: {
            type: 'trip_delta',
            version: 1,
            trips: (parsed as RawTripPayload[]).slice(0, SECURITY_LIMITS.MAX_TRIPS_PER_BATCH),
          },
        };
      }

      const parsedObj = parsed as Record<string, unknown>;

      // Prototype pollution & excessive object depth defense
      const safety = checkPayloadSafety(parsedObj);
      if (!safety.safe) {
        this.logger.warn('Rejected payload failing safety check', {
          parsed: parsedObj,
          reason: safety.reason,
        });
        return {
          success: false,
          error: safety.errorMessage || 'Invalid JSON object structure detected.',
        };
      }

      // Check for multi-trip "trips" array
      if (Array.isArray(parsedObj['trips'])) {
        return {
          success: true,
          payload: {
            type: typeof parsedObj['type'] === 'string' ? parsedObj['type'] : 'trip_delta',
            version: typeof parsedObj['version'] === 'number' ? parsedObj['version'] : 1,
            trips: (parsedObj['trips'] as RawTripPayload[]).slice(
              0,
              SECURITY_LIMITS.MAX_TRIPS_PER_BATCH,
            ),
          },
        };
      }

      // Single trip normalization
      let tripPayload: RawTripPayload;
      if (parsedObj['trip'] && typeof parsedObj['trip'] === 'object') {
        tripPayload = parsedObj['trip'] as RawTripPayload;
      } else if (
        parsedObj['parks'] ||
        parsedObj['states'] ||
        parsedObj['name'] ||
        parsedObj['route']
      ) {
        tripPayload = parsedObj as RawTripPayload;
      } else {
        return {
          success: false,
          error:
            'JSON is missing required trip data. Please include a "trip" or "trips" section with at least one park, state, or road trip route.',
        };
      }

      const payload: TripDeltaPayload = {
        type: typeof parsedObj['type'] === 'string' ? parsedObj['type'] : 'trip_delta',
        version: typeof parsedObj['version'] === 'number' ? parsedObj['version'] : 1,
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
   * Supports both single-trip and multi-trip batch payloads.
   */
  public validateAndResolve(
    payload: TripDeltaPayload,
    currentSettings: AppSettings,
  ): BatchValidationResult & ValidationResult {
    const rawTrips: RawTripPayload[] = [];
    if (Array.isArray(payload.trips)) {
      rawTrips.push(...payload.trips.slice(0, SECURITY_LIMITS.MAX_TRIPS_PER_BATCH));
    } else if (payload.trip) {
      rawTrips.push(payload.trip);
    }

    if (rawTrips.length === 0) {
      return {
        valid: false,
        trips: [],
        totalCount: 0,
        validCount: 0,
        errors: ['No recognized trip definitions found in payload.'],
        warnings: [],
      };
    }

    const validatedTrips: ValidatedTripDelta[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    rawTrips.forEach((rawTrip, idx) => {
      const { resolved, errors, warnings } = this.validateSingleTrip(rawTrip, currentSettings, idx);
      if (warnings.length > 0) {
        allWarnings.push(...warnings);
      }
      if (errors.length > 0) {
        allErrors.push(...errors);
      }
      if (resolved) {
        validatedTrips.push(resolved);
      }
    });

    const valid = validatedTrips.length > 0 && allErrors.length === 0;

    return {
      valid,
      trips: validatedTrips,
      resolved: validatedTrips[0], // for backwards compatibility with single-trip callers
      totalCount: rawTrips.length,
      validCount: validatedTrips.length,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Validates and resolves a single raw trip definition into a ValidatedTripDelta.
   */
  private validateSingleTrip(
    trip: RawTripPayload,
    currentSettings: AppSettings,
    index: number,
  ): { resolved?: ValidatedTripDelta; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = `[Trip ${index + 1}]`;

    // 1. Validate Date with strict calendar arithmetic & limits
    let resolvedDate = (trip.date || '').trim();
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!resolvedDate) {
      const today = new Date().toISOString().split('T')[0];
      resolvedDate = today;
      warnings.push(`${prefix} No date provided. Defaulted to today (${today}).`);
    } else if (!isoDateRegex.test(resolvedDate)) {
      if (/^\d{4}$/.test(resolvedDate)) {
        resolvedDate = `${resolvedDate}-06-01`;
        warnings.push(`${prefix} Year-only date provided. Adjusted to ${resolvedDate}.`);
      } else if (/^\d{4}-\d{2}$/.test(resolvedDate)) {
        resolvedDate = `${resolvedDate}-01`;
        warnings.push(`${prefix} Month-year date provided. Adjusted to ${resolvedDate}.`);
      } else {
        const fallback = new Date().toISOString().split('T')[0];
        warnings.push(
          `${prefix} Unrecognized date format "${resolvedDate}". Defaulted to ${fallback}.`,
        );
        resolvedDate = fallback;
      }
    }

    if (!isValidCalendarDate(resolvedDate)) {
      const fallback = new Date().toISOString().split('T')[0];
      warnings.push(`${prefix} Invalid calendar date "${resolvedDate}". Defaulted to ${fallback}.`);
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
          warnings.push(`${prefix} Group member "${rawName}" was not found in your settings.`);
        }
      }
      if (resolvedMembers.length === 0 && family.length > 0) {
        resolvedMembers.push(...family.map((f) => ({ id: f.id, name: f.name })));
        warnings.push(`${prefix} No recognized members specified; assigned to all group members.`);
      }
    }

    // 3. Resolve National Parks (capped at MAX_ENTITIES_PER_TRIP)
    const resolvedParks: ResolvedEntity[] = [];
    const rawParks = (Array.isArray(trip.parks) ? trip.parks : []).slice(
      0,
      SECURITY_LIMITS.MAX_ENTITIES_PER_TRIP,
    );

    for (const item of rawParks) {
      if (!item) continue;
      let rawName = '';
      let itemDate: string | undefined;
      let itemNotes: string | undefined;

      if (typeof item === 'string') {
        rawName = sanitizePlainText(item, SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH);
      } else if (typeof item === 'object' && item !== null) {
        const itemObj = item as { name?: unknown; date?: unknown; notes?: unknown };
        if (typeof itemObj.name === 'string') {
          rawName = sanitizePlainText(itemObj.name, SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH);
        }
        if (typeof itemObj.date === 'string' && isValidCalendarDate(itemObj.date.trim())) {
          itemDate = itemObj.date.trim();
        }
        if (typeof itemObj.notes === 'string') {
          itemNotes = sanitizePlainText(itemObj.notes, SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH);
        }
      }

      if (!rawName) continue;
      const match = this.matchPark(rawName);
      if (match) {
        if (!resolvedParks.some((p) => p.id === match.id)) {
          resolvedParks.push({
            id: match.id,
            name: match.name,
            country: match.country,
            dateVisited: itemDate,
            notes: itemNotes,
          });
        }
      } else {
        warnings.push(`${prefix} National Park "${rawName}" could not be recognized.`);
      }
    }

    // 4. Resolve States & Provinces (capped at MAX_ENTITIES_PER_TRIP)
    const resolvedStates: ResolvedEntity[] = [];
    const rawStates = (Array.isArray(trip.states) ? trip.states : []).slice(
      0,
      SECURITY_LIMITS.MAX_ENTITIES_PER_TRIP,
    );

    for (const item of rawStates) {
      if (!item) continue;
      let rawName = '';
      let itemDate: string | undefined;
      let itemNotes: string | undefined;

      if (typeof item === 'string') {
        rawName = sanitizePlainText(item, SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH);
      } else if (typeof item === 'object' && item !== null) {
        const itemObj = item as { name?: unknown; date?: unknown; notes?: unknown };
        if (typeof itemObj.name === 'string') {
          rawName = sanitizePlainText(itemObj.name, SECURITY_LIMITS.MAX_STRING_ITEM_LENGTH);
        }
        if (typeof itemObj.date === 'string' && isValidCalendarDate(itemObj.date.trim())) {
          itemDate = itemObj.date.trim();
        }
        if (typeof itemObj.notes === 'string') {
          itemNotes = sanitizePlainText(itemObj.notes, SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH);
        }
      }

      if (!rawName) continue;
      const match = this.matchState(rawName);
      if (match) {
        if (!resolvedStates.some((s) => s.id === match.id)) {
          resolvedStates.push({
            id: match.id,
            name: match.name,
            country: match.country,
            dateVisited: itemDate,
            notes: itemNotes,
          });
        }
      } else {
        warnings.push(`${prefix} State/Province "${rawName}" could not be recognized.`);
      }
    }

    // Must have at least one valid destination (either a park or a state)
    if (resolvedParks.length === 0 && resolvedStates.length === 0) {
      errors.push(`${prefix} No recognized National Parks or States/Provinces found.`);
    }

    // Sanitize trip title and notes against XSS, control characters, and length limits
    const rawNameCleaned = sanitizePlainText(trip.name || '', SECURITY_LIMITS.MAX_TRIP_NAME_LENGTH);
    const tripName = rawNameCleaned || this.generateDefaultTripName(resolvedParks, resolvedStates);
    const tripNotes =
      sanitizePlainText(trip.notes || '', SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH) || undefined;

    if (errors.length > 0) {
      return { errors, warnings };
    }

    const resolved: ValidatedTripDelta = {
      id: crypto.randomUUID(),
      name: tripName,
      date: resolvedDate,
      members: resolvedMembers,
      parks: resolvedParks,
      states: resolvedStates,
      notes: tripNotes,
      warnings,
      status: 'pending',
    };

    return { resolved, errors: [], warnings };
  }

  /**
   * Merges a batch of validated trip deltas incrementally into the central application state
   * in a single atomic update. Only trips with status === 'approved' are merged.
   * Returns an ImportReceipt detailing what was added and updated, or null on failure.
   */
  public applyBatchTripDeltas(trips: ValidatedTripDelta[]): ImportReceipt | null {
    const approvedTrips = trips.filter((t) => t.status === 'approved');
    if (approvedTrips.length === 0) {
      this.toastService.showInfo('No approved trips to import.');
      return null;
    }

    try {
      const current = this.stateService.getSettings();
      const updatedVisitedParks: Record<string, VisitDetail[]> = {
        ...(current.visitedParks || {}),
      };
      const updatedVisitedStates: Record<string, VisitDetail[]> = {
        ...(current.visitedStates || {}),
      };

      const initialVisitedParks = current.visitedParks || {};
      const initialVisitedStates = current.visitedStates || {};

      const previouslyVisitedParkIds = new Set(
        Object.keys(initialVisitedParks).filter((id) => (initialVisitedParks[id] || []).length > 0),
      );
      const previouslyVisitedStateIds = new Set(
        Object.keys(initialVisitedStates).filter(
          (id) => (initialVisitedStates[id] || []).length > 0,
        ),
      );

      const newParks: LocationImportSummary[] = [];
      const alreadyVisitedParks: LocationImportSummary[] = [];
      const newStates: LocationImportSummary[] = [];
      const alreadyVisitedStates: LocationImportSummary[] = [];
      const affectedMembersSet = new Set<string>();
      let totalLogEntriesAdded = 0;

      for (const trip of approvedTrips) {
        trip.members.forEach((m) => affectedMembersSet.add(m.name));

        // 1. Merge Parks
        for (const park of trip.parks) {
          const dateStr = park.dateVisited || trip.date;
          const comments = park.notes || trip.notes || trip.name;

          const isPriorVisited = previouslyVisitedParkIds.has(park.id);
          const summaryItem: LocationImportSummary = {
            id: park.id,
            name: park.name,
            isNewVisit: !isPriorVisited,
            dateVisited: dateStr,
            notes: comments,
          };

          if (isPriorVisited) {
            if (!alreadyVisitedParks.some((p) => p.id === park.id)) {
              alreadyVisitedParks.push(summaryItem);
            }
          } else {
            if (!newParks.some((p) => p.id === park.id)) {
              newParks.push(summaryItem);
            }
            previouslyVisitedParkIds.add(park.id);
          }

          if (!updatedVisitedParks[park.id]) {
            updatedVisitedParks[park.id] = [];
          }

          for (const member of trip.members) {
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
              totalLogEntriesAdded++;
            } else {
              if (!memberDetail.visits) {
                memberDetail.visits = [];
              }
              const existingSameDate = memberDetail.visits.find((v) => v.dateVisited === dateStr);
              if (!existingSameDate) {
                memberDetail.visits.push(newLogEntry);
                totalLogEntriesAdded++;
              } else if (
                comments &&
                (!existingSameDate.comments || !existingSameDate.comments.includes(comments))
              ) {
                existingSameDate.comments = existingSameDate.comments
                  ? `${existingSameDate.comments}; ${comments}`
                  : comments;
              }
              if (!memberDetail.firstVisitedDate || memberDetail.firstVisitedDate > dateStr) {
                memberDetail.firstVisitedDate = dateStr;
              }
            }
          }
        }

        // 2. Merge States
        for (const state of trip.states) {
          const dateStr = state.dateVisited || trip.date;
          const comments = state.notes || trip.notes || trip.name;

          const isPriorVisited = previouslyVisitedStateIds.has(state.id);
          const summaryItem: LocationImportSummary = {
            id: state.id,
            name: state.name,
            isNewVisit: !isPriorVisited,
            dateVisited: dateStr,
            notes: comments,
          };

          if (isPriorVisited) {
            if (!alreadyVisitedStates.some((s) => s.id === state.id)) {
              alreadyVisitedStates.push(summaryItem);
            }
          } else {
            if (!newStates.some((s) => s.id === state.id)) {
              newStates.push(summaryItem);
            }
            previouslyVisitedStateIds.add(state.id);
          }

          if (!updatedVisitedStates[state.id]) {
            updatedVisitedStates[state.id] = [];
          }

          for (const member of trip.members) {
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
              totalLogEntriesAdded++;
            } else {
              if (!memberDetail.visits) {
                memberDetail.visits = [];
              }
              const existingSameDate = memberDetail.visits.find((v) => v.dateVisited === dateStr);
              if (!existingSameDate) {
                memberDetail.visits.push(newLogEntry);
                totalLogEntriesAdded++;
              } else if (
                comments &&
                (!existingSameDate.comments || !existingSameDate.comments.includes(comments))
              ) {
                existingSameDate.comments = existingSameDate.comments
                  ? `${existingSameDate.comments}; ${comments}`
                  : comments;
              }
              if (!memberDetail.firstVisitedDate || memberDetail.firstVisitedDate > dateStr) {
                memberDetail.firstVisitedDate = dateStr;
              }
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

      const receipt: ImportReceipt = {
        success: true,
        tripsCount: approvedTrips.length,
        newParks,
        alreadyVisitedParks,
        newStates,
        alreadyVisitedStates,
        totalLogEntriesAdded,
        affectedMembers: Array.from(affectedMembersSet),
      };

      this.toastService.showSuccess(
        `Successfully imported ${approvedTrips.length} trip${approvedTrips.length > 1 ? 's' : ''}!`,
      );

      return receipt;
    } catch (e) {
      this.logger.error('Failed to apply batch trip deltas', e);
      this.toastService.showError({
        type: AppErrorType.VALIDATION_ERROR,
        message: 'Failed to merge trip batch into your tracker.',
      });
      return null;
    }
  }

  /**
   * Merges a single validated trip delta into the central application state.
   */
  public applyTripDelta(validated: ValidatedTripDelta): boolean {
    validated.status = 'approved';
    return !!this.applyBatchTripDeltas([validated]);
  }

  /**
   * Resolves a single National Park name or alias to a canonical ResolvedEntity.
   */
  public resolveSinglePark(rawName: string): ResolvedEntity | null {
    const match = this.matchPark(rawName);
    return match ? { id: match.id, name: match.name, country: match.country } : null;
  }

  /**
   * Resolves a single State/Province name or postal code to a canonical ResolvedEntity.
   */
  public resolveSingleState(rawState: string): ResolvedEntity | null {
    const match = this.matchState(rawState);
    return match ? { id: match.id, name: match.name, country: match.country } : null;
  }

  /**
   * Returns all canonical National Parks for selection/autocomplete.
   */
  public getAllParks(): GeoLocation[] {
    return NATIONAL_PARKS;
  }

  /**
   * Returns all canonical States/Provinces for selection/autocomplete.
   */
  public getAllStates(): GeoLocation[] {
    return STATES;
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

  private readonly statePostalMap: Record<string, string> = STATE_CODE_TO_NAME;

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
