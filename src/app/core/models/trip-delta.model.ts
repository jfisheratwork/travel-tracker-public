export type RawTripLocation = string | { name: string; date?: string; notes?: string };

export interface RawTripPayload {
  name?: string;
  date?: string;
  members?: string[];
  parks?: RawTripLocation[];
  states?: RawTripLocation[];
  notes?: string;
}

export interface TripDeltaPayload {
  type?: string;
  version?: number;
  trip?: RawTripPayload;
  trips?: RawTripPayload[];
}

export interface ResolvedEntity {
  id: string;
  name: string;
  country?: string;
  dateVisited?: string;
  notes?: string;
}

export interface LocationImportSummary {
  id: string;
  name: string;
  isNewVisit: boolean;
  dateVisited: string;
  notes?: string;
}

export interface ImportReceipt {
  success: boolean;
  tripsCount: number;
  newParks: LocationImportSummary[];
  alreadyVisitedParks: LocationImportSummary[];
  newStates: LocationImportSummary[];
  alreadyVisitedStates: LocationImportSummary[];
  totalLogEntriesAdded: number;
  affectedMembers: string[];
}

export interface ValidatedTripDelta {
  id: string;
  name: string;
  date: string;
  members: { id: string; name: string }[];
  parks: ResolvedEntity[];
  states: ResolvedEntity[];
  notes?: string;
  warnings: string[];
  status: 'pending' | 'approved' | 'skipped';
}

export interface ParseResult {
  success: boolean;
  payload?: TripDeltaPayload;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  resolved?: ValidatedTripDelta;
  errors: string[];
  warnings: string[];
}

export interface BatchValidationResult {
  valid: boolean;
  trips: ValidatedTripDelta[];
  totalCount: number;
  validCount: number;
  errors: string[];
  warnings: string[];
}
