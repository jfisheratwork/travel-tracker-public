export interface RawTripPayload {
  name?: string;
  date?: string;
  members?: string[];
  parks?: string[];
  states?: string[];
  notes?: string;
}

export interface TripDeltaPayload {
  type?: string;
  version?: number;
  trip: RawTripPayload;
}

export interface ResolvedEntity {
  id: string;
  name: string;
  country?: string;
}

export interface ValidatedTripDelta {
  name: string;
  date: string;
  members: { id: string; name: string }[];
  parks: ResolvedEntity[];
  states: ResolvedEntity[];
  notes?: string;
  warnings: string[];
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
