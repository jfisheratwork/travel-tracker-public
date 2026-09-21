/**
 * Trip stop represents an anchor, destination, or corridor stop on a trip.
 */
export interface TripStop {
  placeId: string; // References Place.id (curated or custom)
  name: string;
  lat: number;
  lng: number;
  stopType: 'destination' | 'corridor_stop';
  isWaypointOnly?: boolean; // Option A: true for routing geometry waypoints without logging PlaceVisit
  arrivalDate?: string;
  notes?: string;
}

/**
 * Trip represents a first-class travel journey.
 */
export interface Trip {
  id: string;
  name: string; // e.g. 'Pacific Northwest Summer Expedition'
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  travelerIds: string[]; // Family member IDs on this trip
  destinations: TripStop[]; // Primary overnight or major stay destinations
  corridorStops?: TripStop[]; // Waypoints, state parks, or scenic stops
  transitRegionIds?: string[]; // Region IDs driven through (e.g. ['US-WY', 'US-SD'])
  highlights?: string[]; // Key moments/highlights logged by user or AI
  notes?: string;
  coordinates?: [number, number][]; // Routing geometry polyline
  distanceMiles?: number;
  color?: string;
}
